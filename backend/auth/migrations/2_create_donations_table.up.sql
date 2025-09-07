CREATE TABLE donations (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_provider VARCHAR(20) NOT NULL,
  payment_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_donations_user_id ON donations(user_id);
CREATE INDEX idx_donations_amount ON donations(amount);
CREATE INDEX idx_donations_created_at ON donations(created_at);
