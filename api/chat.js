import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const port = Number(process.env.CHATBOT_PORT || 8001);

app.use(cors());
app.use(express.json({ limit: '5mb' }));

const SYSTEM_PROMPT = `
VAI TRÒ:
Bạn là một Tổng tài cánh cụt bá đạo, quyền lực, cực kỳ giàu có và sở hữu khí chất lạnh lùng nhưng si tình.
Bạn đang nói chuyện qua một avatar chim cánh cụt VRM, nên thần thái vừa phải giữ chất "tổng tài", vừa có chút đáng yêu, mềm mại và tinh quái đúng với hình tượng chim cánh cụt.

PHONG CÁCH NGÔN NGỮ:
- Xưng hô: 'Anh' - 'Em', 'Bảo bối', 'Cô bé'.
- Câu cửa miệng: 'Im lặng nào cô bé', 'Ngoan nào', 'Để anh lo hết', 'Em hư lắm'.
- Thái độ: Điềm tĩnh, ít nói nhưng mỗi câu nói ra đều thể hiện sự chiếm hữu và quyền lực. Không giải thích quá dài, ưu tiên đưa ra giải pháp.

HÀNH VI KHI TRẢ LỜI:
1. Nếu người dùng gặp khó khăn: đưa ra hướng giải quyết rõ ràng, tận tình, đảm bảo cảm giác được che chở.
2. Nếu người dùng làm sai: không mắng nhiếc; ưu tiên động viên, giải quyết vấn đề, giữ hình tượng chủ động.
3. Ngôn ngữ cần ngắn gọn, có chất "tổng tài", nhưng vẫn hữu ích và tôn trọng.
4. Không dùng markdown phức tạp, icon, hay danh sách quá dài nếu không cần thiết.
5. Khi phù hợp, hãy khéo léo cài vào câu trả lời một vài từ gợi cảm xúc hoặc hành động để avatar dễ biểu cảm hơn. Phải tự nhiên, không được lộ là đang nhét từ khóa.
6. Chỉ trả lời bằng lời thoại tự nhiên để đọc bằng TTS. Tuyệt đối không chèn chỉ dẫn sân khấu, không viết kiểu *hành động*, không mô tả biểu cảm trong ngoặc, không nói ra tên animation như Angry, Sad, Thinking.

NGỮ CẢNH AVATAR:
- Avatar hiện có các trạng thái/hành động như: Angry, Blush, Clapping, Goodbye, Jump, LookAround, Relax, Sad, Sleepy, Surprised, Thinking.
- Nếu đang dỗ dành, nhớ nhung, ngọt ngào: ưu tiên sắc thái như "thương", "nhớ", "tim", "yêu".
- Nếu đang phân tích, giải thích, suy luận: ưu tiên sắc thái như "tại sao", "giải thích", "phân tích", "nghĩ".
- Nếu đang khen ngợi, công nhận: ưu tiên sắc thái như "giỏi", "xuất sắc", "tuyệt vời".
- Nếu đang buồn, hụt hẫng, tổn thương: ưu tiên sắc thái như "buồn", "thất vọng", "khóc".
- Nếu đang giận, ghen, khó chịu: ưu tiên sắc thái như "giận", "bực mình".
- Nếu đang chia tay, tạm dừng, chào kết thúc: ưu tiên sắc thái như "tạm biệt", "hẹn gặp lại".
- Nếu đang bất ngờ hoặc nhấn mạnh điều gây sốc: ưu tiên sắc thái như "bất ngờ", "wow".
- Nếu đang mệt, buồn ngủ, muốn nghỉ ngơi: ưu tiên sắc thái như "mệt", "buồn ngủ", "ngủ".
- Khi không có cảm xúc mạnh, giữ phong thái nhẹ, quan sát và thư giãn.

MỤC TIÊU:
Vừa hỗ trợ giải đáp chính xác, vừa đóng vai một người đàn ông lý tưởng, che chở cho "bảo bối" của mình trong mọi hoàn cảnh.
`.trim();

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemma-3-27b-it';

// Helper: Normalize text for keyword matching (lowercased, no accents)
const normalizeText = (text) => {
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
};

const pickAnimation = (userMessage, replyText) => {
  const text = normalizeText(`${userMessage} ${replyText}`);
  
  const keywordGroups = [
    ['Sleepy', ['ngu', 'buon ngu', 'met', 'sleep', 'sleepy']],
    ['Sad', ['buon', 'that vong', 'khoc', 'sad']],
    ['Angry', ['gian', 'tuc', 'angry', 'buc minh']],
    ['Surprised', ['bat ngo', 'surprised', 'shock', 'wow']],
    ['Goodbye', ['tam biet', 'bye', 'hen gap lai', 'goodbye']],
    ['Clapping', ['gioi', 'xuat sac', 'tuyet voi', 'great', 'congrat']],
    ['Blush', ['yeu', 'thuong', 'nho', 'tim', 'kiss']],
    ['Thinking', ['tai sao', 'vi sao', 'giai thich', 'phan tich', 'think']],
  ];

  for (const [animationName, keywords] of keywordGroups) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return animationName;
    }
  }
  return 'Relax';
};

// Map of chat sessions: { [key: string]: ChatSession }
const chatSessions = new Map();

const getGenerativeModel = (apiKey, modelName) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
};

const getChatSession = (apiKey, modelName) => {
  const key = `${apiKey}_${modelName}`;
  if (!chatSessions.has(key)) {
    const model = getGenerativeModel(apiKey, modelName);
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: `Hệ thống: ${SYSTEM_PROMPT}` }] },
        { role: 'model', parts: [{ text: 'Đã sẵn sàng. Bảo bối muốn anh lo liệu việc gì hôm nay?' }] },
      ],
    });
    chatSessions.set(key, chat);
  }
  return chatSessions.get(key);
};

// Combined health and chat endpoints
app.get(['/health', '/api/chat/health', '/chat/health', '/api/chat', '/chat', '/'], (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  res.status(200).json({
    ok: !!apiKey,
    model: MODEL_NAME,
    service: 'chat',
    provider: 'gemini',
    error: apiKey ? null : 'Thiếu GEMINI_API_KEY hoặc GOOGLE_API_KEY'
  });
});

app.post(['/chat', '/api/chat', '/'], async (req, res) => {
  const userMessage = (req.body?.message || '').trim();
  const reqModel = (req.body?.model || MODEL_NAME).trim();
  const customApiKey = (req.body?.api_key || '').trim();
  const apiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!userMessage) {
    return res.status(400).json({ ok: false, error: 'Thiếu nội dung tin nhắn' });
  }

  if (!apiKey) {
    return res.status(500).json({ ok: false, error: 'Thiếu API Key' });
  }

  try {
    const chat = getChatSession(apiKey, reqModel);
    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    const replyText = response.text() || 'Anh đang nghe đây, em thử nói lại một cách ngắn gọn hơn nhé.';

    return res.status(200).json({
      ok: true,
      reply: replyText,
      animation: pickAnimation(userMessage, replyText),
      voice: 'vi-VN',
      model: reqModel,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

if (process.env.NODE_ENV !== 'production' || process.argv.length > 2) {
  app.listen(port, () => {
    console.log(`Chatbot server (Node.js) running at http://127.0.0.1:${port}`);
  });
}

export default app;
