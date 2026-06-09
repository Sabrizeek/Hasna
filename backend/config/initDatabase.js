import { query } from "./db.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const databaseName = process.env.DB_NAME;

const createTables = [
  `CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(150) NOT NULL UNIQUE,
    faculty_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    university_id VARCHAR(50) NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'lecturer', 'admin', 'hod', 'dean') NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    department_id INT NULL,
    profile_photo VARCHAR(500) NULL,
    phone VARCHAR(30) NULL,
    first_login TINYINT(1) NOT NULL DEFAULT 1,
    must_change_password TINYINT(1) NOT NULL DEFAULT 1,
    created_by INT NULL,
    last_login DATETIME NULL,
    deleted_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id)
      ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(id)
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
    type ENUM('theory','practical') NOT NULL DEFAULT 'theory',
    label VARCHAR(100) NULL,
    question_text TEXT NOT NULL,
    category VARCHAR(100) NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS lecturer_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    photo_url VARCHAR(500) NULL,
    designation VARCHAR(150) NULL,
    qualifications TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_lecturer_profiles_user FOREIGN KEY (user_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS lecturer_modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lecturer_id INT NOT NULL,
    course_id INT NOT NULL,
    semester_id INT NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lecturer_modules_lecturer FOREIGN KEY (lecturer_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_lecturer_modules_course FOREIGN KEY (course_id) REFERENCES courses(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_lecturer_modules_semester FOREIGN KEY (semester_id) REFERENCES semesters(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE KEY uq_lecturer_modules_assignment (lecturer_id, course_id, semester_id, academic_year)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS evaluation_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    lecturer_id INT NOT NULL,
    course_id INT NOT NULL,
    semester_id INT NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    type ENUM('theory','practical') NOT NULL,
    overall_grade DECIMAL(5,2) NULL,
    comment_text TEXT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_evaluation_submissions_student FOREIGN KEY (student_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_evaluation_submissions_lecturer FOREIGN KEY (lecturer_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_evaluation_submissions_course FOREIGN KEY (course_id) REFERENCES courses(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_evaluation_submissions_semester FOREIGN KEY (semester_id) REFERENCES semesters(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE KEY uq_evaluation_submissions_once (student_id, lecturer_id, course_id, semester_id, type),
    UNIQUE KEY uq_evaluation_submissions_once_year (student_id, lecturer_id, course_id, semester_id, academic_year, type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS evaluation_responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL,
    question_id INT NOT NULL,
    score TINYINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_evaluation_responses_submission FOREIGN KEY (submission_id) REFERENCES evaluation_submissions(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_evaluation_responses_question FOREIGN KEY (question_id) REFERENCES questions(id)
      ON UPDATE CASCADE ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS supervision_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lecturer_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INT UNSIGNED NOT NULL,
    status ENUM('submitted','under_review','accepted','rejected') NOT NULL DEFAULT 'submitted',
    admin_comment TEXT NULL,
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL DEFAULT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_supervision_reports_lecturer FOREIGN KEY (lecturer_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_supervision_reports_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS evaluation_windows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    semester_id INT NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    open_date DATETIME NOT NULL,
    close_date DATETIME NOT NULL,
    status ENUM('open','closed','scheduled') NOT NULL DEFAULT 'scheduled',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_evaluation_windows_semester FOREIGN KEY (semester_id) REFERENCES semesters(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_evaluation_windows_created_by FOREIGN KEY (created_by) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS access_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    department_id INT NULL,
    semester_id INT NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    status ENUM('active','revoked','expired') NOT NULL DEFAULT 'active',
    expires_at DATETIME NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_access_tokens_department FOREIGN KEY (department_id) REFERENCES departments(id)
      ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_access_tokens_semester FOREIGN KEY (semester_id) REFERENCES semesters(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_access_tokens_created_by FOREIGN KEY (created_by) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INT NULL,
    details JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS lecturer_award_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lecturer_id INT NOT NULL,
    semester_id INT NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    supervision_score DECIMAL(6,2) NOT NULL DEFAULT 0,
    admin_comment TEXT NULL,
    updated_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_lecturer_award_scores_lecturer FOREIGN KEY (lecturer_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_lecturer_award_scores_semester FOREIGN KEY (semester_id) REFERENCES semesters(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_lecturer_award_scores_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE SET NULL,
    UNIQUE KEY uq_lecturer_award_scores (lecturer_id, semester_id, academic_year)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS password_reset_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    university_id VARCHAR(50) NOT NULL,
    email VARCHAR(150) NOT NULL,
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL DEFAULT NULL,
    admin_note TEXT NULL,
    CONSTRAINT fk_password_reset_requests_user FOREIGN KEY (user_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_password_reset_requests_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    role ENUM('student','lecturer','admin','hod','dean') NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info','success','warning','error','system') NOT NULL DEFAULT 'info',
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    related_entity_type VARCHAR(100) NULL,
    related_entity_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE CASCADE
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

const questionSeeds = [
  ["theory", "T1", "The lecturer explains lecture concepts clearly and at an appropriate level.", 1],
  ["theory", "T2", "The lecturer demonstrates strong subject knowledge in the course content.", 2],
  ["theory", "T3", "The lectures are well organized and follow a logical sequence.", 3],
  ["theory", "T4", "The lecturer communicates effectively and is easy to understand.", 4],
  ["theory", "T5", "The lecturer uses relevant examples to connect theory with scientific applications.", 5],
  ["theory", "T6", "The lecturer encourages student participation and engagement during lectures.", 6],
  ["theory", "T7", "The lecturer applies fair and transparent assessment expectations.", 7],
  ["theory", "T8", "The lectures help students achieve the intended learning outcomes of the course.", 8],
  ["theory", "T9", "The lecturer is punctual and uses scheduled lecture time effectively.", 9],
  ["theory", "T10", "Overall, the lecturer provides high quality teaching for this theory course.", 10],
  ["practical", "P1", "The practical sessions are well organized and prepared in advance.", 1],
  ["practical", "P2", "The lecturer or demonstrator provides clear demonstrations before practical work begins.", 2],
  ["practical", "P3", "Laboratory safety instructions are clearly explained and consistently reinforced.", 3],
  ["practical", "P4", "The lecturer provides helpful guidance while students perform practical activities.", 4],
  ["practical", "P5", "Required equipment, specimens, chemicals, or materials are available and suitable for the practical work.", 5],
  ["practical", "P6", "The practical sessions help students develop relevant scientific and technical skills.", 6],
  ["practical", "P7", "Experimental procedures are explained clearly before students begin the tasks.", 7],
  ["practical", "P8", "The lecturer gives useful feedback on student performance and practical records.", 8],
  ["practical", "P9", "Practical session time is managed effectively to complete the intended activities.", 9],
  ["practical", "P10", "The practical sessions help students achieve the intended learning outcomes of the course.", 10],
];

const tableColumnExists = async (tableName, columnName) => {
  const [rows] = await query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [databaseName, tableName, columnName]
  );

  return rows.length > 0;
};

const addColumnIfMissing = async (tableName, columnName, definition) => {
  if (!(await tableColumnExists(tableName, columnName))) {
    await query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
};

const indexExists = async (tableName, indexName) => {
  const [rows] = await query(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?
     LIMIT 1`,
    [databaseName, tableName, indexName]
  );

  return rows.length > 0;
};

