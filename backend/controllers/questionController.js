import { query } from "../config/db.js";

export const getQuestions = async (req, res) => {
  try {
    const type = req.query.type?.trim();

    if (!["theory", "practical"].includes(type)) {
      return res.status(400).json({ message: "Question type must be theory or practical." });
    }

    const [questions] = await query(
      `SELECT id, type, label, question_text, display_order
       FROM questions
       WHERE type = ? AND is_active = 1
       ORDER BY display_order ASC, id ASC`,
      [type]
    );

    res.json({ questions });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch questions.", error: error.message });
  }
};
