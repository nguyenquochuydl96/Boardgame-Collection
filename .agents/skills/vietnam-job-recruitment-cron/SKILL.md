---
name: vietnam-job-recruitment-cron
description: Use when building Vietnam job digests.
version: 1
author: hermes-agent
license: MIT
metadata:
  hermes:
    tags: [jobs, recruitment, vietnam, telegram, cron, automation]
    related_skills: [telegram-news-cron, scheduled-market-report]
---

# Vietnam Job Recruitment Telegram Digest Cron

## When to Use
Use when building or maintaining automated daily job recruitment digests delivered to Telegram (e.g. Key Account, KAM, Business Development, Sales roles in HCMC from multiple Vietnam portals).

## Sources & Scraping Guidelines
1. **VietnamWorks API (`ms.vietnamworks.com`)**:
   - Endpoint: `POST https://ms.vietnamworks.com/job-search/v1.0/search`
   - Payload: `{"userId":0,"query":"<kw>","filter":[],"ranges":[],"order":[],"hitsPerPage":50,"page":0,"retrieveFields":["jobId","jobTitle","companyName","salaryMin","salaryMax","isSalaryVisible","workingLocations","createdOn","expiredOn"]}`
   - Location filter: Server-side city-filter parameters often fail or return 0 items. Fetch wide (`hitsPerPage: 50`) and filter client-side by `cityId == 29` or `cityName`/`cityNameVI` containing "ho chi minh" / "hcm".
2. **CareerViet (`careerviet.vn`)**:
   - Endpoint: `https://www.careerviet.vn/viec-lam/<Keyword>-k-vi.html` (hyphenated keywords, e.g., `Key-Account-k-vi.html`, `Business-Development-k-vi.html`).
   - Parsing: Each page lists 50 `class="job-item..."` blocks. Strip the leading class attribute artifact before splitting by HTML tags so fields align as `[title, company, salary, location]`.
   - Location filter: Fetch wide and filter client-side for "hồ chí minh" / "ho chi minh" / "hcm".

## Quality & Level Filtering Rules (Senior-targeted)
- **Level exclusion**: Exclude entry-level, junior, intern, or fresher titles using a regex:
  `\bintern\b|\bfresher\b|\bfresh\b|\bjunior\b|entry[\s-]?level|thực tập|thuc tap|mới tốt nghiệp|sinh viên|chưa có kinh nghiệm|không yêu cầu kinh nghiệm`.
- **Salary floor (minimum 20M VND)**:
  - If salary is undisclosed/negotiable (`Thương lượng`, `Cạnh tranh`, or empty), **always pass**.
  - If salary is visible, convert USD quotes (values < 100,000) using the current USD→VND rate (~26,000), and check the **maximum** of the range (`salaryMax` or upper bound). Drop the job if the max salary is below 20,000,000 VND.

## Output Format & Delivery
- Format: Plain text, one item per line, emoji section headers (`🔎`), bold via `*...*`, no markdown tables.
- Track seen IDs in a local state JSON file to mark new items with `🆕`.
- Follow strict user preference: **Never auto-test a job after creating/editing it** unless explicitly asked ("gửi test"). Deliver to the designated topic thread ID (e.g., `-1003952190147:581`).
