CREATE DATABASE IF NOT EXISTS lecturer_evaluation;
USE lecturer_evaluation;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS evaluations;
DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS semesters;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS departments;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_name VARCHAR(150) NOT NULL UNIQUE,
  faculty_name VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE users (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_users_role_status ON users(role, status);
CREATE INDEX idx_users_department_id ON users(department_id);

CREATE TABLE semesters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  semester_name VARCHAR(100) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE courses (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_courses_department_id ON courses(department_id);
CREATE INDEX idx_courses_lecturer_id ON courses(lecturer_id);
CREATE INDEX idx_courses_semester_id ON courses(semester_id);

CREATE TABLE announcements (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_announcements_target_role ON announcements(target_role);
CREATE INDEX idx_announcements_department_id ON announcements(department_id);

CREATE TABLE evaluations (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_evaluations_student_id ON evaluations(student_id);
CREATE INDEX idx_evaluations_lecturer_id ON evaluations(lecturer_id);
CREATE INDEX idx_evaluations_course_id ON evaluations(course_id);
CREATE INDEX idx_evaluations_semester_id ON evaluations(semester_id);

CREATE TABLE questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_text TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  evaluation_id INT NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comments_evaluation FOREIGN KEY (evaluation_id) REFERENCES evaluations(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_comments_evaluation_id ON comments(evaluation_id);

CREATE TABLE reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_title VARCHAR(200) NOT NULL,
  report_type VARCHAR(100) NOT NULL,
  generated_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reports_generated_by FOREIGN KEY (generated_by) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_reports_generated_by ON reports(generated_by);

INSERT INTO departments (department_name, faculty_name) VALUES
('Department of Computer Science', 'Faculty of Science'),
('Department of Mathematics', 'Faculty of Science'),
('Department of Chemistry', 'Faculty of Science'),
('Department of Physics', 'Faculty of Science'),
('Department of Botany', 'Faculty of Science'),
('Department of Zoology', 'Faculty of Science');

INSERT INTO semesters (semester_name, academic_year, is_active) VALUES
('Semester 1', '2025/2026', 1),
('Semester 2', '2025/2026', 0);

-- Create the admin account with: node scripts/seedAdmin.js
