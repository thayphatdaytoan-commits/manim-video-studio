---
name: project-graph-gitnexus
description: Thiết lập và dùng bản đồ dự án hai lớp (PROJECT-GRAPH + GitNexus) cho bất kỳ repo nào — tiết kiệm token, explore/debug/impact an toàn. Dùng khi bắt đầu dự án mới, onboard agent, hoặc user yêu cầu "ghi nhớ skill GitNexus".
---

# Project Graph + GitNexus (mọi dự án)

Mẫu học từ [GitNexus](https://github.com/abhigyanpatwari/GitNexus) + `manim-video-studio`. Áp dụng cho **bất kỳ** codebase khi Cursor Agent cần sửa code mà không quét cả repo.

## Hai lớp bản đồ (luôn dùng cả hai)

| Lớp | File | Nội dung | Ai tạo |
|-----|------|----------|--------|
| **Thủ công** | `docs/PROJECT-GRAPH.md` | Kiến trúc, workflow người dùng, API, file map, chỉ mục sửa nhanh | Agent/human, ~150–250 dòng |
| **Tự động** | GitNexus index + `AGENTS.md` | Symbol, call graph, clusters, execution flows | `npx gitnexus analyze --skills` |

**Quy tắc agent:** đọc `PROJECT-GRAPH.md` trước → dùng GitNexus MCP cho trace/impact → chỉ mở 1–3 file liên quan.

## Bootstrap dự án mới (checklist)

Khi user nói *"áp dụng skill graph cho repo này"* hoặc bắt đầu làm việc lâu dài trên repo lớn:

```
[ ] 1. Tạo docs/PROJECT-GRAPH.md (mục 1–8 bên dưới)
[ ] 2. Tạo .cursor/skills/<tên-dự-án>-graph/SKILL.md → trỏ PROJECT-GRAPH
[ ] 3. Tạo 3 skill: <tên>-exploring, <tên>-debugging, <tên>-impact (copy từ template)
[ ] 4. Tạo .cursor/rules/project-graph.mdc (alwaysApply: true)
[ ] 5. Chạy: npx gitnexus@latest analyze --skills
[ ] 6. Thêm .gitignore: .gitnexus/* !.gitnexus/run.cjs !.gitnexus/.gitignore
[ ] 7. Commit: AGENTS.md, .claude/skills/gitnexus-*, .cursor/skills/*, docs/PROJECT-GRAPH.md
[ ] 8. (Một lần/máy) npx gitnexus@latest setup → Cursor MCP
```

## Cấu trúc PROJECT-GRAPH.md (template)

```markdown
# <Tên dự án> — PROJECT GRAPH

## 1. Kiến trúc (mermaid hoặc ascii)
## 2. Luồng người dùng / workflow chính
## 3. Mô hình dữ liệu trung tâm (schema JSON / DB)
## 4. Các đường xử lý quan trọng (nếu có)
## 5. Quy tắc nghiệp vụ / convention code
## 6. API / CLI index
## 7. File map (chỉ file quan trọng)
## 8. Chỉ mục sửa nhanh (triệu chứng → file)
## 9. Phụ thuộc / stack
## 10. Git / nhánh
## 11. GitNexus (tùy chọn — link HUONG-DAN hoặc lệnh re-index)
```

Cập nhật PROJECT-GRAPH trong **cùng PR** khi thêm API/module/UI lớn.

## Ba skill workflow (mỗi dự án)

Đặt tên theo repo, ví dụ `myapp-exploring`:

| Skill | Khi dùng | GitNexus gốc |
|-------|----------|--------------|
| `<repo>-exploring` | Hiểu kiến trúc, luồng mới | `gitnexus-exploring` |
| `<repo>-debugging` | Lỗi, triệu chứng → file | `gitnexus-debugging` |
| `<repo>-impact` | Sửa/refactor an toàn | `gitnexus-impact-analysis` |

Mỗi skill project-specific:
1. Bước 1: đọc `docs/PROJECT-GRAPH.md` + §8 chỉ mục nhanh
2. Bước 2: GitNexus MCP (`query`, `context`, `impact`, `trace`) với `repo: "<tên-index>"`
3. Bảng triệu chứng / vùng code **của dự án đó** (không copy nguyên từ Manim)

Template copy: `.cursor/skills/project-graph-gitnexus/references/` trong repo `manim-video-studio`, hoặc xem skill sibling `project-graph-gitnexus-bootstrap`.

## GitNexus MCP (một lần trên máy dev)

```bash
npx gitnexus@latest setup    # ghi ~/.cursor/mcp.json
```

Trong repo:

```bash
npx gitnexus@latest analyze --skills
# sau pull lớn:
npx gitnexus@latest analyze
```

**npm 11 lỗi npx:** `npm i -g gitnexus@latest` rồi `gitnexus analyze --skills`.

## Quy tắc token (mọi repo)

| Làm | Không làm |
|-----|-----------|
| PROJECT-GRAPH + 1–3 file | Đọc file khổng lồ toàn bộ |
| `grep` với `path` hẹp | `glob **/*` qua node_modules |
| `impact` trước khi đổi API public | Find-replace rename xuyên repo |
| `detect_changes` trước commit | Commit mù không kiểm tra graph |

## Rule Cursor (.cursor/rules/project-graph.mdc)

```yaml
---
description: Bản đồ dự án — agent đọc trước khi explore
alwaysApply: true
---
Trước khi grep/Task explore toàn repo, đọc **docs/PROJECT-GRAPH.md**.
Skills: `<repo>-graph`, `<repo>-exploring`, `<repo>-debugging`, `<repo>-impact`.
GitNexus: AGENTS.md, MCP gitnexus (nếu đã cài).
```

## Ví dụ đã áp dụng

- **manim-video-studio:** `docs/PROJECT-GRAPH.md`, `docs/HUONG-DAN-GITNEXUS.md`, skills `manim-studio-*`

## Khi user nói "ghi nhớ skill này"

→ Áp dụng checklist bootstrap cho repo hiện tại hoặc copy folder `.cursor/skills/project-graph-gitnexus/` sang dự án mới và đổi tên prefix skill.
