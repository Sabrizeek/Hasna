import fs from "fs/promises";
import path from "path";

export const supervisionReportsUploadDir = path.resolve(
  process.cwd(),
  "uploads",
  "supervision-reports"
);

export const ensureUploadDirectories = async () => {
  await fs.mkdir(supervisionReportsUploadDir, { recursive: true });
};
