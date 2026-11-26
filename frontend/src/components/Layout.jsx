import { NavLink } from "react-router-dom";
import { Bookmark, Home, Network, Route as RouteIcon, Search } from "lucide-react";

const LINKS = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/search", label: "Explore", icon: Search },
  { to: "/graph", label: "Graph", icon: Network },
  { to: "/bridge", label: "Bridge", icon: RouteIcon },
  { to: "/collections", label: "Collections", icon: Bookmark },
];

function BridgeMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M5 21 Q16 6 27 21" stroke="var(--accent)" strokeWidth="2.2" fill="none" />
      <circle cx="5" cy="21" r="3.6" fill="var(--accent)" />
      <circle cx="27" cy="21" r="3.6" fill="var(--accent)" />
      <circle cx="16" cy="11" r="3.2" fill="var(--amber)" />
    </svg>
  );
}

export default function Layout({ children }) {
  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <NavLink to="/" className="brand">
            <BridgeMark />
            <span>
              Research<span style={{ color: "var(--accent)" }}>Bridge</span>
            </span>
          </NavLink>
          <nav className="nav-links">
            {LINKS.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className="nav-link">
                <span className="row gap-2">
                  <Icon size={16} />
                  <span className="nav-link-label">{label}</span>
                </span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </>
  );
}
