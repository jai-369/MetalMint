import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import Icon from "../components/Icon.jsx";
import { useTheme } from "../theme/ThemeContext.jsx";
import {
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  subscribeToPrinterState,
  printProductLabel,
} from "../utils/bluetoothPrinter.js";

const utilityItems = [
  {
    to: "/repairs",
    icon: "repair",
    label: "Service Desk",
    desc: "Capture repairs, track status & print service invoices.",
    iconColor: "#f43f5e",
    accent: "rgba(244,63,94,0.1)",
    accentBorder: "rgba(244,63,94,0.3)",
  },
  {
    to: "/scan",
    icon: "scan",
    label: "Scan Product",
    desc: "Use camera or manual code entry to open a product record.",
    iconColor: "#6366f1",
    accent: "rgba(99,102,241,0.1)",
    accentBorder: "rgba(99,102,241,0.3)",
  },
];

function MorePage() {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [printer, setPrinter] = useState({ connected: false, name: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToPrinterState((state) => {
      setPrinter(state);
    });
    return unsubscribe;
  }, []);

  const handleConnectPrinter = async () => {
    setLoading(true);
    try {
      await connectBluetoothPrinter();
    } catch (error) {
      console.error(error);
      alert("Failed to connect: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestPrint = async () => {
    try {
      await printProductLabel({
        product_type_name: "Test Wardrobe 74x38x19",
        width: 38, height: 74, depth: 19,
        size_label: "74 x 38 x 19",
        doors: "2-Door", weight_class: "Heavy",
        manufacturing_date: new Date().toISOString().slice(0, 10),
        product_code: "P2405601",
        qr_url: `${window.location.origin}/qr/P2405601`,
      });
    } catch (error) {
      console.error(error);
      alert("Test print failed: " + error.message);
    }
  };

  return (
    <section className="page-section more-page-v2 animate-fade-in" style={{ paddingBottom: "24px" }}>
      {/* ── Header ── */}
      <div className="page-header-v3" style={{ "--section-color": "var(--clr-more)" }}>
        <div className="page-header-v3-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
          </svg>
        </div>
        <div>
          <p className="page-header-v3-eyebrow">More</p>
          <h1 className="page-header-v3-title">Tools &amp; Settings</h1>
        </div>
      </div>

      {/* ── User Profile Card ── */}
      <div className="workspace-card" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "13px",
            background: "linear-gradient(135deg, var(--primary-strong), #7c3aed)",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--mono)",
            fontWeight: 900,
            fontSize: "15px",
            color: "#fff",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
          }}
        >
          {user.name?.trim().split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-strong)", marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              fontSize: "0.65rem",
              fontFamily: "var(--mono)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              padding: "2px 8px",
              borderRadius: "999px",
              background: user.role === "admin" ? "rgba(244,63,94,0.1)" : user.role === "staff" ? "rgba(245,158,11,0.1)" : "rgba(99,102,241,0.1)",
              color: user.role === "admin" ? "#f43f5e" : user.role === "staff" ? "#f59e0b" : "var(--primary)",
              border: `1px solid ${user.role === "admin" ? "rgba(244,63,94,0.25)" : user.role === "staff" ? "rgba(245,158,11,0.25)" : "rgba(99,102,241,0.25)"}`,
            }}>
              {user.role}
            </span>
            <span style={{ fontSize: "0.7rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.email}
            </span>
          </div>
        </div>
      </div>

      <div>
        <div className="v3-section-header">
          <p className="v3-section-title">Tools</p>
        </div>
        <div className="utility-grid-v2">
          {utilityItems.map((item) => (
            <Link
              className="utility-card"
              key={item.to}
              style={{ borderColor: "var(--border)", position: "relative", overflow: "hidden" }}
              to={item.to}
            >
              <div
                className="utility-card-icon"
                style={{ background: item.accent, color: item.iconColor, borderColor: item.accentBorder }}
              >
                <Icon name={item.icon} size={18} />
              </div>
              <h3>{item.label}</h3>
              <p>{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Thermal Printer ── */}
      <div className="workspace-card">
        <div className="panel-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", display: "grid", placeItems: "center", color: "var(--primary)", flexShrink: 0 }}>
              <Icon name="print" size={16} />
            </div>
            <div>
              <p className="eyebrow">Hardware</p>
              <h3>Thermal Printer</h3>
            </div>
          </div>
          <div
            style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: printer.connected ? "#34d399" : "var(--muted)",
              boxShadow: printer.connected ? "0 0 8px rgba(52,211,153,0.6)" : "none",
              flexShrink: 0,
            }}
          />
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: "0 0 12px" }}>
          {printer.connected ? `Connected: ${printer.name}` : "No label printer connected over Bluetooth."}
        </p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            className="action-btn-v2"
            onClick={printer.connected ? disconnectBluetoothPrinter : handleConnectPrinter}
            disabled={loading}
            type="button"
            style={{ flex: 1 }}
          >
            {loading ? "Connecting..." : printer.connected ? "Disconnect" : "Pair Printer"}
          </button>
          {printer.connected && (
            <button
              className="action-btn-v2"
              onClick={handleTestPrint}
              type="button"
              style={{ flex: 1 }}
            >
              Test Label
            </button>
          )}
        </div>
      </div>

      {/* ── Workers (staff & admin) ── */}
      {(user.role === "admin" || user.role === "staff") && (
        <div>
          <div className="v3-section-header">
            <p className="v3-section-title">Team</p>
          </div>
          <Link
            className="utility-card"
            to="/workers"
            style={{ flexDirection: "row", alignItems: "center", gap: "12px" }}
          >
            <div className="utility-card-icon" style={{ background: "rgba(99,102,241,0.1)", color: "var(--primary)", borderColor: "rgba(99,102,241,0.25)" }}>
              <Icon name="users" size={18} />
            </div>
            <div>
              <h3 style={{ marginBottom: "2px" }}>Manage Workers</h3>
              <p>View, add and update employees in the manufacturing roster.</p>
            </div>
          </Link>
        </div>
      )}

      {/* ── Admin tools ── */}
      {user.role === "admin" && (
        <div>
          <div className="v3-section-header">
            <p className="v3-section-title">Admin</p>
          </div>
          <div className="utility-grid-v2">
            <Link className="utility-card" to="/admin/product-types">
              <div className="utility-card-icon" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", borderColor: "rgba(245,158,11,0.25)" }}>
                <Icon name="types" size={18} />
              </div>
              <h3>Product Types</h3>
              <p>Maintain the master product catalog.</p>
            </Link>
            <Link className="utility-card" to="/admin/users">
              <div className="utility-card-icon" style={{ background: "rgba(244,63,94,0.1)", color: "#f43f5e", borderColor: "rgba(244,63,94,0.25)" }}>
                <Icon name="users" size={18} />
              </div>
              <h3>User Accounts</h3>
              <p>Manage roles, passwords and activation.</p>
            </Link>
          </div>
        </div>
      )}

      {/* ── Preferences ── */}
      <div>
        <div className="v3-section-header">
          <p className="v3-section-title">Preferences</p>
        </div>
        <div style={{ display: "grid", gap: "8px" }}>
          <button
            className="utility-card"
            onClick={toggleTheme}
            style={{ flexDirection: "row", alignItems: "center", gap: "12px", cursor: "pointer", background: "none", textAlign: "left", font: "inherit" }}
            type="button"
          >
            <div className="utility-card-icon" style={{ background: theme === "dark" ? "rgba(245,158,11,0.1)" : "rgba(99,102,241,0.1)", color: theme === "dark" ? "#f59e0b" : "var(--primary)", borderColor: theme === "dark" ? "rgba(245,158,11,0.25)" : "rgba(99,102,241,0.25)" }}>
              <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
            </div>
            <div>
              <h3 style={{ marginBottom: "2px" }}>{theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}</h3>
              <p>Change the app appearance.</p>
            </div>
          </button>

          <button
            className="utility-card"
            onClick={logout}
            style={{ flexDirection: "row", alignItems: "center", gap: "12px", cursor: "pointer", background: "none", textAlign: "left", font: "inherit", borderColor: "rgba(251,113,133,0.25)" }}
            type="button"
          >
            <div className="utility-card-icon" style={{ background: "rgba(251,113,133,0.1)", color: "var(--danger)", borderColor: "rgba(251,113,133,0.3)" }}>
              <Icon name="logout" size={18} />
            </div>
            <div>
              <h3 style={{ marginBottom: "2px", color: "var(--danger)" }}>Sign Out</h3>
              <p>End the current session on this device.</p>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
}

export default MorePage;
