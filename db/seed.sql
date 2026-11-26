-- Seed data: a default local user that owns collections and notes.
INSERT INTO users (username) VALUES ('demo')
ON DUPLICATE KEY UPDATE username = username;
