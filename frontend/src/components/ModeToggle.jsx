// Переключатель режима работы стенда: «Уязвимый» ⇄ «Безопасный».
// От него зависит и выводимый код, и реальное поведение демонстрации.
export default function ModeToggle({ mode, onChange }) {
  const safe = mode === 'safe'
  return (
    <div className={`mode-toggle ${mode}`}>
      <button
        className={`switch ${safe ? 'on' : ''}`}
        onClick={() => onChange(safe ? 'vuln' : 'safe')}
        aria-label="Переключить режим"
      />
      <span className="mode-label">
        {safe ? '🛡️ Безопасный режим' : '⚠️ Уязвимый режим'}
        <span className="sub">
          {safe
            ? 'Уязвимость исправлена — payload не выполняется'
            : 'Уязвимость активна — payload выполняется'}
        </span>
      </span>
    </div>
  )
}
