# /// script
# dependencies = [
#   "aiohttp",
#   "watchdog",
# ]
# ///

"""
Python dev server with live-reload and extensionless module/image handling.

Features:
- Serves index.html (injecting a reload websocket script)
- Serves any file under cwd, guessing MIME
- For /content/<hash> with no extension: sniff first bytes -> image/* or application/javascript
- For /r/metadata/<id> with no extension: serve as application/json
- WebSocket at /ws; on main.js save, broadcasts 'reload' to clients

Dependencies:
  pip install aiohttp watchdog

Run:
  python dev_server.py

"""
import os
import imghdr
import asyncio
from aiohttp import web
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# keep track of websocket clients
dealers = set()

async def ws_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    dealers.add(ws)
    try:
        async for _ in ws:
            pass
    finally:
        dealers.remove(ws)
    return ws

async def index(request):
    # serve index.html with live-reload injection
    p = os.path.join(os.getcwd(), 'index.html')
    text = open(p, 'r', encoding='utf-8').read()
    snippet = (
        "<script>"
        "const ws=new WebSocket(`ws://${location.host}/ws`);"
        "ws.onmessage=e=>e.data==='reload'&&location.reload();"
        "</script>"
    )
    text = text.replace('</body>', snippet + '</body>')
    return web.Response(text=text, content_type='text/html')

# guess correct MIME for static files
def guess_mime(fp, url):
    # extensionless content => sniff
    if url.startswith('/content/') and not os.path.splitext(url)[1]:
        try:
            hdr = open(fp, 'rb').read(512)
            t = imghdr.what(None, hdr)
            if t:
                if t == 'jpeg': return 'image/jpeg'
                return f'image/{t}'
        except: pass
        return 'application/javascript'
    # metadata JSON
    if url.startswith('/r/metadata/') and not os.path.splitext(url)[1]:
        return 'application/json'
    # fallback
    import mimetypes
    mt, _ = mimetypes.guess_type(fp)
    return mt or 'application/octet-stream'

async def static_handler(request):
    url = request.path
    local = os.path.join(os.getcwd(), url.lstrip('/'))
    if os.path.isdir(local):
        return await index(request)
    if not os.path.exists(local):
        raise web.HTTPNotFound()
    mime = guess_mime(local, url)
    return web.FileResponse(local, headers={'Content-Type': mime})

async def broadcast_reload():
    for ws in dealers.copy():
        await ws.send_str('reload')

def start_watcher(loop):
    class Watcher(FileSystemEventHandler):
        def on_modified(self, event):
            if os.path.basename(event.src_path) == 'main.js':
                asyncio.run_coroutine_threadsafe(broadcast_reload(), loop)
    obs = Observer()
    obs.schedule(Watcher(), path='.', recursive=False)
    obs.start()

async def init_app():
    app = web.Application()
    app.router.add_get('/', index)
    app.router.add_get('/index.html', index)
    app.router.add_get('/ws', ws_handler)
    app.router.add_route('*', '/{tail:.*}', static_handler)
    return app

if __name__ == '__main__':
    loop = asyncio.get_event_loop()
    start_watcher(loop)
    app = loop.run_until_complete(init_app())
    web.run_app(app, port=5173)
