# KindnessSchool — Báo cáo Tổng quan Sản phẩm

> Ngày lập: 2026-05-26 · Phiên bản 1.0

---

## 1. Concept & Ý tưởng cốt lõi

### Bối cảnh & Vấn đề

Học sinh cần một kênh lành mạnh để chia sẻ hành động tích cực trong môi trường học đường. Các mạng xã hội phổ thông (Facebook, TikTok) không phù hợp vì:

- Thiếu tính kiểm soát của nhà trường
- Không có cơ chế ghi nhận hành động tốt một cách có hệ thống
- Dễ bị phân tâm bởi nội dung không liên quan

### Giải pháp: Mạng xã hội học đường tích cực có gamification

**KindnessSchool** là nền tảng mạng xã hội nội bộ dành riêng cho học sinh và giáo viên, ứng dụng cơ chế **gamification** (trò chơi hóa) để biến mỗi hành động tốt thành điểm thưởng có thể đo đếm và công khai.

> *"Mỗi hành động tốt đều được ghi nhận — không bị lãng quên."*

### Triết lý thiết kế

| Yếu tố | Quyết định | Lý do |
|--------|-----------|-------|
| Ngôn ngữ | Tiếng Việt 100% | Thân thiện, không rào cản ngôn ngữ |
| Phong cách | Tươi sáng, vui nhộn | Phù hợp tâm lý học sinh THPT |
| Màu chủ đạo | Indigo `#6B6FD8` | Chuyên nghiệp, nhận diện thương hiệu |
| Màu nhấn | Xanh lá `#22C55E` | Tích cực, thân thiện, gợi thiên nhiên |
| Ẩn dụ điểm | Trồng cây 🌱→🌳 | Dễ hiểu, kết nối với học sinh |
| Không dùng UI library | Tự build component | Thiết kế độc bản, không generic |

---

## 2. Hệ thống Kindness Points (KP)

### Cách kiếm điểm

| Hành động | Điểm | Ghi chú |
|-----------|------|---------|
| Đăng ký lần đầu | +20 KP | Chào mừng thành viên mới |
| Đăng bài viết | +10 KP | Khuyến khích chia sẻ nội dung |
| Bình luận | +5 KP | Khuyến khích thảo luận |
| Nhận like trên bài | +2 KP | Được cộng đồng công nhận |

### Cơ cấu điểm — Hệ thống Trồng cây

Điểm được tổ chức theo **chu kỳ 1.000 điểm**, mỗi khi đạt ngưỡng → thu hoạch 1 🌲 "cây trưởng thành":

| Điểm trong chu kỳ | Icon | Danh hiệu |
|-------------------|------|-----------|
| 0 – 49 | 🌰 | Hạt giống |
| 50 – 149 | 🌱 | Mầm non |
| 150 – 319 | 🌿 | Chồi non |
| 320 – 599 | 🪴 | Cây con |
| 600 – 999 | 🌳 | Cây xanh |
| 1.000 (thu hoạch) | 🌲 | Cây trưởng thành |
| ≥ 3 cây thu hoạch | 🌴 | Cây cổ thụ (achievement đặc biệt) |

**Cơ chế kỹ thuật:**
- `totalPoints`: tổng điểm tích lũy suốt đời (không bao giờ giảm trừ vi phạm)
- `cyclePoints`: điểm trong chu kỳ hiện tại (0–999), reset về 0 sau mỗi thu hoạch
- `matureTreeCount`: đếm số cây đã thu hoạch
- Bảng xếp hạng tuần dùng `pointHistory` collection (ghi log mỗi lần cộng điểm)

### Bảng xếp hạng

- **Tổng thể**: sắp xếp theo `totalPoints` (tích lũy toàn thời gian)
- **Theo tuần**: tổng hợp từ `pointHistory` kể từ thứ Hai đầu tuần
- **Theo khối**: lọc học sinh theo khối 6–12
- Real-time: dùng `onSnapshot` — cập nhật ngay khi ai đó kiếm điểm

---

## 3. Chức năng hiện tại — Danh sách đầy đủ

### 3.1 Xác thực & Tài khoản (Auth)

- Đăng ký / đăng nhập email + mật khẩu
- Đăng nhập Google (OAuth 2.0, popup)
- Quên mật khẩu → gửi email reset link
- Onboarding học sinh mới đăng nhập Google lần đầu
- Bảo vệ route — chưa đăng nhập tự redirect về `/login`
- Luồng giáo viên: đăng ký → chờ duyệt (`/pending`) → admin duyệt → vào được ứng dụng

