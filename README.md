# VKU Field Survey PWA + Capacitor

Ứng dụng khảo sát cơ sở vật chất tại trường đại học VKU, được xây dựng dưới dạng PWA và đóng gói bằng Capacitor để chạy trên thiết bị di động Android. Ứng dụng hỗ trợ lưu dữ liệu offline, chụp ảnh minh chứng, lấy tọa độ GPS và tự động đồng bộ dữ liệu lên Google Sheets khi có mạng.

## 1. Tổng quan

Dự án này là một ứng dụng khảo sát thực tế cho các khu vực trong trường như phòng học, khu vệ sinh, khu giảng đường, ký túc xá và các khu tiện ích. Người dùng có thể:

- nhập thông tin khảo sát theo từng vị trí
- chọn trạng thái: đạt chuẩn, cần xử lý, nghiêm trọng
- chụp ảnh minh chứng bằng camera thiết bị
- lấy vị trí GPS hiện tại
- lưu dữ liệu local ngay cả khi offline
- đồng bộ dữ liệu lên Google Sheets khi kết nối mạng trở lại

## 2. Tính năng chính

- Responsive UI tối ưu cho màn hình điện thoại
- Form khảo sát chi tiết cho cơ sở vật chất VKU
- Lưu dữ liệu vào IndexedDB bằng Dexie
- Hỗ trợ offline-first
- Tự động phát hiện trạng thái mạng
- Auto-sync dữ liệu khi có internet
- Gửi thông báo local notification sau khi đồng bộ thành công
- Chụp ảnh và lưu vào gallery của thiết bị
- Đồng bộ dữ liệu lên Google Apps Script / Google Sheets

## 3. Công nghệ sử dụng

- HTML5, CSS3, JavaScript
- Tailwind CSS
- Dexie + IndexedDB
- Capacitor
- Capacitor Camera
- Capacitor Geolocation
- Capacitor Network
- Capacitor Local Notifications
- Google Apps Script để kết nối Google Sheets

## 4. Cấu trúc project

```bash
.
├── android/                  # Dự án Android do Capacitor tạo ra
├── css/
│   └── styles.css           # CSS tùy chỉnh
├── icons/                   # Icon của PWA
├── js/
│   ├── app.js               # Logic chính của ứng dụng
│   ├── db.js                # IndexedDB / Dexie
│   ├── native-features.js   # Camera, GPS, Notification
│   ├── sw-register.js       # Đăng ký service worker
│   └── app.js               # Main logic
├── index.html               # Giao diện chính
├── manifest.json            # Metadata của PWA
├── sw.js                    # Service Worker
├── capacitor.config.json    # Cấu hình Capacitor
├── package.json             # Script build & sync
├── README.md                # Hướng dẫn dự án
└── Mini-Project-1-Report-Template.md
```

## 5. Cài đặt và chạy dự án

### Bước 1: Cài đặt dependencies

```bash
npm install
```

### Bước 2: Build PWA ra thư mục `www`

```bash
npm run build
```

### Bước 3: Đồng bộ với Capacitor

```bash
npm run sync
```

Lệnh này sẽ:
- build lại app
- copy file vào thư mục `www`
- chạy `npx cap sync`

### Bước 4: Mở Android Studio

```bash
npx cap open android
```

Hoặc bạn có thể chạy trực tiếp trên Android emulator/devices từ Android Studio.

## 6. Cấu hình đồng bộ Google Sheets

Trong file `js/app.js`, có biến sau:

```js
const GOOGLE_SHEET_API_URL = "https://script.google.com/macros/s/....../exec";
```

Bạn cần thay bằng URL của Google Apps Script tương ứng để dữ liệu được gửi lên Google Sheets.

## 7. Quy trình hoạt động

1. Người dùng nhập dữ liệu khảo sát.
2. Hệ thống lưu dữ liệu vào IndexedDB ngay lập tức.
3. Nếu thiết bị đang online, dữ liệu sẽ được gửi tới Google Sheets.
4. Nếu offline, dữ liệu sẽ nằm trong hàng đợi chờ đồng bộ.
5. Khi mạng ổn định trở lại, ứng dụng tự động đồng bộ.

## 8. Lưu ý quan trọng

- Ứng dụng cần cấp quyền Camera, vị trí GPS và thông báo thiết bị để hoạt động đầy đủ.
- Khi thử nghiệm trên browser, một số tính năng native như Camera/GPS có thể hoạt động khác biệt so với Android app.
- Nếu không có mạng, dữ liệu vẫn được lưu trên thiết bị và sẽ được đồng bộ sau.

## 9. Kết luận

Dự án này mang lại giải pháp khảo sát hiện trường cho trường học với mô hình offline-first, phù hợp cho các tình huống cần thu thập dữ liệu ở nơi không có kết nối internet ổn định. Việc kết hợp PWA và Capacitor giúp ứng dụng dễ triển khai trên nhiều thiết bị và thuận tiện cho việc kiểm tra thực tế ở môi trường trường học.

## 10. Liên hệ / Ghi chú

Dự án này là một mini-project môn Cross-Platform Mobile App Development (VKU), dùng để minh họa việc xây dựng ứng dụng mobile tích hợp khả năng lưu trữ local, chụp ảnh, định vị GPS và tự đồng bộ dữ liệu.
