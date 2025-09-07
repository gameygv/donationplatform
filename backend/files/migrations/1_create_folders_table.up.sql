CREATE TABLE folders (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  min_donation_amount DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default folders
INSERT INTO folders (id, name, description, min_donation_amount) VALUES 
(1, 'General', 'General content available to all donors', 0),
(2, 'Premium', 'Premium content for donors of $100+', 100);
