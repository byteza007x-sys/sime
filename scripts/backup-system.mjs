import { createWriteStream, existsSync } from "fs";
import { copyFile, mkdir, open, readFile, readdir, rm, stat, writeFile } from "fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");
const skipUploads = process.argv.includes("--skip-uploads");

function parseArgs() {
  const values = {};

  for (const arg of process.argv.slice(2)) {
    if (!arg.startsWith("--") || !arg.includes("=")) continue;
    const [key, ...parts] = arg.slice(2).split("=");
    values[key] = parts.join("=");
  }

  return values;
}

function parseEnv(text) {
  const values = {};

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || match[1].startsWith("#")) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[match[1]] = value;
  }

  return values;
}

async function readLocalEnv() {
  try {
    const envText = await readFile(join(projectRoot, ".env"), "utf8");
    return parseEnv(envText);
  } catch {
    return {};
  }
}

function resolveConfigPath(value, fallback) {
  const configured = value || fallback;
  return isAbsolute(configured) ? configured : resolve(projectRoot, configured);
}

function getDatabaseConfig(databaseUrl) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing. Set it in .env before running backup.");
  }

  const url = new URL(databaseUrl);
  if (!["mysql:", "mariadb:"].includes(url.protocol)) {
    throw new Error(`Unsupported DATABASE_URL protocol: ${url.protocol}`);
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!database) {
    throw new Error("DATABASE_URL must include a database name.");
  }

  return {
    database,
    host: url.hostname || "127.0.0.1",
    port: url.port || "3306",
    user: decodeURIComponent(url.username || "root"),
    password: decodeURIComponent(url.password || ""),
  };
}

function getMysqlDumpPath(env) {
  const configured = process.env.MYSQLDUMP_PATH || env.MYSQLDUMP_PATH;
  if (configured) return configured;

  const xamppPath = "C:\\xampp\\mysql\\bin\\mysqldump.exe";
  return existsSync(xamppPath) ? xamppPath : "mysqldump";
}

function getTarPath(env) {
  return process.env.TAR_PATH || env.TAR_PATH || "tar";
}

function buildDumpArgs(config) {
  const args = [
    "--single-transaction",
    "--routines",
    "--triggers",
    "--default-character-set=utf8mb4",
    "--host",
    config.host,
    "--port",
    config.port,
    "--user",
    config.user,
  ];

  if (config.password) args.push(`--password=${config.password}`);

  args.push(config.database);
  return args;
}

function redactArgs(args) {
  return args.map((arg) => (arg.startsWith("--password=") ? "--password=***" : arg));
}

async function runDump(command, args, outputFile) {
  await mkdir(dirname(outputFile), { recursive: true });

  const output = createWriteStream(outputFile, { flags: "wx" });
  const child = spawn(command, args, {
    cwd: projectRoot,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  child.stdout.pipe(output);
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  return await new Promise((resolvePromise, reject) => {
    child.on("error", async (error) => {
      output.destroy();
      await rm(outputFile, { force: true });
      reject(error);
    });

    child.on("close", async (code) => {
      output.end();
      if (code === 0) {
        resolvePromise();
        return;
      }

      await rm(outputFile, { force: true });
      reject(new Error(stderr.trim() || `mysqldump exited with code ${code}`));
    });
  });
}

async function runCommand(command, args) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    shell: false,
    stdio: ["ignore", "ignore", "pipe"],
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  return await new Promise((resolvePromise, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
    });
  });
}

async function fileSize(filePath) {
  try {
    const details = await stat(filePath);
    return details.size;
  } catch {
    return 0;
  }
}

