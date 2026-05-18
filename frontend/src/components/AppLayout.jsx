import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useTheme } from "../theme/ThemeContext.jsx";
import Button from "./Button.jsx";
import Icon from "./Icon.jsx";

function AppLayout() {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const desktopNavItems = [
    { icon: "dashboard", label: "Dashboard", shortLabel: "Dash", to: "/" },
    { icon: "products", label: "Products", shortLabel: "Products", to: "/products" },
    { icon: "search", label: "Search", shortLabel: "Search", to: "/products/search" },
    { icon: "scan", label: "Scan", shortLabel: "Scan", to: "/scan" },
    { icon: "stock", label: "Stock", shortLabel: "Stock", to: "/stock" },
    { icon: "sales", label: "Sales", shortLabel: "Sales", to: "/sales" },
    { icon: "repair", label: "Repair", shortLabel: "Repair", to: "/repairs" },
    { adminOnly: true, icon: "types", label: "Product Types", shortLabel: "Types", to: "/admin/product-types" },
    { adminOnly: true, icon: "users", label: "Users", shortLabel: "Users", to: "/admin/users" },
  ];
  const mobileNavItems = [
    { icon: "dashboard", label: "Dashboard", shortLabel: "Dash", to: "/", matchPaths: ["/"] },
    { icon: "products", label: "Products", shortLabel: "Products", to: "/products", matchPaths: ["/products"] },
    { icon: "stock", label: "Stock", shortLabel: "Stock", to: "/stock", matchPaths: ["/stock"] },
    { icon: "scan", label: "Scan", shortLabel: "Scan", to: "/scan", matchPaths: ["/scan"] },
    {
      icon: "more",
      label: "More",
      shortLabel: "More",
      to: "/more",
      matchPaths: ["/more", "/sales", "/repairs", "/admin/product-types", "/admin/users"],
    },
  ];
  const visibleNavItems = desktopNavItems.filter((item) => !item.adminOnly || user.role === "admin");
  const contextNavItems = [...visibleNavItems, { label: "More", to: "/more" }];
  const activeNavItem =
    contextNavItems
      .filter((item) => (item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)))
      .sort((first, second) => second.to.length - first.to.length)[0] ?? visibleNavItems[0];

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true">
            MM
          </span>
          <div>
            <p className="eyebrow">Steel Manufacturing Tracker</p>
            <h1 className="app-title">MetalMint</h1>
          </div>
        </div>

        <div className="user-card">
          <span className="avatar" aria-hidden="true">
            {user.name?.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <strong>{user.name}</strong>
            <span>{user.role}</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          <span className="nav-section-label">Operations</span>
          {visibleNavItems.map((item) => (
            <NavLink end={item.to === "/"} key={item.to} to={item.to}>
              <span className="nav-icon" aria-hidden="true">
                <Icon name={item.icon} size={16} />
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div className="mobile-brand brand-lockup">
            <span className="brand-mark" aria-hidden="true">
              MM
            </span>
            <div>
              <p className="eyebrow">Steel Manufacturing Tracker</p>
              <h1 className="app-title">MetalMint</h1>
            </div>
          </div>
          <div className="topbar-context">
            <p className="eyebrow">Workspace</p>
            <strong>{activeNavItem.label}</strong>
          </div>
          <div className="topbar-actions">
            <span className="user-chip">
              <span className="avatar small" aria-hidden="true">
                {user.name?.slice(0, 2).toUpperCase()}
              </span>
              <span>
                <strong>{user.name}</strong>
                <small>{user.role}</small>
              </span>
            </span>
            <Button icon={theme === "dark" ? "sun" : "moon"} tone="secondary" onClick={toggleTheme}>
              {theme === "dark" ? "Light" : "Dark"}
            </Button>
            <Button icon="logout" tone="secondary" onClick={logout}>
              Logout
            </Button>
          </div>
        </header>

        <div className="workspace">
          <main className="content">
            <Outlet />
          </main>
        </div>
      </div>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {mobileNavItems.map((item) => (
          <NavLink
            className={
              item.matchPaths.some((path) => (path === "/" ? location.pathname === "/" : location.pathname.startsWith(path)))
                ? "active"
                : ""
            }
            end={item.to === "/"}
            key={item.to}
            to={item.to}
          >
            <span className="nav-icon" aria-hidden="true">
              <Icon name={item.icon} size={16} />
            </span>
            <span>{item.shortLabel}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default AppLayout;
