# -*- coding: utf-8 -*-
"""
XSS-песочница — бэкенд (Flask + SQLite).

Назначение: учебный стенд для демонстрации трёх подтипов XSS и их исправления.

ВАЖНО ДЛЯ МЕТОДИЧКИ:
  В современном SPA-приложении (React) уязвимость Reflected/Stored XSS может
  жить в ДВУХ слоях:
    1) на сервере  — если сервер сам подставляет данные пользователя в HTML
                     или отдаёт их без экранирования (этот файл);
    2) на клиенте  — если React выводит данные через dangerouslySetInnerHTML
                     (см. frontend/src/pages/*).

  В этом стенде серверный рубеж защиты демонстрируется на странице
  Reflected XSS (см. функцию reflected_search ниже): переключатель режима
  меняет поведение СЕРВЕРА — отдавать «сырые» данные или экранированные.

Запуск:
    pip install -r requirements.txt
    python app.py
Сервер поднимется на http://localhost:5000
"""

import html
import os
import sqlite3
from datetime import datetime

from flask import Flask, g, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # разрешаем запросы с dev-сервера Vite (http://localhost:5173)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sandbox.db")


# --------------------------------------------------------------------------
#  Работа с базой данных (SQLite)
# --------------------------------------------------------------------------
def get_db():
    """Соединение с БД на время одного запроса."""
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exception):
    db = g.pop("db", None)
    if db is not None:
        db.close()


# Тренировочные («заводские») данные, которыми наполняется БД при сбросе.
SEED_COMMENTS = [
    ("Анна",   "Отличный курс по веб-безопасности, спасибо!"),
    ("Иван",   "А когда будет занятие про SQL-инъекции?"),
    ("Мария",  "Очень наглядно объясняется про XSS :)"),
]

SEED_PRODUCTS = [
    ("Ноутбук «Студент»",        "Лёгкий ноутбук для учёбы и программирования."),
    ("Веб-камера HD",            "Камера 1080p для онлайн-занятий."),
    ("Книга «Безопасность веба»", "Учебник по уязвимостям веб-приложений."),
    ("USB-токен",                "Аппаратный ключ для двухфакторной аутентификации."),
    ("Мышь беспроводная",        "Эргономичная мышь для долгой работы."),
]