function isoStampForPath(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function safeTag(value) {
  return String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function removeOldBackups(outputRoot, retentionDays) {
  if (!Number.isFinite(retentionDays) || retentionDays < 1) return [];

  const deleted = [];
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const entries = await readdir(outputRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const candidate = resolve(outputRoot, entry.name);
    const marker = join(candidate, ".e-service-backup");
    if (!candidate.startsWith(resolve(outputRoot)) || !existsSync(marker)) continue;

    const details = await stat(candidate);
    if (details.mtimeMs >= cutoff) continue;

    await rm(candidate, { recursive: true, force: true });
    deleted.push(entry.name);
  }

  return deleted;
}

async function withBackupLock(outputRoot, task) {
  const lockPath = join(outputRoot, ".backup.lock");
  let lockHandle;

  try {
    lockHandle = await open(lockPath, "wx");
    await lockHandle.writeFile(`${process.pid}\n${new Date().toISOString()}\n`);
  } catch {
    throw new Error(`Another backup appears to be running. Remove ${lockPath} only if it is stale.`);
  }

  try {
    return await task();
  } finally {
    await lockHandle.close();
    await rm(lockPath, { force: true });
  }
}

function getRetentionDays(args, env) {
  const raw =
    args["retention-days"] ??
    process.env.BACKUP_RETENTION_DAYS ??
    env.BACKUP_RETENTION_DAYS ??
    "forever";

  if (["0", "forever", "never", "none", "off"].includes(String(raw).toLowerCase())) {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function main() {
  const args = parseArgs();
  const env = await readLocalEnv();
  const databaseConfig = getDatabaseConfig(process.env.DATABASE_URL || env.DATABASE_URL);
  const outputRoot = resolveConfigPath(
    args["backup-root"] || process.env.BACKUP_ROOT || env.BACKUP_ROOT,
    "backups/daily",
  );
  const retentionDays = getRetentionDays(args, env);
  const startedAt = new Date();
  const timestamp = isoStampForPath(startedAt);
  const tag = safeTag(args.tag || process.env.BACKUP_TAG || env.BACKUP_TAG);
  const targetName = tag ? `${timestamp}--${tag}` : timestamp;
  const targetDir = join(outputRoot, targetName);
  const latestFile = join(outputRoot, "latest-backup.json");
  const markerFile = join(targetDir, ".e-service-backup");
  const dbFile = join(targetDir, "database.sql");
  const uploadsFile = join(targetDir, "uploads.tar.gz");
  const backupInfoFile = join(targetDir, "backup-info.json");
  const bundleFile = join(outputRoot, `${targetName}.tar.gz`);
  const uploadsDir = join(projectRoot, "public", "uploads");
  const dumpCommand = getMysqlDumpPath(env);
  const dumpArgs = buildDumpArgs(databaseConfig);
  const tarCommand = getTarPath(env);
  const errors = [];

  const summary = {
    version: 1,
    service: "e service",
    status: dryRun ? "dry-run" : "running",
    projectRoot,
    backupRoot: outputRoot,
    targetDir,
    tag: tag || null,
    startedAt: startedAt.toISOString(),
    finishedAt: null,
    durationMs: null,
    retentionDays,
    database: {
      name: databaseConfig.database,
      host: databaseConfig.host,
      port: databaseConfig.port,
      file: dbFile,
      sizeBytes: 0,
      ok: false,
    },
    uploads: {
      source: uploadsDir,
      file: uploadsFile,
      sizeBytes: 0,
      ok: false,
      skipped: skipUploads || !existsSync(uploadsDir),
    },
    bundle: {
      file: bundleFile,
      sizeBytes: 0,
      ok: false,
    },
    deletedOldBackups: [],
    errors,
  };

  console.log(`Backup root: ${outputRoot}`);
  console.log(`Target: ${targetDir}`);
  console.log(`Retention: ${retentionDays ? `${retentionDays} days` : "forever"}`);
  if (tag) console.log(`Tag: ${tag}`);
  console.log(`Database: ${databaseConfig.database} at ${databaseConfig.host}:${databaseConfig.port}`);
  console.log(`mysqldump: ${dumpCommand} ${redactArgs(dumpArgs).join(" ")}`);

  if (summary.uploads.skipped) {
    console.log("Uploads: skipped");
  } else {
    console.log(`Uploads: ${uploadsDir}`);
    console.log(`tar: ${tarCommand}`);
  }

  if (dryRun) {
    console.log("Dry run completed. No backup files were created.");
    return;
  }

  await mkdir(outputRoot, { recursive: true });

  await withBackupLock(outputRoot, async () => {
    await mkdir(targetDir, { recursive: true });
    await writeFile(markerFile, "e-service backup\n", "utf8");

    try {
      await runDump(dumpCommand, dumpArgs, dbFile);
      summary.database.sizeBytes = await fileSize(dbFile);
      summary.database.ok = summary.database.sizeBytes > 0;
      console.log(`Database backup completed: ${dbFile}`);
    } catch (error) {
      errors.push(`database: ${error instanceof Error ? error.message : String(error)}`);
      console.error(errors.at(-1));
    }

    if (!summary.uploads.skipped) {
      try {
        await runCommand(tarCommand, ["-czf", uploadsFile, "-C", join(projectRoot, "public"), "uploads"]);
        summary.uploads.sizeBytes = await fileSize(uploadsFile);
        summary.uploads.ok = summary.uploads.sizeBytes > 0;
        console.log(`Uploads backup completed: ${uploadsFile}`);
      } catch (error) {
        errors.push(`uploads: ${error instanceof Error ? error.message : String(error)}`);
        console.error(errors.at(-1));
      }
    }

    if (retentionDays !== null) {
      try {
        summary.deletedOldBackups = await removeOldBackups(outputRoot, retentionDays);
      } catch (error) {
        errors.push(`retention: ${error instanceof Error ? error.message : String(error)}`);
        console.error(errors.at(-1));
      }
    }

    const finishedAt = new Date();
    summary.finishedAt = finishedAt.toISOString();
    summary.durationMs = finishedAt.getTime() - startedAt.getTime();
    summary.status =
      summary.database.ok && (summary.uploads.ok || summary.uploads.skipped)
        ? "success"
        : "failed";

    await writeFile(backupInfoFile, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

    if (summary.status === "success") {
      try {
        await runCommand(tarCommand, ["-czf", bundleFile, "-C", outputRoot, basename(targetDir)]);
        summary.bundle.sizeBytes = await fileSize(bundleFile);
        summary.bundle.ok = summary.bundle.sizeBytes > 0;
        await writeFile(backupInfoFile, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
        console.log(`Combined backup completed: ${bundleFile}`);
      } catch (error) {
        errors.push(`bundle: ${error instanceof Error ? error.message : String(error)}`);
        summary.status = "failed";
        await writeFile(backupInfoFile, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
        console.error(errors.at(-1));
      }
    }

    await copyFile(backupInfoFile, latestFile);
  });

  console.log(`Backup status: ${summary.status}`);
  console.log(`Backup info: ${backupInfoFile}`);
  console.log(`Latest status: ${latestFile}`);

  if (summary.status !== "success") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
