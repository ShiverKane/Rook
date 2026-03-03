-- First, clean existing data if needed (be careful with this in production)
-- TRUNCATE users, categories, books, listings, messages RESTART IDENTITY CASCADE;

-- 1. INSERT 20 REGULAR USERS (non-admin)
DO $$
DECLARE
  uid BIGINT;
BEGIN
  -- 1. Nguyen Van An
  SELECT rook_create_account('Nguyen Van An', 'an.nguyen@email.com', 'password123', 'user') INTO uid;
  UPDATE users SET phone = '0901234567', status = 'active', created_at = '2026-01-15 10:30:00+07' WHERE id = uid;

  -- 2. Tran Thi Binh
  SELECT rook_create_account('Tran Thi Binh', 'binh.tran@email.com', 'password123', 'user') INTO uid;
  UPDATE users SET phone = '0902345678', status = 'active', created_at = '2026-01-20 14:20:00+07' WHERE id = uid;

  -- 3. Le Van Cuong
  SELECT rook_create_account('Le Van Cuong', 'cuong.le@email.com', 'password123', 'user') INTO uid;
  UPDATE users SET phone = '0903456789', status = 'active', created_at = '2026-01-25 09:15:00+07' WHERE id = uid;

  -- 4. Pham Thi Dung
  SELECT rook_create_account('Pham Thi Dung', 'dung.pham@email.com', 'password123', 'user') INTO uid;
  UPDATE users SET phone = '0904567890', status = 'active', created_at = '2026-02-01 11:45:00+07' WHERE id = uid;

  -- 5. Hoang Van Em
  SELECT rook_create_account('Hoang Van Em', 'em.hoang@email.com', 'password123', 'user') INTO uid;
  UPDATE users SET phone = '0905678901', status = 'active', created_at = '2026-02-03 16:30:00+07' WHERE id = uid;

  -- 6. Nguyen Thi Phuong
  SELECT rook_create_account('Nguyen Thi Phuong', 'phuong.nguyen@email.com', 'password123', 'user') INTO uid;
  UPDATE users SET phone = '0906789012', status = 'active', created_at = '2026-02-05 08:20:00+07' WHERE id = uid;

  -- 7. Tran Van Giang
  SELECT rook_create_account('Tran Van Giang', 'giang.tran@email.com', 'password123', 'user') INTO uid;
  UPDATE users SET phone = '0907890123', status = 'active', created_at = '2026-02-07 13:40:00+07' WHERE id = uid;

  -- 8. Le Thi Huong
  SELECT rook_create_account('Le Thi Huong', 'huong.le@email.com', 'password123', 'user') INTO uid;
  UPDATE users SET phone = '0908901234', status = 'active', created_at = '2026-02-09 10:10:00+07' WHERE id = uid;

  -- 9. Pham Van Hung
  SELECT rook_create_account('Pham Van Hung', 'hung.pham@email.com', 'password123', 'user') INTO uid;
  UPDATE users SET phone = '0909012345', status = 'active', created_at = '2026-02-12 15:50:00+07' WHERE id = uid;

  -- 10. Hoang Thi Kim
  SELECT rook_create_account('Hoang Thi Kim', 'kim.hoang@email.com', 'password123', 'user') INTO uid;
  UPDATE users SET phone = '0910123456', status = 'inactive', created_at = '2026-02-14 09:30:00+07' WHERE id = uid;

  -- 11. Nguyen Van Long
  SELECT rook_create_account('Nguyen Van Long', 'long.nguyen@email.com', 'password123', 'user') INTO uid;
  UPDATE users SET phone = '0911234567', status = 'active', created_at = '2026-02-16 14:15:00+07' WHERE id = uid;

  -- 12. Tran Thi Mai
  SELECT rook_create_account('Tran Thi Mai', 'mai.tran@email.com', 'password123', 'user') INTO uid;
  UPDATE users SET phone = '0912345678', status = 'active', created_at = '2026-02-18 11:20:00+07' WHERE id = uid;

  -- 13. Le Van Nam
  SELECT rook_create_account('Le Van Nam', 'nam.le@email.com', 'password123', 'user') INTO uid;
  UPDATE users SET phone = '0913456789', status = 'banned', created_at = '2026-02-20 10:45:00+07' WHERE id = uid;

  -- 14. Pham Thi Oanh
  SELECT rook_create_account('Pham Thi Oanh', 'oanh.pham@email.com', 'password123', 'user') INTO uid;
  UPDATE users SET phone = '0914567890', status = 'active', created_at = '2026-02-21 16:30:00+07' WHERE id = uid;

  -- 15. Hoang Van Phuoc
  SELECT rook_create_account('Hoang Van Phuoc', 'phuoc.hoang@email.com', 'password123', 'user') INTO uid;
  UPDATE users SET phone = '0915678901', status = 'active', created_at = '2026-02-23 08:55:00+07' WHERE id = uid;

  -- 16. Nguyen Thi Quynh
  SELECT rook_create_account('Nguyen Thi Quynh', 'quynh.nguyen@email.com', 'password123', 'user') INTO uid;
  UPDATE users SET phone = '0916789012', status = 'active', created_at = '2026-02-24 13:25:00+07' WHERE id = uid;

  -- 17. Tran Van Sang
  SELECT rook_create_account('Tran Van Sang', 'sang.tran@email.com', 'password123', 'user') INTO uid;
  UPDATE users SET phone = '0917890123', status = 'active', created_at = '2026-02-25 15:40:00+07' WHERE id = uid;

  -- 18. Le Thi Trang
  SELECT rook_create_account('Le Thi Trang', 'trang.le@email.com', 'password123', 'user') INTO uid;
  UPDATE users SET phone = '0918901234', status = 'active', created_at = '2026-02-26 09:10:00+07' WHERE id = uid;

  -- 19. Pham Van Uyen
  SELECT rook_create_account('Pham Van Uyen', 'uyen.pham@email.com', 'password123', 'user') INTO uid;
  UPDATE users SET phone = '0919012345', status = 'active', created_at = '2026-02-27 14:50:00+07' WHERE id = uid;

  -- 20. Hoang Thi Van
  SELECT rook_create_account('Hoang Thi Van', 'van.hoang@email.com', 'password123', 'user') INTO uid;
  UPDATE users SET phone = '0920123456', status = 'active', created_at = '2026-02-28 11:35:00+07' WHERE id = uid;
