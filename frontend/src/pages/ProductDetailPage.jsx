import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatStatus, productStatuses } from "../constants/productStatuses.js";
import { subscribeToPrinterState, printProductLabel } from "../utils/bluetoothPrinter.js";

const today = new Date().toISOString().slice(0, 10);
const currentTime = new Date().toTimeString().slice(0, 5);

const blankPaintingForm = {
  painted_by: "",
  paint_color: "",
  paint_brand: "",
  paint_batch_number: "",
  coating_type: "",
  painting_date: today,
  painting_time: currentTime,
  painting_status: "PAINTED",
  repaint_required: false,
  move_to_stock_after_painting: false,
  remarks: "",
};

function getBlankPaintingForm() {
  return {
    ...blankPaintingForm,
    painting_date: new Date().toISOString().slice(0, 10),
    painting_time: new Date().toTimeString().slice(0, 5),
  };
}

const blankDispatchForm = {
  customer_name: "",
  customer_mobile: "",
  invoice_number: "",
  sale_price: "",
  dispatch_date: today,
  delivery_location: "",
  transport_details: "",
  vehicle_number: "",
  remarks: "",
  mark_sold: false,
};

function DetailCell({ label, value }) {
  const displayValue = value ?? "—";
  return (
    <div style={{ display: "grid", gap: "3px" }}>
      <span style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", fontFamily: "var(--mono)", fontWeight: "700", letterSpacing: "0.06em" }}>{label}</span>
      <strong style={{ fontSize: "0.9rem", color: "var(--text-strong)", fontWeight: "600" }}>{displayValue === "" ? "—" : displayValue}</strong>
    </div>
  );
}

function InfoCard({ title, accentColor = "var(--primary-strong)", children }) {
  return (
    <div style={{
      border: "1px solid var(--border)",
      borderRadius: "18px",
      background: "var(--surface)",
      overflow: "hidden",
      boxShadow: "var(--shadow-card)",
    }}>
      <div style={{
        padding: "14px 16px",
        borderBottom: "1px solid var(--border-soft)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: "var(--surface-high)",
      }}>
        <div style={{
          width: "4px", height: "18px",
          borderRadius: "2px",
          background: accentColor,
          flexShrink: 0,
        }} />
        <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: "700", color: "var(--text-strong)" }}>{title}</h3>
      </div>
      <div style={{ padding: "16px" }}>{children}</div>
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="page-section product-detail-page animate-fade-in" style={{ padding: "16px", paddingBottom: "40px", display: "grid", gap: "14px" }}>
      <div className="skeleton-box" style={{ height: "100px", borderRadius: "18px" }} />
      <div className="skeleton-box" style={{ height: "56px", borderRadius: "14px" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton-box" style={{ height: "70px" }} />)}
      </div>
      <div className="skeleton-box" style={{ height: "180px", borderRadius: "18px" }} />
      <div className="skeleton-box" style={{ height: "220px", borderRadius: "18px" }} />
    </div>
  );
}

