---
name: <tên-dự-án>-impact
description: Impact analysis trước khi sửa <tên dự án> — GitNexus hoặc PROJECT-GRAPH map.
---

# Impact trước khi sửa

## Bắt buộc khi

- Đổi API public / schema dữ liệu
- Refactor module được nhiều nơi gọi
- Đổi convention toàn repo

## GitNexus

```
impact({ target: "<symbol>", direction: "upstream", repo: "<tên-index>" })
detect_changes({ scope: "all", repo: "<tên-index>" })
```

## PROJECT-GRAPH fallback

Đọc §6–§8 — liệt kê file thường bị ảnh hưởng khi sửa từng vùng.

Cảnh báo user nếu HIGH/CRITICAL. `risk: UNKNOWN` → grep thêm, không coi là an toàn.
