import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Section from '../components/Section.jsx'
import Callout from '../components/Callout.jsx'
import CodeBlock from '../components/CodeBlock.jsx'
import ModeToggle from '../components/ModeToggle.jsx'
import PayloadList from '../components/PayloadList.jsx'
import AttackerLog from '../components/AttackerLog.jsx'

const PAYLOADS = [
  {
    code: `<img src=x onerror="alert('Отражённый XSS!')">`,
    note: 'Проверка выполнения кода через ссылку.',
  },
  {
    code: `<img src=x onerror="window.__attacker('cookie='+document.cookie)">`,
    note: 'Кража cookie у того, кто перешёл по ссылке.',
  },
  {
    code: `<svg onload="alert('XSS через svg onload')">`,
    note: 'Другой вектор — обработчик onload у <svg>.',
  },
]

export default function ReflectedXSS() {
  const [mode, setMode] = useState('vuln')
  const [searchParams, setSearchParams] = useSearchParams()
  const [input, setInput] = useState(() => searchParams.get('q') ?? PAYLOADS[1].code)
  const [data, setData] = useState(null)

  const q = searchParams.get('q')

  // Каждый раз, когда меняется запрос в URL (?q=...) или режим — спрашиваем
  // сервер. Открытие страницы по «вредоносной ссылке» сразу запускает поиск.
  useEffect(() => {
    if (q == null) { setData(null); return }
    fetch(`/api/reflected/search?q=${encodeURIComponent(q)}&mode=${mode}`)
      .then((r) => r.json())
      .then(setData)
  }, [q, mode])

  function search(e) {
    e.preventDefault()
    setSearchParams({ q: input })
  }

  const maliciousLink =
    `${window.location.origin}/reflected?q=${encodeURIComponent(input)}`

  return (
    <div className="page">
      <div className="page-head">
        <span className="badge">Подтип 2</span>
        <h1>Отражённый (непостоянный) XSS</h1>
        <p className="lead">
          Полезная нагрузка передаётся в параметре запроса (URL) и тут же
          «отражается» сервером обратно в ответ. Нигде не сохраняется —
          срабатывает <b>только у того, кто перешёл по подготовленной ссылке</b>.
          Типичный сценарий: вредоносная ссылка в письме или сообщении.
        </p>
      </div>

      <ModeToggle mode={mode} onChange={setMode} />

      {/* ================= ШАГ 1 ================= */}
      <Section num={1} title="Где уязвимость и уязвимый код">
        <p>
          Страница поиска показывает строку «Вы искали: …», подставляя в неё
          текст запроса. В уязвимом режиме <b>сервер</b> возвращает запрос без
          экранирования, а клиент выводит его как HTML — поэтому код из URL
          выполняется.
        </p>
        <CodeBlock
          file="backend/app.py — отражение запроса"
          variant="vuln"
          highlight={[5, 6]}
          code={`@app.get("/api/reflected/search")
def reflected_search():
    query = request.args.get("q", "")
    ...
    # УЯЗВИМОСТЬ: запрос возвращается «как есть», без экранирования.
    echo = query
    return jsonify({"echo": echo, "results": results})`}
        />
        <CodeBlock
          file="frontend/src/pages/ReflectedXSS.jsx — вывод ответа"
          variant="vuln"
          highlight={[2]}
          code={`// Полученный от сервера echo выводится как РАЗМЕТКА:
<p dangerouslySetInnerHTML={{ __html: data.echo }} />`}
        />
      </Section>

      {/* ================= ШАГ 2 ================= */}
      <Section num={2} title="Практическая реализация атаки на тренировочных данных">
        <p>
          Атакующий формирует ссылку, в параметр <span className="mono">q</span>{' '}
          которой вшит payload, и отправляет её жертве. Подставьте нагрузку и
          нажмите «Искать» — обратите внимание, как payload оказывается в адресе
          страницы.
        </p>
        <PayloadList items={PAYLOADS} onUse={(c) => setInput(c)} />

        <hr className="sep" />
        <form onSubmit={search}>
          <div className="field">
            <label>Поисковый запрос (сюда вставлен payload)</label>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} />
          </div>
          <button type="submit" className="btn primary">🔍 Искать</button>
        </form>

        <Callout type="danger" title="Вредоносная ссылка для жертвы">
          <p className="mono" style={{ wordBreak: 'break-all', fontSize: 13 }}>
            {maliciousLink}
          </p>
          <button
            className="btn small"
            onClick={() => navigator.clipboard?.writeText(maliciousLink)}
          >
            📋 Скопировать ссылку
          </button>{' '}
          <span className="muted" style={{ fontSize: 13 }}>
            Жертве достаточно перейти по ней — в уязвимом режиме скрипт выполнится
            в её браузере.
          </span>
        </Callout>
      </Section>

      {/* ================= ШАГ 3 ================= */}
      <Section num={3} title="Как это выглядит для жертвы">
        <p>
          {mode === 'vuln'
            ? 'Уязвимый режим: сервер вернул запрос без экранирования — payload выполняется.'
            : 'Безопасный режим: сервер экранировал спецсимволы — payload показан как текст.'}
        </p>

        <div className={`demo ${mode}`}>
          <div className="demo-screen-label">
            🖥️ Экран жертвы — страница результатов поиска
          </div>
          {data ? (
            <>
              {/* Вывод «отражения» как HTML. Опасно при «сыром» echo с сервера. */}
              <p>
                Вы искали:{' '}
                <span dangerouslySetInnerHTML={{ __html: data.echo }} />
              </p>
              <div style={{ marginTop: 10 }}>
                {data.results.length === 0 && (
                  <span className="muted">Ничего не найдено.</span>
                )}
                {data.results.map((p) => (
                  <div className="product" key={p.id}>
                    <div className="name">{p.name}</div>
                    <div className="desc">{p.description}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <span className="muted">Выполните поиск, чтобы увидеть результат.</span>
          )}
        </div>

        <AttackerLog />
      </Section>

      {/* ================= ШАГ 4 ================= */}
      <Section num={4} title="Исправление уязвимости">
        <p>
          <b>Серверный рубеж:</b> экранируйте вывод. Функция{' '}
          <span className="mono">html.escape()</span> превращает{' '}
          <span className="mono">&lt; &gt; &amp; "</span> в безопасные сущности,
          и браузер покажет их как текст. В этом стенде именно этот код включает
          переключатель «Безопасный режим».
        </p>
        <CodeBlock
          file="backend/app.py — экранирование вывода"
          variant="fix"
          highlight={[3]}
          code={`import html

# ИСПРАВЛЕНО: экранируем спецсимволы HTML перед возвратом.
echo = html.escape(query)   # <img ...> -> &lt;img ...&gt;
return jsonify({"echo": echo, "results": results})`}
        />
        <Callout type="success" title="Клиентский рубеж (эшелонированная защита)">
          <p>
            Дополнительно не выводите данные как HTML на клиенте — выводите как
            текст, и React сам всё экранирует:
          </p>
          <CodeBlock
            file="frontend/src/pages/ReflectedXSS.jsx — безопасный вывод"
            variant="fix"
            highlight={[1]}
            code={`<p>Вы искали: {data.query}</p>   {/* React выводит как ТЕКСТ */}`}
          />
        </Callout>
      </Section>

      {/* ================= ШАГ 5 ================= */}
      <Section num={5} title="Безопасный вид веб-приложения">
        <p>
          После исправления тот же запрос отображается как текст. Ниже —
          гарантированно безопасный вывод (клиентский рубеж: значение выводится
          как текст):
        </p>
        <div className="demo safe">
          <div className="demo-screen-label">🛡️ Экран жертвы — исправленная версия</div>
          {data ? (
            <p>Вы искали: {data.query}</p>
          ) : (
            <span className="muted">Выполните поиск выше, чтобы увидеть результат.</span>
          )}
        </div>
        <Callout type="info">
          <p>
            Payload отображается как строка, скрипт не выполняется, cookie не
            утекает. Переключите режим вверху, чтобы сравнить с уязвимым видом.
          </p>
        </Callout>
      </Section>
    </div>
  )
}
