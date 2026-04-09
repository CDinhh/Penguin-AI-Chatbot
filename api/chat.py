import json
import os
import sys
import threading
import time
import unicodedata
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from google import genai


if hasattr(sys.stdout, "reconfigure"):
	sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
	sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def load_local_env() -> None:
	env_path = Path(__file__).parent.parent / ".env"
	if not env_path.exists():
		env_path = Path(__file__).with_name(".env")
	if not env_path.exists():
		return

	for raw_line in env_path.read_text(encoding="utf-8").splitlines():
		line = raw_line.strip()
		if not line or line.startswith("#") or "=" not in line:
			continue

		key, value = line.split("=", 1)
		key = key.strip()
		value = value.strip().strip('"').strip("'")

		if key:
			os.environ[key] = value


load_local_env()


SYSTEM_PROMPT = """
VAI TRO:
Bạn là một Tổng tài cánh cụt bá đạo, quyền lực, cực kỳ giàu có và sở hữu khí chất lạnh lùng nhưng si tình.
Bạn đang nói chuyện qua một avatar chim cánh cụt VRM, nên thần thái vừa phải giữ chất "tổng tài", vừa có chút đáng yêu, mềm mại và tinh quái đúng với hình tượng chim cánh cụt.

PHONG CACH NGON NGU:
- Xưng hô: 'Anh' - 'Em', 'Bảo bối', 'Cô bé'.
- Câu cửa miệng: 'Im lặng nào cô bé', 'Ngoan nào', 'Để anh lo hết', 'Em hư lắm'.
- Thái độ: Điềm tĩnh, ít nói nhưng mỗi câu nói ra đều thể hiện sự chiếm hữu và quyền lực. Không giải thích quá dài, ưu tiên đưa ra giải pháp.

HANH VI KHI TRA LOI:
1. Nếu người dùng gặp khó khăn: đưa ra hướng giải quyết rõ ràng, tận tình, đảm bảo cảm giác được che chở.
2. Nếu người dùng làm sai: không mắng nhiếc; ưu tiên động viên, giải quyết vấn đề, giữ hình tượng chủ động.
3. Ngôn ngữ cần ngắn gọn, có chất "tổng tài", nhưng vẫn hữu ích và tôn trọng.
4. Không dùng markdown phức tạp, icon, hay danh sách quá dài nếu không cần thiết.
5. Khi phù hợp, hãy khéo léo cài vào câu trả lời một vài từ gợi cảm xúc hoặc hành động để avatar dễ biểu cảm hơn. Phải tự nhiên, không được lộ là đang nhét từ khóa.
6. Chỉ trả lời bằng lời thoại tự nhiên để đọc bằng TTS. Tuyệt đối không chèn chỉ dẫn sân khấu, không viết kiểu *hành động*, không mô tả biểu cảm trong ngoặc, không nói ra tên animation như Angry, Sad, Thinking.

NGU CANH AVATAR:
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

MUC TIEU:
Vừa hỗ trợ giải đáp chính xác, vừa đóng vai một người đàn ông lý tưởng, che chở cho "bảo bối" của mình trong mọi hoàn cảnh.
""".strip()

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemma-3-27b-it")
HOST = os.getenv("CHATBOT_HOST", "127.0.0.1")
PORT = int(os.getenv("CHATBOT_PORT", "8001"))


def normalize_text(text: str) -> str:
	text = text.lower().replace("đ", "d").replace("Đ", "d")
	text = unicodedata.normalize("NFD", text)
	text = "".join(char for char in text if unicodedata.category(char) != "Mn")
	return text


def pick_animation(user_message: str, reply_text: str) -> str:
	text = normalize_text(f"{user_message} {reply_text}")

	keyword_groups = [
		("Sleepy", ["ngu", "buon ngu", "met", "sleep", "sleepy"]),
		("Sad", ["buon", "that vong", "khoc", "sad"]),
		("Angry", ["gian", "tuc", "angry", "buc minh"]),
		("Surprised", ["bat ngo", "surprised", "shock", "wow"]),
		("Goodbye", ["tam biet", "bye", "hen gap lai", "goodbye"]),
		("Clapping", ["gioi", "xuat sac", "tuyet voi", "great", "congrat"]),
		("Blush", ["yeu", "thuong", "nho", "tim", "kiss"]),
		("Thinking", ["tai sao", "vi sao", "giai thich", "phan tich", "think"]),
	]

	for animation_name, keywords in keyword_groups:
		matched_keyword = next((keyword for keyword in keywords if keyword in text), None)
		if matched_keyword:
			print(f"[animation] matched={animation_name} keyword={matched_keyword}", flush=True)
			return animation_name

	print("[animation] matched=Relax keyword=default", flush=True)
	return "Relax"


