import { useEffect, useState } from 'react'
import Section from '../components/Section.jsx'
import Callout from '../components/Callout.jsx'
import CodeBlock from '../components/CodeBlock.jsx'
import ModeToggle from '../components/ModeToggle.jsx'
import PayloadList from '../components/PayloadList.jsx'
import AttackerLog from '../components/AttackerLog.jsx'

// Готовые полезные нагрузки (payload) для тренировки на хранимом XSS.
const PAYLOADS = [
  {
    code: `<img src=x onerror="alert('Сработал хранимый XSS!')">`,
    note: 'Простейшая проверка выполнения кода — выскочит alert.',
  },
  {
    code: `<img src=x onerror="window.__attacker('cookie='+document.cookie)">`,
    note: 'Кража cookie сессии — результат появится в «журнале сервера атакующего».',
  },
  {
    code: `<b onmouseover="alert('XSS по наведению мыши')">НАВЕДИ МЫШЬ СЮДА</b>`,
    note: 'Срабатывание по действию пользователя (обработчик события).',
  },
]

export default function StoredXSS() {
  const [mode, setMode] = useState('vuln')
  const [comments, setComments] = useState([])
  const [author, setAuthor] = useState('Гость')
  const [text, setText] = useState(PAYLOADS[1].code)

  async function load() {
    const r = await fetch('/api/stored/comments')
    setComments(await r.json())
  }
  useEffect(() => { load() }, [])

  async function submit(e) {
    e.preventDefault()
    if (!text.trim()) return
    await fetch('/api/stored/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, text }),
    })
    setText('')
    await load()
  }

  async function reset() {
    await fetch('/api/stored/comments', { method: 'DELETE' })
    await load()
  }

  return (
    <div className="page">
      <div className="page-head">
        <span className="badge">Подтип 1</span>
        <h1>Хранимый (постоянный) XSS</h1>
        <p className="lead">
          Полезная нагрузка <b>сохраняется на сервере</b> (в базе данных) вместе
          с обычными данными — например, как комментарий в гостевой книге.
          Скрипт срабатывает <b>у каждого</b>, кто откроет страницу с этими
          данными, и продолжает работать, пока запись не удалят. Это самый
          опасный подтип XSS.
        </p>
      </div>

      <ModeToggle mode={mode} onChange={setMode} />

      {/* ================= ШАГ 1 ================= */}
      <Section num={1} title="Где уязвимость и уязвимый код">
        <p>
          Сервер (Flask) принимает комментарий и сохраняет его в SQLite «как
          есть». Само по себе это не ошибка — API обязано хранить данные. Брешь
          возникает на <b>клиенте</b>: React выводит текст комментария как HTML
          через <span className="mono">dangerouslySetInnerHTML</span>, поэтому
          вставленные теги и обработчики событий выполняются.
        </p>
        <CodeBlock
          file="frontend/src/pages/StoredXSS.jsx — вывод комментария"
          variant="vuln"
          highlight={[3, 4, 5, 6]}
          code={`// Режим «Уязвимый»: текст комментария вставляется как РАЗМЕТКА.
// Любые теги (<img onerror>, <svg onload>, ...) будут исполнены браузером.
<div
  className="comment-text"
  dangerouslySetInnerHTML={{ __html: comment.text }}
/>`}
        />
        <CodeBlock
          file="backend/app.py — сохранение комментария"
          variant="vuln"
          highlight={[5]}
          code={`@app.post("/api/stored/comments")
def add_comment():
    ...
    db.execute(
        "INSERT INTO comments (author, text, created_at) VALUES (?, ?, ?)",
        (author, text, now),   # payload сохраняется в БД и будет отдан всем
    )`}
        />
        <Callout type="warning" title="Важный нюанс">
          <p>
            Параметризованный запрос (<span className="mono">?</span>) защищает
            от <b>SQL-инъекции</b>, но <b>не</b> от XSS. Это разные уязвимости:
            здесь опасен не сам факт хранения, а небезопасный <b>вывод</b> данных.
          </p>
        </Callout>
      </Section>

      {/* ================= ШАГ 2 ================= */}
      <Section num={2} title="Практическая реализация атаки на тренировочных данных">
        <p>
          Атакующий — обычный пользователь — оставляет «комментарий», в котором
          вместо текста находится HTML с JavaScript. Выберите готовую нагрузку
          (она подставится в поле) и отправьте комментарий.
        </p>
        <PayloadList items={PAYLOADS} onUse={(c) => setText(c)} />

        <hr className="sep" />
        <form onSubmit={submit}>
          <div className="row">
            <div className="field" style={{ flex: '0 0 180px' }}>
              <label>Имя</label>
              <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Комментарий (сюда вставлен payload)</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="row">
            <button type="submit" className="btn primary">Отправить комментарий</button>
            <button type="button" className="btn" onClick={reset}>
              Сбросить к исходным данным
            </button>
          </div>
        </form>
      </Section>

      {/* ================= ШАГ 3 ================= */}
      <Section num={3} title="Как это выглядит для жертвы">
        <p>
          Любой пользователь, открывший страницу с комментариями, незаметно для
          себя выполняет внедрённый код.{' '}
          {mode === 'vuln'
            ? 'Сейчас включён уязвимый режим — payload срабатывает.'
            : 'Сейчас включён безопасный режим — payload показан как текст. Переключите режим в «⚠️ Уязвимый», чтобы увидеть атаку.'}
        </p>

        <div className={`demo ${mode}`}>
          <div className="demo-screen-label">
            🖥️ Экран жертвы — лента комментариев ({mode === 'vuln' ? 'уязвимо' : 'безопасно'})
          </div>
          {comments.map((c) => (
            <div className="comment" key={c.id}>
              <span className="author">{c.author}</span>{' '}
              <span className="meta">· {c.created_at}</span>
              {mode === 'vuln' ? (
                // === УЯЗВИМЫЙ ВЫВОД: текст интерпретируется как HTML ===
                <div
                  className="comment-text"
                  dangerouslySetInnerHTML={{ __html: c.text }}
                />
              ) : (
                // === БЕЗОПАСНЫЙ ВЫВОД: React экранирует и показывает как текст ===
                <div className="comment-text">{c.text}</div>
              )}
            </div>
          ))}
        </div>

        <AttackerLog />
      </Section>

      {/* ================= ШАГ 4 ================= */}
      <Section num={4} title="Исправление уязвимости">
        <p>
          <b>Главный приём:</b> выводите пользовательский текст как текст. В
          React достаточно подставить значение в фигурных скобках — фреймворк
          сам экранирует <span className="mono">&lt; &gt; &amp; "</span>.
        </p>
        <CodeBlock
          file="frontend/src/pages/StoredXSS.jsx — безопасный вывод"
          variant="fix"
          highlight={[2]}
          code={`// Без dangerouslySetInnerHTML. React выведет ТЕКСТ, а не разметку.
<div className="comment-text">{comment.text}</div>`}
        />
        <p>
          Если разметку всё же нужно разрешить (например, форматирование), не
          выводите HTML «как есть» — очищайте его санитайзером{' '}
          <span className="mono">DOMPurify</span>:
        </p>
        <CodeBlock
          file="вариант: разрешён безопасный HTML"
          variant="fix"
          highlight={[3, 4]}
          code={`import DOMPurify from 'dompurify'

// DOMPurify вырежет опасные теги/атрибуты (script, onerror, ...),
// оставив безопасную разметку.
const clean = DOMPurify.sanitize(comment.text)
<div dangerouslySetInnerHTML={{ __html: clean }} />`}
        />
        <Callout type="success" title="Эшелонированная защита (доп. рубеж на сервере)">
          <p>
            Полезно очищать данные и на сервере — тогда даже неаккуратный
            клиент будет защищён:
          </p>
          <CodeBlock
            file="backend/app.py — серверная очистка (рекомендация)"
            variant="fix"
            highlight={[3]}
            code={`import bleach  # либо html.escape() из стандартной библиотеки

# Очищаем ввод перед сохранением (оставляем только безопасные теги).
clean = bleach.clean(text, tags=["b", "i", "u"], strip=True)
db.execute("INSERT INTO comments (author, text, ...) VALUES (?, ?, ...)",
           (author, clean, now))`}
          />
        </Callout>
      </Section>

      {/* ================= ШАГ 5 ================= */}
      <Section num={5} title="Безопасный вид веб-приложения">
        <p>
          После исправления тот же payload отображается как <b>обычный
          текст</b> и не выполняется. Ниже — гарантированно безопасный вывод тех
          же комментариев (как в исправленной версии приложения):
        </p>
        <div className="demo safe">
          <div className="demo-screen-label">🛡️ Экран жертвы — исправленная версия</div>
          {comments.map((c) => (
            <div className="comment" key={c.id}>
              <span className="author">{c.author}</span>{' '}
              <span className="meta">· {c.created_at}</span>
              {/* Всегда безопасный вывод: значение выводится как текст. */}
              <div className="comment-text">{c.text}</div>
            </div>
          ))}
        </div>
        <Callout type="info">
          <p>
            Обратите внимание: payload виден как строка{' '}
            <span className="mono">&lt;img src=x onerror=...&gt;</span>, alert не
            появляется, cookie не утекает — журнал атакующего пуст.
          </p>
        </Callout>
      </Section>
    </div>
  )
}
