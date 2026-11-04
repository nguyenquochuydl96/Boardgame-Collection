#!/usr/bin/env python3
"""Probe and drive a local page over Chrome DevTools Protocol.

Solves the loopback problem: browser_exec refuses 127.0.0.1, so launch a throwaway
headless Chromium on a private debug port, evaluate JS (measurements), optionally
click things, screenshot, then exit.

Usage:
  python3 cdp_probe.py <url> '<js body>' [--width 1440] [--height 1000] [--wait 3]
                       [--click '<js>']... [--shot /tmp/out.png]

The JS argument is the BODY of a function: `return` what you want printed as JSON.
Example:
  python3 cdp_probe.py http://127.0.0.1:3000/ \
    'return JSON.stringify({vw: innerWidth, sw: document.documentElement.scrollWidth});'

Requires: pip install websockets   (stdlib + websockets only)
"""
import asyncio, base64, json, os, shutil, signal, subprocess, sys, tempfile, time, urllib.request

CHROME = next(
    (p for p in (
        os.path.expanduser("~/.cache/ms-playwright/chromium-1234/chrome-linux/chrome"),
    ) if os.path.exists(p)),
    None,
)
PORT = int(os.environ.get("CDP_PROBE_PORT", "9334"))  # avoid a persistent 9333 debug instance


def find_chrome(explicit=None):
    if explicit:
        return explicit
    if CHROME:
        return CHROME
    for root in (os.path.expanduser("~/.cache/ms-playwright"),):
        for dirpath, _dirnames, filenames in os.walk(root):
            if "chrome" in filenames and dirpath.endswith("chrome-linux"):
                return os.path.join(dirpath, "chrome")
    raise RuntimeError("no Playwright chromium found; pass --chrome /path/to/chrome")


def launch(chrome, width, height):
    prof = tempfile.mkdtemp(prefix="cdp-prof-")
    args = [
        chrome, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
        f"--remote-debugging-port={PORT}", f"--window-size={width},{height}",
        f"--user-data-dir={prof}", "about:blank",
    ]
    p = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                         start_new_session=True)
    for _ in range(120):
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/version", timeout=0.5):
                return p, prof
        except Exception:
            time.sleep(0.1)
    raise RuntimeError("chrome did not open the debug port")


async def run(url, expr, width, height, wait, actions, shot):
    import websockets
    proc, prof = launch(find_chrome(), width, height)
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json") as r:
            tabs = [t for t in json.load(r) if t.get("type") == "page"]
        async with websockets.connect(tabs[0]["webSocketDebuggerUrl"],
                                      max_size=20 * 1024 * 1024) as ws:
            n = {"i": 0}

            async def cmd(method, **params):
                n["i"] += 1
                mid = n["i"]
                await ws.send(json.dumps({"id": mid, "method": method, "params": params}))
                while True:
                    msg = json.loads(await ws.recv())
                    if msg.get("id") == mid:
                        return msg

            await cmd("Page.enable")
            await cmd("Runtime.enable")
            await cmd("Page.navigate", url=url)
            await asyncio.sleep(wait)
            for a in actions:  # e.g. click a tab before measuring
                resp = await cmd("Runtime.evaluate", expression=a, returnByValue=True,
                                 awaitPromise=True)
                print("ACTION:", a[:70], "->", json.dumps(resp.get("result", {}))[:200])
                await asyncio.sleep(0.6)
            resp = await cmd("Runtime.evaluate", expression=f"(() => {{ {expr} }})()",
                             returnByValue=True, awaitPromise=True)
            if "exceptionDetails" in resp.get("result", {}) or resp.get("result", {}).get("subtype") == "error":
                print("JS ERROR", json.dumps(resp)[:800])
            if shot:
                img = await cmd("Page.captureScreenshot", format="png", captureBeyondViewport=False)
                with open(shot, "wb") as f:
                    f.write(base64.b64decode(img["result"]["data"]))
                print("SHOT:", shot)
            print(json.dumps(resp.get("result", {}).get("result", {}).get("value"),
                             ensure_ascii=False, indent=1))
    finally:
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
        except Exception:
            pass
        shutil.rmtree(prof, ignore_errors=True)


if __name__ == "__main__":
    url, expr = sys.argv[1], sys.argv[2]
    width, height, wait, shot, actions = 1440, 1000, 3.0, None, []
    args = sys.argv[3:]
    i = 0
    while i < len(args):
        k = args[i]
        if k == "--width":
            width = int(args[i + 1]); i += 2
        elif k == "--height":
            height = int(args[i + 1]); i += 2
        elif k == "--wait":
            wait = float(args[i + 1]); i += 2
        elif k == "--shot":
            shot = args[i + 1]; i += 2
        elif k == "--click":
            actions.append(args[i + 1]); i += 2
        else:
            i += 1
    asyncio.run(run(url, expr, width, height, wait, actions, shot))
