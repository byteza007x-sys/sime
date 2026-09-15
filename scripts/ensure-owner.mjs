import { randomBytes, randomUUID, scryptSync } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import mariadb from "mariadb";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

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

async function readLocalEnv() {
  try {
    return parseEnv(await readFile(path.join(projectRoot, ".env"), "utf8"));
  } catch {
    return {};
  }
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `scrypt:${salt}:${hash}`;
}

const env = await readLocalEnv();
const databaseUrl = process.env.DATABASE_URL || env.DATABASE_URL;
const ownerUsername = (process.env.OWNER_USERNAME || env.OWNER_USERNAME || "byteza007x")
  .trim()
  .toLowerCase();
const ownerPassword = process.env.OWNER_PASSWORD || env.OWNER_PASSWORD;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing.");
}
if (!ownerPassword || ownerPassword.length < 8) {
  throw new Error("OWNER_PASSWORD must be at least 8 characters.");
}

function getDatabaseConfig(value) {
  const url = new URL(value);

  return {
    host: url.hostname === "localhost" ? "127.0.0.1" : url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
  };
}

const databaseConfig = getDatabaseConfig(databaseUrl);
const connection = await mariadb.createConnection(databaseConfig);

try {
  await connection.query(
    `INSERT INTO roles (role_name, description, created_at)
     VALUES ('admin', 'Administrator', NOW())
     ON DUPLICATE KEY UPDATE description = VALUES(description)`,
  );

  const roles = await connection.query("SELECT role_id FROM roles WHERE role_name = 'admin'");
  const adminRoleId = Number(roles[0].role_id);
  const existingRows = await connection.query(
    "SELECT user_id FROM users WHERE username = ? LIMIT 1",
    [ownerUsername],
  );
  const ownerId = existingRows[0]?.user_id ?? randomUUID();
  const passwordHash = hashPassword(ownerPassword);

  await connection.query(
    `INSERT INTO users (
      user_id, username, email, password_hash, role_id, full_name, is_active, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, 'System Owner', TRUE, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      email = VALUES(email),
      password_hash = VALUES(password_hash),
      role_id = VALUES(role_id),
      full_name = VALUES(full_name),
      is_active = TRUE,
      updated_at = NOW()`,
    [
      ownerId,
      ownerUsername,
      `${ownerUsername}@owner.e-service.local`,
      passwordHash,
      adminRoleId,
    ],
  );

  console.log(`Owner account is ready: ${ownerUsername}`);
} finally {
  await connection.end();
}