END $$;

-- 2. INSERT 12 CATEGORIES
INSERT INTO categories (name, description) VALUES
  ('Văn học Việt Nam', 'Sách văn học, tiểu thuyết, truyện ngắn của tác giả Việt Nam'),
  ('Văn học nước ngoài', 'Tác phẩm văn học dịch từ các nước trên thế giới'),
  ('Kinh tế - Kinh doanh', 'Sách về quản trị, khởi nghiệp, đầu tư, tài chính'),
  ('Kỹ năng sống', 'Sách phát triển bản thân, kỹ năng mềm'),
  ('Khoa học - Công nghệ', 'Sách về khoa học, công nghệ thông tin, AI'),
  ('Tâm lý học', 'Sách về tâm lý, hành vi con người'),
  ('Lịch sử', 'Sách về lịch sử thế giới và Việt Nam'),
  ('Văn hóa - Xã hội', 'Nghiên cứu văn hóa, xã hội học'),
  ('Thiếu nhi', 'Sách, truyện tranh cho trẻ em'),
  ('Giáo khoa - Tham khảo', 'Sách giáo khoa, sách bài tập, tham khảo'),
  ('Ngoại ngữ', 'Sách học tiếng Anh, tiếng Trung, tiếng Nhật'),
  ('Nấu ăn - Ẩm thực', 'Sách dạy nấu ăn, công thức, văn hóa ẩm thực');