const addIndexIfMissing = async (tableName, indexName, columns) => {
  if (!(await indexExists(tableName, indexName))) {
    await query(`CREATE INDEX ${indexName} ON ${tableName} (${columns})`);
  }
};

const addUniqueIndexIfMissing = async (tableName, indexName, columns) => {
  if (!(await indexExists(tableName, indexName))) {
    await query(`CREATE UNIQUE INDEX ${indexName} ON ${tableName} (${columns})`);
  }
};

const migrateExistingTables = async () => {
  await addColumnIfMissing("users", "university_id", "VARCHAR(50) NULL UNIQUE AFTER id");
  await addColumnIfMissing("users", "profile_photo", "VARCHAR(500) NULL AFTER department_id");
  await addColumnIfMissing("users", "phone", "VARCHAR(30) NULL AFTER profile_photo");
  await addColumnIfMissing("users", "first_login", "TINYINT(1) NOT NULL DEFAULT 1 AFTER phone");
  await addColumnIfMissing("users", "must_change_password", "TINYINT(1) NOT NULL DEFAULT 1 AFTER first_login");
  await addColumnIfMissing("users", "created_by", "INT NULL AFTER must_change_password");
  await addColumnIfMissing("users", "last_login", "DATETIME NULL AFTER created_by");
  await addColumnIfMissing("users", "deleted_at", "DATETIME NULL AFTER last_login");

  await addColumnIfMissing("questions", "type", "ENUM('theory','practical') NOT NULL DEFAULT 'theory' AFTER id");
  await addColumnIfMissing("questions", "label", "VARCHAR(100) NULL AFTER type");
  await addColumnIfMissing("questions", "display_order", "INT NOT NULL DEFAULT 0 AFTER question_text");
  await addColumnIfMissing("questions", "is_active", "TINYINT(1) NOT NULL DEFAULT 1 AFTER display_order");

  await query("UPDATE questions SET category = type WHERE category IS NULL OR category = ''");
};

