// Секция-«шаг» с номером и заголовком. Используется для 5 этапов на каждой
// странице (уязвимость → атака → взгляд жертвы → исправление → безопасный вид).
export default function Section({ num, title, children }) {
  return (
    <section className="section">
      <h2 className="section-title">
        {num != null && <span className="step-num">{num}</span>}
        {title}
      </h2>
      {children}
    </section>
  )
}