-- 3. INSERT 36 BOOKS
INSERT INTO books (title, author, category_id, language, isbn, description) VALUES
  -- Văn học Việt Nam (1)
  ('Tắt Đèn', 'Ngô Tất Tố', 1, 'vi', '9786041234561', 'Tiểu thuyết kinh điển về người nông dân Việt Nam trước Cách mạng'),
  ('Số Đỏ', 'Vũ Trọng Phụng', 1, 'vi', '9786041234562', 'Tác phẩm trào phúng nổi tiếng của văn học Việt Nam'),
  ('Nhật ký Đặng Thùy Trâm', 'Đặng Thùy Trâm', 1, 'vi', '9786041234563', 'Nhật ký thời chiến của nữ bác sĩ'),
  
  -- Văn học nước ngoài (2)
  ('Nhà Giả Kim', 'Paulo Coelho', 2, 'vi', '9786041234564', 'Tiểu thuyết nổi tiếng về hành trình tìm kiếm giấc mơ'),
  ('Trăm Năm Cô Đơn', 'Gabriel García Márquez', 2, 'vi', '9786041234565', 'Kiệt tác của văn học hiện thực huyền ảo'),
  ('1984', 'George Orwell', 2, 'vi', '9786041234566', 'Tiểu thuyết phản địa đàng kinh điển'),
  
  -- Kinh tế - Kinh doanh (3)
  ('Cha Giàu Cha Nghèo', 'Robert Kiyosaki', 3, 'vi', '9786041234567', 'Sách dạy về tư duy tài chính'),
  ('Tư Duy Nhanh Và Chậm', 'Daniel Kahneman', 3, 'vi', '9786041234568', 'Tâm lý học trong ra quyết định kinh tế'),
  ('Khởi Nghiệp Tinh Gọn', 'Eric Ries', 3, 'vi', '9786041234569', 'Phương pháp khởi nghiệp hiện đại'),
  
  -- Kỹ năng sống (4)
  ('Đắc Nhân Tâm', 'Dale Carnegie', 4, 'vi', '9786041234570', 'Nghệ thuật ứng xử và giao tiếp'),
  ('7 Thói Quen Hiệu Quả', 'Stephen Covey', 4, 'vi', '9786041234571', 'Phát triển bản thân toàn diện'),
  ('Tuổi Trẻ Đáng Giá Bao Nhiêu', 'Rosie Nguyễn', 4, 'vi', '9786041234572', 'Bài học về tuổi trẻ và cuộc sống'),
  
  -- Khoa học - Công nghệ (5)
  ('Lược Sử Thời Gian', 'Stephen Hawking', 5, 'vi', '9786041234573', 'Khám phá vũ trụ và thời gian'),
  ('Homo Deus', 'Yuval Noah Harari', 5, 'vi', '9786041234574', 'Lược sử tương lai của nhân loại'),
  ('Machine Learning Cơ Bản', 'Vũ Hữu Tiệp', 5, 'vi', '9786041234575', 'Giáo trình machine learning tiếng Việt'),
  
  -- Tâm lý học (6)
  ('Tâm Lý Học Tội Phạm', 'Stanton Samenow', 6, 'vi', '9786041234576', 'Nghiên cứu tâm lý tội phạm'),
  ('Ảnh Hưởng', 'Robert Cialdini', 6, 'vi', '9786041234577', 'Tâm lý học thuyết phục'),
  ('Flow - Dòng Chảy', 'Mihaly Csikszentmihalyi', 6, 'vi', '9786041234578', 'Trạng thái tập trung cao độ'),
  
  -- Lịch sử (7)
  ('Lịch Sử Việt Nam Bằng Tranh', 'Trần Bạch Đằng', 7, 'vi', '9786041234579', 'Lịch sử Việt Nam qua hình ảnh'),
  ('Súng, Vi Trùng Và Thép', 'Jared Diamond', 7, 'vi', '9786041234580', 'Lịch sử văn minh nhân loại'),
  ('Chiến Tranh Việt Nam', 'Max Hastings', 7, 'vi', '9786041234581', 'Góc nhìn đa chiều về chiến tranh'),
  
  -- Văn hóa - Xã hội (8)
  ('Cội Nguồn', 'Nguyễn Văn Huyên', 8, 'vi', '9786041234582', 'Văn hóa truyền thống Việt Nam'),
  ('Xã Hội Việt Nam', 'Đào Duy Anh', 8, 'vi', '9786041234583', 'Nghiên cứu xã hội học Việt Nam'),
  ('Việt Nam Phong Tục', 'Phan Kế Bính', 8, 'vi', '9786041234999', 'Phong tục tập quán người Việt'),
  
  -- Thiếu nhi (9)
  ('Dế Mèn Phiêu Lưu Ký', 'Tô Hoài', 9, 'vi', '9786041234584', 'Tác phẩm kinh điển cho thiếu nhi'),
  ('Kính Vạn Hoa', 'Nguyễn Nhật Ánh', 9, 'vi', '9786041234585', 'Bộ truyện tuổi học trò'),
  ('Cho Tôi Xin Một Vé Đi Tuổi Thơ', 'Nguyễn Nhật Ánh', 9, 'vi', '9786041234586', 'Ký ức tuổi thơ'),
  
  -- Giáo khoa - Tham khảo (10)
  ('Toán 12 Nâng Cao', 'Đoàn Quỳnh', 10, 'vi', '9786041234587', 'Sách giáo khoa toán lớp 12'),
  ('Vật Lý Đại Cương', 'Lương Duyên Bình', 10, 'vi', '9786041234588', 'Giáo trình vật lý đại học'),
  ('Hóa Học Vô Cơ', 'Nguyễn Đức Vận', 10, 'vi', '9786041234589', 'Giáo trình hóa học nâng cao'),
  
  -- Ngoại ngữ (11)
  ('English Grammar In Use', 'Raymond Murphy', 11, 'en', '9786041234590', 'Ngữ pháp tiếng Anh thực hành'),
  ('IELTS Practice Tests', 'Cambridge', 11, 'en', '9786041234591', 'Bài thi mẫu IELTS'),
  ('Tiếng Nhật Minna No Nihongo', '3A Network', 11, 'ja', '9786041234592', 'Giáo trình tiếng Nhật'),
  
  -- Nấu ăn - Ẩm thực (12)
  ('Món Ngon Việt Nam', 'Triệu Thị Chơi', 12, 'vi', '9786041234593', 'Ẩm thực truyền thống Việt'),
  ('Dạy Nấu Ăn Cao Cấp', 'Auguste Escoffier', 12, 'vi', '9786041234594', 'Kỹ thuật nấu ăn chuyên nghiệp'),
  ('Bếp Chay Dưỡng Tâm', 'Hoàng Trà My', 12, 'vi', '9786041234595', 'Công thức món chay');

