import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatStatus, productStatuses } from "../constants/productStatuses.js";

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

function DetailCell({ label, value, wide = false }) {
  const displayValue = value ?? "-";

  return (
    <div className={`record-cell${wide ? " wide" : ""}`}>
      <span>{label}</span>
      <strong>{displayValue === "" ? "-" : displayValue}</strong>
    </div>
  );
}

function ProductDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const canWrite = user.role === "admin" || user.role === "staff";
  const [product, setProduct] = useState(null);
  const [paintingRecords, setPaintingRecords] = useState([]);
  const [dispatchRecords, setDispatchRecords] = useState([]);
  const [paintingForm, setPaintingForm] = useState(getBlankPaintingForm);
  const [dispatchForm, setDispatchForm] = useState(blankDispatchForm);
  const [status, setStatus] = useState("");
  const [statusRemarks, setStatusRemarks] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPaintingSubmitting, setIsPaintingSubmitting] = useState(false);
  const [isDispatchSubmitting, setIsDispatchSubmitting] = useState(false);

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
    setError("");
    setMessage("");

    try {
      const data = await apiRequest(`/api/products/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ current_status: status, remarks: statusRemarks }),
      });
      setProduct(data.product);
      setStatusRemarks("");
      setMessage("Status updated.");
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

    setPaintingForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function savePainting(event, override = {}) {
    event?.preventDefault();
    setError("");
    setMessage("");

    const payload = {
      ...paintingForm,
      ...override,
    };

    if (payload.painting_status === "PAINTED" && (!payload.painted_by.trim() || !payload.paint_color.trim())) {
      setError("Painted by and paint color are required when marking a product as painted.");
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
          ? "Painting saved and product moved to stock."
          : payload.painting_status === "REPAINT_REQUIRED"
            ? "Repaint requirement saved."
            : "Painting record saved."
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

    setDispatchForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function saveDispatch(event, override = {}) {
    event?.preventDefault();
    setError("");
    setMessage("");
    setIsDispatchSubmitting(true);

    try {
      await apiRequest(`/api/products/${id}/dispatch`, {
        method: "POST",
        body: JSON.stringify({
          ...dispatchForm,
          sale_price: dispatchForm.sale_price || null,
          ...override,
        }),
      });
      setDispatchForm({
        ...blankDispatchForm,
        dispatch_date: new Date().toISOString().slice(0, 10),
      });
      setMessage(override.mark_sold ? "Product marked sold." : "Dispatch record saved.");
      await refreshDetail();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsDispatchSubmitting(false);
    }
  }

  if (isLoading) {
    return <p className="state-card">Loading product...</p>;
  }

  if (!product) {
    return (
      <section className="page-section">
        {error ? <p className="error-message">{error}</p> : null}
        <Link to="/products">Back to products</Link>
      </section>
    );
  }

  const latestPainting = paintingRecords[0];
  const latestDispatch = dispatchRecords[0];
  const sizeDisplay = product.size_label || `${product.width} x ${product.height}`;
  const dimensions = `${product.width || "-"} x ${product.height || "-"} x ${product.depth || "-"}`;

  return (
    <section className="page-section product-detail-page">
      <header className="product-record-hero">
        <div className="record-hero-main">
          <p className="eyebrow">Product Detail</p>
          <h2>
            <code>{product.product_code}</code>
          </h2>
          <p className="muted">
            {product.product_type_code} - {product.product_type_name}
          </p>
        </div>
        <div className="record-hero-actions">
          <StatusBadge status={product.current_status}>{formatStatus(product.current_status)}</StatusBadge>
          <Link className="button primary" to={`/qr-label/${encodeURIComponent(product.product_code)}`}>
            Print QR Label
          </Link>
          <Link className="button secondary" to="/products">
            Back
          </Link>
        </div>
      </header>

      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      <div className="record-summary-grid">
        <DetailCell label="Size" value={sizeDisplay} />
        <DetailCell label="Paint state" value={product.paint_color || "Unpainted"} />
        <DetailCell label="Mfg date" value={product.manufacturing_date?.slice(0, 10)} />
        <DetailCell label="Batch" value={product.manufacturing_batch} />
        <DetailCell label="Current status" value={<StatusBadge status={product.current_status}>{formatStatus(product.current_status)}</StatusBadge>} />
      </div>

      <div className="record-layout">
        <section className="record-panel">
          <div className="panel-header">
            <h3>Manufacturing Details</h3>
          </div>
          <div className="record-field-grid">
            <DetailCell label="Type" value={`${product.product_type_code} - ${product.product_type_name}`} />
            <DetailCell label="Dimensions" value={dimensions} />
            <DetailCell label="Material gauge" value={product.material_gauge} />
            <DetailCell label="Manufactured by" value={product.manufactured_by} />
            <DetailCell label="Factory location" value={product.factory_location} />
            <DetailCell label="Remarks" value={product.remarks} wide />
          </div>
        </section>

        <section className="record-panel record-panel-accent-warning">
          <div className="panel-header">
            <h3>Painting Details</h3>
          </div>
          <div className="record-field-grid">
            <DetailCell label="Painted by" value={latestPainting?.painted_by} />
            <DetailCell label="Paint color" value={latestPainting?.paint_color || product.paint_color || "Unpainted"} />
            <DetailCell label="Paint brand" value={latestPainting?.paint_brand} />
            <DetailCell label="Paint batch" value={latestPainting?.paint_batch_number} />
            <DetailCell label="Coating type" value={latestPainting?.coating_type} />
            <DetailCell label="Date/time" value={latestPainting ? `${latestPainting.painting_date?.slice(0, 10) || "-"} ${latestPainting.painting_time || ""}` : "-"} />
            <DetailCell
              label="Painting status"
              value={latestPainting ? <StatusBadge status={latestPainting.painting_status}>{latestPainting.painting_status}</StatusBadge> : "-"}
            />
            <DetailCell label="Repaint required" value={latestPainting ? (latestPainting.repaint_required ? "Yes" : "No") : "-"} />
            <DetailCell label="Remarks" value={latestPainting?.remarks} wide />
          </div>

          {canWrite ? (
            <form className="painting-form record-form painting-entry-form" onSubmit={(event) => savePaintingOutcome(event, "PAINTED")}>
              <div className="painting-entry-header wide-field">
                <div>
                  <p className="eyebrow">Add Painting Record</p>
                  <h4>Record paint completion</h4>
                </div>
                <StatusBadge status={paintingForm.paint_color ? "PAINTED" : "PENDING"}>
                  {paintingForm.paint_color ? "Ready" : "Needs color"}
                </StatusBadge>
              </div>

              <label>
                Painted by
                <input
                  name="painted_by"
                  onChange={handlePaintingChange}
                  placeholder="Painter or team name"
                  value={paintingForm.painted_by}
                />
              </label>
              <label>
                Paint color
                <input
                  name="paint_color"
                  onChange={handlePaintingChange}
                  placeholder="Grey, Blue Gloss, Matte Black..."
                  value={paintingForm.paint_color}
                />
              </label>
              <label>
                Painting date
                <input name="painting_date" onChange={handlePaintingChange} type="date" value={paintingForm.painting_date} />
              </label>
              <label>
                Painting time
                <input name="painting_time" onChange={handlePaintingChange} type="time" value={paintingForm.painting_time} />
              </label>

              <details className="painting-advanced wide-field">
                <summary>Paint batch and coating details</summary>
                <div className="painting-advanced-grid">
                  <label>
                    Paint brand
                    <input name="paint_brand" onChange={handlePaintingChange} value={paintingForm.paint_brand} />
                  </label>
                  <label>
                    Paint batch number
                    <input name="paint_batch_number" onChange={handlePaintingChange} value={paintingForm.paint_batch_number} />
                  </label>
                  <label>
                    Coating type
                    <input name="coating_type" onChange={handlePaintingChange} placeholder="Powder coat, enamel..." value={paintingForm.coating_type} />
                  </label>
                  <label className="wide-field">
                    Remarks
                    <textarea name="remarks" onChange={handlePaintingChange} rows="3" value={paintingForm.remarks} />
                  </label>
                </div>
              </details>

              <div className="painting-action-grid wide-field">
                <button className="button primary" disabled={isPaintingSubmitting} type="submit">
                  {isPaintingSubmitting ? "Saving..." : "Save as Painted"}
                </button>
                <button
                  className="button secondary"
                  disabled={isPaintingSubmitting}
                  onClick={(event) => savePaintingOutcome(event, "PAINTED", true)}
                  type="button"
                >
                  Painted & Move to Stock
                </button>
                <button
                  className="button secondary"
                  disabled={isPaintingSubmitting}
                  onClick={(event) => savePaintingOutcome(event, "REPAINT_REQUIRED")}
                  type="button"
                >
                  Repaint Required
                </button>
                <button
                  className="button secondary"
                  disabled={isPaintingSubmitting}
                  onClick={(event) => savePaintingOutcome(event, "PENDING")}
                  type="button"
                >
                  Save as Pending
                </button>
              </div>
            </form>
          ) : null}
        </section>

        <section className="record-panel">
          <div className="panel-header">
            <h3>Stock / Status</h3>
          </div>
          <div className="record-field-grid">
            <DetailCell label="Current status" value={<StatusBadge status={product.current_status}>{formatStatus(product.current_status)}</StatusBadge>} />
            <DetailCell label="Location" value={product.factory_location} />
          </div>

          {canWrite ? (
            <form className="status-form record-form compact" onSubmit={updateStatus}>
              <label>
                Update status
                <select onChange={(event) => setStatus(event.target.value)} value={status}>
                  {productStatuses.map((productStatus) => (
                    <option key={productStatus} value={productStatus}>
                      {formatStatus(productStatus)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status remarks
                <input
                  onChange={(event) => setStatusRemarks(event.target.value)}
                  placeholder="Required for damaged, returned, or service"
                  required={["DAMAGED", "RETURNED", "UNDER_SERVICE"].includes(status)}
                  value={statusRemarks}
                />
              </label>
              <button className="button primary" type="submit">
                Save status
              </button>
            </form>
          ) : null}
        </section>

        <section className="record-panel">
          <div className="panel-header">
            <h3>Dispatch / Sale</h3>
          </div>
          <div className="record-field-grid">
            <DetailCell label="Customer" value={latestDispatch?.customer_name} />
            <DetailCell label="Mobile" value={latestDispatch?.customer_mobile} />
            <DetailCell label="Invoice" value={latestDispatch?.invoice_number} />
            <DetailCell label="Sale price" value={latestDispatch?.sale_price} />
            <DetailCell label="Dispatch date" value={latestDispatch?.dispatch_date?.slice(0, 10)} />
            <DetailCell label="Vehicle" value={latestDispatch?.vehicle_number} />
            <DetailCell label="Delivery location" value={latestDispatch?.delivery_location} />
            <DetailCell label="Transport details" value={latestDispatch?.transport_details} />
          </div>

          {canWrite ? (
            <form className="dispatch-form record-form" onSubmit={saveDispatch}>
              <label>
                Customer name
                <input name="customer_name" onChange={handleDispatchChange} required value={dispatchForm.customer_name} />
              </label>
              <label>
                Customer mobile
                <input name="customer_mobile" onChange={handleDispatchChange} value={dispatchForm.customer_mobile} />
              </label>
              <label>
                Invoice number
                <input name="invoice_number" onChange={handleDispatchChange} value={dispatchForm.invoice_number} />
              </label>
              <label>
                Sale price
                <input name="sale_price" onChange={handleDispatchChange} type="number" value={dispatchForm.sale_price} />
              </label>
              <label>
                Dispatch date
                <input name="dispatch_date" onChange={handleDispatchChange} type="date" value={dispatchForm.dispatch_date} />
              </label>
              <label>
                Vehicle number
                <input name="vehicle_number" onChange={handleDispatchChange} value={dispatchForm.vehicle_number} />
              </label>
              <label className="wide-field">
                Delivery location
                <textarea name="delivery_location" onChange={handleDispatchChange} rows="2" value={dispatchForm.delivery_location} />
              </label>
              <label className="wide-field">
                Transport details
                <textarea name="transport_details" onChange={handleDispatchChange} rows="2" value={dispatchForm.transport_details} />
              </label>
              <label className="wide-field">
                Remarks
                <textarea name="remarks" onChange={handleDispatchChange} rows="2" value={dispatchForm.remarks} />
              </label>
              <div className="form-actions wide-field">
                <button className="button primary" disabled={isDispatchSubmitting} type="submit">
                  {isDispatchSubmitting ? "Saving..." : "Dispatch Product"}
                </button>
                <button
                  className="button secondary"
                  disabled={isDispatchSubmitting}
                  onClick={(event) => saveDispatch(event, { mark_sold: true })}
                  type="button"
                >
                  Mark Sold
                </button>
              </div>
            </form>
          ) : null}
        </section>

        <section className="record-panel qr-record-panel">
          <div className="panel-header">
            <h3>QR / Label</h3>
          </div>
          <div className="qr-panel">
            <div>
              <p>Scans open the private MetalMint product lookup.</p>
              <div className="form-actions">
                <Link className="button primary" to={`/qr-label/${encodeURIComponent(product.product_code)}`}>
                  Print QR Label
                </Link>
                <Link className="button secondary" to={`/qr/${encodeURIComponent(product.product_code)}`}>
                  Test QR Link
                </Link>
              </div>
            </div>
            <QRCodeCanvas value={product.qr_url} size={180} level="M" includeMargin />
          </div>
        </section>

        <section className="record-panel record-timeline-panel">
          <div className="panel-header">
            <h3>Timeline / History</h3>
          </div>
          {product.history?.length ? (
            <div className="record-timeline">
              {product.history.map((entry) => (
                <article className="timeline-item" key={entry.id}>
                  <span className="activity-dot" aria-hidden="true" />
                  <div>
                    <code>{product.product_code}</code>
                    <strong>{entry.description}</strong>
                    <small>
                      {entry.action_type}
                      {entry.old_status || entry.new_status
                        ? ` | ${entry.old_status || "-"} -> ${entry.new_status || "-"}`
                        : ""}
                      {entry.performed_by_name ? ` | ${entry.performed_by_name}` : ""}
                    </small>
                    <time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString()}</time>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">No history yet.</p>
          )}
        </section>
      </div>
    </section>
  );
}

export default ProductDetailPage;
