import { query } from './config/db.js';

async function diagnose() {
  // The HoD user in screenshot is: Dr. Pradeep Wijesinghe, Department of Mathematics
  const [hodUser] = await query("SELECT id, department_id, full_name FROM users WHERE email='hod.mathematics@ruhuna.lk' LIMIT 1");
  console.log('Math HoD:', hodUser[0]);
  
  // Check what semesters exist and if semesterId 37 works
  const [sems] = await query('SELECT id, semester_name, academic_year, is_active FROM semesters ORDER BY id');
  console.log('All semesters:', sems);
  
  // Test with semesterId=3 (Semester 2, 2025/2026) - what HoD sees in screenshot
  const departmentId = hodUser[0].department_id;
  const filters = { semesterId: 3 }; // Semester 2 - 2025/2026
  
  console.log('\n--- Testing getDepartmentOverview with semesterId=3 ---');
  try {
    const evalConditions = ['u.department_id = ?'];
    const evalParams = [departmentId];
    if (filters.semesterId) {
      evalConditions.push('es.semester_id = ?');
      evalParams.push(filters.semesterId);
    }
    
    const [evaluationRows] = await query(
      `SELECT COUNT(es.id) AS totalEvaluations,
              ROUND(AVG(
                COALESCE(es.overall_grade, 0) * 0.50 +
                COALESCE(las.peer_evaluation_score, 0) * 0.20 +
                COALESCE(las.mentoring_score, 0) * 0.15 +
                COALESCE(las.supervision_score, 0) * 0.10 +
                COALESCE(las.other_score, 0) * 0.05
              ), 1) AS averageScore
       FROM evaluation_submissions es
       INNER JOIN users u ON es.lecturer_id = u.id
       LEFT JOIN lecturer_award_scores las ON las.lecturer_id = u.id AND las.semester_id = ?
       WHERE ${evalConditions.join(' AND ')}`,
      [filters.semesterId, ...evalParams]
    );
    console.log('KPI query OK:', evaluationRows[0]);
  } catch(e) {
    console.error('KPI query FAILED:', e.message);
  }
  
  // Check that users.status ENUM doesn't have 'inactive' - confirm deactivateUser will throw
  console.log('\n--- Status ENUM check ---');
  const [statusCol] = await query("SHOW COLUMNS FROM users WHERE Field = 'status'");
  console.log('users.status:', statusCol[0].Type);
  const hasInactive = statusCol[0].Type.includes('inactive');
  console.log('Has inactive:', hasInactive);
  if (!hasInactive) {
    console.log('BUG: deactivateUser sets status=inactive but ENUM only allows pending/approved/rejected!');
    console.log('This means deactivateUser query will silently set status=empty or throw!');
  }
  
  // Test what happens when status='inactive' is inserted
  try {
    await query("UPDATE users SET status='inactive' WHERE id=999999");
    console.log('UPDATE with inactive: no error');
  } catch(e) {
    console.error('UPDATE with inactive THROWS:', e.message);
  }
  
  // Check for .gitignore issues - what the friend's machine will be missing
  console.log('\n--- Cross-machine issues ---');
  const fs = await import('fs');
  const path = await import('path');
  
  // 1. No .gitignore means node_modules and .env could be in git
  // OR uploads/ folder could be missing on friend's machine if it's gitignored
  console.log('.gitignore exists:', fs.existsSync('.gitignore'));
  
  // 2. Check if backups/les-database.sql exists (friend needs this for db:import)
  console.log('backups/les-database.sql exists:', fs.existsSync('./backups/les-database.sql'));
  
  // 3. Check if multer disk storage destination exists at server start
  console.log('uploads/ dir exists at cwd:', fs.existsSync('./uploads'));
  
  // Check if uploads directories exist
  const uploadDirs = ['./uploads/supervision-reports', './uploads/peer-evaluations', './uploads/profile-photos'];
  for (const dir of uploadDirs) {
    console.log(dir, 'exists:', fs.existsSync(dir));
  }
  
  // 4. Check if .env exists (could have been committed by mistake)
  console.log('.env exists in backend:', fs.existsSync('.env'));
  console.log('.env exists in frontend:', fs.existsSync('../frontend/.env'));
  
  // 5. Check what happens on a fresh DB (no peer_evaluation_score column)
  // Simulating: old DB without peer_evaluation_score column in lecturer_award_scores
  console.log('\n--- Simulating old DB (peer_evaluation_score missing) ---');
  console.log('If peer_evaluation_score is missing from lecturer_award_scores on friends machine:');
  console.log('  - getLecturerAwardScores query will FAIL with "Unknown column"');
  console.log('  - getDepartmentOverview will FAIL with "Unknown column"');
  console.log('  - All Award Scores and HoD overview requests will return 500 errors');
  console.log('  This matches screenshots: "Failed to fetch lecturer award scores" and "Failed to fetch HoD department overview"');
  
  // Check the old SQL schema - does it have peer_evaluation_score?
  const oldSchema = fs.readFileSync('./database/lecturer_evaluation.sql', 'utf-8');
  const hasOldLectAwardScores = oldSchema.includes('lecturer_award_scores');
  const hasOldPeerEvalScore = oldSchema.includes('peer_evaluation_score');
  console.log('\nOld schema (lecturer_evaluation.sql) has lecturer_award_scores table:', hasOldLectAwardScores);
  console.log('Old schema has peer_evaluation_score column:', hasOldPeerEvalScore);
  
  // Check if peer_evaluation_uploads, peer_evaluation_assignments in old schema
  const hasOldPeerTables = oldSchema.includes('peer_evaluation_assignments');
  console.log('Old schema has peer evaluation tables:', hasOldPeerTables);
  
  process.exit(0);
}

diagnose().catch(e => { console.error('Error:', e.message); process.exit(1); });