-- 4. INSERT LISTINGS (with dates over 2026-03-03)
INSERT INTO listings (book_id, seller_id, price, condition, status, sold_at, is_active, created_at) VALUES
  -- Available listings after March 3
  (1, 1, 45000.00, 'Như mới', 'available', NULL, TRUE, '2026-03-04 09:30:00+07'),
  (2, 2, 35000.00, 'Tốt', 'available', NULL, TRUE, '2026-03-05 14:15:00+07'),
  (3, 3, 55000.00, 'Trung bình', 'available', NULL, TRUE, '2026-03-06 11:20:00+07'),
  (4, 4, 65000.00, 'Như mới', 'available', NULL, TRUE, '2026-03-07 16:45:00+07'),
  (5, 5, 70000.00, 'Tốt', 'available', NULL, TRUE, '2026-03-08 10:30:00+07'),
  (6, 6, 40000.00, 'Trung bình', 'available', NULL, TRUE, '2026-03-09 13:50:00+07'),
  (7, 7, 85000.00, 'Như mới', 'available', NULL, TRUE, '2026-03-10 08:15:00+07'),
  (8, 8, 95000.00, 'Tốt', 'available', NULL, TRUE, '2026-03-11 15:40:00+07'),
  (9, 9, 60000.00, 'Trung bình', 'available', NULL, TRUE, '2026-03-12 09:55:00+07'),
  (10, 11, 50000.00, 'Như mới', 'available', NULL, TRUE, '2026-03-13 14:25:00+07'),
  (11, 12, 55000.00, 'Tốt', 'available', NULL, TRUE, '2026-03-14 11:35:00+07'),
  (12, 14, 45000.00, 'Trung bình', 'available', NULL, TRUE, '2026-03-15 16:10:00+07'),
  (13, 15, 120000.00, 'Như mới', 'available', NULL, TRUE, '2026-03-16 10:45:00+07'),
  (14, 2, 110000.00, 'Tốt', 'available', NULL, TRUE, '2026-03-17 13:20:00+07'),
  (15, 17, 150000.00, 'Như mới', 'available', NULL, TRUE, '2026-03-18 09:00:00+07'),
  
  -- Sold listings (with sold_at dates)
  (16, 18, 75000.00, 'Tốt', 'sold', '2026-03-08 17:30:00+07', FALSE, '2026-03-04 15:30:00+07'),
  (17, 19, 80000.00, 'Như mới', 'sold', '2026-03-10 11:20:00+07', FALSE, '2026-03-05 10:15:00+07'),
  (18, 20, 45000.00, 'Trung bình', 'sold', '2026-03-12 14:45:00+07', FALSE, '2026-03-06 08:40:00+07'),
  (19, 1, 90000.00, 'Tốt', 'sold', '2026-03-15 09:30:00+07', FALSE, '2026-03-07 12:25:00+07'),
  (20, 2, 85000.00, 'Như mới', 'sold', '2026-03-18 16:15:00+07', FALSE, '2026-03-08 14:50:00+07'),
  
  -- More available listings
  (21, 3, 65000.00, 'Tốt', 'available', NULL, TRUE, '2026-03-19 11:30:00+07'),
  (22, 4, 40000.00, 'Trung bình', 'available', NULL, TRUE, '2026-03-20 15:45:00+07'),
  (23, 5, 55000.00, 'Như mới', 'available', NULL, TRUE, '2026-03-21 09:10:00+07'),
  (24, 6, 35000.00, 'Tốt', 'available', NULL, TRUE, '2026-03-22 13:25:00+07'),
  (25, 7, 70000.00, 'Như mới', 'available', NULL, TRUE, '2026-03-23 16:40:00+07'),
  (26, 8, 45000.00, 'Trung bình', 'available', NULL, TRUE, '2026-03-24 10:15:00+07'),
  (27, 9, 85000.00, 'Tốt', 'available', NULL, TRUE, '2026-03-25 14:30:00+07'),
  (28, 11, 95000.00, 'Như mới', 'available', NULL, TRUE, '2026-03-26 08:50:00+07'),
  (29, 12, 60000.00, 'Tốt', 'available', NULL, TRUE, '2026-03-27 11:55:00+07'),
  (30, 14, 50000.00, 'Trung bình', 'available', NULL, TRUE, '2026-03-28 15:20:00+07'),
  
  -- Some listings from before March 3 (for variety)
  (31, 15, 75000.00, 'Như mới', 'available', NULL, TRUE, '2026-02-25 10:30:00+07'),
  (32, 2, 80000.00, 'Tốt', 'available', NULL, TRUE, '2026-02-26 14:45:00+07'),
  (33, 17, 55000.00, 'Trung bình', 'sold', '2026-02-28 16:20:00+07', FALSE, '2026-02-20 09:15:00+07'),
  (34, 18, 90000.00, 'Như mới', 'sold', '2026-03-01 11:30:00+07', FALSE, '2026-02-22 13:40:00+07'),
  (35, 19, 65000.00, 'Tốt', 'available', NULL, TRUE, '2026-02-27 08:55:00+07'),
  (36, 20, 70000.00, 'Như mới', 'available', NULL, TRUE, '2026-02-28 12:10:00+07');

