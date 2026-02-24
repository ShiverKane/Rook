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
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_active ON listings (is_active);
CREATE INDEX IF NOT EXISTS idx_listings_book_id ON listings (book_id);
CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON listings (seller_id);

-- Messages: hội thoại giữa người mua và người bán theo từng listing.
CREATE TABLE IF NOT EXISTS messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id BIGINT REFERENCES listings(id) ON DELETE CASCADE,
  sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sender_receiver CHECK (sender_id <> receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread ON messages (receiver_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_listing_created ON messages (listing_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_id);
