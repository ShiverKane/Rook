# Setup (Local Dev)

## Yêu cầu

- Windows
- Python 3.12 (khuyến nghị). Tránh Python 3.14 vì một số dependency có thể không có wheel phù hợp.
- (Tuỳ chọn) Docker Desktop nếu muốn chạy Postgres bằng `docker compose`.

## Chạy nhanh (SQLite mặc định)

1) Cài dependencies (tại thư mục project):

```bash
py -3.12 -m pip install -r requirements.txt
```

2) Chạy backend (tại `backend/`):

```bash
cd backend
py -3.12 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

3) Mở frontend:

- http://localhost:8000/ui/

Ghi chú:
- Nếu không set `DATABASE_URL` thì backend sẽ dùng SQLite ở `backend/app.db` và tự tạo bảng khi chạy.

## Chạy với Postgres (Docker)

1) Bật Docker Desktop.
2) Tại thư mục project:

```bash
docker compose up --build
```

3) Mở frontend:

- http://localhost:8000/ui/

## Supabase (Tuỳ chọn)

Nếu muốn FE gọi Supabase REST (thay vì local backend), set 2 biến môi trường cho backend để endpoint `/config` trả về cấu hình:

- `ROOK_SUPABASE_REST_URL`
- `ROOK_SUPABASE_ANON_KEY`

Sau đó reload lại trang FE.