def init_db():
    """Создаёт таблицы и наполняет их тренировочными данными при первом запуске."""
    db = sqlite3.connect(DB_PATH)
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS comments (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            author     TEXT NOT NULL,
            text       TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS products (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            description TEXT NOT NULL
        );
        """
    )
    # Наполняем, только если таблицы пустые.
    if db.execute("SELECT COUNT(*) FROM comments").fetchone()[0] == 0:
        now = datetime.now().isoformat(timespec="seconds")
        db.executemany(
            "INSERT INTO comments (author, text, created_at) VALUES (?, ?, ?)",
            [(a, t, now) for a, t in SEED_COMMENTS],
        )
    if db.execute("SELECT COUNT(*) FROM products").fetchone()[0] == 0:
        db.executemany(
            "INSERT INTO products (name, description) VALUES (?, ?)",
            SEED_PRODUCTS,
        )
    db.commit()
    db.close()


# ==========================================================================
#  STORED (ХРАНИМЫЙ) XSS — гостевая книга / комментарии
# --------------------------------------------------------------------------
#  Сервер просто хранит и отдаёт комментарии в формате JSON. Само по себе
#  хранение «сырого» текста — это нормально (так делает большинство API).
#  УЯЗВИМОСТЬ возникает на КЛИЕНТЕ, когда React выводит этот текст через
#  dangerouslySetInnerHTML (см. frontend/src/pages/StoredXSS.jsx).
#
#  Поэтому здесь сервер НЕ меняет поведение в зависимости от режима — фикс
#  для Stored XSS в этом стенде делается на фронтенде. Серверный рубеж
#  (доп. очистка) показан как справочный код в UI.
# ==========================================================================
@app.get("/api/stored/comments")
def get_comments():
    db = get_db()
    rows = db.execute(
        "SELECT id, author, text, created_at FROM comments ORDER BY id DESC"
    ).fetchall()
    # Отдаём данные «как есть». Безопасность вывода — ответственность клиента.
    return jsonify([dict(r) for r in rows])


@app.post("/api/stored/comments")
def add_comment():
    data = request.get_json(force=True) or {}
    author = (data.get("author") or "Аноним").strip() or "Аноним"
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Пустой комментарий"}), 400

    db = get_db()
    db.execute(
        "INSERT INTO comments (author, text, created_at) VALUES (?, ?, ?)",
        # ВАЖНО: SQL-параметры (?) защищают от SQL-инъекции, но НЕ от XSS.
        # Полезная нагрузка XSS сохраняется в БД «как есть» — в этом и суть
        # ХРАНИМОГО XSS: payload остаётся в базе и срабатывает у каждого,
        # кто откроет страницу с комментариями.
        (author, text, datetime.now().isoformat(timespec="seconds")),
    )
    db.commit()
    return jsonify({"ok": True}), 201


@app.delete("/api/stored/comments")
def reset_comments():
    """Сброс комментариев к исходным тренировочным данным (кнопка «Сбросить»)."""
    db = get_db()
    db.execute("DELETE FROM comments")
    now = datetime.now().isoformat(timespec="seconds")
    db.executemany(
        "INSERT INTO comments (author, text, created_at) VALUES (?, ?, ?)",
        [(a, t, now) for a, t in SEED_COMMENTS],
    )
    db.commit()
    return jsonify({"ok": True})


# ==========================================================================
#  REFLECTED (ОТРАЖЁННЫЙ) XSS — поиск по каталогу
# --------------------------------------------------------------------------
#  Классический отражённый XSS: сервер «отражает» поисковый запрос обратно
#  в ответ. Если запрос вернуть без экранирования, payload из URL выполнится
#  в браузере жертвы.
#
#  Здесь переключатель режима РЕАЛЬНО меняет поведение СЕРВЕРА — это и есть
#  серверный рубеж защиты (экранирование вывода / output encoding).
# ==========================================================================
@app.get("/api/reflected/search")
def reflected_search():
    query = request.args.get("q", "")
    mode = request.args.get("mode", "vuln")

    # Поиск товаров по подстроке (это «полезная» часть, не относится к XSS).
    db = get_db()
    like = f"%{query}%"
    rows = db.execute(
        "SELECT id, name, description FROM products "
        "WHERE name LIKE ? OR description LIKE ? ORDER BY id",
        (like, like),
    ).fetchall()
    results = [dict(r) for r in rows]

    if mode == "safe":
        # ╔══════════════════════════════════════════════════════════════╗
        # ║  ИСПРАВЛЕНО (серверный рубеж): экранируем спецсимволы HTML.    ║
        # ║  html.escape() превращает < > " & в безопасные сущности        ║
        # ║  (&lt; &gt; &quot; &amp;), и payload отображается как ТЕКСТ.    ║
        # ╚══════════════════════════════════════════════════════════════╝
        echo = html.escape(query)
    else:
        # ╔══════════════════════════════════════════════════════════════╗
        # ║  >>> УЯЗВИМОСТЬ: REFLECTED XSS <<<                              ║
        # ║  Поисковый запрос возвращается в ответ БЕЗ экранирования.       ║
        # ║  Если фронтенд выведет это как HTML — сработает внедрённый код. ║
        # ╚══════════════════════════════════════════════════════════════╝
        echo = query

    return jsonify({"echo": echo, "query": query, "mode": mode, "results": results})


@app.get("/")
def index():
    return jsonify(
        {
            "service": "XSS Sandbox API",
            "endpoints": [
                "GET    /api/stored/comments",
                "POST   /api/stored/comments",
                "DELETE /api/stored/comments  (сброс)",
                "GET    /api/reflected/search?q=...&mode=vuln|safe",
            ],
        }
    )


if __name__ == "__main__":
    init_db()
    # host=0.0.0.0 нужен для работы внутри Docker-контейнера (доступ извне).
    # debug=True удобно для учебного стенда (видны ошибки).
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)
