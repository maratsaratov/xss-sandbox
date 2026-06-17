import { NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import StoredXSS from './pages/StoredXSS.jsx'
import ReflectedXSS from './pages/ReflectedXSS.jsx'
import DomXSS from './pages/DomXSS.jsx'

export default function App() {
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="brand">
            <span className="brand-mark">&lt;XSS&gt;</span> Песочница
          </NavLink>
          <nav className="nav">
            <NavLink to="/" end>Главная</NavLink>
            <NavLink to="/stored">1. Хранимый</NavLink>
            <NavLink to="/reflected">2. Отражённый</NavLink>
            <NavLink to="/dom">3. DOM-модель</NavLink>
          </nav>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stored" element={<StoredXSS />} />
          <Route path="/reflected" element={<ReflectedXSS />} />
          <Route path="/dom" element={<DomXSS />} />
        </Routes>
      </main>
    </>
  )
}
