---
name: <tên-dự-án>-exploring
description: Khám phá kiến trúc <tên dự án> — đọc PROJECT-GRAPH trước, GitNexus MCP nếu có.
---

# Khám phá <tên dự án>

## Bước 1 — Bản đồ thủ công

1. Đọc **`docs/PROJECT-GRAPH.md`**
2. Mở 1–3 file từ §7 / §8
3. `grep` với `path` hẹp

## Bước 2 — GitNexus (nếu MCP đã cài)

```
READ gitnexus://repo/<tên-index>/context
query({ search_query: "...", repo: "<tên-index>" })
context({ name: "<symbol>", repo: "<tên-index>" })
```

Index cũ → `npx gitnexus@latest analyze`

## Vùng quan trọng (điền theo dự án)

| Chủ đề | File bắt đầu |
|--------|--------------|
| | |
