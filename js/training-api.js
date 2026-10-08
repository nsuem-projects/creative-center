/* No modules, packages or local JSON fetch required for file://. */
(() => {
  const mode = window.CREATIVE_CENTER_RUNTIME === 'server' ? 'server' : 'autonomous';
  const fileMode = location.protocol === 'file:';
  const calls = [];
  const clone = value => JSON.parse(JSON.stringify(value));
  function snapshot(path) {
    if (path === '/api/featured-workshops') return WORKSHOPS.slice(0, 3);
    if (path === '/api/schedule') return WORKSHOPS.map((d, i) => ({id:d.id, places:2+i%5}));
    const match = path.match(/^\/api\/workshops\/(\d+)$/);
    if (match) {
      const item = WORKSHOPS.find(d => d.id === Number(match[1]));
      if (item) return item;
    }
    throw new Error('Нет учебных данных: ' + path);
  }
  async function http(path) {
    const response = await fetch(path, {cache:'no-store'});
    if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + path);
    return response.json();
  }
  async function read(path) {
    if (!path.startsWith('/api/')) return http(path.replace(/^\//, ''));
    const entry = {path, mode, transport:fileMode?'memory':mode==='server'?'http-api':'http-static-json', started:Date.now(), jsDelayMs:0};
    calls.push(entry);
    try {
      let result;
      if (mode === 'server') result = await http(path);
      else {
        if (fileMode) {
          result = clone(snapshot(path));
          console.info('[Учебный режим: вызов в памяти, не HTTP]', path);
        } else {
          const url = 'assets/data/mock/' + path.slice(5) + '.json';
          entry.resource = url;
          try { result = await http(url); }
          catch (error) {
            entry.fallback = true;
            entry.loadError = error.message;
            console.warn('[Учебный режим: загрузка не удалась, локальные данные]', url, error.message);
            result = clone(snapshot(path));
          }
        }
        if (path === '/api/schedule') {
          entry.jsDelayMs = 3000;
          console.info('[Учебный режим: таймер JS 3000 ms после получения данных; это НЕ сетевое ожидание]');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      entry.status = 'fulfilled';
      return result;
    } catch (error) {
      entry.status = 'rejected';
      entry.error = error.message;
      throw error;
    } finally { entry.finished = Date.now(); }
  }
  window.CreativeCenterTraining = Object.freeze({mode, fileMode, calls, read});
})();
