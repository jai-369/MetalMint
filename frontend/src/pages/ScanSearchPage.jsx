import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";

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
        {
          fps: 8,
          qrbox: { width: 240, height: 240 },
        },
        false
      );
      scannerRef.current.render((decodedText) => {
        scannerRef.current?.clear?.().catch(() => {});
        const scannedCode = decodedText.replace(/\/$/, "").split("/").pop();
        setProductCode(scannedCode.toUpperCase());
        openProduct(scannedCode);
      });
    } catch {
      setError("Camera scanner could not start. Manual product code search is available.");
    } finally {
      setIsStartingCamera(false);
    }
  }

  return (
    <section className="page-section scan-page">
      <PageHeader
        eyebrow="Scan"
        icon="scan"
        title="Scan/Search Product"
      />

      <section className="scan-manual-panel">
        <form className="search-code-form" onSubmit={submitManualCode}>
          <label>
            Manual product code
            <input
              autoFocus
              className="technical-input"
              onChange={(event) => setProductCode(event.target.value.toUpperCase())}
              placeholder="MM-ALM2D-3660-2605-0001"
              required
              value={productCode}
            />
          </label>
          <button className="button primary" type="submit">
            Open Product
          </button>
        </form>
      </section>

      <section className="scanner-workbench">
        <div className="scanner-stage">
          <div className="scanner-frame" aria-label="QR scanner preview">
            <span className="scanner-bracket scanner-bracket-tl" />
            <span className="scanner-bracket scanner-bracket-tr" />
            <span className="scanner-bracket scanner-bracket-bl" />
            <span className="scanner-bracket scanner-bracket-br" />
            {!cameraEnabled ? <span className="scanner-sweep" aria-hidden="true" /> : null}
            <div id="qr-reader" className={`qr-reader${cameraEnabled ? " active" : ""}`} />
            {!cameraEnabled ? (
              <div className="scanner-placeholder">
                <span>QR</span>
                <strong>Camera scanner ready</strong>
                <small>Start camera permissions when working from a device with a camera.</small>
              </div>
            ) : null}
          </div>
        </div>
        <div className="scanner-controls">
          <div>
            <p className="eyebrow">Camera</p>
            <h3>Scan MetalMint QR labels</h3>
            <p className="muted">
              The scanner opens the private product record after reading a permanent product code or QR URL.
            </p>
          </div>
          <button className="button primary" disabled={isStartingCamera} onClick={startCameraScanner} type="button">
            {isStartingCamera ? "Starting..." : "Start Camera Scanner"}
          </button>
          <p className="scanner-fallback-note">Manual product-code search remains available if camera access is limited.</p>
        </div>
      </section>

      {error ? <p className="error-message">{error}</p> : null}
    </section>
  );
}

export default ScanSearchPage;
