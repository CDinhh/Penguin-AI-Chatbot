# Tổng tài Cánh Cụt - VRM AI Chatbox

Hệ thống chatbot avatar 3D tích hợp AI (Gemini) và Text-to-Speech (Vclip), hỗ trợ chạy đầy đủ dưới Local hoặc có thể Deploy trực tiếp thành một ứng dụng web hoàn chỉnh lên Vercel Serverless.

Dự án gồm 3 phần chính hoạt động trơn tru cùng nhau:
- `api/chat.py`: API Serverless bằng Python giao tiếp với Google Gemini.
- `api/tts.js`: API Serverless bằng Node.js (Express) để tổng hợp giọng nói cực mượt thông qua Vclip.
- `index.html`: Giao diện VRM viewer tương tác 3D chân thực ở frontend (Three.js & `@pixiv/three-vrm`).

## Cấu trúc thư mục

```text
Penguin-AI-Chatbot/
|- api/
|  |- chat.py       # Chat API (Python)
|  |- tts.js        # TTS API (Node.js)
|- dev-runner.mjs   # Script khởi chạy multi-service local
|- index.html       # Web App Frontend tĩnh
|- vercel.json      # Cấu hình định tuyến và deploy Vercel
|- package.json
|- .env
|- VRM/             # Mô hình 3D (.vrm)
|- VRMA/            # Gói Animations (.vrma)
|- hdr/             # Môi trường ánh sáng (.hdr)
```

## Yêu cầu môi trường (Chạy Local)

- Node.js (Khuyên dùng bản 18+)
- Python 3.10+ (Đã khởi tạo môi trường ảo `venv` và cài gói `google-genai`)
- Tài khoản và khoá API:
  - Gemini API Key
  - Vclip API Key (cho tính năng giọng nói)

## Cài đặt Local

### 1. Cài đặt các thư viện Node.js

```powershell
npm install
```

### 2. Thiết lập cấu hình `.env`

Tạo file `.env` (hoặc copy từ `.env.example`) đặt ngay tại thư mục gốc:

```env
GEMINI_API_KEY=your_gemini_api_key_here
VCLIP_API_KEY=your_vclip_api_key_here
VCLIP_VOICE_ID=your_vclip_voice_id_here
```

## Khởi chạy Local (Development)

Bạn chỉ cần duy nhất **MỘT LỆNH** để bật cả 3 thành phần (Frontend, Python Chat API, và Node.js TTS API):

```powershell
npm run dev
```

Sau đó mở trình duyệt tại địa chỉ: `http://127.0.0.1:8000`

Lệnh này hỗ trợ Auto-reload đỉnh cao:
- Sửa `index.html`: Dịch vụ Vite sẽ tự động làm mới giao diện trình duyệt tức thì.
- Sửa `api/chat.py`: Nodemon tự động Restart lại API Python ở cổng 8001.
- Sửa `api/tts.js`: Nodemon tự động Restart lại API Node ở cổng 8002.

## Triển khai công khai (Deploy lên Vercel)

Kiến trúc hiện tại đã được cấu hình chặt chẽ để deploy nguyên combo lên Vercel dưới dạng Serverless Functions vô cùng tiết kiệm chi phí mà không cần thiết lập máy chủ VPS:

1. Đẩy (Push) mã nguồn hiện tại lên một Github Repository của bạn.
2. Đăng nhập vào trang quản trị [Vercel](https://vercel.com/) và tạo nút "Add New Project" -> Import cái Repository vừa tạo.
3. Trong giao diện thiết lập, **bạn không cần cấu hình Framework Preset hay Build Command**. Vercel sẽ đọc file `vercel.json` và nhận diện: 
   - Trang Frontend sẽ được Serve tĩnh hoàn toàn (`index.html`).
   - Tự động map `api/chat.py` thành chức năng Python Endpoint tại `/api/chat`.
   - Tự động map `api/tts.js` bằng Express tích hợp vào `/api/tts`.
4. Quan trọng: Mở phần **Environment Variables** trên Vercel lên và thêm đầy đủ:
   - `GEMINI_API_KEY`
   - `VCLIP_API_KEY`
   - `VCLIP_VOICE_ID`
5. Bấm Deploy và đợi điều kì diệu xảy ra! Frontend sẽ tự động nhận biết nó đang ở môi trường Production và tự gọi đúng tới đường dẫn `/api` thay vì thiết lập localhost.

## Xử lý các lỗi cơ bản Local

### 1. Lỗi cổng bị chiếm (EADDRINUSE)
Thường thì khi tắt terminal hoặc crash app đột ngột, các cổng `8000`, `8001`, `8002` vẫn chạy ngầm. Có thể dùng lệnh `npm run predev` hoặc thao tác diệt Process cơ bản của Windows nếu bạn biết PID của nó.

### 2. TTS Server không lên tiếng
Kiểm tra endpoint `http://127.0.0.1:8002/health`. Nếu API trả về state lỗi thì có thể là Key VCLIP không hợp lệ hoặc model giọng `VCLIP_VOICE_ID` bị thay đổi.

### 3. Vercel gọi API bị báo lỗi 404 (Không tìm thấy Route)
Chắc chắn bạn đã sử dụng nhánh chính và không thay tên file/thư mục. Nếu sửa cấu trúc, hãy mở file `vercel.json` lên và khai báo lại `rewrites` cho đúng với vị trí file đặt.

## Nguồn tham khảo & Khâm định (Credits)

- **VRMA Animations**: Các file hoạt ảnh (animations) 3D sử dụng cho avatar trong thư mục `VRMA/` được tham khảo và trích xuất từ repository mã nguồn mở: [tk256ailab/vrm-viewerm](https://github.com/tk256ailab/vrm-viewerm). Xin gửi lời cám ơn tới tác giả.
