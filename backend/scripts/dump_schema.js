import mysql from 'mysql2/promise';

async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Root@12345',
    database: 'lecturer_evaluation'
  });
  
  const tables = [
    'users',
    'evaluation_submissions',
    'evaluation_responses',
    'evaluation_windows',
    'semesters',
    'courses',
    'student_courses',
    'lecturer_modules',
    'questions',
    'peer_evaluation_assignments',
    'lecturer_award_scores'
  ];
  
  for (const table of tables) {
    try {
      const [rows] = await conn.query(`SHOW CREATE TABLE ${table}`);
      console.log(rows[0]['Create Table']);
      console.log('---');
    } catch (e) {
      console.error('Error on table', table, e.message);
    }
  }
  await conn.end();
}
run().catch(console.error);
