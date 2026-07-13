import xlsx from 'xlsx';
import { query } from '../config/db.js';

async function seed() {
  console.log("Starting DB seeding from LES_Modules.xlsx...");
  
  const workbook = xlsx.readFile('LES_Modules.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: null });

  console.log(`Parsed ${data.length} rows.`);

  // 1. Fill down merged cells (Department, Year, Semester)
  let currentDept = null;
  let currentYear = null;
  let currentSem = null;

  const coursesToInsert = [];

  for (const row of data) {
    if (row['Department']) currentDept = row['Department'];
    if (row['Year']) currentYear = row['Year'];
    if (row['Semester']) currentSem = row['Semester'];

    if (!row['Course Code'] || !row['Course Name']) continue;

    const courseCode = String(row['Course Code']).trim();
    
    // Parse Year and Semester from course code if they are missing or if we want to rely on course code
    // The user said: 1st number is year, 2nd number is semester.
    const yearMatch = courseCode.match(/[A-Z]+(\d)(\d)/i);
    let parsedYear = currentYear;
    let parsedSem = currentSem;
    
    if (yearMatch) {
      parsedYear = `Year ${yearMatch[1]}`;
      parsedSem = `Semester ${yearMatch[2]}`;
    }

    coursesToInsert.push({
      department: currentDept?.trim() || "Unknown Department",
      year: parsedYear,
      semester: parsedSem,
      courseCode: courseCode,
      courseName: String(row['Course Name']).trim(),
      isCore: 1 // Default to core for seeded modules
    });
  }

  console.log(`Found ${coursesToInsert.length} valid courses to insert.`);

  // 2. Insert Departments (IGNORE duplicates)
  const uniqueDepts = [...new Set(coursesToInsert.map(c => c.department))];
  
  for (const dept of uniqueDepts) {
    try {
      await query("INSERT IGNORE INTO departments (department_name, faculty_name) VALUES (?, ?)", [dept, "Faculty of Science"]);
    } catch (e) {
      console.error(`Error inserting department ${dept}:`, e.message);
    }
  }

  // Get department map
  const [deptRows] = await query("SELECT id, department_name FROM departments");
  const deptMap = {};
  for (const d of deptRows) {
    deptMap[d.department_name] = d.id;
  }

  // 3. Prepare generic semesters (Semester 1 and Semester 2) for the courses
  let sem1Id, sem2Id;
  const [sems] = await query("SELECT id, semester_name FROM semesters");
  const sem1 = sems.find(s => s.semester_name.toLowerCase().includes('semester 1'));
  const sem2 = sems.find(s => s.semester_name.toLowerCase().includes('semester 2'));

  if (sem1) sem1Id = sem1.id;
  else {
    const [res] = await query("INSERT INTO semesters (semester_name, academic_year, is_active) VALUES ('Semester 1', 'Generic', 0)");
    sem1Id = res.insertId;
  }

  if (sem2) sem2Id = sem2.id;
  else {
    const [res] = await query("INSERT INTO semesters (semester_name, academic_year, is_active) VALUES ('Semester 2', 'Generic', 0)");
    sem2Id = res.insertId;
  }

  // 4. Delete old courses (this might fail if foreign keys restrict it, so let's delete relationships first)
  console.log("Cleaning up old courses...");
  await query("DELETE FROM student_courses");
  await query("DELETE FROM lecturer_modules");
  await query("DELETE FROM evaluation_responses");
  await query("DELETE FROM evaluation_submissions");
  await query("DELETE FROM courses");

  // 5. Insert new courses
  let insertedCourses = 0;
  for (const c of coursesToInsert) {
    const deptId = deptMap[c.department];
    if (!deptId) continue;

    // Use Semester 1 or Semester 2 based on parsed text
    const semId = c.semester?.toLowerCase().includes('2') ? sem2Id : sem1Id;

    try {
      await query(
        "INSERT INTO courses (course_code, course_name, department_id, semester_id, is_core) VALUES (?, ?, ?, ?, ?)",
        [c.courseCode, c.courseName, deptId, semId, c.isCore]
      );
      insertedCourses++;
    } catch (e) {
      console.error(`Error inserting course ${c.courseCode}:`, e.message);
    }
  }

  console.log(`Successfully inserted ${insertedCourses} courses.`);
  process.exit(0);
}

seed();
