import { useEffect, useState } from 'react'
import Section from '../components/Section.jsx'
import Callout from '../components/Callout.jsx'
import CodeBlock from '../components/CodeBlock.jsx'
import PayloadList from '../components/PayloadList.jsx'
import AttackerLog from '../components/AttackerLog.jsx'

// Описание фильтров «доски сообщений». v1–v3 — намеренно дырявые чёрные
// списки (их нужно обойти), safe — корректное кодирование вывода.
const FILTERS = {
  v1: {
    label: 'v1',
    tone: 'vuln',
    title: 'Наивный фильтр v1 — вырезание по подстроке',
    code: `def filter_v1(text):
    # «Защита»: вырезаем только литерал "<script>"
    return text.replace("<script>", "").replace("</script>", "")`,
    hint: 'Фильтр ищет лишь строку «<script>». А нужен ли вообще тег <script>, чтобы выполнить JavaScript? Вспомните обработчики событий.',
  },
  v2: {
    label: 'v2',
    tone: 'vuln',
    title: 'Наивный фильтр v2 — чёрный список тегов и обработчиков',
    code: `def filter_v2(text):
    text = re.sub(r"(?is)<\\s*script.*?>.*?</\\s*script\\s*>", "", text)
    text = re.sub(r"(?i)onerror", "", text)   # режем по имени
    text = re.sub(r"(?i)onload", "", text)
    return text`,
    hint: 'Заблокированы onerror и onload. Но сколько всего обработчиков событий в HTML? Попробуйте другой (срабатывающий по наведению или автоматически).',
  },
  v3: {
    label: 'v3',
    tone: 'vuln',
    title: 'Наивный фильтр v3 — вырезание атрибутов-обработчиков',
    code: `def filter_v3(text):
    text = re.sub(r"(?is)<\\s*script.*?>.*?</\\s*script\\s*>", "", text)
    text = re.sub(r"(?i)\\son\\w+\\s*=", " ", text)  # режет " on...=" после ПРОБЕЛА
    return text`,
    hint: 'Атрибуты « on...=» вырезаются, когда перед ними пробел. А какой ещё символ HTML допускает между атрибутами? Замените разделитель.',
  },
  safe: {
    label: 'safe',
    tone: 'fix',
    title: 'Корректная защита — кодирование вывода',
    code: `def filter_safe(text):
    # < > & " ' заменяются на HTML-сущности: разметка становится текстом
    return html.escape(text)`,
    hint: 'Это правильный подход (не чёрный список, а кодирование). Обойти его не получится — убедитесь в этом и объясните почему.',
  },
}

const STARTERS = [
  {
    code: `<script>alert('XSS')</script>`,
    note: 'Классика — но через innerHTML тег <script> не исполняется. Нужен другой вектор.',
  },
  {
    code: `<img src=x onerror="alert('XSS')">`,
    note: 'Сработает против v1. Против v2 и v3 — нет: доработайте payload.',
  },
  {
    code: `<img src=x onerror="window.__attacker('cookie='+document.cookie)">`,
    note: 'Цель «кража cookie»: при удачном обходе значение появится в журнале атакующего.',
  },
]

