// Список готовых XSS-payload-ов для тренировки. Кнопка «Подставить»
// вставляет полезную нагрузку в поле ввода демонстрации.
export default function PayloadList({ items, onUse }) {
  return (
    <div className="payloads">
      {items.map((p, i) => (
        <div className="payload" key={i}>
          <code>{p.code}</code>
          <button className="btn small primary" onClick={() => onUse(p.code)}>
            Подставить
          </button>
          {p.note && <span className="note">💡 {p.note}</span>}
        </div>
      ))}
    </div>
  )
}
