// Цветной информационный блок: info / warning / danger / success.
export default function Callout({ type = 'info', title, children }) {
  return (
    <div className={`callout ${type}`}>
      {title && <p className="callout-title">{title}</p>}
      {children}
    </div>
  )
}