export default function LabXSS() {
  const [flt, setFlt] = useState('v1')
  const [messages, setMessages] = useState([])
  const [author, setAuthor] = useState('Гость')
  const [text, setText] = useState(`<img src=x onerror="alert('XSS')">`)

  async function load(f = flt) {
    const r = await fetch(`/api/lab/messages?filter=${f}`)
    const d = await r.json()
    setMessages(d.messages || [])
  }
  useEffect(() => { load(flt) }, [flt])

  async function submit(e) {
    e.preventDefault()
    if (!text.trim()) return
    await fetch('/api/lab/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, text }),
    })
    await load()
  }
  async function reset() {
    await fetch('/api/lab/messages', { method: 'DELETE' })
    await load()
  }

  const cur = FILTERS[flt]
  const isSafe = flt === 'safe'

  return (
    <div className="page">
      <div className="page-head">
        <span className="badge">Лабораторное задание</span>
        <h1>Полигон: обход фильтров и корректная защита</h1>
        <p className="lead">
          Доска сообщений «защищена» фильтром — разработчик попытался не
          кодировать вывод, а <b>вырезать опасное</b> (чёрный список). Это
          типичная ошибка. Ваша задача — последовательно <b>обойти</b> наивные
          фильтры v1, v2 и v3, добившись выполнения JavaScript (в том числе
          кражи cookie), а затем убедиться, что корректная защита (режим{' '}
          <span className="mono">safe</span>) обойти невозможно, и объяснить
          почему.
        </p>
      </div>

      {/* Выбор фильтра */}
      <div className={`mode-toggle ${isSafe ? 'safe' : 'vuln'}`}>
        <span className="mode-label" style={{ marginRight: 8 }}>
          Активный фильтр:
        </span>
        {Object.entries(FILTERS).map(([key, f]) => (
          <button
            key={key}
            className={`btn ${flt === key ? 'primary' : ''}`}
            onClick={() => setFlt(key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Section num={1} title="Условие и цель">
        <p>
          Сообщение сохраняется на сервере, а при выводе к нему применяется
          выбранный выше фильтр; результат вставляется на страницу как HTML
          (<span className="mono">dangerouslySetInnerHTML</span>). Значит, всё,
          что прошло фильтр, выполнится в браузере.
        </p>
        <Callout type="warning" title="Что нужно получить">
          <p>
            Для каждого из фильтров <b>v1, v2, v3</b> подберите полезную
            нагрузку, которая обойдёт фильтр и (а) выполнит{' '}
            <span className="mono">alert</span>, затем (б) отправит cookie в
            журнал атакующего. Для режима <b>safe</b> покажите, что ни одна
            нагрузка не срабатывает.
          </p>
        </Callout>
      </Section>

      <Section num={2} title="Текущий фильтр (изучите его слабое место)">
        <CodeBlock
          file="backend/app.py — активный фильтр"
          variant={cur.tone}
          code={cur.code}
        />
        <Callout type={isSafe ? 'success' : 'info'} title="Подсказка">
          <p>{cur.hint}</p>
        </Callout>
      </Section>

      <Section num={3} title="Атака: подберите обход">
        <p>
          Ниже — стартовые нагрузки. Большинство из них текущий фильтр
          заблокирует — это нормально: дорабатывайте их, пока скрипт не
          выполнится. Подставленный payload отправляется как обычное сообщение.
        </p>
        <PayloadList items={STARTERS} onUse={(c) => setText(c)} />

        <hr className="sep" />
        <form onSubmit={submit}>
          <div className="row">
            <div className="field" style={{ flex: '0 0 180px' }}>
              <label>Имя</label>
              <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Сообщение (ваш payload)</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="row">
            <button type="submit" className="btn primary">Отправить</button>
            <button type="button" className="btn" onClick={reset}>
              Очистить доску
            </button>
          </div>
        </form>

        <div className={`demo ${isSafe ? 'safe' : 'vuln'}`} style={{ marginTop: 16 }}>
          <div className="demo-screen-label">
            🖥️ Доска сообщений — фильтр «{cur.label}»
          </div>
          {messages.map((m) => (
            <div className="comment" key={m.id}>
              <span className="author">{m.author}</span>{' '}
              <span className="meta">· {m.created_at}</span>
              {/* Выводим результат работы фильтра как HTML: то, что прошло,
                  будет исполнено браузером. */}
              <div
                className="comment-text"
                dangerouslySetInnerHTML={{ __html: m.filtered }}
              />
            </div>
          ))}
        </div>
        <AttackerLog />
      </Section>

      <Section num={4} title="Вывод: почему «чёрные списки» не работают">
        <p>
          Любой фильтр-«вырезатель» опасных конструкций неизбежно неполон:
          обработчиков событий десятки, разделители и регистр варьируются,
          символы можно кодировать. Поэтому защита через чёрный список — это
          гонка, которую защищающийся проигрывает. Правильный подход —{' '}
          <b>кодирование вывода</b> (или санитизация по белому списку): не
          пытаться угадать «плохое», а сделать так, чтобы данные в принципе не
          могли стать разметкой.
        </p>
        <CodeBlock
          file="backend/app.py — корректная защита"
          variant="fix"
          highlight={[2]}
          code={`def filter_safe(text):
    return html.escape(text)   # < > & " ' -> HTML-сущности`}
        />
        <Callout type="success">
          <p>
            Переключитесь на фильтр <span className="mono">safe</span> и
            повторите свои рабочие обходы — ни один не сработает: символы{' '}
            <span className="mono">&lt;</span> и <span className="mono">&gt;</span>{' '}
            экранированы, и браузер видит текст, а не теги.
          </p>
        </Callout>
      </Section>
    </div>
  )
}
