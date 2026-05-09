# Cấu trúc project Next.js QLBH Nội Thất Tính Tuyết

## Files cần tạo:
1. .env.local - biến môi trường
2. lib/nocodb.ts - kết nối NocoDB API
3. lib/auth.ts - xác thực JWT
4. middleware.ts - bảo vệ routes
5. app/layout.tsx - layout chính
6. app/globals.css - CSS global
7. app/page.tsx - redirect về dashboard
8. app/login/page.tsx - màn hình đăng nhập
9. app/dashboard/layout.tsx - layout dashboard
10. app/dashboard/page.tsx - trang tổng quan
11. components/Sidebar.tsx - menu sidebar
12. components/StatCard.tsx - card thống kê
13. components/OrderTable.tsx - bảng đơn hàng
14. components/AlertBadge.tsx - badge cảnh báo
