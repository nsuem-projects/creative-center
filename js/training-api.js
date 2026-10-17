/* No modules, packages or local JSON fetch required for file://. */
(() => {
  const mode = window.CREATIVE_CENTER_RUNTIME === 'server' ? 'server' : 'autonomous';
  const fileMode = location.protocol === 'file:';
  const calls = [];
  const clone = value => JSON.parse(JSON.stringify(value));

  // Локальный кэш для хранения объединенного массива из 1.json
  let cachedWorkshops = null;

  // Функция-имитатор сервера, которая теперь работает ВСЕГДА для локального файла 1.json
  function snapshot(workshopsArray, path) {
    if (path === '/api/featured-workshops') return workshopsArray.slice(0, 3);
    if (path === '/api/schedule') return workshopsArray.map((d, i) => ({id: d.id, places: 2 + i % 5}));
    
    // Регулярное выражение для поиска конкретного ID (например, /api/workshops/5)
    const match = path.match(/^\/api\/workshops\/(\d+)$/);
    if (match) {
      const targetId = Number(match[1]); // Достаем ID из совпадения
      const item = workshopsArray.find(d => d.id === targetId);
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

      // ЖЕСТКИЙ ПЕРЕХВАТ: Если запрашивают список или конкретный воркшоп — перенаправляем на 1.json
      if (path.startsWith('/api/workshops') || path === '/api/featured-workshops' || path === '/api/schedule') {
        // Определяем правильный путь к 1.json относительно корня или папки mock
        const url = fileMode ? '1.json' : 'assets/data/mock/1.json';
        entry.resource = url;
        entry.transport = 'mocked-single-json';

        // Загружаем 1.json один раз
        if (!cachedWorkshops) {
          cachedWorkshops = await http(url);
        }

        // Вырезаем из 1.json только то, что просил main.js (например, только элемент с ID 5)
        result = clone(snapshot(cachedWorkshops, path));
      } else {
        // Для всех остальных системных запросов (если они есть) оставляем стандартное поведение
        if (mode === 'server') {
          result = await http(path);
        } else {
          result = clone(snapshot([], path));
        }
      }
      
      if (path === '/api/schedule') {
        entry.jsDelayMs = 3000;
        console.info('[Учебный режим: таймер JS 3000 ms после получения данных]');
        await new Promise(resolve => setTimeout(resolve, 3000));
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
