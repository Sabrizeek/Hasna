import { query } from "../config/db.js";

export const logAudit = async ({
  userId = null,
  action,
  entityType,
  entityId = null,
  details = null,
}) => {
  if (!action || !entityType) {
    return;
  }

  const serializedDetails = details ? JSON.stringify(details) : null;

  await query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, action, entityType, entityId, serializedDetails]
  );
};