const createIndexes = async () => {
  await addUniqueIndexIfMissing("users", "uq_users_university_id", "university_id");
  await addIndexIfMissing("users", "idx_users_department_id", "department_id");
  await addIndexIfMissing("users", "idx_users_role_status", "role, status");
  await addIndexIfMissing("courses", "idx_courses_department_id", "department_id");
  await addIndexIfMissing("courses", "idx_courses_lecturer_id", "lecturer_id");
  await addIndexIfMissing("courses", "idx_courses_semester_id", "semester_id");
  await addIndexIfMissing("semesters", "idx_semesters_academic_year", "academic_year");
  await addIndexIfMissing("announcements", "idx_announcements_department_id", "department_id");
  await addIndexIfMissing("announcements", "idx_announcements_target_role", "target_role");
  await addIndexIfMissing("evaluations", "idx_evaluations_lecturer_id", "lecturer_id");
  await addIndexIfMissing("evaluations", "idx_evaluations_course_id", "course_id");
  await addIndexIfMissing("evaluations", "idx_evaluations_semester_id", "semester_id");
  await addIndexIfMissing("evaluations", "idx_evaluations_submitted_at", "submitted_at");
  await addIndexIfMissing("lecturer_profiles", "idx_lecturer_profiles_user_id", "user_id");
  await addIndexIfMissing("lecturer_modules", "idx_lecturer_modules_lecturer_id", "lecturer_id");
  await addIndexIfMissing("lecturer_modules", "idx_lecturer_modules_course_id", "course_id");
  await addIndexIfMissing("lecturer_modules", "idx_lecturer_modules_semester_id", "semester_id");
  await addIndexIfMissing("questions", "idx_questions_type_active_order", "type, is_active, display_order");
  await addIndexIfMissing("evaluation_submissions", "idx_eval_submissions_lecturer_id", "lecturer_id");
  await addIndexIfMissing("evaluation_submissions", "idx_eval_submissions_course_id", "course_id");
  await addIndexIfMissing("evaluation_submissions", "idx_eval_submissions_semester_id", "semester_id");
  await addIndexIfMissing("evaluation_submissions", "idx_eval_submissions_submitted_at", "submitted_at");
  await addIndexIfMissing("evaluation_submissions", "idx_eval_submissions_type", "type");
  await addUniqueIndexIfMissing("evaluation_submissions", "uq_evaluation_submissions_once_year", "student_id, lecturer_id, course_id, semester_id, academic_year, type");
  await addIndexIfMissing("evaluation_responses", "idx_eval_responses_submission_id", "submission_id");
  await addIndexIfMissing("evaluation_responses", "idx_eval_responses_question_id", "question_id");
  await addIndexIfMissing("supervision_reports", "idx_supervision_reports_lecturer_id", "lecturer_id");
  await addIndexIfMissing("supervision_reports", "idx_supervision_reports_status", "status");
  await addIndexIfMissing("supervision_reports", "idx_supervision_reports_submitted_at", "submitted_at");
  await addIndexIfMissing("evaluation_windows", "idx_evaluation_windows_semester_id", "semester_id");
  await addIndexIfMissing("evaluation_windows", "idx_evaluation_windows_status", "status");
  await addIndexIfMissing("access_tokens", "idx_access_tokens_department_id", "department_id");
  await addIndexIfMissing("access_tokens", "idx_access_tokens_semester_id", "semester_id");
  await addIndexIfMissing("access_tokens", "idx_access_tokens_status", "status");
  await addIndexIfMissing("audit_logs", "idx_audit_logs_user_id", "user_id");
  await addIndexIfMissing("audit_logs", "idx_audit_logs_entity", "entity_type, entity_id");
  await addIndexIfMissing("lecturer_award_scores", "idx_lecturer_award_scores_lecturer_id", "lecturer_id");
  await addIndexIfMissing("lecturer_award_scores", "idx_lecturer_award_scores_semester_id", "semester_id");
  await addIndexIfMissing("password_reset_requests", "idx_password_reset_requests_user_status", "user_id, status");
  await addIndexIfMissing("password_reset_requests", "idx_password_reset_requests_status", "status");
  await addIndexIfMissing("password_reset_requests", "idx_password_reset_requests_requested_at", "requested_at");
  await addIndexIfMissing("notifications", "idx_notifications_user_read", "user_id, is_read");
  await addIndexIfMissing("notifications", "idx_notifications_created_at", "created_at");
  await addIndexIfMissing("notifications", "idx_notifications_related", "related_entity_type, related_entity_id");
};