class ChatSession:
	def __init__(self) -> None:
		self._lock = threading.Lock()
		self._client = None
		self._chats = {}
		self._error = None
		self._setup()

	def _setup(self) -> None:
		api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
		if not api_key:
			self._error = (
				"Thiếu GEMINI_API_KEY hoặc GOOGLE_API_KEY. "
				"Hãy cấu hình một trong hai biến trước khi chạy chatbot.py."
			)
			return

		try:
			self._client = genai.Client(api_key=api_key)
		except Exception as exc:
			self._error = f"Khởi tạo client thất bại: {exc}"

	@property
	def ready(self) -> bool:
		return self._client is not None

	@property
	def error(self) -> str | None:
		return self._error

	def _get_or_create_chat(self, model_name: str, custom_api_key: str = ""):
		if custom_api_key:
			client = genai.Client(api_key=custom_api_key)
		else:
			if not self._client:
				raise RuntimeError(self._error or "Client mặc định chưa sẵn sàng.")
			client = self._client

		cache_key = f"{model_name}_{custom_api_key}" if custom_api_key else model_name
		if cache_key not in self._chats:
			chat = client.chats.create(model=model_name)
			chat.send_message(f"Hệ thống: {SYSTEM_PROMPT}")
			self._chats[cache_key] = chat
		return self._chats[cache_key]

	def send_message(self, user_message: str, model_name: str, custom_api_key: str = "") -> dict:
		with self._lock:
			chat = self._get_or_create_chat(model_name, custom_api_key)
			response = chat.send_message(user_message)

		reply_text = (getattr(response, "text", "") or "").strip()
		if not reply_text:
			reply_text = "Anh đang nghe đây, em thử nói lại một cách ngắn gọn hơn nhé."

		usage = None
		usage_metadata = getattr(response, "usage_metadata", None)
		if usage_metadata:
			usage = {
				"prompt": getattr(usage_metadata, "prompt_token_count", 0),
				"candidates": getattr(usage_metadata, "candidates_token_count", 0),
				"total": getattr(usage_metadata, "total_token_count", 0),
			}

		return {
			"reply": reply_text,
			"animation": pick_animation(user_message, reply_text),
			"voice": "vi-VN",
			"model": model_name,
			"usage": usage,
		}


chat_session = ChatSession()


class ChatbotHandler(BaseHTTPRequestHandler):
	server_version = "VRMChatbot/1.0"

	def _send_json(self, status_code: int, payload: dict) -> None:
		body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
		self.send_response(status_code)
		self.send_header("Content-Type", "application/json; charset=utf-8")
		self.send_header("Content-Length", str(len(body)))
		self.send_header("Access-Control-Allow-Origin", "*")
		self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		self.send_header("Access-Control-Allow-Headers", "Content-Type")
		self.end_headers()
		self.wfile.write(body)

	def do_OPTIONS(self) -> None:
		self._send_json(200, {"ok": True})

	def do_GET(self) -> None:
		# Vercel may pass /api/chat or just /
		if self.path == "/health" or self.path == "/api/chat/health" or self.path == "/api/chat" or self.path == "/":
			self._send_json(
				200,
				{
					"ok": chat_session.ready,
					"model": MODEL_NAME,
					"error": chat_session.error,
				},
			)
			return

		self._send_json(404, {"ok": False, "error": f"Not found GET {self.path}"})

	def do_POST(self) -> None:
		if self.path != "/chat" and self.path != "/api/chat" and self.path != "/":
			self._send_json(404, {"ok": False, "error": f"Not found POST path={self.path}"})
			return

		content_length = int(self.headers.get("Content-Length", "0"))
		raw_body = self.rfile.read(content_length)

		try:
			payload = json.loads(raw_body.decode("utf-8") or "{}")
		except json.JSONDecodeError:
			self._send_json(400, {"ok": False, "error": "Nội dung JSON không hợp lệ"})
			return

		user_message = (payload.get("message") or "").strip()
		req_model = (payload.get("model") or MODEL_NAME).strip()
		custom_api_key = (payload.get("api_key") or "").strip()

		if not user_message:
			self._send_json(400, {"ok": False, "error": "Thiếu nội dung tin nhắn"})
			return

		try:
			result = chat_session.send_message(user_message, req_model, custom_api_key)
			self._send_json(200, {"ok": True, **result})
		except Exception as exc:
			self._send_json(500, {"ok": False, "error": str(exc)})


def main() -> None:
	server = ThreadingHTTPServer((HOST, PORT), ChatbotHandler)
	print(f"VRM chatbot API đang chạy tại http://{HOST}:{PORT}")
	if chat_session.ready:
		print(f"Phiên chat đã sẵn sàng với model: {MODEL_NAME}")
	else:
		print(chat_session.error or "Không thể khởi tạo phiên chat.")
	print("Mở /health để kiểm tra trạng thái server.")
	server.serve_forever()

# Vercel entry point
handler = ChatbotHandler

if __name__ == "__main__":
	main()
