# REST API StudentPlan

Все маршруты, кроме регистрации, входа и health-check, требуют заголовок `Authorization: Bearer <JWT>`.

## Авторизация

### POST `/api/auth/register`

```json
{
  "email": "student@example.com",
  "full_name": "Иван Иванов",
  "password": "password123"
}
```

### POST `/api/auth/login`

Тип тела: `application/x-www-form-urlencoded`.

```text
username=student@example.com&password=password123
```

### GET `/api/auth/me`

Возвращает текущего пользователя.

## Занятия

### POST `/api/lessons`

```json
{
  "subject": "Базы данных",
  "teacher": "Иванов И.И.",
  "room": "А-101",
  "lesson_type": "Лекция",
  "weekday": 0,
  "start_time": "09:00",
  "end_time": "10:30",
  "week_type": "every",
  "notes": "Повторить SQL"
}
```

`weekday`: 0 — понедельник, 6 — воскресенье.  
`week_type`: `every`, `odd`, `even`.

### GET `/api/lessons`

Параметры:

- `weekday` — фильтр дня;
- `q` — поиск по дисциплине, преподавателю или аудитории.

### PATCH `/api/lessons/{id}`

Передаются только изменяемые поля.

### DELETE `/api/lessons/{id}`

Удаляет занятие владельца.

## Задания

### POST `/api/assignments`

```json
{
  "title": "Лабораторная работа №1",
  "description": "Разработать ER-диаграмму",
  "lesson_id": 1,
  "due_at": "2026-08-20T18:00:00+05:00",
  "status": "todo",
  "priority": "high"
}
```

### GET `/api/assignments`

Параметры:

- `status=todo|in_progress|done`;
- `include_done=false` — скрыть выполненные.

### PATCH `/api/assignments/{id}`

Например:

```json
{ "status": "done" }
```

## Расписание

### GET `/api/schedule/week?date=2026-08-06`

Возвращает понедельник–воскресенье недели, в которую входит дата.

### GET `/api/schedule/next`

Возвращает занятие, дату начала и число минут до начала. Если занятий нет, возвращается `null`.

## Поиск

### GET `/api/search?q=базы`

Одновременно ищет по занятиям и заданиям текущего пользователя.

## Статистика

### GET `/api/stats/summary`

Возвращает:

- число занятий;
- всего заданий;
- выполнено;
- просрочено;
- срок наступает в течение семи дней.

## Интерактивная документация

После запуска backend Swagger доступен по адресу `/docs`, ReDoc — `/redoc`.
