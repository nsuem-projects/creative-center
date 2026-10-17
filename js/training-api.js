/* No modules, packages or local JSON fetch required for file://. */
(() => {
  const mode = window.CREATIVE_CENTER_RUNTIME === 'server' ? 'server' : 'autonomous';
  const fileMode = location.protocol === 'file:';
  const calls = [];
  const clone = value => JSON.parse(JSON.stringify(value));

  // Локальный кэш, куда запишется массив после первой загрузки 1.json
  let cachedWorkshops = null;

  // Функция имитирует серверные эндпоинты, используя данные из одного массива
  function snapshot(workshopsArray, path) {
    if (path === '/api/featured-workshops') return workshopsArray.slice(0, 3);
    if (path === '/api/schedule') return workshopsArray.map((d, i) => ({id: d.id, places: 2 + i % 5}));
    
    const match = path.match(/^\/api\/workshops\/(\d+)$/);
    if (match) {
      const item = workshopsArray.find(d => d.id === Number(match[1]));
      if (item) return item;
    }
    throw new Error('Нет учебных данных: ' + path);
  }

  async function http(path) {
    const response = await fetch(path, {cache:'no-store'});
    if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + path);
    return await response.json();
  }

  async function read(path) {
    if (!path.startsWith('/api/')) return http(path.replace(/^\//, ''));
    const entry = {path, mode, transport:fileMode?'memory':mode==='server'?'http-api':'http-static-json', started:Date.now(), jsDelayMs:0};
    calls.push(entry);
    
    try {
      let result;
      if (mode === 'server') {
        result = await http(path);
      } else {
        if (fileMode) {
          // Если открыто как file://, используем встроенный резервный пустой массив, если 1.json недоступен по сети
          result = clone(snapshot(cachedWorkshops || [], path));
          console.info('[Учебный режим: вызов в памяти, не HTTP]', path);
        } else {
          // Путь к вашему единому новому файлу 1.json
          const url = 'assets/data/mock/1.json';
          entry.resource = url;
          
          try { 
            // Загружаем единый файл 1.json, если он еще не был загружен
            if (!cachedWorkshops) {
              cachedWorkshops = await http(url);
            }
            // Вырезаем нужные данные из загруженного 1.json
            result = clone(snapshot(cachedWorkshops, path));
          }
          catch (error) {
            entry.fallback = true;
            entry.loadError = error.message;
            console.warn('[Учебный режим: загрузка 1.json не удалась]', url, error.message);
            result = clone(snapshot([], path));
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