### 3.2 Feed & Bài viết

- Feed hiển thị tất cả bài viết, mới nhất lên đầu, real-time
- Phân trang "Xem thêm" (20 bài/trang, load thêm 10 mỗi lần)
- Đăng bài: text + ảnh/video (Firebase Storage, progress bar upload)
- Chỉnh sửa bài (menu ···, textarea, thay đổi/xoá media, tag "đã chỉnh sửa")
- Xoá bài — tác giả hoặc giáo viên/admin
- Chia sẻ bài — Web Share API (native) hoặc copy link + toast thông báo
- Like/unlike — optimistic update, Firestore transaction đảm bảo chính xác
- Route `/post/:postId` — mở bài trực tiếp từ link chia sẻ

### 3.3 Bình luận

- Xem / đăng bình luận (text), real-time
- Reply 1 cấp — nút "Trả lời", @mention tự điền
- Like/unlike comment — subcollection riêng
- Phân trang bình luận (5/trang, "Xem thêm")
- Xoá bình luận — tác giả hoặc giáo viên/admin
- Rate limiting — cooldown 8 giây giữa các lần gửi, hiển thị đếm ngược

### 3.4 Hồ sơ (Profile)

- Trang cá nhân (`/profile`) và trang người khác (`/profile/:uid`)
- Chỉnh sửa: tên hiển thị, lớp học, ảnh đại diện, ảnh bìa
- Thống kê: tổng điểm KP, xếp hạng chính xác, danh hiệu cây
- Tab "Bài viết" — tất cả bài của user, có thể xoá (nếu là chủ)
- Kindness Progress hiển thị tiến độ chu kỳ hiện tại + số cây đã thu hoạch

### 3.5 Bảng xếp hạng (Leaderboard)

- Top toàn trường, real-time (`onSnapshot` trên 200 user)
- Podium đặc biệt cho top 3 🥇🥈🥉
- Lọc: theo khối lớp (6–12), tìm kiếm theo tên
- Chế độ tuần — tổng hợp điểm từ `pointHistory` kể từ thứ Hai
- Thống kê cộng đồng: tổng học sinh, giáo viên, thành viên, tổng KP
- Biểu đồ cột phân bổ học sinh theo khối

### 3.6 Kho chuyện truyền cảm hứng (Stories)

- Thư viện nội dung do giáo viên/admin đăng — ảnh, video, bài viết
- Lọc theo chủ đề: Lòng tốt, Cộng đồng, Trường học, Môi trường
- Giáo viên: tạo/sửa/xoá story
- Story nổi bật (`isFeatured`) hiển thị trên Hero Carousel trang chủ
- Sample stories tĩnh làm nội dung mặc định khi chưa có nội dung thật

### 3.7 Tìm kiếm

- SearchDropdown trên Navbar — debounce 300ms, hiện top 4 user + top 4 bài
- Trang `/search` đầy đủ:
  - Tab Người dùng: lọc vai trò, tìm theo tên/lớp
  - Tab Bài viết: lọc thời gian (7/30 ngày), sort (mới nhất/nhiều like)
  - Click kết quả → navigate đến profile hoặc bài viết

### 3.8 Thông báo (Notifications)

- Bell icon trên Navbar — badge đếm chưa đọc, real-time
- Dropdown 30 thông báo gần nhất
- Loại thông báo: like bài, bình luận mới
- Click thông báo → nhảy đến bài viết tương ứng
- Đánh dấu đã đọc — từng cái hoặc "Đọc tất cả"

### 3.9 Quản lý thành viên (Members — Giáo viên/Admin)

- Danh sách tất cả học sinh + giáo viên
- Tìm kiếm, lọc theo khối, sort theo điểm/tên/ngày tham gia
- Xử lý vi phạm: xoá toàn bộ bài viết + reset điểm về 0 (có dialog xác nhận)

### 3.10 Admin Panel

- Danh sách giáo viên chờ duyệt
- Duyệt: role `pending_teacher` → `teacher`, batch-update `authorRole` trong toàn bộ bài viết
- Từ chối: role → `rejected`

### 3.11 Hạ tầng & DevOps

