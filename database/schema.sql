-- Users: lưu thông tin người dùng (admin|user). 1-n listings, 1-n messages (sender/receiver).
CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) NOT NULL UNIQUE,
  hashed_password TEXT NOT NULL,
  phone VARCHAR(32) UNIQUE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active',
  listing_count INT DEFAULT 0,
  CONSTRAINT ck_users_role CHECK (role IN ('admin','user')),
  CONSTRAINT ck_users_status CHECK (status IN ('active','inactive','banned'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);

-- Categories: danh mục sách. 1-n books.
CREATE TABLE IF NOT EXISTS categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT
);

CREATE INDEX IF NOT EXISTS idx_categories_name ON categories (name);

-- Books: thông tin sách; thuộc một danh mục (có thể NULL); có trường language. 1-n listings.
CREATE TABLE IF NOT EXISTS books (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  language VARCHAR(16) NOT NULL DEFAULT 'und',
  isbn VARCHAR(32) UNIQUE,
  description TEXT
);

CREATE INDEX IF NOT EXISTS idx_books_title ON books (title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books (author);
CREATE INDEX IF NOT EXISTS idx_books_category_id ON books (category_id);

-- Listings: tin đăng bán sách. FK book_id->books, seller_id->users. 1-n messages.
CREATE TABLE IF NOT EXISTS listings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  book_id BIGINT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  seller_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL,
  condition VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  sold_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_listings_status CHECK (status IN ('available', 'sold'))
);

CREATE INDEX IF NOT EXISTS idx_listings_active ON listings (is_active);
CREATE INDEX IF NOT EXISTS idx_listings_book_id ON listings (book_id);
CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON listings (seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings (status);

-- Messages: hội thoại giữa người mua và người bán theo từng listing.
CREATE TABLE IF NOT EXISTS messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id BIGINT REFERENCES listings(id) ON DELETE CASCADE,
  sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- Removed CONSTRAINT chk_sender_receiver to use trigger instead as requested
);

CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread ON messages (receiver_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_listing_created ON messages (listing_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_id);

-- TRIGGERS

-- 1. Tự động set ngày tạo bài đăng (Auto set listing created_at)
CREATE OR REPLACE FUNCTION set_listing_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_listing_created_at ON listings;
CREATE TRIGGER trg_set_listing_created_at
BEFORE INSERT ON listings
FOR EACH ROW
EXECUTE FUNCTION set_listing_created_at();

-- 2. Không cho đăng bài nếu user bị khóa (Prevent banned users from posting)
CREATE OR REPLACE FUNCTION check_banned_user_listing()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE id = NEW.seller_id AND status = 'banned') THEN
    RAISE EXCEPTION 'User is banned and cannot create listings';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_banned_user_listing ON listings;
CREATE TRIGGER trg_check_banned_user_listing
BEFORE INSERT ON listings
FOR EACH ROW
EXECUTE FUNCTION check_banned_user_listing();

-- 3. Không cho giá <= 0 (Prevent price <= 0)
CREATE OR REPLACE FUNCTION validate_listing_price()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.price <= 0 THEN
    RAISE EXCEPTION 'Price must be greater than 0';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_listing_price ON listings;
CREATE TRIGGER trg_validate_listing_price
BEFORE INSERT OR UPDATE ON listings
FOR EACH ROW
EXECUTE FUNCTION validate_listing_price();

-- 4. Khi bài đăng chuyển sang SOLD → lưu thời gian bán (Track sold time)
CREATE OR REPLACE FUNCTION track_listing_sold_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'sold' AND (OLD.status IS DISTINCT FROM 'sold') THEN
    NEW.sold_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_track_listing_sold_time ON listings;
CREATE TRIGGER trg_track_listing_sold_time
BEFORE UPDATE ON listings
FOR EACH ROW
EXECUTE FUNCTION track_listing_sold_time();

-- 5. Tự động tăng số bài đăng của user (Increment user listing count)
CREATE OR REPLACE FUNCTION increment_user_listing_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET listing_count = listing_count + 1 WHERE id = NEW.seller_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_increment_user_listing_count ON listings;
CREATE TRIGGER trg_increment_user_listing_count
AFTER INSERT ON listings
FOR EACH ROW
EXECUTE FUNCTION increment_user_listing_count();

-- 6. Giảm số bài khi xóa bài (Decrement user listing count)
CREATE OR REPLACE FUNCTION decrement_user_listing_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET listing_count = listing_count - 1 WHERE id = OLD.seller_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_decrement_user_listing_count ON listings;
CREATE TRIGGER trg_decrement_user_listing_count
AFTER DELETE ON listings
FOR EACH ROW
EXECUTE FUNCTION decrement_user_listing_count();

-- 7. Không cho user tự nhắn tin cho chính mình (Block self-messages)
CREATE OR REPLACE FUNCTION block_self_messages()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sender_id = NEW.receiver_id THEN
    RAISE EXCEPTION 'Users cannot send messages to themselves';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_self_messages ON messages;
CREATE TRIGGER trg_block_self_messages
BEFORE INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION block_self_messages();