const normalizeSemesters = async () => {
  const [groups] = await query(
    `SELECT semester_name, academic_year,
            MIN(id) AS fallback_id,
            MIN(CASE WHEN is_active = 1 THEN id ELSE NULL END) AS active_id,
            COUNT(*) AS duplicate_count,
            MAX(is_active) AS has_active
     FROM semesters
     GROUP BY semester_name, academic_year`
  );

  for (const group of groups) {
    const canonicalId = group.active_id || group.fallback_id;
    const [duplicates] = await query(
      `SELECT id
       FROM semesters
       WHERE semester_name = ? AND academic_year = ? AND id != ?`,
      [group.semester_name, group.academic_year, canonicalId]
    );

    const duplicateIds = duplicates.map((semester) => semester.id);

    for (const duplicateId of duplicateIds) {
      await query(
        `DELETE duplicate_module
         FROM lecturer_modules duplicate_module
         INNER JOIN lecturer_modules canonical_module
           ON canonical_module.lecturer_id = duplicate_module.lecturer_id
          AND canonical_module.course_id = duplicate_module.course_id
          AND canonical_module.academic_year = duplicate_module.academic_year
          AND canonical_module.semester_id = ?
         WHERE duplicate_module.semester_id = ?`,
        [canonicalId, duplicateId]
      );
      await query(
        `DELETE duplicate_submission
         FROM evaluation_submissions duplicate_submission
         INNER JOIN evaluation_submissions canonical_submission
           ON canonical_submission.student_id = duplicate_submission.student_id
          AND canonical_submission.lecturer_id = duplicate_submission.lecturer_id
          AND canonical_submission.course_id = duplicate_submission.course_id
          AND canonical_submission.type = duplicate_submission.type
          AND canonical_submission.semester_id = ?
         WHERE duplicate_submission.semester_id = ?`,
        [canonicalId, duplicateId]
      );
      await query("UPDATE courses SET semester_id = ? WHERE semester_id = ?", [canonicalId, duplicateId]);
      await query("UPDATE evaluations SET semester_id = ? WHERE semester_id = ?", [canonicalId, duplicateId]);
      await query("UPDATE lecturer_modules SET semester_id = ? WHERE semester_id = ?", [canonicalId, duplicateId]);
      await query("UPDATE evaluation_submissions SET semester_id = ? WHERE semester_id = ?", [canonicalId, duplicateId]);
      await query("UPDATE evaluation_windows SET semester_id = ? WHERE semester_id = ?", [canonicalId, duplicateId]);
      await query("UPDATE access_tokens SET semester_id = ? WHERE semester_id = ?", [canonicalId, duplicateId]);
      await query("DELETE FROM semesters WHERE id = ?", [duplicateId]);
    }

    await query("UPDATE semesters SET is_active = ? WHERE id = ?", [group.has_active ? 1 : 0, canonicalId]);
  }

  const [activeSemesters] = await query(
    "SELECT id FROM semesters WHERE is_active = 1 ORDER BY created_at DESC, id DESC"
  );

  if (activeSemesters.length > 1) {
    const activeId = activeSemesters[0].id;
    await query("UPDATE semesters SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END", [activeId]);
  }

  await addUniqueIndexIfMissing("semesters", "uq_semesters_name_year", "semester_name, academic_year");
};

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
  university_id: process.env.ADMIN_UNIVERSITY_ID || "ADM001",
  full_name: process.env.ADMIN_NAME || "Hasna Faizar",
  email: process.env.ADMIN_EMAIL || "admin@ruhuna.lk",
  password: process.env.ADMIN_PASSWORD || "Admin@123",
  department_id: Number(process.env.ADMIN_DEPARTMENT_ID || 1),
};

const demoPassword = process.env.DEFAULT_USER_PASSWORD || process.env.DEMO_PASSWORD || "UOR@12345";

const baseSeedUsers = [
  {
    university_id: "SCI2026001",
    full_name: "Ayesha Perera",
    email: "student@ruhuna.lk",
    role: "student",
    department_name: "Department of Computer Science",
  },
  {
    university_id: "DEAN001",
    full_name: "Prof. Anoma Senanayake",
    email: "dean.science@ruhuna.lk",
    role: "dean",
    department_name: "Department of Computer Science",
  },
  {
    university_id: "HOD005",
    full_name: "Dr. Chamari Gunawardena",
    email: "hod.botany@ruhuna.lk",
    role: "hod",
    department_name: "Department of Botany",
  },
  {
    university_id: "HOD002",
    full_name: "Dr. Pradeep Wijesinghe",
    email: "hod.mathematics@ruhuna.lk",
    role: "hod",
    department_name: "Department of Mathematics",
  },
  {
    university_id: "HOD001",
    full_name: "Dr. Shalini Rathnayake",
    email: "hod.cs@ruhuna.lk",
    role: "hod",
    department_name: "Department of Computer Science",
  },
  {
    university_id: "LEC001",
    full_name: "Dr. Nimal Jayasinghe",
    email: "nimal.jayasinghe@ruhuna.lk",
    role: "lecturer",
    department_name: "Department of Computer Science",
    designation: "Senior Lecturer",
    qualifications: "PhD in Computer Science\nMSc in Software Engineering\nBSc Special in Computer Science",
  },
  {
    university_id: "LEC002",
    full_name: "Dr. Tharushi Fernando",
    email: "tharushi.fernando@ruhuna.lk",
    role: "lecturer",
    department_name: "Department of Mathematics",
    designation: "Senior Lecturer",
    qualifications: "PhD in Applied Mathematics\nMPhil in Mathematical Modelling\nBSc Special in Mathematics",
  },
  {
    university_id: "LEC003",
    full_name: "Dr. Kasun Silva",
    email: "kasun.silva@ruhuna.lk",
    role: "lecturer",
    department_name: "Department of Chemistry",
    designation: "Lecturer",
    qualifications: "PhD in Analytical Chemistry\nBSc Special in Chemistry",
  },
  {
    university_id: "LEC004",
    full_name: "Dr. Malsha Weerasinghe",
    email: "malsha.weerasinghe@ruhuna.lk",
    role: "lecturer",
    department_name: "Department of Zoology",
    designation: "Senior Lecturer",
    qualifications: "PhD in Zoology\nMSc in Biodiversity Conservation\nBSc Special in Zoology",
  },
  {
    university_id: "LEC005",
    full_name: "Dr. Sandeepani Dias",
    email: "sandeepani.dias@ruhuna.lk",
    role: "lecturer",
    department_name: "Department of Botany",
    designation: "Lecturer",
    qualifications: "PhD in Plant Sciences\nBSc Special in Botany",
  },
  {
    university_id: "LEC006",
    full_name: "Dr. Ruwan Bandara",
    email: "ruwan.bandara@ruhuna.lk",
    role: "lecturer",
    department_name: "Department of Physics",
    designation: "Senior Lecturer",
    qualifications: "PhD in Physics\nMSc in Materials Science\nBSc Special in Physics",
  },
];

