import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const backupFile = path.resolve("backups", "les-database.sql");

const {
  DB_HOST = "localhost",
  DB_PORT = "3306",
  DB_USER,
  DB_PASSWORD = "",
  DB_NAME,
} = process.env;

if (!DB_USER || !DB_NAME) {
  console.error("DB_USER and DB_NAME must be set in backend/.env.");
  process.exit(1);
}

if (!fs.existsSync(backupFile)) {
  console.error(`Backup file not found: ${backupFile}`);
  console.error("Place les-database.sql in backend/backups or run npm run db:export on the source PC first.");
  process.exit(1);
}

const createDatabase = async () => {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: false,
  });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME.replace(/`/g, "``")}\``);
  await connection.end();
};

try {
  await createDatabase();
} catch (error) {
  console.error("Failed to create/check database. Confirm backend/.env MySQL credentials are correct.");
  console.error(error.message);
  process.exit(1);
}

const args = [
  "-h",
  DB_HOST,
  "-P",
  DB_PORT,
  "-u",
  DB_USER,
  DB_NAME,
];

const restore = spawn("mysql", args, {
  env: { ...process.env, MYSQL_PWD: DB_PASSWORD },
  stdio: ["pipe", "inherit", "pipe"],
});

fs.createReadStream(backupFile).pipe(restore.stdin);

restore.stderr.on("data", (data) => {
  process.stderr.write(data);
});

restore.on("error", (error) => {
  console.error("Failed to start mysql. Make sure MySQL bin tools are installed and available in PATH.");
  console.error(error.message);
  process.exit(1);
});

restore.on("close", (code) => {
  if (code !== 0) {
    console.error(`Database import failed with exit code ${code}.`);
    process.exit(code);
  }
  console.log(`Database imported from ${backupFile}`);
});
