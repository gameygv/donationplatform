-- Create a default admin user
-- Email: admin@example.com
-- Password: password123
INSERT INTO users (email, password_hash, is_admin, first_name, language) VALUES (
  'admin@example.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- Correct hashed password for "password123"
  TRUE,
  'Admin',
  'es'
);
