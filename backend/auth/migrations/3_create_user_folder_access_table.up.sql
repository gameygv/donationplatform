CREATE TABLE user_folder_access (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id BIGINT NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_user_folder_access_unique ON user_folder_access(user_id, folder_id);
