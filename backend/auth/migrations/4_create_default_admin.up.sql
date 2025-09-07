-- Create a default admin user
-- Email: admin@example.com
-- Password: password123
INSERT INTO users (email, password_hash, is_admin, first_name, language) VALUES (
  'admin@example.com',
  '$2b$10$9xR.nC2n2mJ/K.l3m4n5o.u/wXyZ.aBcDeFgHiJkLmNoPqRsTuVw.', -- Correct hashed password for "password123"
  TRUE,
  'Admin',
  'es'
);
