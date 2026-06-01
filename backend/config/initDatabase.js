import { query } from "./db.js";
import bcrypt from "bcrypt";

const createTables = [
  `CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(150) NOT NULL UNIQUE,
    faculty_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'lecturer', 'admin', 'hod', 'dean') NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    department_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id)
      ON UPDATE CASCADE ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS semesters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    semester_name VARCHAR(100) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(50) NOT NULL UNIQUE,
    course_name VARCHAR(150) NOT NULL,
    department_id INT NOT NULL,
    lecturer_id INT NULL,
    semester_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_courses_department FOREIGN KEY (department_id) REFERENCES departments(id)
      ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_courses_lecturer FOREIGN KEY (lecturer_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_courses_semester FOREIGN KEY (semester_id) REFERENCES semesters(id)
      ON UPDATE CASCADE ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    target_role ENUM('all', 'student', 'lecturer', 'admin', 'hod', 'dean') NOT NULL DEFAULT 'all',
    department_id INT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_announcements_department FOREIGN KEY (department_id) REFERENCES departments(id)
      ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_announcements_created_by FOREIGN KEY (created_by) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS evaluations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    lecturer_id INT NOT NULL,
    course_id INT NOT NULL,
    semester_id INT NOT NULL,
    status ENUM('draft', 'submitted', 'reviewed') NOT NULL DEFAULT 'draft',
    submitted_at TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT fk_evaluations_student FOREIGN KEY (student_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_evaluations_lecturer FOREIGN KEY (lecturer_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_evaluations_course FOREIGN KEY (course_id) REFERENCES courses(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_evaluations_semester FOREIGN KEY (semester_id) REFERENCES semesters(id)
      ON UPDATE CASCADE ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_text TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evaluation_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comments_evaluation FOREIGN KEY (evaluation_id) REFERENCES evaluations(id)
      ON UPDATE CASCADE ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_title VARCHAR(200) NOT NULL,
    report_type VARCHAR(100) NOT NULL,
    generated_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reports_generated_by FOREIGN KEY (generated_by) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

const seedDepartments = [
  ["Department of Computer Science", "Faculty of Science"],
  ["Department of Mathematics", "Faculty of Science"],
  ["Department of Chemistry", "Faculty of Science"],
  ["Department of Zoology", "Faculty of Science"],
  ["Department of Botany", "Faculty of Science"],
  ["Department of Physics", "Faculty of Science"],
];

const seedSemesters = [
  ["Semester 1", "2025/2026", 1],
  ["Semester 2", "2025/2026", 0],
];

const defaultAdmin = {
  full_name: process.env.ADMIN_NAME || "Hasna Faizar",
  email: process.env.ADMIN_EMAIL || "admin@ruhuna.lk",
  password: process.env.ADMIN_PASSWORD || "Admin@123",
  department_id: Number(process.env.ADMIN_DEPARTMENT_ID || 1),
};

export const initializeDatabase = async () => {
  for (const statement of createTables) {
    await query(statement);
  }

  for (const [department_name, faculty_name] of seedDepartments) {
    await query(
      "INSERT IGNORE INTO departments (department_name, faculty_name) VALUES (?, ?)",
      [department_name, faculty_name]
    );
  }

  for (const [semester_name, academic_year, is_active] of seedSemesters) {
    await query(
      "INSERT IGNORE INTO semesters (semester_name, academic_year, is_active) VALUES (?, ?, ?)",
      [semester_name, academic_year, is_active]
    );
  }

  const [existingAdmin] = await query("SELECT id FROM users WHERE email = ? LIMIT 1", [defaultAdmin.email]);
  if (existingAdmin.length === 0) {
    const hashedPassword = await bcrypt.hash(defaultAdmin.password, 10);
    await query(
      "INSERT INTO users (full_name, email, password, role, status, department_id) VALUES (?, ?, ?, 'admin', 'approved', ?)",
      [defaultAdmin.full_name, defaultAdmin.email, hashedPassword, defaultAdmin.department_id]
    );
  }
};