function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canWrite = user.role === "admin" || user.role === "staff";
  const canDelete = user.role === "admin";
  const [product, setProduct] = useState(null);
  const [paintingRecords, setPaintingRecords] = useState([]);
  const [dispatchRecords, setDispatchRecords] = useState([]);
  const [paintColors, setPaintColors] = useState([]);
  const [paintingForm, setPaintingForm] = useState(getBlankPaintingForm);
  const [dispatchForm, setDispatchForm] = useState(blankDispatchForm);
  const [status, setStatus] = useState("");
  const [statusRemarks, setStatusRemarks] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPaintingSubmitting, setIsPaintingSubmitting] = useState(false);
  const [isDispatchSubmitting, setIsDispatchSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState("details"); // "details" | "paint" | "dispatch" | "status"
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printingStatus, setPrintingStatus] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToPrinterState((state) => {
      setPrinterConnected(state.connected);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    async function loadPaintColors() {
      try {
        const data = await apiRequest("/api/paint-colors");
        setPaintColors(data.paint_colors || []);
      } catch (requestError) {
        console.error("Failed to load paint colors:", requestError);
      }
    }

    loadPaintColors();
  }, []);

  const handleBlePrint = async () => {
    try {
      setPrintingStatus("Printing...");
      await printProductLabel(product);
      setPrintingStatus("✓ Printed!");
      setTimeout(() => setPrintingStatus(""), 2500);
    } catch (err) {
      alert("BLE print failed: " + err.message);
      setPrintingStatus("");
    }
  };

  useEffect(() => {
    async function loadDetail() {
      setIsLoading(true);
      setError("");
      try {
        const [productData, paintingData, dispatchData] = await Promise.all([
          apiRequest(`/api/products/${id}`),
          apiRequest(`/api/products/${id}/painting`),
          apiRequest(`/api/products/${id}/dispatch`),
        ]);
        setProduct(productData.product);
        setStatus(productData.product.current_status);
        setPaintingRecords(paintingData.painting_records);
        setDispatchRecords(dispatchData.dispatch_records);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadDetail();
  }, [id]);

  async function updateStatus(event) {
    event.preventDefault();
    setError(""); setMessage("");
    try {
      const data = await apiRequest(`/api/products/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ current_status: status, remarks: statusRemarks }),
      });
      setProduct(data.product);
      setStatusRemarks("");
      setMessage("Status updated successfully.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function refreshDetail() {
    const [productData, paintingData, dispatchData] = await Promise.all([
      apiRequest(`/api/products/${id}`),
      apiRequest(`/api/products/${id}/painting`),
      apiRequest(`/api/products/${id}/dispatch`),
    ]);
    setProduct(productData.product);
    setStatus(productData.product.current_status);
    setPaintingRecords(paintingData.painting_records);
    setDispatchRecords(dispatchData.dispatch_records);
  }

  function handlePaintingChange(event) {
    const { checked, name, type, value } = event.target;
    setPaintingForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  async function savePainting(event, override = {}) {
    event?.preventDefault();
    setError(""); setMessage("");
    const payload = { ...paintingForm, ...override };
    if (payload.painting_status === "PAINTED" && (!payload.painted_by.trim() || !payload.paint_color.trim())) {
      setError("Painter name and paint color are required when marking as painted.");
      return;
    }
    if (payload.painting_status === "REPAINT_REQUIRED") {
      payload.repaint_required = true;
      payload.move_to_stock_after_painting = false;
    }
    setIsPaintingSubmitting(true);
    try {
      await apiRequest(`/api/products/${id}/painting`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setPaintingForm(getBlankPaintingForm());
      setMessage(
        payload.move_to_stock_after_painting
          ? "✓ Painted & moved to stock!"
          : payload.painting_status === "REPAINT_REQUIRED"
          ? "Repaint requirement saved."
          : "✓ Painting record saved."
      );
      await refreshDetail();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsPaintingSubmitting(false);
    }
  }

  function savePaintingOutcome(event, paintingStatus, moveToStockAfterPainting = false) {
    return savePainting(event, {
      painting_status: paintingStatus,
      repaint_required: paintingStatus === "REPAINT_REQUIRED",
      move_to_stock_after_painting: moveToStockAfterPainting,
    });
  }

  function handleDispatchChange(event) {
    const { checked, name, type, value } = event.target;
    setDispatchForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  async function saveDispatch(event, override = {}) {
    event?.preventDefault();
    setError(""); setMessage("");
    setIsDispatchSubmitting(true);
    try {
      await apiRequest(`/api/products/${id}/dispatch`, {
        method: "POST",
        body: JSON.stringify({ ...dispatchForm, sale_price: dispatchForm.sale_price || null, ...override }),
      });
      setDispatchForm({ ...blankDispatchForm, dispatch_date: new Date().toISOString().slice(0, 10) });
      setMessage(override.mark_sold ? "✓ Product marked as sold!" : "✓ Dispatch record saved.");
      await refreshDetail();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsDispatchSubmitting(false);
    }
  }

  async function handleDeleteProduct() {
    if (!canDelete || !product) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${product.product_code}? This removes the manufactured product and related stock history.`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await apiRequest(`/api/products/${product.id}`, {
        method: "DELETE",
      });
      navigate("/stock", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const stages = [
    { num: 1, label: "Built", statuses: ["MANUFACTURED", "PAINTING_PENDING"] },
    { num: 2, label: "Painted", statuses: ["PAINTED"] },
    { num: 3, label: "In Stock", statuses: ["IN_STOCK", "RESERVED"] },
    { num: 4, label: "Sold", statuses: ["SOLD", "DISPATCHED"] },
  ];

  function getActiveStageIndex() {
    if (!product) return -1;
    const current = product.current_status;
    for (let i = 0; i < stages.length; i++) {
      if (stages[i].statuses.includes(current)) return i;
    }
    return -1;
  }

  if (isLoading) return <ProductDetailSkeleton />;

  if (!product) {
    return (
      <section className="page-section animate-fade-in" style={{ padding: "16px" }}>
        {error && <p className="error-message">{error}</p>}
        <Link className="button secondary" to="/products">← Back to Products</Link>
      </section>
    );
  }

  const latestPainting = paintingRecords[0];
  const latestDispatch = dispatchRecords[0];
  const sizeDisplay = product.size_label || `${product.width} × ${product.height}`;
  const activeStageIdx = getActiveStageIndex();
  const mfgNames = product.manufacturers?.length > 0
    ? product.manufacturers.map((m) => m.name).join(", ")
    : product.manufactured_by || "—";
  const paintNames = latestPainting?.painters?.length > 0
    ? latestPainting.painters.map((p) => p.name).join(", ")
    : (product.painters?.length > 0 ? product.painters.map((p) => p.name).join(", ") : (latestPainting?.painted_by || "Unpainted"));

  const isPaintPending = ["PAINTING_PENDING", "MANUFACTURED"].includes(product.current_status);
  const isDispatchable = ["IN_STOCK", "PAINTED"].includes(product.current_status);

  const sectionTabs = [
    { key: "details", label: "Details" },
    { key: "paint", label: "Paint", alert: isPaintPending && canWrite },
    { key: "dispatch", label: "Dispatch", alert: isDispatchable && canWrite },
    { key: "status", label: "Status" },
  ];

  return (
    <section className="page-section product-detail-page animate-fade-in" style={{ paddingBottom: "32px" }}>
      {/* ── Back button + title ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Link
          to="/products"
          style={{
            width: "34px", height: "34px", borderRadius: "10px", border: "1px solid var(--border)",
            background: "var(--surface)", display: "grid", placeItems: "center",
            color: "var(--muted)", textDecoration: "none", flexShrink: 0, fontSize: "1.1rem",
            transition: "all 0.18s ease",
          }}
          aria-label="Back to products"
        >
          ←
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: "0.65rem", color: "var(--muted)", fontFamily: "var(--mono)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em" }}>Product Detail</p>
          <h1 style={{ margin: "1px 0 0", fontSize: "1rem", fontWeight: "800", color: "var(--text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {product.product_type_name}
          </h1>
        </div>
        {canDelete ? (
          <button
            className="button danger"
            onClick={handleDeleteProduct}
            style={{ minHeight: "34px", padding: "0 12px", flexShrink: 0 }}
            type="button"
          >
            Delete
          </button>
        ) : null}
        <StatusBadge status={product.current_status}>{formatStatus(product.current_status)}</StatusBadge>
      </div>

      {/* ── Hero card ── */}
      <div style={{
        border: "1px solid var(--border)",
        borderRadius: "18px",
        background: "linear-gradient(135deg, var(--surface-high) 0%, var(--surface) 100%)",
        padding: "16px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "100px", height: "100px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)", pointerEvents: "none" }} />
        <code style={{ display: "block", fontSize: "0.72rem", color: "var(--primary)", marginBottom: "8px", fontWeight: "700", wordBreak: "break-all" }}>
          {product.product_code}
        </code>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <DetailCell label="Size" value={sizeDisplay} />
          <DetailCell label="Type" value={`${product.doors || "2D"} · ${product.weight_class || "Heavy"}`} />
          <DetailCell label="Paint" value={product.paint_color || "Unpainted"} />
          <DetailCell label="Mfg Date" value={product.manufacturing_date?.slice(0, 10)} />
        </div>
      </div>

      {/* ── Progress pipeline ── */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "14px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "4px",
        position: "relative",
      }}>
        {/* connector line */}
        <div style={{ position: "absolute", left: "12%", right: "12%", top: "50%", height: "2px", background: "var(--border-soft)", zIndex: 0, transform: "translateY(-50%)" }}>
          <div style={{ height: "100%", background: "var(--primary-strong)", width: `${activeStageIdx >= 0 ? (activeStageIdx / (stages.length - 1)) * 100 : 0}%`, transition: "width 0.5s ease", borderRadius: "2px" }} />
        </div>
        {stages.map((stage, idx) => {
          const isCompleted = idx < activeStageIdx;
          const isActive = idx === activeStageIdx;
          return (
            <div key={stage.num} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", flex: 1, position: "relative", zIndex: 1 }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "50%",
                background: isCompleted ? "var(--primary-strong)" : isActive ? "var(--surface)" : "var(--surface)",
                border: isCompleted ? "2px solid var(--primary-strong)" : isActive ? "2px solid var(--primary-strong)" : "2px solid var(--border)",
                display: "grid", placeItems: "center",
                fontWeight: "800", fontSize: "0.78rem",
                color: isCompleted ? "#fff" : isActive ? "var(--primary-strong)" : "var(--muted)",
                boxShadow: isActive ? "0 0 0 4px rgba(99,102,241,0.15)" : "none",
                transition: "all 0.3s ease",
              }}>
                {isCompleted ? "✓" : stage.num}
              </div>
              <span style={{ fontSize: "0.6rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.04em", color: isActive ? "var(--primary)" : isCompleted ? "var(--primary)" : "var(--muted)", textAlign: "center" }}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      {/* ── Action alerts ── */}
      {isPaintPending && canWrite && (
        <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "12px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.1rem" }}>🖌️</span>
          <div>
            <strong style={{ fontSize: "0.84rem", color: "#f59e0b" }}>Paint Record Needed</strong>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted)" }}>This almirah is waiting for painting. Tap Paint tab below.</p>
          </div>
          <button onClick={() => setActiveSection("paint")} style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: "8px", border: "1px solid rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.1)", color: "#f59e0b", fontWeight: "700", fontSize: "0.78rem", cursor: "pointer", flexShrink: 0 }} type="button">
            Paint →
          </button>
        </div>
      )}

      {isDispatchable && canWrite && (
        <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "12px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.1rem" }}>📦</span>
          <div>
            <strong style={{ fontSize: "0.84rem", color: "#10b981" }}>Ready to Dispatch</strong>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted)" }}>In stock and ready for delivery or sale.</p>
          </div>
          <button onClick={() => setActiveSection("dispatch")} style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.1)", color: "#10b981", fontWeight: "700", fontSize: "0.78rem", cursor: "pointer", flexShrink: 0 }} type="button">
            Dispatch →
          </button>
        </div>
      )}

      {/* ── Tab selector ── */}
      <div style={{ display: "flex", gap: "6px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "4px", flexWrap: "wrap" }}>
        {sectionTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            style={{
              flex: 1,
              minWidth: "60px",
              padding: "8px 10px",
              borderRadius: "10px",
              border: "none",
              fontSize: "0.82rem",
              fontWeight: "700",
              cursor: "pointer",
              background: activeSection === tab.key ? "var(--primary-strong)" : "transparent",
              color: activeSection === tab.key ? "#fff" : tab.alert ? "#f59e0b" : "var(--muted)",
              transition: "all 0.2s ease",
              position: "relative",
            }}
            type="button"
          >
            {tab.label}
            {tab.alert && activeSection !== tab.key && (
              <span style={{ position: "absolute", top: "4px", right: "4px", width: "6px", height: "6px", borderRadius: "50%", background: "#f59e0b" }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content: Details ── */}
      {activeSection === "details" && (
        <div style={{ display: "grid", gap: "12px" }}>
          <InfoCard title="Manufacturing Details" accentColor="#f59e0b">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <DetailCell label="Type Code" value={product.product_type_code} />
              <DetailCell label="Batch" value={product.manufacturing_batch} />
              <DetailCell label="Doors" value={product.doors || "2-Door"} />
              <DetailCell label="Weight" value={product.weight_class || "Heavy"} />
              <DetailCell label="Material" value={product.material_gauge} />
              <DetailCell label="Custom Order" value={product.is_custom ? "Yes" : "No"} />
              <DetailCell label="Made By" value={mfgNames} />
              <DetailCell label="Location" value={product.factory_location} />
            </div>
            {product.remarks && (
              <div style={{ marginTop: "12px", padding: "10px", borderRadius: "10px", background: "var(--surface-higher)", fontSize: "0.82rem", color: "var(--muted)" }}>
                <span style={{ fontSize: "0.65rem", fontFamily: "var(--mono)", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.06em" }}>Remarks</span>
                <p style={{ margin: "4px 0 0", color: "var(--text)" }}>{product.remarks}</p>
              </div>
            )}
          </InfoCard>

          <InfoCard title="Painting Details" accentColor="#a855f7">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <DetailCell label="Painted By" value={paintNames} />
              <DetailCell label="Color" value={latestPainting?.paint_color || product.paint_color || "Unpainted"} />
              <DetailCell label="Paint Brand" value={latestPainting?.paint_brand} />
              <DetailCell label="Coating" value={latestPainting?.coating_type} />
              <DetailCell label="Paint Date" value={latestPainting?.painting_date?.slice(0, 10)} />
              <DetailCell label="Repaint?" value={latestPainting ? (latestPainting.repaint_required ? "Yes" : "No") : "—"} />
            </div>
          </InfoCard>

          {latestDispatch && (
            <InfoCard title="Dispatch / Sale" accentColor="#3b82f6">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <DetailCell label="Customer" value={latestDispatch.customer_name} />
                <DetailCell label="Mobile" value={latestDispatch.customer_mobile} />
                <DetailCell label="Invoice" value={latestDispatch.invoice_number} />
                <DetailCell label="Sale Price" value={latestDispatch.sale_price ? `₹${latestDispatch.sale_price}` : "—"} />
                <DetailCell label="Dispatch Date" value={latestDispatch.dispatch_date?.slice(0, 10)} />
                <DetailCell label="Vehicle" value={latestDispatch.vehicle_number} />
              </div>
            </InfoCard>
          )}

          {/* QR */}
          <InfoCard title="QR Code & Label" accentColor="#6366f1">
            <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ background: "#ffffff", padding: "8px", borderRadius: "12px", display: "inline-flex", flexShrink: 0 }}>
                <QRCodeCanvas value={product.qr_url} size={120} level="M" includeMargin={false} />
              </div>
              <div style={{ flex: 1, minWidth: "140px", display: "grid", gap: "8px" }}>
                <Link className="button secondary" to={`/qr-label/${encodeURIComponent(product.product_code)}`} style={{ textAlign: "center", display: "block" }}>
                  🖨 Browser Print Label
                </Link>
                {printerConnected ? (
                  <button className="button primary" onClick={handleBlePrint} type="button">
                    {printingStatus || "📡 BLE Print Label"}
                  </button>
                ) : (
                  <button className="button secondary" disabled type="button" style={{ opacity: 0.5 }}>
                    BLE Printer Offline
                  </button>
                )}
              </div>
            </div>
          </InfoCard>
        </div>
      )}

      {/* ── Tab: Paint ── */}
      {activeSection === "paint" && (
        <div style={{ display: "grid", gap: "12px" }}>
          {!isPaintPending && (
            <div style={{ background: "var(--success-soft)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: "12px", padding: "12px 14px", fontSize: "0.84rem", color: "var(--success)" }}>
              ✓ This product is already painted: <strong>{latestPainting?.paint_color || product.paint_color}</strong>
            </div>
          )}

          {canWrite && (
            <InfoCard title="Add Paint Record" accentColor="#a855f7">
              <form onSubmit={(event) => savePaintingOutcome(event, "PAINTED")} style={{ display: "grid", gap: "12px" }}>
                <label>
                  Painted by *
                  <input name="painted_by" onChange={handlePaintingChange} placeholder="Painter name" value={paintingForm.painted_by} />
                </label>
                <label>
                  Paint color *
                  <input
                    list="detail-paint-colors"
                    name="paint_color"
                    onChange={handlePaintingChange}
                    placeholder="Grey, Blue Gloss..."
                    value={paintingForm.paint_color}
                  />
                  <datalist id="detail-paint-colors">
                    {paintColors.map((color) => (
                      <option key={color.id} value={color.name} />
                    ))}
                  </datalist>
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <label>
                    Date
                    <input name="painting_date" onChange={handlePaintingChange} type="date" value={paintingForm.painting_date} />
                  </label>
                  <label>
                    Time
                    <input name="painting_time" onChange={handlePaintingChange} type="time" value={paintingForm.painting_time} />
                  </label>
                </div>

                <details style={{ cursor: "pointer" }}>
                  <summary style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--muted)", padding: "4px 0", userSelect: "none" }}>Advanced paint details (optional)</summary>
                  <div style={{ display: "grid", gap: "12px", marginTop: "12px" }}>
                    <label>
                      Paint brand
                      <input name="paint_brand" onChange={handlePaintingChange} value={paintingForm.paint_brand} />
                    </label>
                    <label>
                      Batch number
                      <input name="paint_batch_number" onChange={handlePaintingChange} value={paintingForm.paint_batch_number} />
                    </label>
                    <label>
                      Coating type
                      <input name="coating_type" onChange={handlePaintingChange} placeholder="Powder coat, enamel..." value={paintingForm.coating_type} />
                    </label>
                    <label>
                      Remarks
                      <textarea name="remarks" onChange={handlePaintingChange} rows="2" value={paintingForm.remarks} />
                    </label>
                  </div>
                </details>

                <div style={{ display: "grid", gap: "8px" }}>
                  <button className="button primary" disabled={isPaintingSubmitting} type="submit" style={{ minHeight: "48px" }}>
                    {isPaintingSubmitting ? "Saving..." : "✓ Save as Painted"}
                  </button>
                  <button
                    className="button secondary"
                    disabled={isPaintingSubmitting}
                    onClick={(event) => savePaintingOutcome(event, "PAINTED", true)}
                    type="button"
                    style={{ minHeight: "44px" }}
                  >
                    Painted → Move to Stock
                  </button>
                  <button
                    className="button secondary"
                    disabled={isPaintingSubmitting}
                    onClick={(event) => savePaintingOutcome(event, "REPAINT_REQUIRED")}
                    type="button"
                    style={{ color: "var(--danger)", borderColor: "rgba(251,113,133,0.3)", minHeight: "44px" }}
                  >
                    ⚠ Repaint Required
                  </button>
                </div>
              </form>
            </InfoCard>
          )}

          {paintingRecords.length > 0 && (
            <InfoCard title="Paint History" accentColor="#a855f7">
              {paintingRecords.map((rec, idx) => (
                <div key={idx} style={{ padding: "10px 0", borderBottom: idx < paintingRecords.length - 1 ? "1px solid var(--border-soft)" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <strong style={{ fontSize: "0.84rem" }}>{rec.paint_color || "—"}</strong>
                    <StatusBadge status={rec.painting_status}>{rec.painting_status}</StatusBadge>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <span>By: {rec.painters?.map(p => p.name).join(", ") || rec.painted_by || "—"}</span>
                    <span>{rec.painting_date?.slice(0, 10)}</span>
                  </div>
                </div>
              ))}
            </InfoCard>
          )}
        </div>
      )}

      {/* ── Tab: Dispatch ── */}
      {activeSection === "dispatch" && (
        <div style={{ display: "grid", gap: "12px" }}>
          {canWrite && isDispatchable && (
            <InfoCard title="Dispatch / Sale Record" accentColor="#3b82f6">
              <form onSubmit={saveDispatch} style={{ display: "grid", gap: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <label>
                    Customer name *
                    <input name="customer_name" onChange={handleDispatchChange} required value={dispatchForm.customer_name} />
                  </label>
                  <label>
                    Mobile
                    <input name="customer_mobile" onChange={handleDispatchChange} value={dispatchForm.customer_mobile} type="tel" />
                  </label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <label>
                    Sale price (₹)
                    <input name="sale_price" onChange={handleDispatchChange} type="number" value={dispatchForm.sale_price} />
                  </label>
                  <label>
                    Dispatch date
                    <input name="dispatch_date" onChange={handleDispatchChange} type="date" value={dispatchForm.dispatch_date} />
                  </label>
                </div>
                <label>
                  Invoice number
                  <input name="invoice_number" onChange={handleDispatchChange} value={dispatchForm.invoice_number} />
                </label>
                <label>
                  Delivery location
                  <textarea name="delivery_location" onChange={handleDispatchChange} rows="2" value={dispatchForm.delivery_location} />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <label>
                    Vehicle number
                    <input name="vehicle_number" onChange={handleDispatchChange} value={dispatchForm.vehicle_number} />
                  </label>
                  <label>
                    Transport details
                    <input name="transport_details" onChange={handleDispatchChange} value={dispatchForm.transport_details} />
                  </label>
                </div>
                <label>
                  Remarks
                  <textarea name="remarks" onChange={handleDispatchChange} rows="2" value={dispatchForm.remarks} />
                </label>
                <div style={{ display: "grid", gap: "8px", marginTop: "4px" }}>
                  <button className="button primary" disabled={isDispatchSubmitting} type="submit" style={{ minHeight: "48px" }}>
                    {isDispatchSubmitting ? "Saving..." : "📦 Dispatch Product"}
                  </button>
                  <button
                    className="button secondary"
                    disabled={isDispatchSubmitting}
                    onClick={(event) => saveDispatch(event, { mark_sold: true })}
                    type="button"
                    style={{ minHeight: "44px", color: "#10b981", borderColor: "rgba(16,185,129,0.3)" }}
                  >
                    ✓ Mark as Sold
                  </button>
                </div>
              </form>
            </InfoCard>
          )}

          {!isDispatchable && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
              <p style={{ color: "var(--muted)", fontSize: "0.88rem", margin: 0 }}>
                Product must be <strong style={{ color: "var(--text-strong)" }}>In Stock</strong> or <strong style={{ color: "var(--text-strong)" }}>Painted</strong> before dispatch.
              </p>
            </div>
          )}

          {dispatchRecords.length > 0 && (
            <InfoCard title="Dispatch History" accentColor="#3b82f6">
              {dispatchRecords.map((rec, idx) => (
                <div key={idx} style={{ padding: "10px 0", borderBottom: idx < dispatchRecords.length - 1 ? "1px solid var(--border-soft)" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <strong style={{ fontSize: "0.88rem" }}>{rec.customer_name || "—"}</strong>
                    {rec.sale_price && <strong style={{ color: "var(--clr-sales)", fontFamily: "var(--mono)" }}>₹{rec.sale_price}</strong>}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <span>{rec.customer_mobile}</span>
                    <span>{rec.dispatch_date?.slice(0, 10)}</span>
                    {rec.invoice_number && <span>#{rec.invoice_number}</span>}
                  </div>
                </div>
              ))}
            </InfoCard>
          )}
        </div>
      )}

      {/* ── Tab: Status ── */}
      {activeSection === "status" && (
        <div style={{ display: "grid", gap: "12px" }}>
          {canWrite && (
            <InfoCard title="Update Status" accentColor="var(--primary-strong)">
              <form onSubmit={updateStatus} style={{ display: "grid", gap: "12px" }}>
                <label>
                  New status
                  <select onChange={(event) => setStatus(event.target.value)} value={status}>
                    {productStatuses.map((productStatus) => (
                      <option key={productStatus} value={productStatus}>{formatStatus(productStatus)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Remarks
                  <input
                    onChange={(event) => setStatusRemarks(event.target.value)}
                    placeholder="Required for Damaged, Returned, Under Service"
                    required={["DAMAGED", "RETURNED", "UNDER_SERVICE"].includes(status)}
                    value={statusRemarks}
                  />
                </label>
                <button className="button primary" type="submit" style={{ minHeight: "48px" }}>
                  Save Status Update
                </button>
              </form>
            </InfoCard>
          )}

          {/* Audit timeline */}
          <InfoCard title="Audit Timeline" accentColor="var(--primary-strong)">
            {product.history?.length ? (
              <div style={{ display: "grid", gap: "14px" }}>
                {product.history.map((entry) => (
                  <div key={entry.id} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--primary-strong)", flexShrink: 0, marginTop: "5px", boxShadow: "0 0 8px rgba(99,102,241,0.5)" }} />
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: "0.84rem", color: "var(--text-strong)", display: "block" }}>{entry.description}</strong>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)", display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
                        {entry.old_status && <span>{entry.old_status} → {entry.new_status}</span>}
                        {entry.performed_by_name && <span>by {entry.performed_by_name}</span>}
                      </span>
                      <time dateTime={entry.created_at} style={{ fontSize: "0.68rem", color: "var(--muted)", fontFamily: "var(--mono)", fontWeight: "700", display: "block", marginTop: "2px" }}>
                        {new Date(entry.created_at).toLocaleString()}
                      </time>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">No history recorded yet.</p>
            )}
          </InfoCard>
        </div>
      )}
    </section>
  );
}

export default ProductDetailPage;
