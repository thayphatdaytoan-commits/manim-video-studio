# Hướng dẫn GitNexus cho Manim Video Studio

> **Dành cho:** thầy/cô dùng Cursor Agent để sửa repo `manim-video-studio` mà không cần đọc hết 4000+ dòng code.

## GitNexus là gì?

[GitNexus](https://github.com/abhigyanpatwari/GitNexus) quét repo và tạo **đồ thị tri thức** (hàm nào gọi hàm nào, luồng API, cụm file liên quan). Agent Cursor dùng qua **MCP** để:

- Tìm luồng code nhanh hơn `grep` mù
- Biết **sửa hàm X sẽ ảnh hưởng chỗ nào** (impact analysis)
- Trace lỗi theo chuỗi gọi

## Hai lớp bản đồ trong repo này

| Lớp | File | Ai viết | Khi nào dùng |
|-----|------|---------|--------------|
| **Thủ công** | `docs/PROJECT-GRAPH.md` | Chúng ta | Luôn đọc trước — workflow giáo viên, API, layout Shorts |
| **Tự động** | GitNexus index + `AGENTS.md` | `npx gitnexus analyze` | Trace symbol, impact, debug sâu |

Hai lớp **bổ sung nhau**: PROJECT-GRAPH giải thích *nghiệp vụ dạy toán*; GitNexus giải thích *phụ thuộc code*.

## Cài trên Windows (một lần)

### 1. Cần có Node.js

Tải LTS từ [nodejs.org](https://nodejs.org/) nếu chưa có. Mở **PowerShell** hoặc **cmd** trong:

```
C:\Users\ADMIN\manim-video-studio
```

### 2. Index repo

```bat
npx gitnexus@latest analyze --skills
```

Lần đầu ~1–3 phút. Tạo:

- `.gitnexus/` (database cục bộ, không push lên GitHub)
- `AGENTS.md`, `CLAUDE.md` (hướng dẫn agent)
- `.claude/skills/gitnexus-*` (skill tự động theo vùng code)

**Lưu ý npm 11:** nếu `npx` báo lỗi `node.target`, cài global:

```bat
npm install -g gitnexus@latest
gitnexus analyze --skills
```

### 3. Bật MCP cho Cursor

```bat
npx gitnexus@latest setup
```

Chọn **Cursor**. Hoặc copy mẫu trong repo:

- File mẫu: `.cursor/mcp.json.example`
- Đích: `%USERPROFILE%\.cursor\mcp.json` (merge vào file có sẵn nếu đã có MCP khác)

Khởi động lại Cursor.

### 4. Sau mỗi lần `git pull` lớn

```bat
cd C:\Users\ADMIN\manim-video-studio
npx gitnexus@latest analyze
```

Hoặc chỉ cập nhật index (nhanh hơn):

```bat
npx gitnexus@latest analyze --index-only
```

## Ba skill workflow (học từ GitNexus)

Repo có bản **tiếng Việt + ngữ cảnh Manim** trong `.cursor/skills/`:

| Skill | Khi hỏi agent |
|-------|----------------|
| `manim-studio-exploring` | "Luồng ghép giọng beat chạy thế nào?" |
| `manim-studio-debugging` | "Compile xong không có tiếng?" |
| `manim-studio-impact` | "Sửa `manim_style.py` có ảnh hưởng gì?" |

Skill GitNexus gốc (tiếng Anh, chi tiết MCP): `.claude/skills/gitnexus-exploring`, `gitnexus-debugging`, `gitnexus-impact-analysis`.

## Ví dụ câu hỏi cho Cursor (sau khi cài MCP)

- *"Dùng GitNexus: ai gọi `merge_beats_voiceover`?"*
- *"Impact analysis trước khi đổi `SHORTS_TQH_LAYOUT_RULES`"*
- *"Trace từ `handleApplyBeatVoiceover` đến API backend"*

Agent sẽ gọi tool MCP `query`, `context`, `impact` thay vì đọc cả `App.jsx`.

## Skill vùng code tự sinh

Sau `analyze --skills`, GitNexus tạo skill theo cụm file:

- **`gitnexus-area-backend`** — `backend/main.py`, `generate.py`, TTS, validate
- **`gitnexus-area-examples`** — `backend/examples/style_shorts_*.py`
- Các cluster frontend (handlers trong `App.jsx`, timeline, …)

Xem danh sách đầy đủ trong `AGENTS.md` (mục GitNexus).

## Không bắt buộc cho giáo viên

Chỉ làm video Manim hàng ngày (`Mo-Manim-Studio.bat`) **không cần** GitNexus.

Chỉ cần khi:

- Nhờ Cursor/Cloud Agent **sửa code** repo
- Muốn agent **ít tốn token** và **ít sửa nhầm file**

## Dùng cho dự án khác (skill Cursor toàn cục)

Mẫu tái sử dụng đã ghi trong repo:

- **Skill global Cursor:** `project-graph-gitnexus` (trong `~/.cursor/skills/` sau khi copy hoặc chạy setup)
- **Template trong repo:** `.cursor/skills/project-graph-gitnexus/` + `references/PROJECT-GRAPH-TEMPLATE.md`

Khi bắt đầu repo mới, nói với Cursor: *"Áp dụng skill project-graph-gitnexus cho dự án này"* — agent sẽ tạo `docs/PROJECT-GRAPH.md`, 3 skill exploring/debugging/impact, và chạy `gitnexus analyze --skills`.

## Tài liệu thêm

- Project graph thủ công: `docs/PROJECT-GRAPH.md`
- Cursor Agent Manim: `docs/HUONG-DAN-CURSOR-AGENT-MANIM.md`
- GitNexus upstream: https://github.com/abhigyanpatwari/GitNexus
