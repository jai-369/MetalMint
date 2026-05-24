import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import Icon from "../components/Icon.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatStatus } from "../constants/productStatuses.js";

const appModules = [
  {
    to: "/products",
    label: "Production",
    desc: "Build wardrobes & assign team",
    icon: "products",
    iconColor: "#f59e0b",
    accent: "rgba(245,158,11,0.12)",
    accentBorder: "rgba(245,158,11,0.35)",
  },
  {
    to: "/sales",
    label: "Sales & Billing",
    desc: "Create invoices & track payments",
    icon: "sales",
    iconColor: "#3b82f6",
    accent: "rgba(59,130,246,0.12)",
    accentBorder: "rgba(59,130,246,0.35)",
  },
  {
    to: "/stock",
    label: "Stock Levels",
    desc: "Real-time inventory by variant",
    icon: "stock",
    iconColor: "#10b981",
    accent: "rgba(16,185,129,0.12)",
    accentBorder: "rgba(16,185,129,0.35)",
  },
  {
    to: "/repairs",
    label: "Service Desk",
    desc: "Repairs, repaints & tracking",
    icon: "repair",
    iconColor: "#f43f5e",
    accent: "rgba(244,63,94,0.12)",
    accentBorder: "rgba(244,63,94,0.35)",
  },
];

const statConfig = [
  { key: "IN_STOCK", label: "In Stock", color: "#10b981", icon: "stock" },
  { key: "PAINTING_PENDING", label: "Paint Pending", color: "#f59e0b", icon: "repair" },
  { key: "PAINTED", label: "Painted", color: "#a855f7", icon: "types" },
  { key: "SOLD", label: "Sold", color: "#3b82f6", icon: "sales" },
];

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getTimeEmoji() {
  const h = new Date().getHours();
  if (h < 6) return "🌙";
  if (h < 12) return "☀️";
  if (h < 17) return "🌤️";
  if (h < 20) return "🌅";
  return "🌙";
}