const generatedStudents = [
  "Department of Computer Science",
  "Department of Mathematics",
  "Department of Chemistry",
  "Department of Zoology",
  "Department of Botany",
  "Department of Physics",
].flatMap((departmentName, departmentIndex) =>
  Array.from({ length: 5 }, (_, index) => {
    const number = departmentIndex * 5 + index + 2;
    const padded = String(number).padStart(3, "0");
    const firstNames = ["Nethmi", "Kavindu", "Isuri", "Dinuka", "Thilini"];
    const lastNames = ["Fernando", "Silva", "Perera", "Jayawardena", "Bandara"];
    return {
      university_id: `SCI2026${padded}`,
      full_name: `${firstNames[index]} ${lastNames[departmentIndex % lastNames.length]}`,
      email: `sci2026${padded}@student.ruhuna.lk`,
      role: "student",
      department_name: departmentName,
    };
  })
);

const additionalHods = [
  {
    university_id: "HOD003",
    full_name: "Dr. Menaka Amarasinghe",
    email: "hod.chemistry@ruhuna.lk",
    role: "hod",
    department_name: "Department of Chemistry",
  },
  {
    university_id: "HOD004",
    full_name: "Dr. Ranjith Ekanayake",
    email: "hod.zoology@ruhuna.lk",
    role: "hod",
    department_name: "Department of Zoology",
  },
  {
    university_id: "HOD006",
    full_name: "Dr. Lakmal Samarasinghe",
    email: "hod.physics@ruhuna.lk",
    role: "hod",
    department_name: "Department of Physics",
  },
];

const additionalLecturers = [
  ["LEC007", "Dr. Inoka Liyanage", "inoka.liyanage@ruhuna.lk", "Department of Computer Science", "Lecturer", "PhD in Data Science\nMSc in Artificial Intelligence\nBSc Special in Computer Science"],
  ["LEC008", "Dr. Dinesh Karunaratne", "dinesh.karunaratne@ruhuna.lk", "Department of Mathematics", "Lecturer", "PhD in Pure Mathematics\nBSc Special in Mathematics"],
  ["LEC009", "Dr. Himashi Nanayakkara", "himashi.nanayakkara@ruhuna.lk", "Department of Chemistry", "Senior Lecturer", "PhD in Organic Chemistry\nBSc Special in Chemistry"],
  ["LEC010", "Dr. Pubudu Herath", "pubudu.herath@ruhuna.lk", "Department of Zoology", "Lecturer", "PhD in Ecology\nBSc Special in Zoology"],
  ["LEC011", "Dr. Nadeesha Kulathunga", "nadeesha.kulathunga@ruhuna.lk", "Department of Botany", "Senior Lecturer", "PhD in Plant Biotechnology\nBSc Special in Botany"],
  ["LEC012", "Dr. Viraj Abeysekara", "viraj.abeysekara@ruhuna.lk", "Department of Physics", "Lecturer", "PhD in Electronics\nBSc Special in Physics"],
].map(([university_id, full_name, email, department_name, designation, qualifications]) => ({
  university_id,
  full_name,
  email,
  role: "lecturer",
  department_name,
  designation,
  qualifications,
}));

const seedUsers = [...baseSeedUsers, ...generatedStudents, ...additionalHods, ...additionalLecturers];

