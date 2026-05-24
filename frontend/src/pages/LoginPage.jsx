import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from?.pathname ?? "/";

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function handleChange(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login(form);
      navigate(from, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
        background: "var(--bg)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glows */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "-15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "70vw",
          maxWidth: "420px",
          height: "70vw",
          maxHeight: "420px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: "5%",
          left: "5%",
          width: "50vw",
          maxWidth: "280px",
          height: "50vw",
          maxHeight: "280px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ width: "100%", maxWidth: "380px", position: "relative", zIndex: 1 }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "18px",
              background: "linear-gradient(145deg, #6366f1 0%, #4338ca 100%)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px",
              boxShadow: "0 8px 28px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
              fontSize: "22px",
              fontWeight: "900",
              color: "#fff",
              fontFamily: "var(--mono)",
              letterSpacing: "-1px",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            MM
          </div>
          <h1
            style={{
              fontSize: "1.65rem",
              fontWeight: "800",
              color: "var(--text-strong)",
              margin: "0 0 6px",
              letterSpacing: "-0.03em",
              fontFamily: "var(--font-display, inherit)",
            }}
          >
            MetalMint
          </h1>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: 0, letterSpacing: "0.02em" }}>
            Steel Almirah Factory OS
          </p>
        </div>

        {/* Login Card */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "22px",
            padding: "28px 22px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.42), 0 0 0 1px rgba(255,255,255,0.04)",
          }}
        >
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: "700",
              color: "var(--text-strong)",
              margin: "0 0 20px",
              letterSpacing: "-0.01em",
            }}
          >
            Sign in to continue
          </h2>

          <form id="login-form" onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
            <label>
              Email address
              <input
                autoComplete="email"
                autoFocus
                id="login-email"
                name="email"
                onChange={handleChange}
                placeholder="you@metalmint.in"
                required
                type="email"
                value={form.email}
                style={{ minHeight: "48px", fontSize: "0.92rem" }}
              />
            </label>

            <label>
              Password
              <div style={{ position: "relative" }}>
                <input
                  autoComplete="current-password"
                  id="login-password"
                  name="password"
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  style={{ minHeight: "48px", fontSize: "0.92rem", paddingRight: "56px", width: "100%", boxSizing: "border-box" }}
                />
                <button
                  id="toggle-password"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--muted)",
                    padding: "4px 6px",
                    minHeight: "unset",
                    fontSize: "0.68rem",
                    fontWeight: "700",
                    letterSpacing: "0.06em",
                    fontFamily: "var(--mono)",
                    borderRadius: "4px",
                  }}
                  type="button"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
            </label>

            {error && (
              <div
                style={{
                  background: "rgba(251,113,133,0.08)",
                  border: "1px solid rgba(251,113,133,0.28)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  fontSize: "0.82rem",
                  color: "#fb7185",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: 600,
                }}
              >
                <span aria-hidden="true">⚠️</span> {error}
              </div>
            )}

            <button
              id="login-submit"
              className="button primary"
              disabled={isSubmitting}
              type="submit"
              style={{
                minHeight: "50px",
                fontSize: "0.95rem",
                fontWeight: "800",
                marginTop: "4px",
                borderRadius: "14px",
                letterSpacing: "-0.01em",
              }}
            >
              {isSubmitting ? (
                <span style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                  <span className="loading-spin" />
                  Signing in...
                </span>
              ) : "Sign in →"}
            </button>
          </form>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: "0.65rem",
            color: "var(--muted)",
            marginTop: "20px",
            letterSpacing: "0.05em",
            fontFamily: "var(--mono)",
          }}
        >
          METALMINT v4 · INTERNAL USE ONLY
        </p>
      </div>
    </main>
  );
}

export default LoginPage;
