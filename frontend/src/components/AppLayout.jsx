import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import Icon from "./Icon.jsx";

const primaryNavItems = [
  { icon: "dashboard", label: "Dashboard", shortLabel: "Home", to: "/" },
  { icon: "products", label: "Manufacturing", shortLabel: "Build", to: "/products" },
  { icon: "stock", label: "Inventory", shortLabel: "Stock", to: "/stock" },
  { icon: "sales", label: "Sales", shortLabel: "Sales", to: "/sales" },
  { icon: "more", label: "More", shortLabel: "More", to: "/more" },
];

const sectionMeta = {
  "/": { title: "MetalMint", subtitle: "Factory OS" },
  "/products": { title: "Production", subtitle: "Build Wardrobes" },
  "/stock": { title: "Inventory", subtitle: "Stock & Tracking" },
  "/sales": { title: "Sales", subtitle: "Invoices & Billing" },
  "/more": { title: "More", subtitle: "Tools & Settings" },
};

function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();

  const activeNavItem =
    primaryNavItems
      .filter((item) =>
        item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)
      )
      .sort((a, b) => b.to.length - a.to.length)[0] ?? primaryNavItems[0];

  const activePath = activeNavItem.to;
  const meta = sectionMeta[activePath] ?? { title: "MetalMint", subtitle: "Factory OS" };

  const initials = user.name
    ? user.name.trim().split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  return (
    <div className="app-frame app-frame-v2">
      <div className="shell-main shell-main-v2">
        {/* ── Premium Header ── */}
        <header className="topbar topbar-v2" role="banner">
          <div className="v3-header-brand">
            <div className="v3-brand-mark" aria-hidden="true">MM</div>
            <div className="v3-header-left">
              <span className="v3-header-title">{meta.title}</span>
              <span className="v3-header-subtitle">{meta.subtitle}</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Live status dot */}
            <div
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#34d399",
                boxShadow: "0 0 5px rgba(52,211,153,0.7)",
                flexShrink: 0,
              }}
              title="System live"
              aria-hidden="true"
            />
            <div
              className="v3-header-avatar"
              aria-label={`Signed in as ${user.name} (${user.role})`}
              title={`${user.name} · ${user.role}`}
              style={{ cursor: "default" }}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* ── Page Content ── */}
        <div className="workspace workspace-v2">
          <main className="content content-v2">
            <Outlet />
          </main>
        </div>
      </div>

      {/* ── Bottom Navigation ── */}
      <nav className="bottom-nav bottom-nav-v2" aria-label="Primary navigation">
        {primaryNavItems.map((item) => (
          <NavLink
            end={item.to === "/"}
            key={item.to}
            to={item.to}
            aria-label={item.label}
          >
            <span className="nav-icon" aria-hidden="true">
              <Icon name={item.icon} size={18} />
            </span>
            <span>{item.shortLabel}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default AppLayout;
