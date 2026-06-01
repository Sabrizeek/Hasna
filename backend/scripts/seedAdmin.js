import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { closePool, query } from "../config/db.js";

dotenv.config();

const seedAdmin = async () => {
  const fullName = process.env.ADMIN_NAME || "System Admin";
  const email = process.env.ADMIN_EMAIL || "admin@ruhuna.lk";
  const plainPassword = process.env.ADMIN_PASSWORD || "Admin@123";
  const departmentId = Number(process.env.ADMIN_DEPARTMENT_ID || 1);

  const [existingUsers] = await query("SELECT id FROM users WHERE email = ?", [email]);
  if (existingUsers.length > 0) {
    console.log("Admin user already exists.");
    await closePool();
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  await query(
    "INSERT INTO users (full_name, email, password, role, status, department_id) VALUES (?, ?, ?, 'admin', 'approved', ?)",
    [fullName, email, hashedPassword, departmentId]
  );

  console.log(`Admin user created: ${email}`);
  await closePool();
  process.exit(0);
};

seedAdmin().catch((error) => {
  console.error("Failed to seed admin user:", error.message);
  process.exit(1);
});
