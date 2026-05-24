import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client.js";

function ScanSearchPage() {
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const [productCode, setProductCode] = useState("");
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      scannerRef.current?.clear?.().catch(() => {});
    };
  }, []);

  async function openProduct(code) {
    setError("");
    try {
      const data = await apiRequest(`/api/products/code/${encodeURIComponent(code.trim())}`);
      navigate(`/products/${data.product.id}`);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function submitManualCode(event) {
    event.preventDefault();
    openProduct(productCode);
  }

  async function startCameraScanner() {
    setError("");
    setIsStartingCamera(true);
    setCameraEnabled(true);
    try {
      await scannerRef.current?.clear?.().catch(() => {});
      const { Html5QrcodeScanner } = await import("html5-qrcode");
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 8, qrbox: { width: 240, height: 240 } },
        false
      );
      scannerRef.current.render((decodedText) => {
        scannerRef.current?.clear?.().catch(() => {});
        const scannedCode = decodedText.replace(/\/$/, "").split("/").pop();
        setProductCode(scannedCode.toUpperCase());
        openProduct(scannedCode);
      });
    } catch {
      setError("Camera scanner could not start. Use manual code search below.");
    } finally {
      setIsStartingCamera(false);
    }
  }

  return (
    <section className="page-section scan-page animate-fade-in" style={{ paddingBottom: "24px" }}>
      {/* ── Header ── */}
      <div className="page-header-v3" style={{ "--section-color": "var(--primary-strong)" }}>
        <div className="page-header-v3-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <rect x="7" y="7" width="10" height="10" rx="1" />
          </svg>
        </div>
        <div>
          <p className="page-header-v3-eyebrow">Lookup</p>
          <h1 className="page-header-v3-title">Scan / Search</h1>
        </div>
      </div>

      {/* ── Manual Code Search ── */}
      <div className="workspace-card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Manual</p>
            <h3>Enter product code</h3>
          </div>
        </div>
        <form onSubmit={submitManualCode} style={{ display: "flex", gap: "8px" }}>
          <input
            autoFocus
            onChange={(event) => setProductCode(event.target.value.toUpperCase())}
            placeholder="e.g. MM-ALM744819-2D-H-2605-0001"
            required
            value={productCode}
            style={{ flex: 1, minHeight: "48px", fontFamily: "var(--mono)", fontSize: "0.82rem" }}
          />
          <button
            className="button primary"
            type="submit"
            style={{ flexShrink: 0, minWidth: "80px" }}
          >
            Find →
          </button>
        </form>
      </div>

      {/* ── QR Camera Scanner ── */}
      <div className="workspace-card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Camera</p>
            <h3>Scan QR label</h3>
          </div>
          {cameraEnabled && (
            <span style={{ fontSize: "0.68rem", fontFamily: "var(--mono)", fontWeight: 700, color: "#34d399", background: "rgba(52,211,153,0.1)", padding: "3px 10px", borderRadius: "999px", border: "1px solid rgba(52,211,153,0.25)" }}>
              LIVE
            </span>
          )}
        </div>

        {/* Camera/QR area */}
        <div
          style={{
            background: "var(--surface-low)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            overflow: "hidden",
            minHeight: "200px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "14px",
            position: "relative",
          }}
        >
          {/* Corner brackets */}
          {!cameraEnabled && (
            <>
              <div style={{ position: "absolute", top: "16px", left: "16px", width: "28px", height: "28px", borderTop: "3px solid var(--primary-strong)", borderLeft: "3px solid var(--primary-strong)", borderRadius: "4px 0 0 0", pointerEvents: "none" }} />
              <div style={{ position: "absolute", top: "16px", right: "16px", width: "28px", height: "28px", borderTop: "3px solid var(--primary-strong)", borderRight: "3px solid var(--primary-strong)", borderRadius: "0 4px 0 0", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: "16px", left: "16px", width: "28px", height: "28px", borderBottom: "3px solid var(--primary-strong)", borderLeft: "3px solid var(--primary-strong)", borderRadius: "0 0 0 4px", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: "16px", right: "16px", width: "28px", height: "28px", borderBottom: "3px solid var(--primary-strong)", borderRight: "3px solid var(--primary-strong)", borderRadius: "0 0 4px 0", pointerEvents: "none" }} />
              <div style={{ textAlign: "center", padding: "24px" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>📷</div>
                <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                  Tap the button below to activate the camera and scan a product QR code
                </p>
              </div>
            </>
          )}
          <div id="qr-reader" style={{ width: "100%" }} />
        </div>

        <button
          className="button primary"
          disabled={isStartingCamera || cameraEnabled}
          onClick={startCameraScanner}
          type="button"
          style={{ width: "100%" }}
        >
          {isStartingCamera ? (
            <span style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
              <span className="loading-spin" />
              Starting camera...
            </span>
          ) : cameraEnabled ? "Camera active — scan a QR label" : "Start Camera"}
        </button>
      </div>

      {error ? <p className="error-message">{error}</p> : null}

      <p style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
        Scan the permanent QR label printed on any MetalMint almirah to open its full product record.
      </p>
    </section>
  );
}

export default ScanSearchPage;
