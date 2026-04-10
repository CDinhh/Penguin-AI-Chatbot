# Tổng tài Cánh Cụt - VRM AI Chatbox

Hệ thống chatbot avatar 3D tích hợp AI (Gemini) và Text-to-Speech (Vclip), hỗ trợ chạy đầy đủ dưới Local hoặc có thể Deploy trực tiếp thành một ứng dụng web hoàn chỉnh lên Vercel Serverless.

Dự án hiện đã được chuyển đổi sang **100% Node.js** để đảm bảo tính ổn định tối đa và hiệu suất cao nhất khi triển khai trên Vercel.

Dự án gồm 3 phần chính hoạt động trơn tru cùng nhau:
- `api/chat.js`: API Serverless bằng Node.js giao tiếp với Google Gemini (tối ưu model và fallback tự động).
- `api/tts.js`: API Serverless bằng Node.js (Express) để tổng hợp giọng nói cực mượt thông qua Vclip.
- `index.html`: Giao diện VRM viewer tương tác 3D chân thực ở frontend (Three.js & `@pixiv/three-vrm`).

## Cấu trúc thư mục

```text
Penguin-AI-Chatbot/
|- api/
|  |- chat.js       # Chat API (Node.js)
|  |- tts.js        # TTS API (Node.js)
|- dev-runner.mjs   # Script khởi chạy multi-service local
|- index.html       # Web App Frontend tĩnh
|- list-models.mjs  # Script liệt kê model khả dụng từ API key hiện tại
|- vercel.json      # Cấu hình định tuyến và deploy Vercel
|- package.json
|- .env
|- public/
|  |- VRM/          # Mô hình 3D (.vrm)
|  |- VRMA/         # Gói Animations (.vrma)
|  |- hdr/          # Môi trường ánh sáng (.hdr)
```

## Cấu hình model chat (Khuyên dùng)

Ứng dụng hiện tối ưu cho 3 model chính:
- `gemini-3.1-flash-lite-preview` (mặc định): nhanh và quota tốt.
- `gemini-3-flash-preview`: chất lượng nhỉnh hơn, quota thấp hơn.
- `gemma-3-27b-it`: model dự phòng quota cao để giữ hội thoại không bị gián đoạn.

Logic fallback tự động trong `api/chat.js`:
1. Bắt đầu từ model đang chọn (mặc định là Flash Lite).
2. Nếu gặp lỗi tạm thời như `429`, `503`, `quota`, `high demand`, hệ thống tự chuyển sang model kế tiếp.
3. Thứ tự fallback: `gemini-3.1-flash-lite-preview` -> `gemini-3-flash-preview` -> `gemma-3-27b-it`.

## Yêu cầu môi trường (Chạy Local)

- Node.js (Khuyên dùng bản 18+)
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

# Tuỳ chọn
# GEMINI_MODEL=gemini-3.1-flash-lite-preview
# MAX_REPLY_CHARS=260
```

Ghi chú:
- Nếu không đặt `GEMINI_MODEL`, hệ thống dùng mặc định `gemini-3.1-flash-lite-preview`.
- `MAX_REPLY_CHARS` giúp giới hạn độ dài câu trả lời để TTS đọc gọn hơn.

### Kiểm tra danh sách model khả dụng theo API key hiện tại

```powershell
node list-models.mjs
```

Lệnh trên sẽ gọi `ListModels` và in ra các model hỗ trợ `generateContent`.

## Khởi chạy Local (Development)

Bạn chỉ cần duy nhất **MỘT LỆNH** để bật cả 3 thành phần (Frontend, Chat API, và TTS API):

```powershell
npm run dev
```

Sau đó mở trình duyệt tại địa chỉ: `http://127.0.0.1:8000`

Lệnh này hỗ trợ Auto-reload đỉnh cao:
- Sửa `index.html`: Dịch vụ Vite sẽ tự động làm mới giao diện trình duyệt tức thì.
- Sửa `api/chat.js`: Nodemon tự động Restart lại API Chat ở cổng 8001.
- Sửa `api/tts.js`: Nodemon tự động Restart lại API TTS ở cổng 8002.

## Triển khai công khai (Deploy lên Vercel)

Kiến trúc hiện tại đã được cấu hình chặt chẽ để deploy nguyên combo lên Vercel dưới dạng Serverless Functions (Node.js Runtimes):

1. Đẩy (Push) mã nguồn hiện tại lên một Github Repository của bạn.
2. Đăng nhập vào trang quản trị [Vercel](https://vercel.com/) và tạo nút "Add New Project" -> Import cái Repository vừa tạo.
3. Trong giao diện thiết lập, Vercel sẽ tự động nhận diện: 
   - Trang Frontend (`index.html`) qua Vite build.
   - Tự động map `api/chat.js` và `api/tts.js` thành các Serverless Functions.
4. Quan trọng: Mở phần **Environment Variables** trên Vercel lên và thêm đầy đủ:
   - `GEMINI_API_KEY`
   - `VCLIP_API_KEY`
   - `VCLIP_VOICE_ID`
5. Bấm Deploy và tận hưởng thành quả!

## Nguồn tham khảo & Khâm định (Credits)

- **VRMA Animations**: Các file hoạt ảnh (animations) 3D sử dụng cho avatar trong thư mục `VRMA/` được tham khảo và trích xuất từ repository mã nguồn mở: [tk256ailab/vrm-viewerm](https://github.com/tk256ailab/vrm-viewerm). Xin gửi lời cám ơn tới tác giả.
