# VRM AI Chatbox

Ứng dụng chatbot avatar 3D chạy trên React + Vite, kết hợp:
- Chat AI (Google Gemini)
- Text-to-Speech (Vclip)
- VRM model + VRMA animation (Three.js / Pixiv VRM)

## Features

- VRM viewer realtime với background `Video` / `HDR`
- 4 model VRM có thể đổi ngay trong UI
- 19 animation VRMA (bao gồm `Dancing.vrma`)
- Chat panel + TTS + lip-sync theo audio
- Animation được AI trả về sẽ tự play và đồng bộ trạng thái nút active
- Loading overlay khi:
   - vào trang
   - switch VRM model
   - toggle background
- UI mới với:
   - font `Nunito`
   - đóng card bằng nút `X` góc phải
   - khi card đóng, hiện nút mũi tên ở viền để mở lại

## Tech Stack

- Frontend: React 18, Vite 7
- 3D: Three.js, `@pixiv/three-vrm`, `@pixiv/three-vrm-animation`
- UI libs: `framer-motion`, `lucide-react`
- Backend API: Node.js, Express
- AI: `@google/generative-ai`

## Project Structure

```txt
.
├── api/
│   ├── chat.js
│   └── tts.js
├── public/
│   ├── VRM/
│   ├── VRMA/
│   └── hdr/
├── src/
│   ├── components/
│   │   ├── VRMViewer.jsx
│   │   ├── ControlsPanel.jsx
│   │   ├── ChatPanel.jsx
│   │   └── SpeechBubble.jsx
│   ├── hooks/
│   │   ├── useChatAPI.js
│   │   └── useTTSAudio.js
│   ├── App.jsx
│   └── App.css
├── index.html
├── package.json
└── vercel.json
```

## Requirements

- Node.js 18+
- npm 9+
- API keys:
   - Gemini API key
   - Vclip API key
   - Vclip voice id

## Setup

1. Install dependencies

```bash
npm install
```

2. Create `.env` from `.env.example`

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

3. Fill env values

```env
GEMINI_API_KEY=your_gemini_key
VCLIP_API_KEY=your_vclip_key
VCLIP_VOICE_ID=your_voice_id
```

4. Run dev

```bash
npm run dev
```

Ports:
- `8000`: frontend (Vite)
- `8001`: chat API
- `8002`: tts API

## Commands

```bash
npm run dev        # run frontend + 2 backend APIs
npm run dev:viewer # frontend only
npm run dev:chatbot
npm run dev:tts
npm run build
```

## Animation List

Current animation buttons:

`Angry, Blush, Clapping, Dancing, Goodbye, Jump, LookAround, Relax, Sad, Sleepy, Surprised, Thinking, Show, Greeting, Peace, Shoot, Spin, Pose, Squat`

## Deploy (Vercel)

1. Push repo lên GitHub
2. Import project vào Vercel
3. Thêm env vars trên Vercel dashboard
4. Deploy

## Notes

- Nếu animation không highlight đúng nút: app hiện đã sync theo state trung tâm ở `App.jsx`.
- Nếu gặp vấn đề cổng bận khi chạy dev: script `predev` đã tự kill `8000/8001/8002`.
