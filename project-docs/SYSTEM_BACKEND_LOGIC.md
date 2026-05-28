# KindnessSchool — Nguyên lý Vận hành Hệ thống

> Tài liệu này mô tả logic backend đã triển khai: cách dữ liệu chảy qua hệ thống, cách điểm thưởng được ghi nhận và bảo vệ, cách nội dung được kiểm duyệt, và cách dữ liệu người dùng được an toàn.

---

## Mục lục

1. [Nguyên tắc vận hành hệ thống](#1-nguyên-tắc-vận-hành-hệ-thống)
2. [Cơ chế ghi nhận và xác thực hành vi](#2-cơ-chế-ghi-nhận-và-xác-thực-hành-vi)
3. [Cơ chế khuyến khích và lan tỏa tích cực](#3-cơ-chế-khuyến-khích-và-lan-tỏa-tích-cực)
4. [Kiểm duyệt và bảo vệ dữ liệu người dùng](#4-kiểm-duyệt-và-bảo-vệ-dữ-liệu-người-dùng)

---

## 1. Nguyên tắc vận hành hệ thống

### 1.1 Kiến trúc tổng thể

KindnessSchool theo mô hình **MVC phía client** kết hợp **Firebase serverless backend**.  
Không có server Node.js riêng — mọi logic đều chạy trong trình duyệt, Firebase đóng vai trò cơ sở dữ liệu, xác thực, và lưu trữ file.

```
┌──────────────────────────────────────────────────────────────────┐
│                        TRÌNH DUYỆT (React)                       │
│                                                                  │
│  View (JSX)  ──►  Controller (hook)  ──►  Service  ──►  Firebase │
│      ▲                                      SDK                  │
│      │                                       │                   │
│  Zustand Store  ◄────────────────────────────┘                   │
│  (global state)            onSnapshot / promise                  │
└──────────────────────────────────────────────────────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
         Firestore           Firebase Auth      Firebase Storage
        (dữ liệu)           (xác thực)          (ảnh / video)
```

### 1.2 Luồng dữ liệu chuẩn

```
User tương tác (click, submit)
        │
        ▼
  Controller hook  ←── Zustand store (đọc user/profile)
  (useXxxController)
        │
        ▼
  Service function   (src/services/*.service.js)
        │
        ▼
  Firebase SDK call  (Firestore / Storage)
        │
        ▼
  onSnapshot callback HOẶC Promise resolve
        │
        ▼
  Zustand store.set(...)
        │
        ▼
  React re-render ──► UI cập nhật
```

Ví dụ cụ thể — luồng đăng bài:

```
[PostComposer] user nhấn "Đăng"
      │
      ▼
useFeedController.handleCreatePost(content, file)
      │
      ├─ uploadPostMedia(uid, file)  →  Firebase Storage
      │     └─ trả về { url, mediaType }
      │
      ├─ createPost(uid, profile, content, mediaUrl, mediaType)
      │     └─ addDoc(db, 'posts', payload)  →  Firestore
      │     └─ addPoints(uid, 10, 'post', postId)  [non-blocking]
      │
      ├─ usePostStore.prependPost(...)   [optimistic UI]
      └─ usePointStore.push(...)         [toast notification]
```

### 1.3 Khởi tạo Firebase — một lần duy nhất

```js
// src/services/firebase.js
const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

Tất cả service import `{ auth, db, storage }` từ file này — đảm bảo chỉ có **một instance duy nhất** trong toàn bộ ứng dụng.

### 1.4 Quản lý trạng thái xác thực (Auth State)

`useAuthStore` (Zustand) lưu trạng thái đăng nhập toàn cục:

```js
// src/store/useAuthStore.js
const useAuthStore = create((set) => ({
  user: null, // Firebase Auth user object
  profile: null, // Firestore users/{uid} document
  loading: true, // true khi đang kiểm tra session
  needsOnboarding: false,
  // ...setters
}));
```

Listener `onAuthStateChanged` trong `App.jsx` đồng bộ tự động:

```
App mount
  │
  ▼
subscribeToAuth(callback)
  │
  ├─ user != null  →  setUser(user)
  │                   subscribeToUserProfile(uid, setProfile)
  │
  └─ user == null  →  clear()  (user=null, profile=null)
```

Khi người dùng đóng tab rồi quay lại, Firebase khôi phục session từ IndexedDB — `onAuthStateChanged` tự động kích hoạt, không cần lưu token thủ công.

### 1.5 Real-time Subscriptions

Thay vì polling, hệ thống dùng `onSnapshot` để nhận dữ liệu ngay khi Firestore thay đổi:

```js
// Ví dụ: Feed tự cập nhật khi có bài viết mới
export function subscribeToPosts(callback, onError, n = 20) {
  const q = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc"),
    limit(n),
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError?.(err),
  );
}
```

Mỗi subscription trả về hàm `unsubscribe` — được gọi trong `useEffect` cleanup để tránh memory leak:

```js
useEffect(() => {
  const unsub = subscribeToPosts(setPosts, onError, feedLimit);
  return unsub; // cleanup khi component unmount hoặc feedLimit thay đổi
}, [feedLimit]);
```

---

## 2. Cơ chế ghi nhận và xác thực hành vi

### 2.1 Bảng điểm thưởng

| Hành động       | Điểm | Hằng số                | Ai nhận         |
| --------------- | ---- | ---------------------- | --------------- |
| Đăng ký lần đầu | +20  | `POINTS.REGISTER`      | Người đăng ký   |
| Đăng bài mới    | +10  | `POINTS.POST`          | Tác giả bài     |
| Bình luận       | +5   | `POINTS.COMMENT`       | Người bình luận |
| Nhận like       | +2   | `POINTS.LIKE_RECEIVED` | Tác giả bài     |

### 2.2 Cơ chế ghi điểm có chu kỳ (Cycle Points)

Hệ thống không chỉ cộng `totalPoints` — mỗi lần tích điểm còn theo dõi **chu kỳ trưởng thành cây**:

```
totalPoints = tổng tích lũy (không giảm trừ bao giờ)
cyclePoints = điểm trong chu kỳ hiện tại  (0 → 999 → harvest → 0)
matureTreeCount = số lần đã thu hoạch đủ 1000 điểm/chu kỳ
```

Khi `cyclePoints + Δ >= 1000`, hệ thống tự động "thu hoạch":

```js
// src/services/user.service.js — hàm addPoints()
const newCycle = current + points; // VD: 990 + 10 = 1000
const harvests = Math.floor(newCycle / MATURE_TREE_THRESHOLD); // = 1
const remainder = newCycle % MATURE_TREE_THRESHOLD; // = 0

tx.update(userRef, {
  totalPoints: increment(points),
  cyclePoints: remainder, // reset về 0
  matureTreeCount: baseMature + harvests, // +1 cây trưởng thành
});
```

Sơ đồ trạng thái chu kỳ:

```
cyclePoints = 0
      │
      │ +10 (đăng bài)
      ▼
cyclePoints = 10 ──► ... ──► cyclePoints = 990
                                    │
                                    │ +10
                                    ▼
                            cyclePoints = 1000
                                    │
                              HARVEST! matureTreeCount++
                                    │
                                    ▼
                            cyclePoints = 0 (bắt đầu chu kỳ mới)
```

### 2.3 Giao dịch chống race condition (Firestore Transaction)

Khi nhiều người like cùng lúc, `runTransaction` đảm bảo atomic update:

```js
// src/services/post.service.js — hàm toggleLike()
await runTransaction(db, async (tx) => {
  const postSnap = await tx.get(postRef); // đọc trong transaction
  if (!postSnap.exists()) throw new Error("Bài viết không tồn tại");

  if (likeSnap.exists()) {
    tx.delete(likeRef);
    tx.update(postRef, { likeCount: increment(-1) });
    nowLiked = false;
  } else {
    tx.set(likeRef, { uid, createdAt: serverTimestamp() });
    tx.update(postRef, { likeCount: increment(1) });
    nowLiked = true;
  }
});
// addPoints() gọi SAU transaction — tránh nested transaction
if (nowLiked && authorId !== uid) {
  addPoints(authorId, POINTS.LIKE_RECEIVED, "like_received", postId);
}
```

Nếu transaction thất bại (conflict), Firestore tự retry. `addPoints()` chạy ngoài để tránh lỗi nested transaction.

### 2.4 Lịch sử điểm (pointHistory)

Mỗi lần cộng điểm ghi một document vào `pointHistory` để audit và tính xếp hạng tuần:

```js
// Ghi sau khi update user (non-critical, không block UI)
addDoc(collection(db, "pointHistory"), {
  uid,
  action, // 'post' | 'comment' | 'like_received' | 'register'
  points,
  refId, // postId hoặc commentId liên quan
  createdAt: serverTimestamp(),
}).catch((e) => console.error("[pointHistory]", e.message));
```

```
pointHistory/{docId}
  uid:       "abc123"
  action:    "comment"
  points:    5
  refId:     "postXYZ"
  createdAt: Timestamp(2025-05-27T...)
```

### 2.5 Xác thực điểm bởi Firestore Security Rules

Rules kiểm tra **giá trị delta** trước khi cho phép ghi — ngăn chặn gian lận điểm từ client:

```js
// firestore.rules — phần users/{uid}
// Chủ tài khoản chỉ được cộng đúng các mức điểm hợp lệ
(
  request.auth.uid == uid &&
  request.resource.data
    .diff(resource.data)
    .affectedKeys()
    .hasOnly(["totalPoints", "cyclePoints", "matureTreeCount"]) &&
  request.resource.data.totalPoints - resource.data.totalPoints in
    [2, 5, 10, 20]
)(
  // Cộng +2 (like_received) từ bất kỳ user authenticated
  request.auth != null &&
    request.auth.uid != uid &&
    request.resource.data.totalPoints - resource.data.totalPoints == 2,
);
```

Nếu client cố tình gửi `totalPoints + 999`, Firestore từ chối với `PERMISSION_DENIED`.

### 2.6 Xác thực file upload (Storage)

Client validate trước khi upload, không đợi server phản hồi:

```js
// src/services/storage.service.js
export function validateFile(file) {
  const accepted = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES];
  // ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  // ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm']
  if (!accepted.includes(file.type)) throw new Error("Định dạng không hỗ trợ");
  if (file.size > MAX_FILE_SIZE) throw new Error("File quá lớn (tối đa 10 MB)");
  // MAX_FILE_SIZE = 10 * 1024 * 1024
  return ACCEPTED_IMAGE_TYPES.includes(file.type) ? "image" : "video";
}
```

---

## 3. Cơ chế khuyến khích và lan tỏa tích cực

### 3.1 Optimistic UI — phản hồi tức thì

Khi user like bài, UI cập nhật **ngay lập tức** mà không đợi server — nếu server lỗi thì revert:

```js
// src/mvc/controllers/useFeedController.js
const handleLike = async (postId) => {
  toggleLikeLocally(postId); // cập nhật UI ngay (tăng/giảm like count)
  try {
    await toggleLike(postId, user.uid); // gọi Firestore
  } catch {
    toggleLikeLocally(postId); // revert nếu lỗi
  }
};
```

```
// src/store/usePostStore.js
toggleLikeLocally(postId) {
  const isLiked = likedPosts.has(postId)
  set({
    likedPosts: /* toggle postId trong Set */,
    posts: posts.map(p =>
      p.id === postId
        ? { ...p, likeCount: p.likeCount + (isLiked ? -1 : 1) }
        : p
    ),
  })
}
```

### 3.2 Toast thông báo điểm thưởng

Mỗi khi nhận điểm, `usePointStore` lưu sự kiện để hiện toast:

```js
// src/store/usePointStore.js
push(entry) {
  set(s => ({
    recent: [{ ...entry, timestamp: Date.now() }, ...s.recent].slice(0, 20),
  }))
}
```

Sau khi đăng bài thành công:

```js
pushPoint({ action: "post", points: POINTS.POST, label: "Đăng bài viết" });
// → Toast "+10 điểm — Đăng bài viết" xuất hiện
```

### 3.3 Hệ thống thông báo (Notifications)

Khi có like hoặc comment, hệ thống gửi thông báo đến chủ bài:

```js
// src/services/notification.service.js
export async function createNotification(
  toUid,
  { type, fromUid, fromName, fromPhotoURL, postId, postSnippet },
) {
  if (toUid === fromUid) return; // không tự thông báo chính mình

  await addDoc(collection(db, "notifications", toUid, "items"), {
    type, // 'like' | 'comment'
    fromUid,
    fromName,
    fromPhotoURL,
    postId,
    postSnippet: postSnippet?.slice(0, 60) ?? "", // trích đoạn 60 ký tự
    read: false,
    createdAt: serverTimestamp(),
  });
}
```

Luồng thông báo khi có like:

```
User A like bài của User B
        │
        ▼
toggleLike() → runTransaction (cập nhật likeCount)
        │
        ▼
addPoints(authorId=B, +2, 'like_received', postId)
        │
        ▼
getUserById(A) → lấy tên + ảnh đại diện
        │
        ▼
createNotification(toUid=B, {
  type: 'like',
  fromUid: A,
  fromName: 'Nguyễn Văn A',
  postId,
  postSnippet: 'Hôm nay mình giúp...'
})
        │
        ▼
notifications/B/items/{docId} được tạo
        │
        ▼
onSnapshot listener của B kích hoạt → bell icon hiện badge đỏ
```

Subscription thông báo real-time (30 mục gần nhất):

```js
export function subscribeToNotifications(uid, callback, onError) {
  const q = query(
    collection(db, 'notifications', uid, 'items'),
    orderBy('createdAt', 'desc'),
    limit(30),
  )
  return onSnapshot(q, snap => callback(...), err => ...)
}
```

### 3.4 Bảng xếp hạng real-time

Leaderboard tự cập nhật khi có thay đổi điểm bất kỳ:

```js
// src/services/user.service.js
export function subscribeToLeaderboard(callback, onError, n = 10) {
  const q = query(
    collection(db, "users"),
    orderBy("totalPoints", "desc"),
    limit(n),
  );
  return onSnapshot(
    q,
    (snap) =>
      callback(
        snap.docs.map((d, i) => ({ uid: d.id, rank: i + 1, ...d.data() })),
      ),
    (err) => onError?.(err),
  );
}
```

Để tính **hạng chính xác** của một user (không bị lệch do pagination):

```js
export async function getUserRank(uid) {
  const profile = await getUserById(uid);
  const pts = profile.totalPoints ?? 0;
  const snap = await getDocs(
    query(collection(db, "users"), where("totalPoints", ">", pts)),
  );
  return snap.size + 1; // đếm số người có điểm cao hơn + 1
}
```

### 3.5 Stories — nội dung truyền cảm hứng

Giáo viên/Admin đăng "Stories" (câu chuyện lòng tốt) để truyền cảm hứng cho học sinh.  
Hero slider trên trang chủ hiển thị những câu chuyện nổi bật:

```
stories/{storyId}
  title:         "Trung Thu cho em vùng cao"
  content:       "Nội dung chi tiết..."
  imageUrl:      "https://firebasestorage.googleapis.com/..."
  category:      "kindness" | "community" | "school" | "environment" | "other"
  isFeatured:    true  ← hiện trên Hero Slider
  publishedBy:   uid
  publisherName: "Cô Nguyễn Thị B"
```

---

## 4. Kiểm duyệt và bảo vệ dữ liệu người dùng

### 4.1 Hệ thống phân quyền (RBAC)

Bốn vai trò với quyền hạn tăng dần:

```
student  <  pending_teacher  <  teacher  <  admin
```

| Quyền                     | student | teacher | admin |
| ------------------------- | ------- | ------- | ----- |
| Đọc bài viết / bình luận  | ✓       | ✓       | ✓     |
| Đăng bài / bình luận      | ✓       | ✓       | ✓     |
| Xoá bài người khác        | ✗       | ✓       | ✓     |
| Đăng Stories              | ✗       | ✓       | ✓     |
| Xem trang Members         | ✗       | ✓       | ✓     |
| Reset điểm user vi phạm   | ✗       | ✓       | ✓     |
| Duyệt / từ chối giáo viên | ✗       | ✗       | ✓     |
| Thay đổi role user        | ✗       | ✗       | ✓     |

### 4.2 Route Guard phía Client

```js
// src/routes/AppRouter.jsx
function AdminGuard({ children }) {
  const { user, profile, loading } = useAuthStore()
  if (loading || (user && !profile)) return <Spinner />
  if (!user)                          return <Navigate to="/login" />
  if (profile.role !== ROLES.ADMIN)   return <Navigate to="/" />
  return children
}

// Trang /admin chỉ admin vào được
<Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />

// Trang /members chỉ teacher + admin
<Route path="members" element={<TeacherGuard><MembersPage /></TeacherGuard>} />
```

Dù client có thể bị bypass, **Firestore Rules luôn là tuyến phòng thủ cuối cùng**.

### 4.3 Firestore Security Rules — tuyến phòng thủ backend

Rules được deploy lên Firebase và thực thi ở server — client không thể bypass:

```js
// Tóm tắt cấu trúc rules
service cloud.firestore {
  match /databases/{database}/documents {

    // Users: chỉ owner sửa profile, chỉ admin đổi role
    match /users/{uid} { ... }

    // Posts: ai cũng đọc, chỉ author / teacher / admin xoá
    match /posts/{postId} {
      allow delete: if request.auth.uid == resource.data.authorId
        || isTeacher() || isAdmin();

      // Like chỉ được ghi/xoá bởi chính uid
      match /likes/{likeUid} {
        allow write: if request.auth.uid == likeUid;
      }
    }

    // Stories: chỉ teacher / admin tạo
    match /stories/{storyId} {
      allow create: if isTeacher() || isAdmin();
    }

    // Config: không ai ghi được từ client
    match /config/{docId} {
      allow write: if false;
    }
  }
}
```

Hàm helper kiểm tra role bằng cách đọc document thật từ Firestore (không dùng token claim):

```js
function isTeacher() {
  return request.auth != null
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
}
```

### 4.4 Xử lý vi phạm — Reset điểm

Khi giáo viên phát hiện user vi phạm (spam, nội dung xấu), có thể reset điểm về 0:

```js
// src/services/user.service.js
export async function resetUserContent(targetUid) {
  await updateDoc(doc(db, "users", targetUid), {
    totalPoints: 0,
    cyclePoints: 0,
    matureTreeCount: 0,
  });
}
```

Rules cho phép teacher/admin ghi ba field này về 0 (chỉ về 0, không về giá trị khác):

```js
// Trong rules — chỉ cho phép reset về đúng 0
(isTeacher() || isAdmin()) &&
  request.resource.data
    .diff(resource.data)
    .affectedKeys()
    .hasOnly(["totalPoints", "cyclePoints", "matureTreeCount"]) &&
  request.resource.data.totalPoints == 0 &&
  request.resource.data.cyclePoints == 0 &&
  request.resource.data.matureTreeCount == 0;
```

### 4.5 Xoá hàng loạt nội dung vi phạm (Batch Delete)

Xoá tất cả bài viết của một user bằng Firestore Batch (tối đa 500 thao tác/lần):

```js
// src/services/post.service.js
export async function deleteAllPostsByUser(targetUid) {
  const snap = await getDocs(
    query(collection(db, "posts"), where("authorId", "==", targetUid)),
  );
  if (snap.empty) return 0;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size; // trả về số bài đã xoá
}
```

### 4.6 Luồng duyệt giáo viên

Giáo viên mới không có quyền giống student — phải chờ admin duyệt:

```
[Đăng ký với role pending_teacher]
        │
        ▼
users/{uid}.role = "pending_teacher"
        │
        ▼
ProtectedRoute → redirect /pending  (không vào được app)
        │
        ▼  [Admin vào /admin, nhấn Duyệt]
        │
        ▼
approveTeacher(uid):
  1. updateDoc(users/uid, { role: 'teacher' })
  2. batch-update tất cả posts của uid: { authorRole: 'teacher' }
        │
        ▼
users/{uid}.role = "teacher"
onSnapshot → profile tự cập nhật → ProtectedRoute cho vào app
```

### 4.7 Bảo vệ Firebase Storage

Storage Rules đảm bảo chỉ owner ghi được vào path của mình:

```
avatars/{uid}/avatar   →  chỉ uid tương ứng được ghi
covers/{uid}/cover     →  chỉ uid tương ứng được ghi
posts/{uid}/{file}     →  chỉ uid tương ứng được ghi
stories/{storyId}/...  →  chỉ teacher/admin được ghi
```

### 4.8 Bảo vệ biến môi trường

`.env` không được commit lên git (có trong `.gitignore`). Tất cả config Firebase dùng prefix `VITE_` — Vite chỉ expose các biến này vào bundle, không leak biến server-side.

Dù Firebase API key có trong bundle, quyền truy cập thực sự được kiểm soát bởi:

- **Firestore Security Rules** (ai đọc/ghi được gì)
- **Storage Rules** (ai upload được path nào)
- **Firebase Auth** (phải đăng nhập mới dùng được)

---

_Cập nhật lần cuối: 2025-05-27_
