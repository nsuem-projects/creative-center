# Руководство администратора / преподавателя

**Проект:** Creative Center · Стенды для дисциплины «Оптимизация веб-приложений» (НГУЭУ)  
**Сервер:** Timeweb Cloud VPS (`129.101.112.157`, Ubuntu 24.04 LTS, ЦОД Новосибирск)  
**Базовый домен:** `https://129-101-112-157.sslip.io`  
**SSL:** Официальный сертификат Let's Encrypt (автоматическое продление через `certbot.timer`)

---

## 1. Ссылки на стенды

* **Эталонный сайт (защищён от правок студентов):**  
  👉 **https://129-101-112-157.sslip.io/**
* **Студенческие стенды (25 независимых адресов):**  
  * Студент 01: https://129-101-112-157.sslip.io/students/student01/
  * Студент 02: https://129-101-112-157.sslip.io/students/student02/
  * Студент 03: https://129-101-112-157.sslip.io/students/student03/
  * Студент 04: https://129-101-112-157.sslip.io/students/student04/
  * Студент 05: https://129-101-112-157.sslip.io/students/student05/
  * Студент 06: https://129-101-112-157.sslip.io/students/student06/
  * Студент 07: https://129-101-112-157.sslip.io/students/student07/
  * Студент 08: https://129-101-112-157.sslip.io/students/student08/
  * Студент 09: https://129-101-112-157.sslip.io/students/student09/
  * Студент 10: https://129-101-112-157.sslip.io/students/student10/
  * Студент 11: https://129-101-112-157.sslip.io/students/student11/
  * Студент 12: https://129-101-112-157.sslip.io/students/student12/
  * Студент 13: https://129-101-112-157.sslip.io/students/student13/
  * Студент 14: https://129-101-112-157.sslip.io/students/student14/
  * Студент 15: https://129-101-112-157.sslip.io/students/student15/
  * Студент 16: https://129-101-112-157.sslip.io/students/student16/
  * Студент 17: https://129-101-112-157.sslip.io/students/student17/
  * Студент 18: https://129-101-112-157.sslip.io/students/student18/
  * Студент 19: https://129-101-112-157.sslip.io/students/student19/
  * Студент 20: https://129-101-112-157.sslip.io/students/student20/
  * Студент 21: https://129-101-112-157.sslip.io/students/student21/
  * Студент 22: https://129-101-112-157.sslip.io/students/student22/
  * Студент 23: https://129-101-112-157.sslip.io/students/student23/
  * Студент 24: https://129-101-112-157.sslip.io/students/student24/
  * Студент 25: https://129-101-112-157.sslip.io/students/student25/

---

## 2. Управление сервером (CLI-команды)

Для управления стендами подключитесь по SSH к VPS (`ssh root@129.101.112.157`). На сервере доступны утилиты:

### `cc-status`
Показывает статус служб (Nginx, API, Deployer, Git-Sync Timer), использование памяти и диска, хэш коммита эталона и количество стендов.

### `cc-reset <student_id>`
Мгновенно восстанавливает стенд конкретного студента к чистому эталонному состоянию:
```bash
cc-reset student03   # или cc-reset 3
```

### `cc-reset-all`
Сбрасывает все 25 студенческих стендов к чистому эталону (рекомендуется перед новой лабораторной работой или новым потоком):
```bash
cc-reset-all
```

### `cc-verify [URL]`
Запускает комплексный тест страниц, намеренных 404 ошибок, задержки API (3 с) и переопределения режима.
```bash
cc-verify                                                      # проверка эталона
cc-verify https://129-101-112-157.sslip.io/students/student01/  # проверка студента
```

---

## 3. Архитектура и службы на VPS

1. **Nginx (`/etc/nginx/sites-available/creative-center`):**
   - Раздаёт эталон из `/var/www/creative-center/reference`.
   - Раздаёт стенды студентов из `/var/www/creative-center/students/studentXX`.
   - Перехватывает вызовы `runtime-mode.js` и отдаёт `window.CREATIVE_CENTER_RUNTIME = 'server';`.
   - Проксирует `/api/` и `/students/*/api/` на локальный порт `127.0.0.1:8000` с `proxy_buffering off;`.
   - Отключает gzip для сохранения реального веса файлов (`legacy-gallery.js` 2 МБ, `editorial-archive.css` 1.2 МБ).
   - Запрещает исполнение скриптов (`.php`, `.py`, `.sh`, `.exe`).
2. **Учебный API (`creative-api.service`):**
   - Порт `127.0.0.1:8000`, запускается от `www-data`.
   - Реализует `GET /api/schedule` (задержка `time.sleep(3)` в потоке, сетевой TTFB ~3 с), `GET /api/featured-workshops`, `GET /api/workshops/<id>`.
3. **Deployer (`creative-deployer.service`):**
   - Порт `127.0.0.1:8001`. Принимает вебхуки и пуши из GitHub, распаковывает разрешённые статические файлы в каталог студента.
4. **Git Sync Timer (`creative-git-sync.timer`):**
   - Каждые 20 секунд опрашивает GitHub-репозиторий. Если студент запушил в ветку `student-XX`, стенд обновляется автоматически даже без настроенных вебхуков в GitHub.

---

## 4. Как привязать собственный домен (например, `stands.nsuem.ru`)

Если университет выделит поддомен:
1. В DNS университета направьте A-запись `stands.nsuem.ru` на IP `129.101.112.157`.
2. На сервере выполните:
   ```bash
   certbot --nginx -d stands.nsuem.ru
   ```
3. Certbot автоматически добавит домен в конфигурацию Nginx и выпустит сертификат.
