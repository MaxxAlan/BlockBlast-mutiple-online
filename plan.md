# Cải thiện cơ chế tính điểm & Hệ thống Kỷ lục Đồng đội

Bản kế hoạch này giải quyết lỗ hổng thiết kế tính điểm bị kẹt (hoặc không cộng điểm khi đặt khối), thêm hệ số thưởng Combo Streak (dây chuyền), và chuyển đổi High Score (điểm kỷ lục vương miện) trong mục chơi Mạng sang chế độ Nhóm (Lưu theo thành viên tham gia).

## User Review Required

> [!WARNING]
> **Nhóm người chơi:** Dựa theo yêu cầu "neu lan sau cac user day vo lai game thi moi hien thi lai ky luc", hệ thống sẽ chuyển sang dùng khái niệm **Team (Tổ đội)**. Kỷ lục Co-op/Versus sẽ không lưu cứng cho 1 cá nhân nữa, mà thuộc về **CHÍNH XÁC NHỮNG NGƯỜI ĐÓ** chơi với nhau. 
> Ví dụ: Bạn (A) tạo phòng mời (B) chơi được 50,000 điểm. Lần sau A và B cùng vào phòng, vương miện sẽ hiện 50,000. Nhưng nếu A mời (C) vào phòng, vương miện sẽ bắt đầu từ 0. Bạn có đồng ý với thiết kế này không?

## Proposed Changes

---

### Database / Backend Layer

#### [MODIFY] `server/db.js`
- Thêm bảng mới `team_records` gồm các cột: `team_hash` (chuỗi ID nhóm, gộp các UID được sắp xếp), `mode`, `high_score`, `player_names`.
- Viết thêm hàm `getTeamRecord(teamHash, mode)` và `updateTeamRecord(teamHash, mode, score)`.

#### [MODIFY] `server/server.js`
- Khi đủ người và bắt đầu ván (sự kiện `game_start`/`room_joined`), máy chủ sẽ lấy danh sách các UID có trong phòng, nối lại thành `teamHash`.
- Truy xuất tỷ số điểm cao nhất của Team này (qua `getTeamRecord`) rồi gán thành giá trị ban đầu vào Room thông qua socket cho các máy con (Clients) dưới tên biến `teamHighScore`.
- Cập nhật chức năng `coop_place_block` để lưu đè điểm mới cho Team nếu cao hơn kỷ lục cũ.

---

### Frontend / Game Logic Layer

#### [MODIFY] `client/src/components/Game.jsx`

**Sửa lỗi không nhận điểm khối & Thêm Combo Cấp Số Nhân:**
- Sử dụng biến tham chiếu (`useRef`) cho Điểm (`score`) và Chuỗi Combo (`comboStreak`) để giải quyết tình trạng closure bất đồng bộ của React (đây là lý do điểm hiện tại của bạn không bị cộng lên khi thả gạch).
- Vận dụng công thức Bonus dựa trên Chuỗi Combo:
  - Vừa thả không nổ dòng nào: `comboStreak` = 0.
  - Gây nổ dòng: `comboStreak` tăng lên 1, 2, 3...
  - Nếu `comboStreak >= 10`: điểm nước đi đó x 1.1 (+10%).
  - Nếu `comboStreak >= 20`: điểm nước đi đó x 1.15 (+15%).
  - Nếu `comboStreak >= 30`: điểm nước đi đó x 1.18 (+18%).
  - Nếu `comboStreak >= 40`: điểm nước đi đó x 1.19 (+19%).
  - Nếu `comboStreak >= 50`: điểm nước đi đó x 1.195 (+19.5%).

**Cập nhật cơ chế hiển thị điểm Vương Miện (High Score):**
- Trong lúc gọi API lấy `solo_high_score` lúc tạo phòng, nếu bạn đang ở phòng ghép (Co-op/Versus), sẽ lắng nghe một tín hiệu bổ sung `team_high_score_sync` từ máy chủ để gán số điểm này vào Vương miện.
- Giao diện góc trái của vương miện sẽ động học, biểu thị đúng kỳ tích của nhóm tổ đội hiện tại.

## Open Questions

> [!IMPORTANT]  
> Các móc Combo Bonus (10% cho x10; 15% cho x20...) sẽ áp dụng nhân trực tiếp vào số điểm người chơi THU ĐƯỢC Ở ĐÚNG LƯỢT ĐÁNH ĐÓ (bao gồm điểm khối lập phương + điểm dòng bị phá). Hay bạn muốn nó nhân lên tổng điểm toàn ván? Việc nhân vào lượt đánh hiện tại là chuẩn quy ước game giải đố nhất.
>
> Thứ hai, với bảng xếp hạng Top người chơi thế giới (Leaderboard), bạn vẫn muốn giữ bảng Top cho Từng Cá Nhân (vd: Cá nhân có trận nhóm cao nhất), hay bạn muốn Bảng Co-op sửa thành Bảng Nhóm (Tên Nhóm là sự ghép tên của các thành viên, vd: "Phòng của Minh, Tuấn")?

## Verification Plan

### Automated Tests
1. **Lỗi Không Lên Điểm:** In log giá trị điểm thay đổi cục bộ sau khi đặt khối.
2. **Combo Bonus Test:** Giả lập thao tác tạo chuỗi ăn dòng liên tiếp > 10 và > 20 để xác thực con số nhận vào nhân đúng với hệ số 1.1 và 1.15.

### Manual Verification
Mở 2 tabs trình duyệt để tạo 2 users A và B, vào chung phòng Co-op. Lấy một kỷ lục X, thoát game. Tắt giả lập, dùng User C kết hợp User A. Kỳ vọng: C thấy Vương Miện = 0. Lại đổi qua User B, vào phòng User A. Kỳ vọng: A và B thấy Vương Miện = X.