function DashboardSkeleton() {
  return (
    <section className="page-section dashboard-v2 animate-fade-in">
      <div className="skeleton-box" style={{ height: "82px", borderRadius: "22px" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-box" style={{ height: "88px" }} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-box" style={{ height: "108px" }} />
        ))}
      </div>
      <div className="skeleton-box" style={{ height: "180px", borderRadius: "22px" }} />
    </section>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showRecentBuild, setShowRecentBuild] = useState(false);
  const [showRecentActivity, setShowRecentActivity] = useState(false);

  const greeting = getTimeGreeting();
  const emoji = getTimeEmoji();

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      setError("");
      try {
        const data = await apiRequest("/api/products/stats/dashboard");
        setDashboard(data.dashboard);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (isLoading) return <DashboardSkeleton />;

  const counts = dashboard?.counts ?? {};
  const firstName = user.name?.split(" ")[0] ?? user.name ?? "there";

  return (
    <section className="page-section dashboard-v2 animate-fade-in">
      {/* ── Hero / Greeting ── */}
      <div className="v3-hero">
        <div className="v3-hero-avatar">
          {user.name?.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="v3-hero-greeting">{greeting} {emoji}</p>
          <p className="v3-hero-name">{firstName}</p>
          <p className="v3-hero-role">
            Logged in as <span style={{ fontWeight: 600, color: "var(--muted-strong)", textTransform: "capitalize" }}>{user.role}</span>
          </p>
        </div>
        {/* Today's date chip */}
        <div style={{
          alignSelf: "flex-start",
          background: "var(--surface-higher)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "4px 10px",
          fontSize: "0.62rem",
          fontFamily: "var(--mono)",
          color: "var(--muted)",
          fontWeight: 700,
          whiteSpace: "nowrap",
          letterSpacing: "0.04em",
        }}>
          {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" }).toUpperCase()}
        </div>
      </div>

      {error ? <p className="error-message">{error}</p> : null}

      {/* ── Live Metrics ── */}
      {dashboard ? (
        <div>
          <div className="v3-section-header">
            <p className="v3-section-title">
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", display: "inline-block", boxShadow: "0 0 4px rgba(52,211,153,0.6)" }} />
              Live Metrics
            </p>
            <Link to="/stock" className="action-link">See all →</Link>
          </div>
          <div className="v3-stat-grid">
            {statConfig.map((stat) => (
              <div
                className="v3-stat-card"
                key={stat.key}
                style={{ "--stat-color": stat.color }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div className="v3-stat-icon">
                    <Icon name={stat.icon} size={13} />
                  </div>
                  <strong className="v3-stat-value">{counts[stat.key] ?? 0}</strong>
                </div>
                <span className="v3-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Module Grid ── */}
      <div>
        <div className="v3-section-header">
          <p className="v3-section-title">Factory Apps</p>
        </div>
        <div className="v3-app-grid">
          {appModules.map((mod) => (
            <Link
              className="v3-app-card"
              key={mod.to}
              to={mod.to}
              style={{
                "--app-accent": mod.accent,
                "--app-accent-border": mod.accentBorder,
                "--app-icon-color": mod.iconColor,
              }}
            >
              <div className="v3-app-card-icon">
                <Icon name={mod.icon} size={19} />
              </div>
              <strong className="v3-app-card-label">{mod.label}</strong>
              <p className="v3-app-card-desc">{mod.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Recent Build ── */}
      {dashboard?.recent_products?.length > 0 ? (
        <div className="workspace-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Production</p>
              <h3>Recently Built</h3>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setShowRecentBuild((c) => !c)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--primary)",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "6px",
                }}
              >
                {showRecentBuild ? "Hide" : "Show"}
              </button>
              <Link to="/products" className="action-link">All →</Link>
            </div>
          </div>
          {showRecentBuild ? (
            <div>
              {dashboard.recent_products.slice(0, 6).map((product) => (
                <Link className="product-stream-row" key={product.id} to={`/products/${product.id}`}>
                  <div className="stream-row-main">
                    <code>{product.product_code}</code>
                    <strong>{product.product_type_name}</strong>
                    <span>{product.size_label || `${product.width} × ${product.height}`} · {product.doors || "2D"}</span>
                  </div>
                  <div className="stream-row-side">
                    <StatusBadge status={product.current_status}>
                      {formatStatus(product.current_status)}
                    </StatusBadge>
                    <span>{product.paint_color || "Unpainted"}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: 0, textAlign: "center", padding: "8px 0" }}>
              {dashboard.recent_products.length} items — tap Show to expand
            </p>
          )}
        </div>
      ) : null}

      {/* ── Recent Activity ── */}
      {dashboard?.recent_history?.length > 0 ? (
        <div className="workspace-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Timeline</p>
              <h3>Recent Activity</h3>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setShowRecentActivity((c) => !c)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--primary)",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "6px",
                }}
              >
                {showRecentActivity ? "Hide" : "Show"}
              </button>
              <Link to="/stock" className="action-link">Stock →</Link>
            </div>
          </div>
          {showRecentActivity ? (
            <div>
              {dashboard.recent_history.slice(0, 8).map((entry) => (
                <Link
                  className="v3-activity-item"
                  key={entry.id}
                  to={`/products/${entry.manufactured_product_id}`}
                >
                  <div className="v3-activity-dot" />
                  <div className="v3-activity-body">
                    <span className="v3-activity-code">{entry.product_code}</span>
                    <span className="v3-activity-desc">{entry.description}</span>
                    <span className="v3-activity-meta">
                      By {entry.performed_by_name || "System"}
                    </span>
                  </div>
                  <time className="v3-activity-time" dateTime={entry.created_at}>
                    {new Date(entry.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </time>
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: 0, textAlign: "center", padding: "8px 0" }}>
              {dashboard.recent_history.length} events — tap Show to expand
            </p>
          )}
        </div>
      ) : null}

      {/* ── Empty State ── */}
      {dashboard && !dashboard.recent_products?.length && !dashboard.recent_history?.length ? (
        <div className="workspace-card">
          <p className="empty-state">
            No manufacturing records yet.{" "}
            <Link to="/products" style={{ color: "var(--primary)", fontWeight: 700 }}>
              Start your first build →
            </Link>
          </p>
        </div>
      ) : null}
    </section>
  );
}

export default DashboardPage;
