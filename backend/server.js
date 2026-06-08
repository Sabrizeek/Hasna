import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import semesterRoutes from "./routes/semesterRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import questionRoutes from "./routes/questionRoutes.js";
import lecturerRoutes from "./routes/lecturerRoutes.js";
import hodRoutes from "./routes/hodRoutes.js";
import deanRoutes from "./routes/deanRoutes.js";
import { downloadSupervisionTemplate } from "./controllers/lecturerController.js";
import { query } from "./config/db.js";
import { initializeDatabase } from "./config/initDatabase.js";
import { sendError } from "./utils/apiResponse.js";
import { ensureUploadDirectories } from "./utils/uploadDirectories.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Lecturer Evaluation System API is running." });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/semesters", semesterRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/lecturer", lecturerRoutes);
app.use("/api/hod", hodRoutes);
app.use("/api/dean", deanRoutes);
app.get("/api/supervision-template", downloadSupervisionTemplate);

app.use((req, res) => {
  sendError(res, "Route not found.", 404);
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === "MulterError") {
    const message = err.code === "LIMIT_FILE_SIZE" ? "Report file must be 10MB or smaller." : err.message;
    return sendError(res, message, 400);
  }

  sendError(res, err.message || "Internal server error.", err.status || 500);
});

const startServer = async () => {
  try {
    await initializeDatabase();
    await ensureUploadDirectories();
    await query("SELECT 1 AS ok");
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log("MySQL connection is ready.");
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
