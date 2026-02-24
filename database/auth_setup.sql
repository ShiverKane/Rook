CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hàm hash mật khẩu với bcrypt (pgcrypto)
CREATE OR REPLACE FUNCTION rook_hash_password(p_password TEXT)
RETURNS TEXT
LANGUAGE SQL
AS $$
  SELECT crypt(p_password, gen_salt('bf'));
$$;

-- Hàm tạo tài khoản (upsert theo email), trả về id user
CREATE OR REPLACE FUNCTION rook_create_account(
  p_name TEXT,
  p_email TEXT,
  p_plain_password TEXT,
  p_role TEXT DEFAULT 'user'
)
RETURNS BIGINT
LANGUAGE SQL
AS $$
  INSERT INTO users (name, email, hashed_password, role)
  VALUES (p_name, p_email, rook_hash_password(p_plain_password), p_role)
  ON CONFLICT (email) DO UPDATE
  SET name = EXCLUDED.name,
      hashed_password = EXCLUDED.hashed_password,
      role = EXCLUDED.role
  RETURNING id;
$$;

-- Hàm đổi mật khẩu theo email, trả về true nếu có bản ghi được cập nhật
CREATE OR REPLACE FUNCTION rook_change_password(
  p_email TEXT,
  p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE users
  SET hashed_password = rook_hash_password(p_new_password)
  WHERE email = p_email;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;

-- Seed tài khoản mặc định
SELECT rook_create_account('Jack', 'jack@example.com', 'jack789', 'user');

SELECT rook_create_account('Jane', 'jane@example.com', 'jaiden23', 'user');

SELECT rook_create_account('Admin', 'admin@example.com', 'admin123', 'admin');

-- Tài khoản sử dụng được:
-- - jack / jack789 (role: user)
-- - jane / jaiden23 (role: user)
-- - admin / admin123 (role: admin)
--
-- LƯU Ý:
-- - Tất cả passwords đã được hash với bcrypt
-- - API Python sẽ tự động verify được vì đều dùng bcrypt
-- - Để tạo user mới, dùng function:
--     SELECT rook_create_account('Ten', 'email@example.com', 'mat_khau', 'user');
