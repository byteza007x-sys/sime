import { createWriteStream, existsSync } from "fs";
import { mkdir, readFile, rm } from "fs/promises";
import { dirname, join, resolve } from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

function parseEnv(text) {
  const values = {};

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || match[1].startsWith("#")) {
      continue;
    }

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
  if (configured) {
    return configured;
  }

  const xamppPath = "C:\\xampp\\mysql\\bin\\mysqldump.exe";
  return existsSync(xamppPath) ? xamppPath : "mysqldump";
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

  if (config.password) {
    args.push(`--password=${config.password}`);
  }

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

const env = await readLocalEnv();
const config = getDatabaseConfig(process.env.DATABASE_URL || env.DATABASE_URL);
const command = getMysqlDumpPath(env);
const args = buildDumpArgs(config);
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = resolve(projectRoot, "backups", "db");
const outputFile = join(outputDir, `${config.database}-${timestamp}.sql`);

console.log(`Database: ${config.database}`);
console.log(`Host: ${config.host}:${config.port}`);
console.log(`Output: ${outputFile}`);
console.log(`Command: ${command} ${redactArgs(args).join(" ")}`);

if (dryRun) {
  console.log("Dry run completed. No backup file was created.");
} else {
  await runDump(command, args, outputFile);
  console.log(`Backup completed: ${outputFile}`);
}
