# OẲN TÙ TÌ V2 – 9×9 STRATEGY BATTLE

Game Oẳn tù tì v2 (OTTv2) là một trò chơi chiến thuật 2 người chơi trên bàn cờ 9×9, được đồng bộ real-time nhờ thư viện PlayHTML. Không cần backend riêng, chỉ cần mở file trong trình duyệt.

## Công nghệ

- HTML5
- CSS3
- JavaScript ES Modules
- [PlayHTML](https://playhtml.fun/) – đồng bộ real-time không cần backend

## Cấu trúc thư mục

```
ottv2/
├── index.html
├── style.css
├── app.js
└── README.md
```

## Cài đặt & Chạy

### Cách 1: Mở trực tiếp

Mở file `index.html` trong trình duyệt hiện đại (Chrome, Edge, Firefox).

> Lưu ý: Một số tính năng PlayHTML hoạt động tốt nhất qua HTTP. Nếu gặp lỗi, dùng local server.

### Cách 2: Dùng local server (khuyến nghị)

```bash
# Python 3
python -m http.server 5500

# Node.js
npx serve .
```

Sau đó truy cập:

```
http://localhost:5500
```

## Luật chơi

### Bàn cờ

- Bàn cờ **9×9** với tọa độ cột **a–i** và hàng **1–9**.
- Hai ô đặc biệt: **a1** (góc trên-trái) và **i9** (góc dưới-phải), được đánh dấu bằng 🏁.

### Quân cờ

Mỗi người chơi có **9 quân**, chia thành 3 loại:

| Loại | Icon | Biểu tượng |
|------|------|------------|
| Đấm | 🥊 | p1-dam-1, p1-dam-2, p1-dam-3 |
| Lá | 🍃 | p1-la-1, p1-la-2, p1-la-3 |
| Kéo | ✂️ | p1-keo-1, p1-keo-2, p1-keo-3 |

### Di chuyển

- Mỗi quân đi **đúng 1 ô** mỗi lượt.
- Đi theo **8 hướng** (như quân Vua trong cờ vua):

```
↖  ↑  ↗
←  ●  →
↙  ↓  ↘
```

- Không được đi ra ngoài bàn cờ.
- Không được đi xuyên qua quân khác.

### Ăn quân

Quan hệ thắng/thua:

```
Đấm (🥊) > Kéo (✂️)
Kéo (✂️) > Lá (🍃)
Lá (🍃) > Đấm (🥊)
```

- **Cùng loại không ăn nhau**: Đấm gặp Đấm → không quân nào bị loại, chỉ chặn đường.
- Quân mạnh hơn có thể ăn quân yếu hơn khi di chuyển vào ô đó.

### Điều kiện thắng

Thắng khi thỏa mãn **MỘT trong hai**:

1. **Ăn hết một loại quân** của đối phương (ví dụ: đối phương không còn quân Kéo nào).
2. **Đưa quân vào ô a1 hoặc i9**.

### Lượt chơi

- Player 1 đi trước.
- Mỗi lượt chỉ di chuyển **một quân**.
- Chỉ người đang có lượt mới được thao tác.

## Multiplayer (Real-time)

### Cách tham gia

1. Mở game ở trình duyệt thứ nhất:

   ```
   http://localhost:5500/?room=ott123
   ```

2. Mở link **giống hệt** ở trình duyệt thứ hai (Edge, Chrome Incognito, hoặc Firefox):

   ```
   http://localhost:5500/?room=ott123
   ```

3. Hai người nhập tên và bấm **VÀO PHÒNG**.

4. Game bắt đầu tự động khi đủ 2 người.

### Sao chép link phòng

Trong màn hình lobby, bấm nút **📋 Sao chép link phòng** để gửi link cho bạn bè.

### Quan sát (Spectator)

Nếu người thứ 3 truy cập cùng room, họ sẽ thấy trận đấu nhưng không thể điều khiển.

## Cách PlayHTML đồng bộ

PlayHTML tạo một **channel dữ liệu dùng chung** theo từng phòng (room). Khi một người chơi cập nhật trạng thái game:

1. `gameData.setData((draft) => { ... })` ghi đè lên **draft mới nhất** của phòng.
2. PlayHTML tự động **broadcast** thay đổi đến tất cả client trong cùng room.
3. `gameData.onUpdate(() => { ... })` được gọi trên mọi trình duyệt để cập nhật giao diện.

Nhờ đó:
- Hai người chơi cùng nhìn thấy bàn cờ.
- Lượt chơi được đồng bộ ngay lập tức.
- Ăn quân, đếm quân, và điều kiện thắng được cập nhật real-time.
- Reset game được đồng bộ cho cả hai.

## Điều khiển

1. **Click quân của bạn** → quân được chọn sẽ phát sáng, các ô hợp lệ được đánh dấu.
2. **Click ô đích** (ô xanh lá) → quân di chuyển.
3. Nếu ô đích có quân đối phương:
   - Quân mạnh hơn ăn quân yếu hơn.
   - Cùng loại → không ăn nhau, nước đi bị từ chối.
4. **🔄 Chơi lại** chỉ xuất hiện khi game kết thúc.

## Tọa độ ví dụ

- Ô **a1**: góc trên-trái (🏁)
- Ô **i9**: góc dưới-phải (🏁)

## Kiểm thử Multiplayer

1. Mở **Browser 1** → `http://localhost:5500/?room=test123`
2. Mở **Browser 2** → `http://localhost:5500/?room=test123`
3. Kiểm tra:
   - Hai người nhìn thấy nhau trong panel Player 1 / Player 2.
   - Bàn cờ giống hệt nhau.
   - Player 1 đi → Player 2 thấy ngay.
   - Player 2 ăn quân → Player 1 thấy quân biến mất.
   - Game over / reset đồng bộ cho cả hai.

## Giải thích ngắn gọn về PlayHTML

- **Không cần backend**: PlayHTML dùng hạ tầng đám mây của họ để relay message giữa các tab/trình duyệt.
- **Room-based**: Mỗi room có `roomId` riêng, hai tab cùng `?room=abc` sẽ được đồng bộ với nhau.
- **Atomic-ish updates**: Dùng mutator `(draft) => { draft.field = value }` để tránh ghi đè lẫn nhau.
- **Real-time**: Thay đổi từ một client được phản ánh trên các client khác gần như tức thì.

## License

Bài tập học tập – không sử dụng cho mục đích thương mại.
