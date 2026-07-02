import fs from "fs/promises";
import path from "path";

export const supervisionReportsUploadDir = path.resolve(
  process.cwd(),
  "uploads",
  "supervision-reports"
);

export const profilePhotosUploadDir = path.resolve(
  process.cwd(),
  "uploads",
  "profile-photos"
);

export const peerEvaluationsUploadDir = path.resolve(
  process.cwd(),
  "uploads",
  "peer-evaluations"
);

export const ensureUploadDirectories = async () => {
  await fs.mkdir(supervisionReportsUploadDir, { recursive: true });
  await fs.mkdir(profilePhotosUploadDir, { recursive: true });
  await fs.mkdir(peerEvaluationsUploadDir, { recursive: true });
};
