import { readFileSync } from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";
import mariadb from "mariadb";

const loadEnv = () => {
  const env = readFileSync(".env", "utf8");

  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=["']?(.*?)["']?$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
};

const hashPassword = (password) => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `scrypt:${salt}:${hash}`;
};

const getDatabaseConfig = () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  const url = new URL(databaseUrl);

  return {
    host: url.hostname === "localhost" ? "127.0.0.1" : url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
  };
};

const getRoleId = async (connection, roleName, description) => {
  await connection.query(
    `INSERT INTO roles (role_name, description, created_at)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE description = VALUES(description)`,
    [roleName, description],
  );

  const rows = await connection.query(
    "SELECT role_id FROM roles WHERE role_name = ? LIMIT 1",
    [roleName],
  );

  return Number(rows[0].role_id);
};

const createPermission = async (connection, key, description) => {
  await connection.query(
    `INSERT INTO permissions (permission_key, description)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE description = VALUES(description)`,
    [key, description],
  );
};

const createUser = async (connection, user) => {
  await connection.query(
    `INSERT INTO users (
      user_id, email, password_hash, role_id, full_name, phone,
      is_active, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      password_hash = VALUES(password_hash),
      role_id = VALUES(role_id),
      full_name = VALUES(full_name),
      phone = VALUES(phone),
      is_active = TRUE,
      updated_at = NOW()`,
    [
      user.userId,
      user.email,
      hashPassword(user.password),
      user.roleId,
      user.fullName,
      user.phone,
    ],
  );
};

const getOrCreateCustomer = async (connection) => {
  const existing = await connection.query(
    "SELECT customer_id FROM customers WHERE company_name = ? LIMIT 1",
    ["Siam E Business Demo Customer"],
  );

  if (existing.length > 0) return Number(existing[0].customer_id);

  const result = await connection.query(
    `INSERT INTO customers (
      company_name, tax_id, contact_person, phone, email, address,
      province, postal_code, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      "Siam E Business Demo Customer",
      "0100000000000",
      "Demo Contact",
      "02-000-0000",
      "customer@example.com",
      "Bangkok service site",
      "Bangkok",
      "10110",
    ],
  );

  return Number(result.insertId);
};

const getOrCreateSite = async (connection, customerId) => {
  const existing = await connection.query(
    "SELECT site_id FROM customer_sites WHERE customer_id = ? AND site_code = ? LIMIT 1",
    [customerId, "BKK-HQ"],
  );

  if (existing.length > 0) return Number(existing[0].site_id);

  const result = await connection.query(
    `INSERT INTO customer_sites (
      customer_id, site_code, site_name, address, province, postal_code,
      contact_person, phone, email, gps_lat, gps_long, gps_radius_meters,
      is_active, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW(), NOW())`,
    [
      customerId,
      "BKK-HQ",
      "Bangkok Head Office",
      "Bangkok service site",
      "Bangkok",
      "10110",
      "Demo Contact",
      "02-000-0000",
      "customer@example.com",
      13.756331,
      100.501762,
      300,
    ],
  );

  return Number(result.insertId);
};

const getOrCreateContact = async (connection, customerId, siteId) => {
  const existing = await connection.query(
    "SELECT contact_id FROM customer_contacts WHERE customer_id = ? AND full_name = ? LIMIT 1",
    [customerId, "Demo Contact"],
  );

  if (existing.length > 0) return Number(existing[0].contact_id);

  const result = await connection.query(
    `INSERT INTO customer_contacts (
      customer_id, site_id, full_name, position, phone, email,
      is_primary, is_active, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, TRUE, TRUE, NOW())`,
    [
      customerId,
      siteId,
      "Demo Contact",
      "Service Coordinator",
      "02-000-0000",
      "customer@example.com",
    ],
  );

  return Number(result.insertId);
};

const getEngineerId = async (connection) => {
  const rows = await connection.query(
    "SELECT engineer_id FROM engineers WHERE employee_id = ? LIMIT 1",
    ["ENG-001"],
  );

  return Number(rows[0].engineer_id);
};

const getOrCreateEquipment = async (connection) => {
  const existingEquipment = await connection.query(
    "SELECT equipment_id FROM equipment_master WHERE brand = ? AND model = ? LIMIT 1",
    ["Cisco", "Demo Router"],
  );

  let equipmentId;
  if (existingEquipment.length > 0) {
    equipmentId = Number(existingEquipment[0].equipment_id);
  } else {
    const result = await connection.query(
      `INSERT INTO equipment_master (
        brand, model, description, category, unit, minimum_stock,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      ["Cisco", "Demo Router", "Demo service equipment", "Network", "pcs", 1],
    );
    equipmentId = Number(result.insertId);
  }

  await connection.query(
    `INSERT INTO inventory (
      equipment_id, serial_number, status, warehouse_location,
      created_at, updated_at
    )
    VALUES (?, ?, 'In Stock', ?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      equipment_id = VALUES(equipment_id),
      status = VALUES(status),
      warehouse_location = VALUES(warehouse_location),
      updated_at = NOW()`,
    [equipmentId, "DEMO-SN-0001", "Main Warehouse"],
  );

  const inventoryRows = await connection.query(
    "SELECT inventory_id FROM inventory WHERE serial_number = ? LIMIT 1",
    ["DEMO-SN-0001"],
  );

  return Number(inventoryRows[0].inventory_id);
};