const seedCourses = [
  {
    course_code: "BOT1122",
    course_name: "Plant Diversity and Evolution",
    department_name: "Department of Botany",
    lecturer_email: "sandeepani.dias@ruhuna.lk",
    semester_name: "Semester 1",
    academic_year: "2025/2026",
  },
  {
    course_code: "CHE1122",
    course_name: "General and Inorganic Chemistry",
    department_name: "Department of Chemistry",
    lecturer_email: "kasun.silva@ruhuna.lk",
    semester_name: "Semester 1",
    academic_year: "2025/2026",
  },
  {
    course_code: "CSC1122",
    course_name: "Programming Fundamentals",
    department_name: "Department of Computer Science",
    lecturer_email: "nimal.jayasinghe@ruhuna.lk",
    semester_name: "Semester 1",
    academic_year: "2025/2026",
  },
  {
    course_code: "MAT1122",
    course_name: "Calculus and Linear Algebra",
    department_name: "Department of Mathematics",
    lecturer_email: "tharushi.fernando@ruhuna.lk",
    semester_name: "Semester 1",
    academic_year: "2025/2026",
  },
  {
    course_code: "PHY1122",
    course_name: "Mechanics and Waves",
    department_name: "Department of Physics",
    lecturer_email: "ruwan.bandara@ruhuna.lk",
    semester_name: "Semester 1",
    academic_year: "2025/2026",
  },
  {
    course_code: "ZOO1122",
    course_name: "Animal Form and Function",
    department_name: "Department of Zoology",
    lecturer_email: "malsha.weerasinghe@ruhuna.lk",
    semester_name: "Semester 1",
    academic_year: "2025/2026",
  },
  {
    course_code: "CSC1222",
    course_name: "Data Structures and Algorithms",
    department_name: "Department of Computer Science",
    lecturer_email: "nimal.jayasinghe@ruhuna.lk",
    semester_name: "Semester 2",
    academic_year: "2025/2026",
  },
  {
    course_code: "MAT1222",
    course_name: "Probability and Statistics",
    department_name: "Department of Mathematics",
    lecturer_email: "tharushi.fernando@ruhuna.lk",
    semester_name: "Semester 2",
    academic_year: "2025/2026",
  },
  {
    course_code: "CSC2122",
    course_name: "Database Systems",
    department_name: "Department of Computer Science",
    lecturer_email: "inoka.liyanage@ruhuna.lk",
    semester_name: "Semester 1",
    academic_year: "2025/2026",
  },
  {
    course_code: "MAT2122",
    course_name: "Real Analysis",
    department_name: "Department of Mathematics",
    lecturer_email: "dinesh.karunaratne@ruhuna.lk",
    semester_name: "Semester 1",
    academic_year: "2025/2026",
  },
  {
    course_code: "CHE2122",
    course_name: "Organic Reaction Mechanisms",
    department_name: "Department of Chemistry",
    lecturer_email: "himashi.nanayakkara@ruhuna.lk",
    semester_name: "Semester 1",
    academic_year: "2025/2026",
  },
  {
    course_code: "ZOO2122",
    course_name: "Ecology and Conservation",
    department_name: "Department of Zoology",
    lecturer_email: "pubudu.herath@ruhuna.lk",
    semester_name: "Semester 1",
    academic_year: "2025/2026",
  },
  {
    course_code: "BOT2122",
    course_name: "Plant Biotechnology",
    department_name: "Department of Botany",
    lecturer_email: "nadeesha.kulathunga@ruhuna.lk",
    semester_name: "Semester 1",
    academic_year: "2025/2026",
  },
  {
    course_code: "PHY2122",
    course_name: "Electronics and Instrumentation",
    department_name: "Department of Physics",
    lecturer_email: "viraj.abeysekara@ruhuna.lk",
    semester_name: "Semester 1",
    academic_year: "2025/2026",
  },
];

const getDepartmentId = async (departmentName) => {
  const [departments] = await query("SELECT id FROM departments WHERE department_name = ? LIMIT 1", [departmentName]);
  return departments[0]?.id || null;
};

const getSemesterId = async (semesterName, academicYear) => {
  const [semesters] = await query(
    "SELECT id FROM semesters WHERE semester_name = ? AND academic_year = ? LIMIT 1",
    [semesterName, academicYear]
  );
  return semesters[0]?.id || null;
};

const getUserIdByEmail = async (email) => {
  const [users] = await query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  return users[0]?.id || null;
};

const getUserIdByUniversityId = async (universityId) => {
  const [users] = await query("SELECT id FROM users WHERE university_id = ? LIMIT 1", [universityId]);
  return users[0]?.id || null;
};

