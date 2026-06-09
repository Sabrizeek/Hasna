import { query } from "../config/db.js";

const allowedTypes = new Set(["info", "success", "warning", "error", "system"]);

const normalizeType = (type) => (allowedTypes.has(type) ? type : "info");

export const notifyUser = async ({
  userId,
  title,
  message,
  type = "info",
  relatedEntityType = null,
  relatedEntityId = null,
}) => {
  if (!userId || !title || !message) return null;

  const [result] = await query(
    `INSERT INTO notifications
       (user_id, title, message, type, related_entity_type, related_entity_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, title, message, normalizeType(type), relatedEntityType, relatedEntityId]
  );
  return result.insertId;
};

export const notifyUsers = async (userIds, payload) => {
  const uniqueIds = [...new Set(userIds.map(Number).filter(Boolean))];
  for (const userId of uniqueIds) {
    await notifyUser({ ...payload, userId });
  }
  return uniqueIds.length;
};

export const notifyRole = async (role, payload) => {
  const [users] = await query(
    "SELECT id FROM users WHERE role = ? AND status = 'approved' AND deleted_at IS NULL",
    [role]
  );
  return notifyUsers(users.map((user) => user.id), payload);
};

export const notifyAllUsers = async (payload) => {
  const [users] = await query(
    "SELECT id FROM users WHERE status = 'approved' AND deleted_at IS NULL"
  );
  return notifyUsers(users.map((user) => user.id), payload);
};

export const notifyAdmins = async (payload) => notifyRole("admin", payload);