const createDemoEngineer = async (connection, engineerUserId) => {
  await connection.query(
    `INSERT INTO engineers (
      user_id, employee_id, first_name, last_name, phone, department,
      position, status, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      user_id = VALUES(user_id),
      first_name = VALUES(first_name),
      last_name = VALUES(last_name),
      phone = VALUES(phone),
      department = VALUES(department),
      position = VALUES(position),
      status = 'Active',
      updated_at = NOW()`,
    [
      engineerUserId,
      "ENG-001",
      "Demo",
      "Engineer",
      "099-000-0001",
      "Service",
      "Field Engineer",
    ],
  );
};

const createDemoReport = async (
  connection,
  customerId,
  siteId,
  contactId,
  engineerId,
  adminUserId,
  inventoryId,
) => {
  const reportId = "10000000-0000-4000-8000-000000000001";

  await connection.query(
    `INSERT INTO service_reports (
      report_id, job_number, project_number, customer_id, site_id, contact_id,
      engineer_id, created_by, service_type, source, priority, status,
      date_issued, scheduled_date, problem_description, charge_type,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Maintenance', 'Admin', 'Normal', 'Open',
      CURDATE(), CURDATE(), ?, 'Free Service', NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      customer_id = VALUES(customer_id),
      site_id = VALUES(site_id),
      contact_id = VALUES(contact_id),
      engineer_id = VALUES(engineer_id),
      created_by = VALUES(created_by),
      status = VALUES(status),
      problem_description = VALUES(problem_description),
      updated_at = NOW()`,
    [
      reportId,
      "SR-DEMO-0001",
      "PRJ-DEMO",
      customerId,
      siteId,
      contactId,
      engineerId,
      adminUserId,
      "Demo service request for dashboard testing.",
    ],
  );

  const existing = await connection.query(
    "SELECT id FROM report_equipment WHERE report_id = ? AND inventory_id = ? LIMIT 1",
    [reportId, inventoryId],
  );

  if (existing.length === 0) {
    await connection.query(
      `INSERT INTO report_equipment (report_id, inventory_id, action_type, reason)
       VALUES (?, ?, 'Installed', ?)`,
      [reportId, inventoryId, "Demo installed equipment"],
    );
  }
};

loadEnv();

const pool = mariadb.createPool({
  ...getDatabaseConfig(),
  connectionLimit: 2,
});

let connection;

try {
  connection = await pool.getConnection();

  const adminRoleId = await getRoleId(
    connection,
    "admin",
    "Full system access",
  );
  const userRoleId = await getRoleId(
    connection,
    "user",
    "Service form access",
  );

  for (const [key, description] of [
    ["dashboard.view", "View dashboard"],
    ["reports.manage", "Create and manage service reports"],
    ["reports.review", "Review submitted service reports"],
    ["field.update", "Update field service evidence"],
    ["settings.manage", "Manage system settings"],
  ]) {
    await createPermission(connection, key, description);
  }

  const users = [
    {
      userId: "00000000-0000-4000-8000-000000000001",
      email: "admin@siamebu.com",
      password: "Admin@1234",
      roleId: adminRoleId,
      fullName: "System Admin",
      phone: "099-000-0000",
    },
    {
      userId: "00000000-0000-4000-8000-000000000003",
      email: "user@siamebu.com",
      password: "User@1234",
      roleId: userRoleId,
      fullName: "Demo User",
      phone: "099-000-0001",
    },
  ];

  for (const user of users) {
    await createUser(connection, user);
  }

  await createDemoEngineer(connection, users[2].userId);

  const customerId = await getOrCreateCustomer(connection);
  const siteId = await getOrCreateSite(connection, customerId);
  const contactId = await getOrCreateContact(connection, customerId, siteId);
  const engineerId = await getEngineerId(connection);
  const inventoryId = await getOrCreateEquipment(connection);

  await createDemoReport(
    connection,
    customerId,
    siteId,
    contactId,
    engineerId,
    users[0].userId,
    inventoryId,
  );

  console.log("Seed completed.");
  console.log("Admin: admin@siamebu.com / Admin@1234");
  console.log("User: user@siamebu.com / User@1234");
} finally {
  if (connection) connection.release();
  await pool.end();
}
