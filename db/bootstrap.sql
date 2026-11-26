-- ResearchBridge: database bootstrap.
-- Run ONCE as a MySQL administrator (root):
--     mysql -u root -p < db/bootstrap.sql
--
-- It creates the application database and a dedicated least-privilege user.
-- The schema itself lives in schema.sql and is loaded separately by the app user.

CREATE DATABASE IF NOT EXISTS research_bridge
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

-- Local-development placeholder password. Use a real secret for any shared or
-- hosted database and keep it only in backend/.env (which is never committed).
CREATE USER IF NOT EXISTS 'rb_app'@'localhost' IDENTIFIED BY 'rb_local_dev';

-- Data access for the running application.
GRANT SELECT, INSERT, UPDATE, DELETE ON research_bridge.* TO 'rb_app'@'localhost';

-- Schema management, so the app user can load schema.sql in development.
GRANT CREATE, ALTER, INDEX, DROP, REFERENCES ON research_bridge.* TO 'rb_app'@'localhost';

FLUSH PRIVILEGES;
