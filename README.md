# Báo cáo Đề tài: Demo Cookie Flags Chống Session Hijacking

**Tên đề tài:** Xây dựng cơ chế kiểm soát phiên đăng nhập (session hijacking prevention) – demo với cookie flags (HttpOnly, Secure).
**Sinh viên thực hiện:** [Điền tên của bạn vào đây]
**MSSV:** [Điền MSSV của bạn vào đây]

---

## 1. 📜 Giới thiệu ngắn gọn về đề tài

Đề tài này xây dựng một ứng dụng web Node.js đơn giản, có kết nối CSDL SQLite, mô phỏng có chủ đích các lỗ hổng bảo mật liên quan đến phiên đăng nhập. Mục tiêu là để trình diễn trực quan các kịch bản tấn công Session Hijacking (Chiếm đoạt phiên) thông qua:

1.  **Cross-Site Scripting (XSS):** Tiêm mã độc để đánh cắp cookie từ trình duyệt.
2.  **Man-in-the-Middle (MITM):** Nghe lén mạng để bắt trộm cookie.

Từ đó, đề tài demo cách áp dụng hai cờ (flags) bảo mật quan trọng là `HttpOnly` và `Secure` cho cookie, và chứng minh cách chúng vô hiệu hóa hiệu quả các phương thức tấn công này.

## 2. 🛠️ Công nghệ sử dụng

* **Ngôn ngữ:** JavaScript
* **Nền tảng:** Node.js (Runtime)
* **Framework (Backend):** Express.js
* **Cơ sở dữ liệu:** SQLite 3
* **Thư viện chính:**
    * `express`: Để dựng máy chủ web.
    * `cookie-parser`: Middleware để xử lý cookie.
    * `sqlite3`: Driver để kết nối và tương tác với CSDL SQLite.

## 3. 📁 Cấu trúc thư mục dự án

```
secure-web-demo/
├── src/
│   └── app.js         <-- File mã nguồn chính, chứa toàn bộ logic (backend, CSDL).
├── .gitignore         <-- File cấu hình để Git bỏ qua thư mục 'node_modules'.
├── package.json       <-- Quản lý dependencies (express, sqlite3, cookie-parser).
├── package-lock.json  <-- File khóa phiên bản của npm.
├── demo.db            <-- File CSDL SQLite (sẽ tự động tạo ra khi chạy code).
└── README.md          <-- File hướng dẫn này.
```

## 4. ⚙️ Hướng dẫn cài đặt & chạy chương trình

### Yêu cầu môi trường
* **Node.js**: v18.x hoặc mới hơn.
* **npm**: v9.x hoặc mới hơn (thường đi kèm với Node.js).
* **Trình duyệt web**: Chrome, Firefox, Edge...
* **(Tùy chọn)** `ngrok`: Để demo kịch bản HTTPS cho cờ `Secure`.

### Cách import database
* **Không cần import thủ công.**
* Khi bạn chạy ứng dụng lần đầu tiên (`node src/app.js`), file `demo.db` sẽ được **tự động tạo ra** ở thư mục gốc.
* Code trong `app.js` cũng sẽ tự động tạo bảng `users`, `notes` và tài khoản `admin`.

### Cách cấu hình file kết nối DB
* **Không cần file cấu hình** (`.env` hay `config.json`).
* Đường dẫn đến file CSDL được khai báo trực tiếp trong `src/app.js` để phục vụ demo:
    ```javascript
    const db = new sqlite3.Database('./demo.db', ...);
    ```

### Lệnh chạy hệ thống
1.  Mở Terminal (Command Prompt) tại thư mục gốc `secure-web-demo`.
2.  Cài đặt các thư viện cần thiết (chỉ chạy lần đầu):
    ```bash
    npm install
    ```
3.  Khởi động máy chủ:
    ```bash
    node src/app.js
    ```
4.  Terminal sẽ hiển thị 2 dòng sau nếu thành công:
    ```
    Kết nối CSDL SQLite thành công.
    Ứng dụng "Nạn nhân" (phiên bản CSDL) đang chạy tại http://localhost:3000
    ```
