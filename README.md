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

*(Bạn cũng có thể dùng điện thoại, lấy app Camera quét mã QR hiển thị ở phòng chờ để đưa trình duyệt điện thoại vào chung phòng)*.

---

## 🌐 Chơi Mạng Nhanh Qua Ngrok (Không cần Deploy)

Nếu bạn muốn chơi cùng bạn bè qua Internet mà không mất công deploy lên server (Vercel/Render...), giải pháp nhanh nhất là tải **Ngrok**. Ngrok sẽ "đục lỗ" tạo ra một đường link công khai dẫn thẳng vào máy bạn.

**Các bước thực hiện:**
1. **Cài đặt ngrok**: Tải ứng dụng tại [ngrok.com](https://ngrok.com/download). (Nếu dùng máy Mac/Linux có thể dùng lệnh `brew install ngrok` hoặc `snap install ngrok`).
2. Mở một terminal/command prompt và liên kết tài khoản ngrok của bạn (Làm theo hướng dẫn từ trang dashboard của ngrok với lệnh `ngrok config add-authtoken ...`).
3. Khởi chạy dự án **Block Blast hoàn chỉnh** trên máy bạn bằng cách bật **cả 2 server** như Hướng dẫn (Bước 1 và Bước 2) - Server Node ở port 3001, Giao diện Vite ở port 5173.
4. Mở thêm 1 terminal mới và chạy lệnh tạo đường hầm tới port của Frontend:
   ```bash
   ngrok http 5173
   ```
5. Ngrok sẽ cấp cho bạn một dải link màu xanh (Ví dụ: `https://abcd-12-34-56.ngrok-free.app`). 

👉 Bạn chỉ việc copy cái link đó và nhắn qua cho những người muốn chơi cùng. Khi họ mở link, trò chơi sẽ được kết nối hoàn hảo với đầy đủ tính năng Multiplayer giống hệt bạn đang chơi trên máy cá nhân!


Edited vite.config.js

Chào bạn, lỗi **404: NOT_FOUND** trên Vercel xảy ra do Vercel không tự tìm thấy mã nguồn giao diện (frontend) của bạn vì mã nguồn đó nằm trong thư mục `client`, chứ không phải nằm ở thư mục gốc của dự án. 

Hơn nữa, có một điều cực kỳ **quan trọng về kỹ thuật** khi deploy app này:
> [!WARNING]
> **Vercel KHÔNG phù hợp để cài đặt Server Backend của bạn!**
> 1. Vercel sử dụng công nghệ Serverless (không duy trì kết nối), do đó nó **không hỗ trợ WebSockets / Socket.IO** (bạn sẽ không thể chơi multiplayer được).
> 2. Vercel chặn việc lưu file lâu dài, nên cơ sở dữ liệu `game_database.db` (SQLite) của bạn sẽ bị xoá liên tục sau mỗi vài phút.

💡 **Giải pháp chuẩn:** 
Chúng ta sẽ chia dự án làm 2 nơi deploy:
- **Giao diện (Client)**: Trực tiếp deploy lên **Vercel** (Rất lý tưởng và nhanh).
- **Máy chủ (Server)**: Deploy lên **Render.com** (Hỗ trợ Node.js chạy 24/7, có hỗ trợ Socket.IO mạnh mẽ và có gói Free).

Mình đã đưa cấu hình file `vite.config.js` về chuẩn mặc định để bạn dễ dàng deploy lên Vercel. Dưới đây là hướng dẫn từng bước:

---

### PHẦN 1: Deploy Giao diện (Client) lên VERCEL

1. Truy cập vào trang Dashboard của Vercel (chỗ bị lỗi 404), tiến hành xoá project cũ đó đi hoặc tạo mới (Add New -> Project).
2. Kết nối tới kho lưu trữ GitHub của bạn.
3. Ở bước cấu hình dự án (Configure Project), bạn **BẮT BUỘC** phải chỉnh lại các mục sau:
   - **Framework Preset**: Chọn `Vite`
   - **Root Directory**: Bấm Edit và gõ `client` (rất quan trọng, để Vercel biết code giao diện nằm trong thư mục client).
   - *Build Command*: `npm run build` (Mặc định)
   - *Output Directory*: `dist` (Mặc định)
4. Bấm **Deploy**. Sau khoảng 1 phút, giao diện của bạn sẽ lên sóng! Nhưng mà hiện tại nó chưa kết nối được server, hãy sang Phần 2.

---

### PHẦN 2: Tách Backend (Server) chạy trên Render.com

1. Truy cập [Render.com](https://render.com) và đăng nhập bằng GitHub.
2. Bấm vào nút **New +** ở góc phải trên -> Chọn **Web Service**.
3. Chọn tùy chọn **Build and deploy from a Git repository** và kết nối repo GitHub dự án của bạn.
4. Ở màn hình thiết lập Web Service, điền các thông tin sau:
   - **Name**: `block-blast-server` (hoặc tên tuỳ ý).
   - **Root Directory**: Gõ `server` (Rất quan trọng, để Render biết code backend nằm ở thư mục này).
   - **Environment**: Chọn `Node`
   - **Build Command**: Gõ `npm install`
   - **Start Command**: Gõ `node server.js`
   - Chọn bản **Free** ở dưới cùng.
5. Bấm **Create Web Service**. 
6. Đợi khoảng vài phút để Render khởi động máy chủ. Sau khi xong, Render sẽ cấp cho bạn một đường link dạng `https://block-blast-server.onrender.com`. Hãy copy URL đó.

---

### PHẦN 3: Liên kết Giao diện và Máy Chủ

Sau khi bạn có URL Backend từ Phàn 2, bạn cần cập nhật lại code frontend để nó gọi API lên trên internet.

Mở máy tính của bạn, vào file `client/src/socket.js`, sửa dòng lấy URL thành link của Render.

```javascript
// file: client/src/socket.js
import { io } from 'socket.io-client';

// Đổi 'http://localhost:3001' thành link render của bạn
export const URL = process.env.NODE_ENV === 'production' 
  ? 'https://block-blast-server.onrender.com' // Nhập link từ bước 2 vào đây !!!
  : 'http://localhost:3001';

export const socket = io(URL, {
  autoConnect: true,
});
```

Sau khi sửa xong dòng code đó:
1. Lưu lại và `git push` đoạn code vừa thay đổi lên lại Github.
2. Vercel sẽ tự động thấy mã nguồn thay đổi và build lại frontend của bạn theo đường link server mới. 
3. Vào lại trang web của Vercel (block-blast-mutiple-online.vercel.app), game của bạn bây giờ đã hoàn chỉnh có thể chơi được Online ở mọi nơi!

Nếu bạn có vướng mắc ở một bước nào, hãy đưa lại ảnh cho mình xem, mình sẽ hỗ trợ bạn ngay!