-- 5. INSERT SOME MESSAGES (for conversation examples)
INSERT INTO messages (listing_id, sender_id, receiver_id, body, is_read, created_at) VALUES
  -- Messages for listing 1 (book Tắt Đèn)
  (1, 2, 1, 'Sách còn không bạn?', TRUE, '2026-03-05 10:30:00+07'),
  (1, 1, 2, 'Dạ còn ạ, bạn muốn mua không?', TRUE, '2026-03-05 14:20:00+07'),
  (1, 2, 1, 'Mình có thể xem sách trước được không?', FALSE, '2026-03-06 09:15:00+07'),
  
  -- Messages for listing 4 (Nhà Giả Kim)
  (4, 5, 4, 'Sách này bản dịch của ai vậy bạn?', TRUE, '2026-03-08 16:40:00+07'),
  (4, 4, 5, 'Bản dịch của Phạm Hữu Thảo ạ', TRUE, '2026-03-08 17:30:00+07'),
  
  -- Messages for listing 7 (Cha Giàu Cha Nghèo)
  (7, 8, 7, 'Giá còn thương lượng được không?', TRUE, '2026-03-11 11:25:00+07'),
  (7, 7, 8, 'Dạ để mình check lại giá nha', FALSE, '2026-03-11 15:10:00+07'),
  
  -- Messages for sold listing 16
  (16, 19, 18, 'Sách còn không ạ? Mình muốn mua', TRUE, '2026-03-05 09:45:00+07'),
  (16, 18, 19, 'Còn bạn ơi, bạn lấy không?', TRUE, '2026-03-05 13:20:00+07'),
  (16, 19, 18, 'Ok bạn, cho mình xin địa chỉ', TRUE, '2026-03-06 10:30:00+07'),
  (16, 18, 19, 'Dạ 123 Nguyễn Trãi, Quận 1', FALSE, '2026-03-06 14:15:00+07');

-- Update listing_count for users based on their listings
UPDATE users u SET listing_count = (
  SELECT COUNT(*) FROM listings l WHERE l.seller_id = u.id
);