const seedDemoUsersAndCourses = async () => {
  const hashedPassword = await bcrypt.hash(demoPassword, 10);

  for (const user of seedUsers) {
    const departmentId = await getDepartmentId(user.department_name);
    if (!departmentId) {
      continue;
    }

    await query(
      `INSERT INTO users (university_id, full_name, email, password, role, status, department_id, first_login, must_change_password)
       VALUES (?, ?, ?, ?, ?, 'approved', ?, 1, 1)
       ON DUPLICATE KEY UPDATE
         university_id = COALESCE(university_id, VALUES(university_id)),
         full_name = VALUES(full_name),
         password = VALUES(password),
         role = VALUES(role),
         status = 'approved',
         department_id = VALUES(department_id),
         first_login = 1,
         must_change_password = 1`,
      [user.university_id, user.full_name, user.email, hashedPassword, user.role, departmentId]
    );

    if (user.role === "lecturer") {
      const userId = await getUserIdByEmail(user.email);
      await query(
        `INSERT INTO lecturer_profiles (user_id, designation, qualifications)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           designation = COALESCE(NULLIF(designation, ''), VALUES(designation)),
           qualifications = COALESCE(NULLIF(qualifications, ''), VALUES(qualifications))`,
        [userId, user.designation, user.qualifications]
      );
    }
  }

  for (const course of seedCourses) {
    const departmentId = await getDepartmentId(course.department_name);
    const semesterId = await getSemesterId(course.semester_name, course.academic_year);
    const lecturerId = await getUserIdByEmail(course.lecturer_email);

    if (!departmentId || !semesterId || !lecturerId) {
      continue;
    }

    await query(
      `INSERT INTO courses (course_code, course_name, department_id, lecturer_id, semester_id)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         course_name = VALUES(course_name),
         department_id = VALUES(department_id),
         lecturer_id = VALUES(lecturer_id),
         semester_id = VALUES(semester_id)`,
      [course.course_code, course.course_name, departmentId, lecturerId, semesterId]
    );

    const [courses] = await query("SELECT id FROM courses WHERE course_code = ? LIMIT 1", [course.course_code]);
    const courseId = courses[0]?.id;

    if (courseId) {
      await query(
        `INSERT IGNORE INTO lecturer_modules (lecturer_id, course_id, semester_id, academic_year)
         VALUES (?, ?, ?, ?)`,
        [lecturerId, courseId, semesterId, course.academic_year]
      );
    }
  }
};

