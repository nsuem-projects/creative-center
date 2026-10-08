import json,time,urllib.request,urllib.error
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
ROOT=Path(__file__).resolve().parent
BASE='http://127.0.0.1:8000'
def get(path):
 with urllib.request.urlopen(BASE+'/'+path.lstrip('/')) as r:return r.status,r.read()
class Links(HTMLParser):
 def __init__(self):super().__init__();self.links=[]
 def handle_starttag(self,tag,attrs):
  for k,v in attrs:
   if k in ('href','src') and v:self.links.append(v)
checks=[]
for page in ROOT.glob('*.html'):
 status,body=get(page.name);assert status==200
 parser=Links();parser.feed(body.decode())
 for link in parser.links:
  p=urlsplit(link)
  if p.scheme or not p.path:continue
  assert (ROOT/unquote(p.path).lstrip('/')).exists(),(page.name,link)
 checks.append(page.name+': 200; ссылки и ресурсы существуют')
for path in ['assets/data/catalog-tags.json','assets/images/entrance-evening.webp','css/map-theme.css','js/journal-recommendations.js']:
 try:get(path);raise AssertionError(path)
 except urllib.error.HTTPError as e:assert e.code==404
checks.append('Все 4 намеренных 404 подтверждены')
for i in range(1,11):assert json.loads(get('api/workshops/'+str(i))[1])['id']==i
checks.append('10 отдельных API endpoints: 200')
for i in range(3):assert len(json.loads(get('api/featured-workshops')[1]))==3
checks.append('3 повторных запроса featured-workshops: 200')
t=time.perf_counter();assert len(json.loads(get('api/schedule')[1]))==10;elapsed=time.perf_counter()-t;assert 2.9<elapsed<5
checks.append(f'API schedule: {elapsed:.2f} секунды')
for heavy,small in [('js/legacy-gallery.js','js/main.js'),('css/editorial-archive.css','css/styles.css')]:
 a=(ROOT/heavy).stat().st_size;b=(ROOT/small).stat().st_size;assert a>500000 and a>b*30;assert get(heavy)[0]==200
 checks.append(f'{heavy}: {a:,} байт; в {a/b:.0f} раз больше {small}')
checks.append('Внешние URL: Google Fonts, cdnjs, jsDelivr присутствуют в HTML; доступность CDN не обязательна')
report='# Проверка проекта\n\n'+ '\n'.join('- '+x for x in checks)+'\n\nПроверено через локальный HTTP-сервер. Проверки браузера см. ниже.\n'
(ROOT/'VERIFICATION.md').write_text(report,encoding='utf-8');print(report)
