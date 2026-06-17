import { useEffect, useRef, useState } from 'react'
import Section from '../components/Section.jsx'
import Callout from '../components/Callout.jsx'
import CodeBlock from '../components/CodeBlock.jsx'
import ModeToggle from '../components/ModeToggle.jsx'
import PayloadList from '../components/PayloadList.jsx'
import AttackerLog from '../components/AttackerLog.jsx'

const PAYLOADS = [
  {
    code: `<img src=x onerror="alert('DOM XSS!')">`,
    note: 'Проверка выполнения кода прямо в браузере.',
  },
  {
    code: `<img src=x onerror="window.__attacker('cookie='+document.cookie)">`,
    note: 'Кража cookie — без единого запроса к серверу.',
  },
  {
    code: `<svg onload="alert('DOM XSS через svg onload')">`,
    note: 'Другой вектор исполнения.',
  },
]

export default function DomXSS() {
  const [mode, setMode] = useState('vuln')
  const [input, setInput] = useState(PAYLOADS[1].code)
  const [message, setMessage] = useState('')
  const outRef = useRef(null)

  // Читаем «небезопасный источник» — часть URL после #.
  function readHash() {
    const raw = window.location.hash.slice(1)
    try { return decodeURIComponent(raw) } catch { return raw }
  }

  // Реагируем на изменение фрагмента URL (и читаем его при загрузке —
  // так срабатывает открытие «вредоносной ссылки»).
  useEffect(() => {
    function onHash() { setMessage(readHash()) }
    onHash()
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Вывод в реальный DOM-узел: уязвимо (innerHTML) или безопасно (textContent).
  useEffect(() => {
    const el = outRef.current
    if (!el) return
    if (!message) { el.textContent = 'Добро пожаловать, гость!'; return }
    const greeting = 'Добро пожаловать, ' + message + '!'
    if (mode === 'vuln') {
      // === УЯЗВИМОСТЬ DOM XSS: данные из URL вставляются как HTML ===
      el.innerHTML = greeting
    } else {
      // === ИСПРАВЛЕНО: данные вставляются как ТЕКСТ ===
      el.textContent = greeting
    }
  }, [message, mode])

  function apply(e) {
    e.preventDefault()
    window.location.hash = input
  }

  const maliciousLink = `${window.location.origin}/dom#${encodeURIComponent(input)}`

  return (
    <div className="page">
      <div className="page-head">
        <span className="badge">Подтип 3</span>
        <h1>DOM-модель (XSS на стороне клиента)</h1>
        <p className="lead">
          Уязвимость целиком в клиентском JavaScript: скрипт берёт данные из
          «небезопасного источника» (часть URL после <span className="mono">#</span>,{' '}
          <span className="mono">location.search</span>, <span className="mono">localStorage</span>…)
          и помещает их в «опасный приёмник» (<span className="mono">innerHTML</span>).{' '}
          <b>Сервер при этом не участвует вообще</b> — фрагмент после{' '}
          <span className="mono">#</span> браузер ему даже не отправляет.
        </p>
      </div>

      <ModeToggle mode={mode} onChange={setMode} />

      {/* ================= ШАГ 1 ================= */}
      <Section num={1} title="Где уязвимость и уязвимый код">
        <p>
          Страница приветствует пользователя по имени, взятому из{' '}
          <span className="mono">location.hash</span>, и записывает результат
          через <span className="mono">innerHTML</span>. Содержимое после{' '}
          <span className="mono">#</span> полностью контролируется тем, кто
          сформировал ссылку.
        </p>
        <CodeBlock
          file="frontend/src/pages/DomXSS.jsx — формирование приветствия"
          variant="vuln"
          highlight={[4]}
          code={`// Небезопасный ИСТОЧНИК — часть URL после #
const data = decodeURIComponent(location.hash.slice(1))
// Опасный ПРИЁМНИК — innerHTML исполняет вставленную разметку
outputEl.innerHTML = 'Добро пожаловать, ' + data + '!'`}
        />
        <Callout type="info" title="Почему это «клиентский» XSS">
          <p>
            Браузер <b>не отправляет</b> серверу часть URL после{' '}
            <span className="mono">#</span>. Поэтому серверные средства защиты
            (логирование, WAF, экранирование на бэкенде) такой payload не видят —
            исправлять нужно именно клиентский код.
          </p>
        </Callout>
      </Section>

      {/* ================= ШАГ 2 ================= */}
      <Section num={2} title="Практическая реализация атаки на тренировочных данных">
        <p>
          Атакующий помещает payload во фрагмент ссылки (после{' '}
          <span className="mono">#</span>) и отправляет её жертве. Подставьте
          нагрузку и нажмите «Применить» — значение попадёт в адрес после{' '}
          <span className="mono">#</span>.
        </p>
        <PayloadList items={PAYLOADS} onUse={(c) => setInput(c)} />

        <hr className="sep" />
        <form onSubmit={apply}>
          <div className="field">
            <label>Имя для приветствия (сюда вставлен payload)</label>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} />
          </div>
          <button type="submit" className="btn primary">Применить (записать в URL после #)</button>
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
            Часть после <span className="mono">#</span> не уходит на сервер —
            атака происходит полностью в браузере жертвы.
          </span>
        </Callout>
      </Section>

      {/* ================= ШАГ 3 ================= */}
      <Section num={3} title="Как это выглядит для жертвы">
        <p>
          {mode === 'vuln'
            ? 'Уязвимый режим: приветствие записывается через innerHTML — payload выполняется.'
            : 'Безопасный режим: приветствие записывается через textContent — payload показан как текст.'}
        </p>
        <div className={`demo ${mode}`}>
          <div className="demo-screen-label">🖥️ Экран жертвы — блок приветствия</div>
          {/* В этот узел клиентский JS пишет приветствие (innerHTML/textContent). */}
          <div ref={outRef} style={{ fontSize: 18, fontWeight: 600 }} />
        </div>
        <AttackerLog />
      </Section>

      {/* ================= ШАГ 4 ================= */}
      <Section num={4} title="Исправление уязвимости">
        <p>
          <b>Не используйте <span className="mono">innerHTML</span> для
          недоверенных данных.</b> Записывайте текст через{' '}
          <span className="mono">textContent</span> — он не интерпретирует
          разметку.
        </p>
        <CodeBlock
          file="frontend/src/pages/DomXSS.jsx — безопасная запись"
          variant="fix"
          highlight={[2]}
          code={`// ИСПРАВЛЕНО: textContent выводит данные как ТЕКСТ, не как HTML.
outputEl.textContent = 'Добро пожаловать, ' + data + '!'`}
        />
        <Callout type="success" title="В стиле React">
          <p>
            В React то же самое достигается обычным выводом значения — фреймворк
            сам экранирует. А если HTML действительно нужен — очищайте его через{' '}
            <span className="mono">DOMPurify.sanitize()</span> перед выводом.
          </p>
          <CodeBlock
            file="React-вариант"
            variant="fix"
            highlight={[1]}
            code={`<div>Добро пожаловать, {data}!</div>   {/* безопасно: вывод как текст */}`}
          />
        </Callout>
      </Section>

      {/* ================= ШАГ 5 ================= */}
      <Section num={5} title="Безопасный вид веб-приложения">
        <p>
          После исправления имя из URL выводится как текст. Ниже —
          гарантированно безопасный вывод того же значения средствами React:
        </p>
        <div className="demo safe">
          <div className="demo-screen-label">🛡️ Экран жертвы — исправленная версия</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            Добро пожаловать, {message || 'гость'}!
          </div>
        </div>
        <Callout type="info">
          <p>
            Payload отображается как строка, скрипт не выполняется, журнал
            атакующего пуст. Переключите режим вверху, чтобы сравнить с уязвимым
            видом.
          </p>
        </Callout>
      </Section>
    </div>
  )
}
