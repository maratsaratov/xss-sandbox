import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// ---------------------------------------------------------------------------
//  ДЕМОНСТРАЦИОННЫЕ ДАННЫЕ ДЛЯ АТАКИ
// ---------------------------------------------------------------------------
// 1) «Секретная» cookie сессии. В реальном приложении такую cookie крадут,
//    чтобы выдать себя за пользователя (угон сессии).
//    Обратите внимание: флаг HttpOnly НЕ установлен — именно поэтому
//    document.cookie доступен из JavaScript. Это типичная ошибка, которая
//    усиливает последствия XSS.
document.cookie = 'session_token=SECRET-7f3a9c2b-DEMO-USER-42; path=/'

// 2) «Сервер атакующего». XSS-payload в стенде вызывает window.__attacker(...),
//    и украденные данные появляются в панели «Журнал сервера атакующего».
//    Так наглядно видно, КУДА утекают данные жертвы. Ничего наружу не
//    отправляется — это безопасная симуляция в пределах страницы.
window.__attacker = function (data) {
  window.dispatchEvent(
    new CustomEvent('attacker-receive', { detail: String(data) })
  )
  return ''
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
