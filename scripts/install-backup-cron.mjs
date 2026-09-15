import { mkdir, readFile } from "fs/promises";
import { dirname, isAbsolute, resolve } from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const marker = "# e-service daily backup";

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
    return parseEnv(await readFile(resolve(projectRoot, ".env"), "utf8"));
  } catch {
    return {};
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function resolveConfigPath(value, fallback) {
  const configured = value || fallback;
  return isAbsolute(configured) ? configured : resolve(projectRoot, configured);
}

function parseTime(value) {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    throw new Error("Invalid --time. Use HH:MM, for example --time=02:00");
  }

  return {
    hour: Number.parseInt(match[1], 10),
    minute: Number.parseInt(match[2], 10),
  };
}

async function run(command, args, input = null) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    shell: false,
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  if (input !== null) {
    child.stdin.end(input);
  } else {
    child.stdin.end();
  }

  return await new Promise((resolvePromise, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      resolvePromise({ code, stdout, stderr });
    });
  });
}

async function findNpm() {
  const result = await run("sh", ["-lc", "command -v npm"]);
  const npmPath = result.stdout.trim();
  if (result.code !== 0 || !npmPath) {
    throw new Error("Could not find npm. Install Node.js/npm before installing backup cron.");
  }

  return npmPath;
}

async function main() {
  if (process.platform === "win32") {
    throw new Error("Cron installer is for Linux servers. Use Windows Task Scheduler on Windows.");
  }

  const args = parseArgs();
  const env = await readLocalEnv();
  const { hour, minute } = parseTime(args.time || process.env.BACKUP_CRON_TIME || "02:00");
  const backupRoot = resolveConfigPath(
    args["backup-root"] || process.env.BACKUP_ROOT || env.BACKUP_ROOT,
    "backups/daily",
  );
  const logFile = resolve(backupRoot, "backup.log");
  const npmPath = await findNpm();
  const current = await run("crontab", ["-l"]);
  const currentLines = current.code === 0 ? current.stdout.split(/\r?\n/) : [];
  const filteredLines = currentLines.filter((line) => !line.includes(marker) && line.trim() !== "");
  const cronLine = [
    minute,
    hour,
    "*",
    "*",
    "*",
    "cd",
    shellQuote(projectRoot),
    "&&",
    "env",
    `BACKUP_ROOT=${shellQuote(backupRoot)}`,
    shellQuote(npmPath),
    "run",
    "backup:daily",
    ">>",
    shellQuote(logFile),
    "2>&1",
    marker,
  ].join(" ");
  const nextCrontab = `${filteredLines.join("\n")}\n${cronLine}\n`;

  await mkdir(backupRoot, { recursive: true });
  const install = await run("crontab", ["-"], nextCrontab);
  if (install.code !== 0) {
    throw new Error(install.stderr.trim() || "Failed to install cron job.");
  }

  console.log(`Daily backup cron installed at ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  console.log(`Backup root: ${backupRoot}`);
  console.log(`Log file: ${logFile}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
