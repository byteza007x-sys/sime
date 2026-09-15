import { constants } from "fs";
import { access, mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const envPath = path.join(projectRoot, ".env");
const checkAppUrl = process.env.CHECK_APP_URL || "http://127.0.0.1:3000/api/health";
const results = [];

function add(status, name, detail) {
  results.push({ status, name, detail });
}

function parseEnv(text) {
  const values = {};

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || line.trim().startsWith("#")) continue;

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

async function readEnv() {
  try {
    const text = await readFile(envPath, "utf8");
    add("ok", ".env", "Found local environment file.");
    return parseEnv(text);
  } catch {
    add("fail", ".env", "Missing .env. Copy .env.example and fill production values.");
    return {};
  }
}

async function checkWritableDirectory(relativePath) {
  const directory = path.join(projectRoot, relativePath);
  const probe = path.join(directory, `.write-test-${process.pid}.tmp`);

  try {
    await mkdir(directory, { recursive: true });
    await access(directory, constants.W_OK);
    await writeFile(probe, "ok", { flag: "wx" });
    await rm(probe, { force: true });
    add("ok", relativePath, "Writable.");
  } catch (error) {
    await rm(probe, { force: true });
    add("fail", relativePath, `Not writable: ${error.message}`);
  }
}

async function checkHealthEndpoint() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(checkAppUrl, { signal: controller.signal });
    const data = await response.json().catch(() => null);

    if (response.ok && data?.ok) {
      add("ok", "health endpoint", `${checkAppUrl} responded ok.`);
    } else {
      add(
        "warn",
        "health endpoint",
        `${checkAppUrl} responded ${response.status}. Start the app and check /api/health.`,
      );
    }
  } catch {
    add(
      "warn",
      "health endpoint",
      `Could not reach ${checkAppUrl}. Run the app before checking live readiness.`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

function checkNodeVersion() {
  const major = Number(process.versions.node.split(".")[0]);

  if (major >= 20) {
    add("ok", "Node.js", `Running ${process.version}.`);
  } else {
    add("fail", "Node.js", `Running ${process.version}. Use Node.js 20 or newer.`);
  }
}

function checkDatabaseUrl(databaseUrl) {
  if (!databaseUrl) {
    add("fail", "DATABASE_URL", "Missing database connection string.");
    return;
  }

  try {
    const url = new URL(databaseUrl);
    const database = decodeURIComponent(url.pathname.replace(/^\//, ""));

    if (!["mysql:", "mariadb:"].includes(url.protocol)) {
      add("fail", "DATABASE_URL", `Unsupported protocol: ${url.protocol}`);
      return;
    }
    if (!database) {
      add("fail", "DATABASE_URL", "Database name is missing.");
      return;
    }
    if (!url.username || url.username === "root") {
      add("warn", "DATABASE_URL", "Use a dedicated database user in production, not root.");
      return;
    }

    add("ok", "DATABASE_URL", `${url.hostname || "localhost"}:${url.port || "3306"}/${database}`);
  } catch {
    add("fail", "DATABASE_URL", "Invalid URL format.");
  }
}

function checkAuthSecret(secret) {
  if (!secret) {
    add("fail", "AUTH_SECRET", "Missing. Sessions are not safe for production.");
    return;
  }
  if (secret.includes("CHANGE_ME") || secret.length < 32) {
    add("fail", "AUTH_SECRET", "Use a random secret with at least 32 characters.");
    return;
  }

  add("ok", "AUTH_SECRET", "Present.");
}

function checkServerActionsKey(key) {
  if (key) {
    add("ok", "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY", "Present.");
  } else {
    add(
      "warn",
      "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY",
      "Recommended when running multiple app instances or rolling deployments.",
    );
  }
}

const env = await readEnv();

checkNodeVersion();
checkDatabaseUrl(process.env.DATABASE_URL || env.DATABASE_URL);
checkAuthSecret(process.env.AUTH_SECRET || env.AUTH_SECRET);
checkServerActionsKey(
  process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY || env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY,
);
await checkWritableDirectory(path.join("public", "uploads", "photos"));
await checkWritableDirectory(path.join("public", "uploads", "signatures"));
await checkHealthEndpoint();

const rank = { ok: 0, warn: 1, fail: 2 };
const sorted = [...results].sort((a, b) => rank[b.status] - rank[a.status]);
const hasFailure = results.some((result) => result.status === "fail");

console.log("");
console.log("e service production readiness");
console.log("--------------------------------");
for (const result of sorted) {
  const label = result.status.toUpperCase().padEnd(4);
  console.log(`${label} ${result.name} - ${result.detail}`);
}
console.log("--------------------------------");
console.log(hasFailure ? "Result: NOT READY" : "Result: READY WITH NOTES");
console.log("");

process.exit(hasFailure ? 1 : 0);
