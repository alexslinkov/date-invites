# Приглашения на свидание

Небольшой личный сервис: создаёт разные ссылки-приглашения, сохраняет ответ и присылает его в Telegram.

## Первый запуск

1. Создай рядом с `server.js` файл `.env` по образцу `.env.example`.
2. В `ADMIN_PASSWORD` задай свой длинный пароль.
3. Выполни в Терминале из этой папки: `npm start`.
4. Открой `http://localhost:3000/admin`.

## Telegram-уведомления

1. В Telegram открой `@BotFather`, отправь `/newbot` и скопируй выданный токен.
2. Напиши новому боту `/start`.
3. Открой в браузере `https://api.telegram.org/botТОКЕН/getUpdates` и найди число после `"chat":{"id":`.
4. Вставь токен в `TELEGRAM_BOT_TOKEN`, а найденное число — в `TELEGRAM_CHAT_ID` в `.env`.
5. Перезапусти сервер.

Не отправляй никому `.env`: в нём пароль и токен бота.

## Публикация: GitHub + Render + Supabase

1. В Supabase создай проект, открой `SQL Editor`, вставь и выполни содержимое `supabase/schema.sql`.
2. В настройках проекта Supabase найди `Project URL` и секретный ключ (`sb_secret_...`).
3. В Render создай **Web Service**, подключи репозиторий GitHub и выбери ветку `main`. Команды уже описаны в `render.yaml`.
4. В Render добавь секреты: `ADMIN_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`.
5. После первого запуска Render автоматически даст публичный HTTPS-адрес. Его вручную указывать не нужно.

Ключ Supabase и токен Telegram не загружаются в GitHub и не должны попадать в переписку.
