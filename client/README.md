# Block Blast Multiplayer Online 🚀

Dự án này là phiên bản nâng cấp của trò chơi Block Blast kinh điển, được xây dựng trên nền tảng Web với khả năng chơi Multiplayer theo thời gian thực (Real-time). Hỗ trợ chơi trên mọi thiết bị (Laptop & Mobile).

## Tính năng nổi bật (Features)

1. **⚡ Chơi Đơn (Solo)**: Trải nghiệm cổ điển với điểm số thay đổi màu sắc background tự động để tăng độ phấn khích.
2. **🤖 Đấu Với AI (PvE)**: Thử thách kỹ năng với BOT AI (tự động tính nước đi best move dựa trên giải thuật).
3. **⚔️ Đối Kháng (Versus)**: Hai người chơi đối đầu. Gửi ngẫu nhiên dòng gạch sang cho đối thủ khi bạn xóa nhiều hàng/cột cùng lúc. Phòng bị giới hạn 2 người.
4. **🤝 Cộng Tác Chung Bảng (Co-op)**:
   - **Mới**: Không giới hạn số lượng người chơi (2 hoặc nhiều người).
   - Mọi người cùng thao tác xếp gạch trên **1 bảng duy nhất** và chia sẻ cùng một điểm số, một khay gạch.
   - **Streaming Screen**: Khi một người chạm và kéo khối gạch, tất cả những người khác trong phòng sẽ nhìn thấy khối gạch đó "bay lơ lửng" trên màn hình của họ kèm bóng mờ (Ghost Preview).
5. **Hiệu ứng & Âm thanh**:
   - Âm thanh được tạo ra theo thời gian thực (Procedural Audio bằng Web Audio API), không phụ thuộc vào tệp mp3 nào.
   - Bóng mờ, block thả xuống, flash clear cột/hàng cực kỳ đã mắt.
6. **Kéo thả mượt mà**:
   - Đã được tối ưu ở mức DOM transform (không phụ thuộc vào React Re-render cycle), giúp fps luôn đạt 60 trên cả Mobile lẫn PC.

---

## 🛠️ Hướng dẫn cài đặt và chạy thử (Local)

Dự án bao gồm 2 phần là `client` và `server`. Bạn cần chạy cả 2 để tính năng Multiplayer hoạt động. 
Yêu cầu hệ thống: Đã cài đặt **Node.js** (Phiên bản >= 16.x) và tiện ích **npm**.

### Bước 1: Khởi động Máy chủ Backend (Server)
Đóng vai trò là Socket server để đồng bộ Multiplayer:
```bash
cd /home/cyin/Desktop/Block-Blast-PROJECT_mutiplePlayer_Online/server
npm install
npm start
```
*(Nếu thành công, terminal sẽ báo `Server is running on port 3001`)*

### Bước 2: Khởi động Giao diện Frontend (Client)
Giao diện React (sử dụng Vite):
```bash
# Mở một Terminal/Tab mới
cd /home/cyin/Desktop/Block-Blast-PROJECT_mutiplePlayer_Online/client
npm install
npm run dev
```

### Bước 3: Trải nghiệm
Mở trình duyệt (hiện tại game đang chạy ở port 5173):
👉 **http://localhost:5173**

#### Cách test tính năng Multiplayer (Co-op và Versus):
1. Mở **http://localhost:5173** trên trình duyệt mặc định. Bấm "Tạo Phòng Co-op" (Hoặc Versus).
2. Hệ thống sẽ cung cấp cho bạn 1 thẻ chứa MÃ PHÒNG (Ví dụ: `ABCD`).
3. Mở **1 Tab Ẩn danh** (Incognito) hoặc 1 trình duyệt khác. Cùng truy cập vào **http://localhost:5173**.
4. Ở màn hình chính, gõ `ABCD` vào ô mã phòng rồi bấm **Vào**.
5. Cả 2 cửa sổ sẽ cùng được nhảy vào 1 bảng. Thử kéo thả khối gạch ở 1 màn hình và xem kết quả đồng bộ (streaming) ở màn hình bên kia! 

*(Bạn cũng có thể dùng điện thoại, lấy app Camera quét mã QR hiển thị ở phòng hờ để đưa trình duyệt điện thoại vào chung phòng)*.