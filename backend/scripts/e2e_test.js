import { query } from '../config/db.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const generateToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
};

async function createStudent(fullName, universityId, deptNames) {
  // 1. Get dept IDs
  const placeholders = deptNames.map(() => '?').join(',');
  const [depts] = await query(`SELECT id FROM departments WHERE department_name IN (${placeholders})`, deptNames);
  
  if (depts.length === 0) throw new Error(`Departments not found: ${deptNames}`);

  // 2. Insert User
  const [result] = await query(
    `INSERT INTO users (university_id, full_name, email, password, role, status)
     VALUES (?, ?, ?, ?, 'student', 'approved')`,
    [universityId, fullName, `${universityId.replace(/\//g, '')}@example.com`, 'hashed_password']
  );
  const studentId = result.insertId;

  // 3. Insert student_departments
  for (const d of depts) {
    await query(`INSERT INTO student_departments (student_id, department_id) VALUES (?, ?)`, [studentId, d.id]);
  }

  return { id: studentId, role: 'student' };
}

async function runTests() {
  console.log("Starting E2E Tests...");
  
  try {
    // Check active semester
    const [sems] = await query("SELECT * FROM semesters WHERE is_active = 1 LIMIT 1");
    if (!sems.length) {
      console.log("No active semester. Activating one...");
      await query("UPDATE semesters SET is_active = 1, module_selection_deadline = DATE_ADD(NOW(), INTERVAL 7 DAY) WHERE id = (SELECT id FROM semesters ORDER BY id DESC LIMIT 1)");
    }
    const [activeSem] = await query("SELECT * FROM semesters WHERE is_active = 1 LIMIT 1");
    console.log(`Active Semester: ${activeSem[0].semester_name} - ${activeSem[0].academic_year}`);

    // Create a Year 1 student (assuming academic year is 2023/2024, Year 1 = 2023)
    // Wait, academic_year is "Generic" in our seed right now. 
    // Let's check academic_year string in DB.
    let academicStart = parseInt(activeSem[0].academic_year.substring(0, 4), 10);
    if (isNaN(academicStart)) academicStart = new Date().getFullYear();

    const year1Id = `SC/${academicStart}/0001`;
    const year2Id = `SC/${academicStart - 1}/0002`;

    console.log(`Creating students: ${year1Id}, ${year2Id}`);
    
    // Cleanup prev
    await query(`DELETE FROM users WHERE university_id IN (?, ?)`, [year1Id, year2Id]);

    // Pick a department for testing
    const [allDepts] = await query("SELECT department_name FROM departments WHERE department_name IN ('Department of Botany', 'Department of Physics')");
    if (allDepts.length < 2) throw new Error("Not enough departments.");
    
    const dept1 = allDepts[0].department_name;
    const dept2 = allDepts[1].department_name;

    const student1 = await createStudent("Year 1 Student", year1Id, [dept1]);
    const student2 = await createStudent("Year 2 Student", year2Id, [dept1, dept2]);

    console.log("Students created. Generating tokens...");
    const token1 = generateToken(student1);
    const token2 = generateToken(student2);

    const fetchApi = async (url, token, options = {}) => {
      const res = await fetch(`http://localhost:5000/api${url}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed');
      return { data };
    };

    // Test Eligible Modules for Student 1
    console.log("Fetching eligible modules for Student 1 (Year 1)...");
    const res1 = await fetchApi('/student/eligible-modules', token1);
    console.log(`Student 1 Current Year inferred: ${res1.data.currentYear}`);
    console.log(`Student 1 found ${res1.data.courses.length} courses.`);
    
    // Save selections for Student 1
    const s1CourseIds = res1.data.courses.map(c => c.id).slice(0, 3);
    console.log(`Saving ${s1CourseIds.length} courses for Student 1...`);
    await fetchApi('/student/module-selections', token1, {
      method: 'POST',
      body: JSON.stringify({ courseIds: s1CourseIds })
    });

    // Test Eligible Modules for Student 2
    console.log("Fetching eligible modules for Student 2 (Year 2, 2 depts)...");
    const res2 = await fetchApi('/student/eligible-modules', token2);
    console.log(`Student 2 Current Year inferred: ${res2.data.currentYear}`);
    console.log(`Student 2 found ${res2.data.courses.length} courses.`);

    // Check Evaluation Hub for Student 1
    console.log("Checking Evaluation Hub for Student 1...");
    // Need to assign a lecturer to one of the selected courses to test this.
    if (s1CourseIds.length > 0) {
      const courseIdToTest = s1CourseIds[0];
      
      // create a mock lecturer
      await query("DELETE FROM users WHERE email = 'testlec@example.com'");
      const [lecRes] = await query(
        `INSERT INTO users (full_name, email, password, role, status) VALUES ('Test Lec', 'testlec@example.com', 'pwd', 'lecturer', 'approved')`
      );
      const lecId = lecRes.insertId;

      await query("DELETE FROM lecturer_modules WHERE course_id = ? AND lecturer_id = ?", [courseIdToTest, lecId]);
      await query(
        `INSERT INTO lecturer_modules (lecturer_id, course_id, semester_id, academic_year, type) VALUES (?, ?, ?, ?, 'both')`,
        [lecId, courseIdToTest, activeSem[0].id, activeSem[0].academic_year]
      );

      const evalRes = await fetchApi('/student/evaluation-lecturers', token1);
      console.log(`Student 1 Evaluation Lecturers count: ${evalRes.data.lecturers.length}`);
      if (evalRes.data.lecturers.length > 0) {
         console.log(`Found lecturer: ${evalRes.data.lecturers[0].lecturer_name} for course code: ${evalRes.data.lecturers[0].course_code}`);
      }
    }

    console.log("E2E Test Script Finished.");
  } catch (err) {
    console.error("Test failed:", err.message);
  }
  process.exit(0);
}

runTests();
