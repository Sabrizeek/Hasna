import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const backupDir = path.resolve("backups");
const backupFile = path.join(backupDir, "les-database.sql");

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

fs.mkdirSync(backupDir, { recursive: true });

const args = [
  "--single-transaction",
  "--routines",
  "--triggers",
  "--add-drop-table",
  "-h",
  DB_HOST,
  "-P",
  DB_PORT,
  "-u",
  DB_USER,
  DB_NAME,
];

const dump = spawn("mysqldump", args, {
  env: { ...process.env, MYSQL_PWD: DB_PASSWORD },
  stdio: ["ignore", "pipe", "pipe"],
});

const output = fs.createWriteStream(backupFile);
dump.stdout.pipe(output);

dump.stderr.on("data", (data) => {
  process.stderr.write(data);
});

dump.on("error", (error) => {
  console.error("Failed to start mysqldump. Make sure MySQL bin tools are installed and available in PATH.");
  console.error(error.message);
  process.exit(1);
});

dump.on("close", (code) => {
  output.close();
  if (code !== 0) {
    console.error(`Database export failed with exit code ${code}.`);
    process.exit(code);
  }
  console.log(`Database exported to ${backupFile}`);
});
