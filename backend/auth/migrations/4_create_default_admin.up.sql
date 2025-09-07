-- Create a default admin user
-- Email: admin@example.com
-- Password: password123
INSERT INTO users (email, password_hash, is_admin, first_name, language) VALUES (
  'admin@example.com',
  '$2a$10$gqR2h3v5k6L7m8N9o0P1qu.KjLgIhGfEdDcBaCb9876543210AbCd', -- Hashed password for "password123"
  TRUE,
  'Admin',
  'es'
);
