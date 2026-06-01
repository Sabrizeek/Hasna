import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const databaseName = process.env.DB_NAME;

const connectionConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const createPool = async () => {
  const bootstrapConnection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  await bootstrapConnection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
  await bootstrapConnection.end();

  return mysql.createPool({
    ...connectionConfig,
    database: databaseName,
  });
};

const poolPromise = createPool();

export const getPool = async () => poolPromise;

export const query = async (sql, params = []) => {
  const pool = await poolPromise;
  return pool.execute(sql, params);
};

export const closePool = async () => {
  const pool = await poolPromise;
  return pool.end();
};
