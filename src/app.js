// Tên file: src/app.js (Phiên bản CÓ DATABASE)

const express = require('express');
const cookieParser = require('cookie-parser');
const sqlite3 = require('sqlite3').verbose(); // Import thư viện SQLite
const app = express();
const port = 3000;

// --- CẤU HÌNH DATABASE ---
// Kết nối (hoặc tạo mới nếu chưa có) file CSDL 'demo.db'
const db = new sqlite3.Database('./demo.db', (err) => {
    if (err) {
        console.error("Lỗi kết nối CSDL:", err.message);
    } else {
        console.log('Kết nối CSDL SQLite thành công.');
    }
});

// Chạy các lệnh SQL để tạo bảng ngay khi kết nối
// .serialize() đảm bảo các lệnh chạy tuần tự
db.serialize(() => {
    // 1. Tạo bảng 'users' nếu chưa tồn tại
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`, (err) => {
        if (err) {
            console.error("Lỗi tạo bảng users:", err);
            return;
        }
        // Thêm tài khoản admin (chỉ thêm nếu chưa có)
        const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
        stmt.run('admin', 'admin123', (err) => {
            if (err && err.errno !== 19) { // 19 là lỗi UNIQUE constraint (đã có user)
                console.error("Lỗi thêm user admin:", err.message);
            }
        });
        stmt.finalize();
    });

    // 2. Tạo bảng 'notes' để demo XSS
    db.run(`CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT
    )`, (err) => {
        if (err) {
            console.error("Lỗi tạo bảng notes:", err);
        }
    });
});
// --- KẾT THÚC CẤU HÌNH DATABASE ---

// Sử dụng các thư viện "trung gian" (middleware)
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

/**
 * Tuyến đường (Route) cho trang chủ
 */
app.get('/', (req, res) => {
    const sessionId = req.cookies.sessionId;
    
    // Đọc tất cả ghi chú từ CSDL để hiển thị
    db.all("SELECT content FROM notes", [], (err, rows) => {
        if (err) {
            console.error(err.message);
            res.status(500).send("Lỗi máy chủ khi đọc ghi chú");
            return;
        }
        
        // Build phần HTML của các ghi chú
        const notesHtml = rows.map(row => `<div>${row.content}</div>`).join('');

        res.send(`
            <html>
                <head><title>Demo Bảo Mật Web (DB)</title></head>
                <body>
                    <h1>Trang Demo (Có CSDL)</h1>
                    
                    ${sessionId ? 
                        `<p><b>Trạng thái:</b> Bạn đã đăng nhập. (Session: ${sessionId})</p>
                         <p><a href="/logout">Đăng xuất</a></p>` : 
                        `
                        <form action="/login" method="POST" style="border: 1px solid #ccc; padding: 10px;">
                            <h3>Form Đăng nhập</h3>
                            <p>Tài khoản demo: <b>admin</b> / <b>admin123</b></p>
                            <div><label>Username: <input type="text" name="username"></label></div>
                            <div><label>Password: <input type="password" name="password"></label></div>
                            <button type="submit">Đăng nhập</button>
                        </form>
                        `
                    }
                    
                    <hr>
                    
                    <h3>Ghi chú công khai (Đọc từ CSDL)</h3>
                    <div style="border: 1px solid #f00; padding: 10px; min-height: 50px;">
                        ${notesHtml} </div>
                    
                    <hr>

                    <h3>Thêm ghi chú mới (Lưu vào CSDL)</h3>
                    <form action="/note" method="POST">
                        <input type="text" name="note" placeholder="Nhập payload XSS ở đây..." style="width: 300px;">
                        <button type="submit">Gửi</button>
                    </form>
                </body>
            </html>
        `);
    });
});

/**
 * Tuyến đường (Route) để xử lý việc đăng nhập
 * Sẽ kiểm tra username/password với CSDL
 */
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Tìm user trong CSDL
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("Lỗi máy chủ");
        }
        
        if (row) {
            // ĐĂNG NHẬP THÀNH CÔNG
            const sessionId = `user-${row.id}-${Date.now()}`; // Tạo session thật hơn

            // --- ĐÂY LÀ DÒNG QUAN TRỌNG ĐỂ DEMO ---
            // **BƯỚC 1 (TRƯỚC):** Không có cờ bảo mật
            res.cookie('sessionId', sessionId);

            // **BƯỚC 2 (SAU - HttpOnly):** Bỏ dấu // ở dòng dưới và // dòng trên
            // res.cookie('sessionId', sessionId, { httpOnly: true });

            // **BƯỚC 3 (SAU - Secure):** Bỏ dấu // ở dòng dưới và // 2 dòng trên
            // res.cookie('sessionId', sessionId, { httpOnly: true, secure: true });
            // --- KẾT THÚC DÒNG QUAN TRỌNG ---
            
            res.redirect('/');
        } else {
            // ĐĂNG NHẬP THẤT BẠI
            res.send('Sai username hoặc password. <a href="/">Quay lại</a>');
        }
    });
});

/**
 * Tuyến đường (Route) để xử lý việc đăng ghi chú
 * Sẽ LƯU VÀO CSDL
 */
app.post('/note', (req, res) => {
    const noteContent = req.body.note; 
    
    // Chèn ghi chú vào CSDL (Không lọc XSS)
    db.run("INSERT INTO notes (content) VALUES (?)", [noteContent], (err) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("Lỗi máy chủ khi lưu ghi chú");
        }
        res.redirect('/');
    });
});

/**
 * Tuyến đường (Route) để đăng xuất
 */
app.get('/logout', (req, res) => {
    res.clearCookie('sessionId');
    res.redirect('/');
});

/**
 * Khởi động máy chủ
 */
app.listen(port, () => {
    console.log(`Ứng dụng "Nạn nhân" (phiên bản CSDL) đang chạy tại http://localhost:${port}`);
    console.log('Nhấn Ctrl+C để dừng máy chủ.');
});