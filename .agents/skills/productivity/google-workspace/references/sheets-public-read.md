# Reading Google Sheets Without OAuth (Public/Link-Sharing)

When a user shares a Google Sheets link and you need to inspect or parse their data but OAuth credentials are not configured, use the Google Visualization API endpoint for read-only access.

## Endpoint Format

```
https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/gviz/tq?tqx=out:json&sheet=<SHEET_NAME>
```

- Extract `SPREADSHEET_ID` from URLs like `https://docs.google.com/spreadsheets/d/1ABC.../edit`
- URL-encode the sheet name (e.g., `Boardgame%20Collection` for "Boardgame Collection")
- Works for public sheets or sheets with "Anyone with the link" sharing enabled

## Response Format

Returns JSONP wrapped in `google.visualization.Query.setResponse(...)`. Strip the wrapper to get JSON:

```python
import urllib.request, json

url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:json&sheet={sheet_name}"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
text = urllib.request.urlopen(req, timeout=15).read().decode("utf-8")
json_str = text[text.index('{'):text.rindex('}')+1]
data = json.loads(json_str)

cols = data['table']['cols']  # Column headers
rows = data['table']['rows']  # Data rows
```

Each row's cells are in `row['c']` as `[{v: value, f: formatted}, ...]`.

## When to Use

- User asks you to "edit their Google Sheet" but only provides a view link
- You need to verify data structure or demonstrate what a parser extracts
- Confirming that user's existing format already works with an app's sync logic

## What NOT to Do

- Do not claim you can write/modify via this endpoint (read-only only)
- Do not insist on format changes when the current structure parses correctly
- If actual writes are needed, guide the user through OAuth setup instead
