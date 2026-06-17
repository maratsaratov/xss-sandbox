// Блок кода с подсветкой строк. Уязвимые строки подсвечиваются красным,
// исправленные — зелёным. Удобно для скриншотов в методичке.
//
//   file      — подпись (путь к файлу)
//   variant   — 'vuln' | 'fix' (цвет подсветки и метка)
//   code      — исходный код одной строкой с переводами строк (\n)
//   highlight — массив номеров строк (с 1) для подсветки
export default function CodeBlock({ file, variant = 'vuln', code, highlight = [] }) {
  const lines = code.replace(/\n$/, '').split('\n')
  const hlClass = variant === 'fix' ? 'hl-fix' : 'hl-vuln'
  return (
    <div className="codeblock">
      <div className="codeblock-head">
        <span className="file">{file}</span>
        <span className={`tag ${variant}`}>
          {variant === 'fix' ? '✓ исправлено' : '✗ уязвимость'}
        </span>
      </div>
      <pre>
        <code>
          {lines.map((line, i) => (
            <span
              key={i}
              className={`code-line ${highlight.includes(i + 1) ? hlClass : ''}`}
            >
              {line || ' '}
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}
