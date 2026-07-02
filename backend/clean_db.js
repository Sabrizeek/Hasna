import { query } from './config/db.js';

async function cleanDuplicates() {
  try {
    const [duplicates] = await query(`
      SELECT evaluator_id, evaluated_id, semester_id, COUNT(*) as count 
      FROM peer_evaluation_assignments 
      GROUP BY evaluator_id, evaluated_id, semester_id 
      HAVING count > 1
    `);
    
    for (const dup of duplicates) {
      console.log(`Found ${dup.count} duplicates for Evaluator ${dup.evaluator_id} -> Evaluated ${dup.evaluated_id}`);
      
      const [rows] = await query(`
        SELECT id FROM peer_evaluation_assignments 
        WHERE evaluator_id = ? AND evaluated_id = ? AND semester_id = ?
        ORDER BY id ASC
      `, [dup.evaluator_id, dup.evaluated_id, dup.semester_id]);
      
      const idsToDelete = rows.slice(1).map(r => r.id);
      
      for (const id of idsToDelete) {
        await query(`DELETE FROM peer_evaluation_assignments WHERE id = ?`, [id]);
      }
      console.log(`Deleted duplicate IDs: ${idsToDelete.join(', ')}`);
    }
    
    console.log("Cleanup complete!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

cleanDuplicates();
