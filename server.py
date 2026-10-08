#!/usr/bin/env python3
"""Dependency-free threaded local teaching server. Never stores submitted data."""
import argparse,json,time
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parent
DATA=json.loads((ROOT/'js/data.js').read_text(encoding='utf-8').split('=',1)[1].rstrip(';'))
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def end_headers(self):
  self.send_header('Cache-Control','no-store')
  self.send_header('X-Content-Type-Options','nosniff')
  super().end_headers()
 def do_GET(self):
  path=urlsplit(self.path).path
  if path=='/js/runtime-mode.js':
   body=b"window.CREATIVE_CENTER_RUNTIME = 'server';"
   self.send_response(200);self.send_header('Content-Type','application/javascript');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body);return
  if not path.startswith('/api/'):return super().do_GET()
  if path=='/api/schedule':
   time.sleep(3)
   result=[dict(id=d['id'],places=2+i%5) for i,d in enumerate(DATA)]
  elif path=='/api/featured-workshops':result=DATA[:3]
  elif path.startswith('/api/workshops/'):
   try:result=next(d for d in DATA if d['id']==int(path.rsplit('/',1)[1]))
   except (ValueError,StopIteration):return self.send_error(404)
  else:return self.send_error(404)
  body=json.dumps(result,ensure_ascii=False).encode('utf-8')
  self.send_response(200);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8000);args=parser.parse_args()
 server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
 print(f'Local: http://masterskaya.localhost:{args.port}/ (fallback: http://127.0.0.1:{args.port}/)',flush=True)
 try:server.serve_forever()
 except KeyboardInterrupt:server.server_close()