5.  Mở trình duyệt và truy cập `http://localhost:3000`.

## 5. 🧑‍💻 Tài khoản demo để đăng nhập
* **Username:** `admin`
* **Password:** `admin123`

*(Tài khoản này được tự động tạo khi CSDL `demo.db` được khởi tạo).*

## 6. 🖼️ Kết quả và hình ảnh minh họa

Dưới đây là các kịch bản demo "Trước" và "Sau" khi áp dụng các cờ cookie.

---

### Kịch bản 1: Tấn công XSS vs. Cờ `HttpOnly`

Mục tiêu: Đánh cắp cookie bằng cách tiêm mã JavaScript vào ô "Ghi chú".
Payload tấn công: `<script>alert(document.cookie)</script>`

**1. TRƯỚC khi bật `HttpOnly`:**
* **Mô tả:** Máy chủ set cookie không có `HttpOnly`. Kẻ tấn công tiêm mã độc và thành công đọc được giá trị của `sessionId`.
* **Kết quả:**
    > **[Dán ảnh chụp màn hình 1: Hộp thoại `alert` hiện ra `sessionId=...` của bạn vào đây]**

**2. SAU khi bật `HttpOnly`:**
* **Mô tả:** Sửa code `app.js` để thêm `{ httpOnly: true }` vào `res.cookie()`. Khởi động lại server và tấn công lại.
* **Kết quả:** Mã độc vẫn chạy (lỗ hổng XSS vẫn còn) nhưng khi gọi `document.cookie`, trình duyệt che giấu cookie `sessionId` đi. Cuộc tấn công đánh cắp phiên thất bại.
    > **[Dán ảnh chụp màn hình 2: Hộp thoại `alert` hiện ra nội dung RỖNG của bạn vào đây]**

---

### Kịch bản 2: Tấn công MITM vs. Cờ `Secure`

Mục tiêu: Nghe lén mạng (giả lập bằng DevTools) để xem cookie có bị gửi qua kết nối HTTP không an toàn hay không.

**1. TRƯỚC khi bật `Secure` (trên HTTP):**
* **Mô tả:** Đăng nhập và theo dõi tab "Network" (Mạng) trong F12. Cookie `sessionId` bị gửi đi dưới dạng văn bản thuần (plain text) trong Request Headers.
* **Kết quả:** Kẻ tấn công có thể "vớt" được cookie này.
    > **[Dán ảnh chụp màn hình 3: Tab F12-Network, thấy rõ dòng `Cookie: sessionId=...` trên kết nối `http://localhost` của bạn vào đây]**

**2. SAU khi bật `Secure` (trên HTTP):**
* **Mô tả:** Sửa code `app.js` để thêm `{ secure: true }`. Khởi động lại server và truy cập `http://localhost:3000`.
* **Kết quả:** Trình duyệt **từ chối** gửi cookie `Secure` qua kết nối HTTP. Ứng dụng sẽ báo bạn "chưa đăng nhập" (vì server không nhận được cookie). Kẻ nghe lén không bắt được gì.
    > **[Dán ảnh chụp màn hình 4: Tab F12-Network, KHÔNG thấy dòng `Cookie: sessionId=...` khi truy cập `http://localhost` của bạn vào đây]**

**3. SAU khi bật `Secure` (trên HTTPS):**
* **Mô tả:** (Demo thêm bằng `ngrok`). Chạy `ngrok http 3000` và truy cập đường link `https://...ngrok.io`.
* **Kết quả:** Kết nối đã được mã hóa (HTTPS). Trình duyệt đồng ý gửi cookie `Secure` đi. Kẻ nghe lén chỉ thấy dữ liệu mã hóa, không đọc được cookie.
    > **[Dán ảnh chụp màn hình 5: Tab F12-Security, thấy kết nối HTTPS báo "Secure" (có ổ khóa) của `ngrok` của bạn vào đây]**