const seedDemoEvaluationSubmissions = async () => {
  const [questionsByType] = await query(
    `SELECT id, type, display_order
     FROM questions
     WHERE is_active = 1 AND type IN ('theory', 'practical')
     ORDER BY type ASC, display_order ASC`
  );

  const questions = {
    theory: questionsByType.filter((question) => question.type === "theory").slice(0, 10),
    practical: questionsByType.filter((question) => question.type === "practical").slice(0, 10),
  };

  if (questions.theory.length !== 10 || questions.practical.length !== 10) return;

  const [courses] = await query(
    `SELECT c.id AS courseId, c.course_code AS courseCode, c.lecturer_id AS lecturerId,
            c.department_id AS departmentId, s.id AS semesterId, s.academic_year AS academicYear
     FROM courses c
     INNER JOIN semesters s ON c.semester_id = s.id
     WHERE c.lecturer_id IS NOT NULL
     ORDER BY c.course_code ASC
     LIMIT 14`
  );

  for (const course of courses) {
    const [students] = await query(
      `SELECT id
       FROM users
       WHERE role = 'student'
         AND status = 'approved'
         AND deleted_at IS NULL
         AND department_id = ?
       ORDER BY university_id ASC
       LIMIT 4`,
      [course.departmentId]
    );

    for (const [studentIndex, student] of students.entries()) {
      for (const type of ["theory", "practical"]) {
        const grade = Math.max(3, Math.min(5, 5 - ((studentIndex + (type === "practical" ? 0 : 1)) % 3)));
        const [existing] = await query(
          `SELECT id
           FROM evaluation_submissions
           WHERE student_id = ? AND lecturer_id = ? AND course_id = ? AND semester_id = ? AND academic_year = ? AND type = ?
           LIMIT 1`,
          [student.id, course.lecturerId, course.courseId, course.semesterId, course.academicYear, type]
        );

        let submissionId = existing[0]?.id;
        if (!submissionId) {
          const [result] = await query(
            `INSERT INTO evaluation_submissions
             (student_id, lecturer_id, course_id, semester_id, academic_year, type, overall_grade, comment_text)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              student.id,
              course.lecturerId,
              course.courseId,
              course.semesterId,
              course.academicYear,
              type,
              grade,
              `Demo ${type} evaluation for ${course.courseCode}.`,
            ]
          );
          submissionId = result.insertId;
        }

        const [responseCount] = await query(
          "SELECT COUNT(*) AS count FROM evaluation_responses WHERE submission_id = ?",
          [submissionId]
        );
        if (Number(responseCount[0]?.count || 0) > 0) continue;

        for (const question of questions[type]) {
          const score = Math.max(1, Math.min(5, grade - ((question.display_order + studentIndex) % 2 === 0 ? 0 : 1)));
          await query(
            "INSERT INTO evaluation_responses (submission_id, question_id, score) VALUES (?, ?, ?)",
            [submissionId, question.id, score]
          );
        }
      }
    }
  }
};

const seedDemoNotifications = async () => {
  const demoNotifications = [
    ["ADM001", "Demo System Ready", "The LES demo database has users, modules, evaluation data, and notifications for testing.", "system"],
    ["SCI2026001", "Evaluation Window Open", "You can submit lecturer evaluations for Semester 1 - 2025/2026.", "info"],
    ["LEC005", "Module Assignment", "You have demo module assignments and sample evaluation charts available.", "info"],
    ["HOD005", "Department Analytics Ready", "Sample department evaluation data is available for dashboard testing.", "info"],
    ["DEAN001", "Faculty Analytics Ready", "Sample faculty-wide evaluation data is available for dashboard testing.", "info"],
  ];

  for (const [universityId, title, message, type] of demoNotifications) {
    const userId = await getUserIdByUniversityId(universityId);
    if (!userId) continue;

    await query(
      `INSERT INTO notifications (user_id, title, message, type, related_entity_type)
       SELECT ?, ?, ?, ?, 'demo_seed'
       WHERE NOT EXISTS (
         SELECT 1 FROM notifications
         WHERE user_id = ? AND title = ? AND related_entity_type = 'demo_seed'
         LIMIT 1
       )`,
      [userId, title, message, type, userId, title]
    );
  }
};

const backfillMissingUniversityIds = async () => {
  const prefixes = {
    student: "SCI2026",
    lecturer: "LEC",
    hod: "HOD",
    dean: "DEAN",
    admin: "ADM",
  };

  const [users] = await query(
    "SELECT id, role FROM users WHERE university_id IS NULL OR university_id = '' ORDER BY id ASC"
  );

  const counters = { student: 900, lecturer: 900, hod: 900, dean: 900, admin: 900 };

  for (const user of users) {
    const prefix = prefixes[user.role] || "UOR";
    counters[user.role] = (counters[user.role] || 900) + 1;
    const universityId = user.role === "student"
      ? `${prefix}${String(counters[user.role]).padStart(3, "0")}`
      : `${prefix}${String(counters[user.role]).padStart(3, "0")}`;
    await query("UPDATE users SET university_id = ? WHERE id = ?", [universityId, user.id]);
  }
};

export const initializeDatabase = async () => {
  for (const statement of createTables) {
    await query(statement);
  }

  await migrateExistingTables();
  await createIndexes();

  for (const [department_name, faculty_name] of seedDepartments) {
    await query(
      "INSERT IGNORE INTO departments (department_name, faculty_name) VALUES (?, ?)",
      [department_name, faculty_name]
    );
  }

  for (const [semester_name, academic_year, is_active] of seedSemesters) {
    await query(
      `INSERT INTO semesters (semester_name, academic_year, is_active)
       SELECT ?, ?, ?
       WHERE NOT EXISTS (
         SELECT 1 FROM semesters WHERE semester_name = ? AND academic_year = ? LIMIT 1
       )`,
      [semester_name, academic_year, is_active, semester_name, academic_year]
    );
  }

  await normalizeSemesters();

  for (const [type, label, question_text, display_order] of questionSeeds) {
    await query(
      `INSERT INTO questions (type, label, question_text, category, display_order, is_active)
       SELECT ?, ?, ?, ?, ?, 1
       WHERE NOT EXISTS (
         SELECT 1 FROM questions WHERE type = ? AND label = ? LIMIT 1
       )`,
      [type, label, question_text, type, display_order, type, label]
    );
  }

  const [existingAdmin] = await query("SELECT id, university_id FROM users WHERE email = ? LIMIT 1", [defaultAdmin.email]);
  if (existingAdmin.length === 0) {
    const hashedPassword = await bcrypt.hash(defaultAdmin.password, 10);
    await query(
      "INSERT INTO users (university_id, full_name, email, password, role, status, department_id, first_login, must_change_password) VALUES (?, ?, ?, ?, 'admin', 'approved', ?, 0, 0)",
      [defaultAdmin.university_id, defaultAdmin.full_name, defaultAdmin.email, hashedPassword, defaultAdmin.department_id]
    );
  } else {
    const hashedPassword = await bcrypt.hash(defaultAdmin.password, 10);
    await query(
      `UPDATE users
       SET university_id = COALESCE(university_id, ?),
           password = ?,
           first_login = 0,
           must_change_password = 0
       WHERE email = ?`,
      [defaultAdmin.university_id, hashedPassword, defaultAdmin.email]
    );
  }

  await seedDemoUsersAndCourses();
  await backfillMissingUniversityIds();
  await seedDemoEvaluationSubmissions();
  await seedDemoNotifications();
};
