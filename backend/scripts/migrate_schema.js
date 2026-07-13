import { query } from '../config/db.js';

async function migrate() {
  console.log("Starting schema migration...");
  
  try {
    // 1. Add module_selection_deadline to semesters
    await query(`
      ALTER TABLE semesters 
      ADD COLUMN module_selection_deadline DATETIME DEFAULT NULL
    `);
    console.log("Added module_selection_deadline to semesters.");
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log("module_selection_deadline already exists.");
    else console.error("Error altering semesters:", e.message);
  }

  try {
    // 2. Add is_core to courses
    await query(`
      ALTER TABLE courses 
      ADD COLUMN is_core BOOLEAN DEFAULT 1
    `);
    console.log("Added is_core to courses.");
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log("is_core already exists.");
    else console.error("Error altering courses:", e.message);
  }

  try {
    // 3. Create student_departments
    await query(`
      CREATE TABLE IF NOT EXISTS student_departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        department_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
        UNIQUE KEY unique_student_dept (student_id, department_id)
      )
    `);
    console.log("Created student_departments table.");
  } catch (e) {
    console.error("Error creating student_departments:", e.message);
  }

  process.exit(0);
}

migrate();