- Firebase Hosting — CDN toàn cầu, HTTPS tự động
- GitHub Actions CI/CD — push master → build → deploy tự động (không thao tác thủ công)
- Firestore Security Rules — phân quyền chi tiết theo role và field
- Storage Security Rules — chỉ owner ghi vào path của mình
- ErrorBoundary — bắt lỗi React toàn cục, không crash trắng trang

---

## 4. Kiến trúc kỹ thuật

### Tech Stack

| Tầng | Công nghệ | Ghi chú |
|------|-----------|---------|
| Frontend | React 19 + Vite 6 | Phiên bản mới nhất (2025) |
| State | Zustand 5 | Nhẹ, không boilerplate |
| Routing | React Router v7 | SPA với protected routes |
| DB | Firebase Firestore | NoSQL real-time, serverless |
| Auth | Firebase Auth | Email/pass + Google OAuth |
| Storage | Firebase Storage (Blaze) | ảnh + video, CDN HTTPS |
| Deploy | Firebase Hosting | + GitHub Actions CI/CD |
| Styling | CSS Modules thuần | Không dùng Tailwind/Bootstrap |

### Các collection Firestore

| Collection | Vai trò |
|------------|---------|
| `users` | Hồ sơ, điểm, role |
| `posts` + `posts/likes` | Bài viết + like |
| `comments` + `comments/likes` | Bình luận + like comment |
| `stories` | Nội dung kho chuyện |
| `notifications/{uid}/items` | Thông báo theo user |
| `pointHistory` | Log điểm để tính rank tuần |

### Số liệu codebase

| Hạng mục | Số lượng |
|----------|---------|
| Feature pages | 11 trang |
| UI components tự xây | 13+ component |
| Services (Firebase) | 9 service |
| Zustand stores | 3 store |
| Controllers (business logic) | 5 controller |
| Firebase collections | 6 collection |
| Lines of code (ước tính) | ~7.000–9.000 LOC |

---

## 5. Đánh giá chất lượng sản phẩm

### Điểm mạnh

| Tiêu chí | Đánh giá |
|----------|---------|
| Tính năng cốt lõi | Đầy đủ và hoạt động ổn định |
| Real-time UX | Tốt — dùng `onSnapshot` xuyên suốt |
| Dữ liệu nhất quán | Tốt — Firestore transaction cho like/điểm |
| Mobile-first | Đạt — thiết kế từ 375px |
| Phân quyền | Chặt chẽ — 5 role, rule kiểm soát từng field |
| CI/CD | Hoàn chỉnh — deploy tự động 0 thao tác thủ công |
| Scroll animations | Có — `IntersectionObserver`, không dùng thư viện nặng |
| Optimistic UI | Có — like/unlike phản hồi tức thì |

### Giới hạn hiện tại (biết trước, chấp nhận được)

| Giới hạn | Mức độ ảnh hưởng | Giải pháp tương lai |
|----------|----------------|-------------------|
| Chưa xác thực email khi đăng ký | Trung bình | Firebase email verification (1 ngày) |
| Điểm cộng phía client | Thấp | Cloud Functions (khi quy mô lớn) |
| Search client-side (không full-text) | Thấp | Algolia hoặc Firestore text index |
| Huy hiệu còn placeholder | Thấp | Tính toán từ `pointHistory` |
| Không có push notification | Thấp | Firebase Cloud Messaging |

---

## 6. Lộ trình nâng cấp

Những hạng mục cần hoàn thiện để đưa sản phẩm lên cấp độ tiếp theo:

| Nâng cấp | Thời gian ước tính | Tác động |
|----------|--------------------|---------|
| Email verification khi đăng ký | 1 ngày | Bảo mật, an tâm cho trường |
| Điểm thưởng qua Cloud Functions | 3–5 ngày | Chống gian lận DevTools |
| Huy hiệu tính từ data thật | 2–3 ngày | Feature hoàn chỉnh |
| Full-text search (Algolia free tier) | 2–3 ngày | UX tốt hơn, tìm kiếm thật |
| Push notification (FCM) | 3–5 ngày | Tăng engagement |
| Lịch sử điểm từ `pointHistory` | 1–2 ngày | Profile đầy đủ |
| Giới hạn đăng ký theo email domain trường | 1 ngày | Kiểm soát người dùng |

---

*Báo cáo lập bởi: Claude Sonnet 4.6 dựa trên audit toàn bộ codebase ngày 2026-05-26*
