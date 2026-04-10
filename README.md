# VRM AI Chatbox - React + Vite

Hệ thống chatbot avatar 3D tương tác với AI (Gemini) và Text-to-Speech (Vclip). Ứng dụng được xây dựng với **React 18** + **Vite 7** cho hiệu suất cực cao và trải nghiệm người dùng mượt mà.

## ✨ Tính năng chính

- **3D Avatar Interactivity**: Mô hình VRM với animation thực tế sử dụng Three.js
- **Hội thoại AI**: Tích hợp Google Gemini API với model fallback tự động
- **Text-to-Speech**: Vclip voice synthesis cho phản hồi audio tự nhiên
- **Múi model linh hoạt**: Hỗ trợ phân kỳ 4 nhân vật VRM khác nhau
- **Hot Module Reload**: Phát triển nhanh với HMR từ Vite
- **Deploy dễ dàng**: Triển khai ngay lên Vercel Serverless

## 📁 Cấu trúc thư mục

```
Penguin-AI-Chatbot/
├── src/
│   ├── App.jsx                 # Root React component
│   ├── App.css                 # Styling
│   ├── components/
│   │   ├── VRMViewer.jsx       # Three.js scene & animation
│   │   ├── ControlsPanel.jsx   # VRM models & animation buttons
│   │   ├── ChatPanel.jsx       # Chat message & input
│   │   └── SpeechBubble.jsx    # Floating text bubble
│   └── hooks/
│       ├── useChatAPI.js       # Chat API integration
│       └── useTTSAudio.js      # TTS audio & lip-sync
├── api/
│   ├── chat.js                 # Chat API (Node.js)
│   └── tts.js                  # TTS API (Node.js)
├── public/
│   ├── VRM/                    # 3D models (.vrm)
│   │   ├── penguin.vrm
│   │   ├── frieren.vrm
│   │   ├── marin.vrm
│   │   └── reze.vrm
│   ├── VRMA/                   # Animations (.vrma)
│   ├── hdr/                    # Environment lighting
│   └── *                       # Static assets
├── index.html                  # HTML entry point
├── vite.config.js              # Vite configuration
├── package.json
├── .env                        # Environment variables
├── .env.example                # Environment template
└── vercel.json                 # Vercel deployment config
```

## 🔧 Yêu cầu môi trường

- **Node.js**: 18+ (khuyên dùng)
- **NPM**: 9+
- **API Keys**:
  - [Google Gemini API](https://aistudio.google.com/) - Chat AI
  - [Vclip API](https://docs.vclip.org/) - Text-to-Speech

## 🚀 Cài đặt & Chạy Local

### 1. Cài đặt thư viện

```bash
npm install
```

### 2. Thiết lập Environment Variables

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Điền đầy đủ API keys vào `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
VCLIP_API_KEY=your_vclip_api_key_here
VCLIP_VOICE_ID=your_vclip_voice_id_here

# Tuỳ chọn
# GEMINI_MODEL=gemini-3.1-flash-lite-preview
# MAX_REPLY_CHARS=260
```

### 3. Khởi chạy Development Server

```bash
npm run dev
```

Ứng dụng sẽ tự động mở tại: `http://127.0.0.1:8000`

**Lệnh trên sẽ khởi chạy 3 server đồng thời:**
- **8000** (Vite Frontend): Auto-reload khi sửa React components
- **8001** (Chat API): Node.js - Gemini integration
- **8002** (TTS API): Node.js - Vclip synthesis

## 🎮 Cách sử dụng

1. **Chọn nhân vật**: Dropdown "VRM Model" (trái)
2. **Bấm animation**: 11 nút hành động (Angry, Blush, Clapping, v.v.)
3. **Chat**: Nhập tin nhắn (phải) → Tổng tài sẽ trả lời + chạy animation + phát giọng

## 🤖 Cấu hình AI Model

Hệ thống hỗ trợ 3 model chính:
- `gemini-3.1-flash-lite-preview` ⭐ (mặc định) - Nhanh & quota tốt
- `gemini-3-flash-preview` - Chất lượng cao hơn
- `gemma-3-27b-it` - Dự phòng (quota dồi dào)

**Fallback tự động**: Nếu model chính gặp lỗi (quota, overload, v.v.), hệ thống tự chuyển sang model tiếp theo.

## 🏗️ Build & Production

### Build static files

```bash
npm run build
```

Output: `dist/` - sẵn sàng deploy.

## Triển khai công khai (Deploy lên Vercel)

1. Push code lên GitHub
2. Kết nối GitHub repo với [Vercel](https://vercel.com/)
3. Vercel tự động detect:
   - Vite build cho frontend
   - `api/` folder → Serverless Functions
4. Thêm Environment Variables trên Vercel dashboard:
   - `GEMINI_API_KEY`
   - `VCLIP_API_KEY`
   - `VCLIP_VOICE_ID`
5. Deploy & thưởng thức 🎉

## 📚 Stack Công nghệ

- **Frontend**: React 18, Vite 7, Three.js, @pixiv/three-vrm
- **Backend APIs**: Node.js, Express, Google Generative AI, Vclip
- **Styling**: Modern CSS (Glassmorphism, Gradients)
- **Build**: Vite (bundler), Nodemon (hot-reload)
- **Deployment**: Vercel Serverless, GitHub

## 🎓 Học hỏi thêm

- [Three.js Documentation](https://threejs.org/)
- [Pixiv VRM Libraries](https://github.com/pixiv/three-vrm)
- [Google Gemini API](https://ai.google.dev/)
- [Vite Guide](https://vitejs.dev/)

## ❤️ Credits

- **VRMA Animations**: Tham khảo từ [tk256ailab/vrm-viewer](https://github.com/tk256ailab/vrm-viewer)
- **3D Models**: VRM format by [VRoid Studio](https://vroid.com/)
- **AI Engine**: [Google Gemini](https://gemini.google.com/)

## 📄 License

MIT - Sử dụng tự do cho mục đích cá nhân & thương mại

---

**Hỏi? Gặp vấn đề?** Mở issue hoặc PR để cộng đồng giúp đỡ! 🚀
