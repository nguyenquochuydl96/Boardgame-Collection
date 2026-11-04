# Translation module (translate_vi.py) — reference

Shared module at `~/.hermes/scripts/translate_vi.py`. Import with:
```python
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from translate_vi import translate, translate_batch
```

## Endpoint & auth
- URLs (tried in order): `http://localhost:20128/v1/chat/completions`, then `http://localhost:20127/v1/chat/completions` fallback. The live port has moved before — never hardcode one port.
- Key: read from `~/.hermes/.env`, trying `HERMES_CUSTOM_LOCALHOST_20128_API_KEY` first, then `HERMES_CUSTOM_LOCALHOST_20127_API_KEY` (or same-named env vars).
- If every translation silently returns English verbatim, probe ports first (`curl -m 5 localhost:<port>/v1/models` with the matching key) before touching prompts or models. A script pointing at a dead port fails closed to originals with no error — indistinguishable from a prompt/model problem without the probe.
- This is a LOCAL gateway — no external API key/cost. Available only when the Hermes gateway is running.

## Model
- Use **`gemini/gemini-3.5-flash-lite`**. It translates EN→VI cleanly.
- DO NOT use `gemini/gemini-3-flash-preview` or `main`: both are reasoning models.
  They stream their chain-of-thought into `reasoning_content` and return an EMPTY or
  untranslated `content`. Verified failure mode: returns original English verbatim.

## Response format
- The gateway returns **SSE streaming**, not a single JSON object:
  ```
  data: {"id":...,"choices":[{"delta":{"role":"assistant"}}]}
  data: {"choices":[{"delta":{"content":"Xin"}}]}
  ...
  data: [DONE]
  ```
- Parse by splitting on lines, strip `data:` prefix, `json.loads` each, and concatenate
  `choices[0].message.content` (non-streaming) or `choices[0].delta.content` (streaming).
- A plain regex fallback on `"content":"..."` works if JSON parse fails.

## Functions
- `translate(text, max_chars=400)` — single string. Falls back to original on any error.
- `translate_batch(texts, max_chars=400)` — **preferred**. Sends all strings in ONE call
  with a numbered prompt ("1. ... 2. ..."), returns a list in the same order. Avoids
  per-item rate limits (endpoint returns 429 if you call it ~10+ times in quick succession).
  System prompt: "Bạn là người Việt bản xứ dịch tin tức. Dịch tự nhiên, gần gũi... Output ONLY the numbered list."
- Both cache results in a module-level dict so repeated runs are cheap.

## Tips
- Truncate long English titles to ~80 chars BEFORE translating (see `short_title` in the
  news scripts) so Vietnamese output stays one readable line.
- Decode HTML entities in source text first (`&#8211;`→`–`, `&#124;`→`|`, `&#039;`→`'`, etc.)
  so the translator doesn't see garbage.
- For Vietnamese-source feeds (VnExpress), skip translation entirely.
