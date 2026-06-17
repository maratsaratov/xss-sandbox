import { useEffect, useState } from 'react'

// «Журнал сервера атакующего». Слушает событие attacker-receive, которое
// генерирует window.__attacker(...) — его вызывают XSS-payload-ы при краже
// данных (например, document.cookie). Так наглядно видно утечку данных.
// Это безопасная симуляция: ничего за пределы страницы не отправляется.
export default function AttackerLog() {
  const [lines, setLines] = useState([])

  useEffect(() => {
    function onReceive(e) {
      const ts = new Date().toLocaleTimeString('ru-RU')
      setLines((prev) => [...prev, { ts, data: e.detail }])
    }
    window.addEventListener('attacker-receive', onReceive)
    return () => window.removeEventListener('attacker-receive', onReceive)
  }, [])

  return (
    <div className="attacker">
      <div className="attacker-head">
        <span>🕵️ Журнал сервера атакующего (evil.example.com)</span>
        <button className="btn small ghost" style={{ color: '#ff9b9b' }}
                onClick={() => setLines([])}>
          очистить
        </button>
      </div>
      <div className="attacker-body">
        {lines.length === 0 ? (
          <span className="empty">// данные жертвы пока не поступали…</span>
        ) : (
          lines.map((l, i) => (
            <div className="attacker-line" key={i}>
              <span className="ts">[{l.ts}]</span>{' '}
              <span className="stolen">УКРАДЕНО ▸</span> {l.data}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
