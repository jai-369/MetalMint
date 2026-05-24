import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import Button from "../components/Button.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatStatus } from "../constants/productStatuses.js";

const today = new Date().toISOString().slice(0, 10);

const blankSale = {
  customer_name: "",
  customer_mobile: "",
  customer_location: "",
  sale_date: today,
  discount_amount: "",
  remarks: "",
};

function SalesPage() {
  const { user } = useAuth();
  const canWrite = user.role === "admin" || user.role === "staff";
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState([]);
  const [lineValues, setLineValues] = useState({});
  const [filters, setFilters] = useState({ search: "" });
  const [sale, setSale] = useState(blankSale);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("pick"); // "pick" | "compose"

  async function loadSalesData() {
    setIsLoading(true);
    setError("");
    try {
      const [productsData, invoicesData] = await Promise.all([
        apiRequest("/api/products?current_status=IN_STOCK"),
        apiRequest("/api/sales/invoices"),
      ]);
      setProducts(productsData.products);
      setInvoices(invoicesData.invoices);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadSalesData(); }, []);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        if (!filters.search) return true;
        const haystack = [
          product.product_code,
          product.product_type_code,
          product.product_type_name,
          product.product_type_category,
          product.size_label,
          product.paint_color,
          product.manufacturing_batch,
        ].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(filters.search.toLowerCase());
      }),
    [filters.search, products]
  );

  const totals = useMemo(() => {
    const subtotal = selected.reduce(
      (sum, product) =>
        sum + Number(lineValues[product.id]?.quantity ?? 1) * Number(lineValues[product.id]?.unit_price ?? 0),
      0
    );
    const lineDiscount = selected.reduce((sum, p) => sum + Number(lineValues[p.id]?.discount_amount ?? 0), 0);
    const invoiceDiscount = Number(sale.discount_amount || 0);
    const discount = lineDiscount + invoiceDiscount;
    return { subtotal, discount, total: Math.max(subtotal - discount, 0) };
  }, [lineValues, sale.discount_amount, selected]);

  function updateSale(event) {
    const { name, value } = event.target;
    setSale((current) => ({ ...current, [name]: value }));
  }

  function toggleProduct(product) {
    setSelected((current) => {
      if (current.some((item) => item.id === product.id)) {
        return current.filter((item) => item.id !== product.id);
      }
      setLineValues((values) => ({
        ...values,
        [product.id]: values[product.id] ?? { quantity: 1, unit_price: "", discount_amount: "" },
      }));
      return [...current, product];
    });
  }

  function updateLine(productId, field, value) {
    setLineValues((current) => ({
      ...current,
      [productId]: {
        ...(current[productId] ?? { quantity: 1, unit_price: "", discount_amount: "" }),
        [field]: value,
      },
    }));
  }

  async function createInvoice(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!selected.length) {
      setError("Select at least one in-stock product.");
      return;
    }
    setIsSubmitting(true);
    try {
      const data = await apiRequest("/api/sales/invoices", {
        method: "POST",
        body: JSON.stringify({
          ...sale,
          discount_amount: sale.discount_amount || 0,
          items: selected.map((product) => ({
            manufactured_product_id: product.id,
            quantity: Number(lineValues[product.id]?.quantity || 1),
            unit_price: Number(lineValues[product.id]?.unit_price || 0),
            discount_amount: Number(lineValues[product.id]?.discount_amount || 0),
          })),
        }),
      });
      setMessage("Sales invoice created.");
      navigate(`/sales/invoices/${data.invoice.id}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="page-section sales-workspace-page animate-fade-in" style={{ paddingBottom: "24px" }}>
      {/* ── Header ── */}
      <div className="page-header-v3" style={{ "--section-color": "var(--clr-sales)" }}>
        <div className="page-header-v3-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" /><rect x="1" y="7" width="22" height="13" rx="2" />
          </svg>
        </div>
        <div>
          <p className="page-header-v3-eyebrow">Sales</p>
          <h1 className="page-header-v3-title">Sales Workspace</h1>
        </div>
      </div>

      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      {/* ── Tab switcher ── */}
      <div style={{ display: "flex", gap: "6px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "4px" }}>
        <button
          onClick={() => setActiveTab("pick")}
          style={{
            flex: 1, padding: "8px", borderRadius: "10px", border: "none", fontSize: "0.84rem", fontWeight: "700", cursor: "pointer",
            background: activeTab === "pick" ? "var(--clr-sales-soft)" : "transparent",
            color: activeTab === "pick" ? "var(--clr-sales)" : "var(--muted)",
            transition: "all 0.2s ease",
          }}
          type="button"
        >
          Pick Products {products.length > 0 && <span style={{ opacity: 0.7 }}>({filteredProducts.length})</span>}
        </button>
        <button
          onClick={() => setActiveTab("compose")}
          style={{
            flex: 1, padding: "8px", borderRadius: "10px", border: "none", fontSize: "0.84rem", fontWeight: "700", cursor: "pointer",
            background: activeTab === "compose" ? "var(--clr-sales-soft)" : "transparent",
            color: activeTab === "compose" ? "var(--clr-sales)" : "var(--muted)",
            transition: "all 0.2s ease",
          }}
          type="button"
        >
          Compose Invoice {selected.length > 0 && <span style={{ fontWeight: "800" }}>({selected.length})</span>}
        </button>
      </div>

      {/* ── Tab: Pick Products ── */}
      {activeTab === "pick" && (
        <div>
          <div style={{ marginBottom: "12px" }}>
            <input
              name="search"
              onChange={(e) => setFilters({ search: e.target.value })}
              placeholder="Search by code, size, color, type..."
              value={filters.search}
              style={{ borderRadius: "12px" }}
            />
          </div>

          {isLoading ? (
            <div style={{ display: "grid", gap: "10px" }}>
              {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton-box" style={{ height: "90px" }} />)}
            </div>
          ) : (
            <div style={{ display: "grid", gap: "8px" }}>
              {!filteredProducts.length ? (
                <p className="empty-state">No in-stock products match this search.</p>
              ) : null}
              {filteredProducts.map((product) => {
                const isSelected = selected.some((item) => item.id === product.id);
                return (
                  <button
                    className={`commerce-product-card-v2${isSelected ? " selected" : ""}`}
                    key={product.id}
                    onClick={() => toggleProduct(product)}
                    type="button"
                    style={{ width: "100%", cursor: "pointer", font: "inherit" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <code style={{ fontSize: "0.75rem" }}>{product.product_code}</code>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {isSelected && (
                          <span style={{ background: "var(--clr-sales)", color: "#fff", borderRadius: "6px", padding: "2px 8px", fontSize: "0.7rem", fontWeight: "700" }}>
                            ✓ Selected
                          </span>
                        )}
                        <StatusBadge status={product.current_status}>{formatStatus(product.current_status)}</StatusBadge>
                      </div>
                    </div>
                    <strong style={{ display: "block", fontSize: "0.9rem", color: "var(--text-strong)", marginBottom: "4px" }}>
                      {product.product_type_name}
                    </strong>
                    <div style={{ fontSize: "0.72rem", color: "var(--muted)", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <span>{product.size_label || `${product.width} × ${product.height}`}</span>
                      <span>·</span>
                      <span>{product.paint_color || "Unpainted"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selected.length > 0 && (
            <div style={{ marginTop: "16px", position: "sticky", bottom: "76px" }}>
              <button
                onClick={() => setActiveTab("compose")}
                className="button primary"
                style={{ width: "100%", fontSize: "0.95rem" }}
                type="button"
              >
                Compose Invoice ({selected.length} item{selected.length !== 1 ? "s" : ""}) →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Compose Invoice ── */}
      {activeTab === "compose" && (
        <form className="commerce-form-v2" onSubmit={createInvoice} style={{ display: "grid", gap: "14px" }}>
          {!selected.length ? (
            <div className="workspace-card">
              <p className="empty-state">
                Go to "Pick Products" tab to select items for this invoice.
              </p>
              <button
                onClick={() => setActiveTab("pick")}
                className="button secondary"
                style={{ width: "100%", marginTop: "8px" }}
                type="button"
              >
                ← Pick Products
              </button>
            </div>
          ) : null}

          {/* Customer details */}
          <div className="workspace-card">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Customer</p>
                <h3>Bill to</h3>
              </div>
            </div>
            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label>
                  Name
                  <input name="customer_name" onChange={updateSale} value={sale.customer_name} />
                </label>
                <label>
                  Mobile
                  <input name="customer_mobile" onChange={updateSale} value={sale.customer_mobile} />
                </label>
              </div>
              <label>
                Location
                <textarea name="customer_location" onChange={updateSale} rows="2" value={sale.customer_location} />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label>
                  Sale date
                  <input name="sale_date" onChange={updateSale} type="date" value={sale.sale_date} />
                </label>
                <label>
                  Invoice discount (₹)
                  <input name="discount_amount" onChange={updateSale} type="number" value={sale.discount_amount} />
                </label>
              </div>
            </div>
          </div>

          {/* Selected items */}
          {selected.length > 0 && (
            <div className="workspace-card">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Line Items</p>
                  <h3>Selected products</h3>
                </div>
                <span className="admin-count">{selected.length}</span>
              </div>
              <div style={{ display: "grid", gap: "12px" }}>
                {selected.map((product) => (
                  <article className="selected-line-v2" key={product.id}>
                    <div className="selected-line-head">
                      <div>
                        <code style={{ fontSize: "0.75rem" }}>{product.product_code}</code>
                        <strong style={{ display: "block", fontSize: "0.88rem", color: "var(--text-strong)" }}>
                          {product.product_type_name}
                        </strong>
                      </div>
                      <button className="inline-link-button" onClick={() => toggleProduct(product)} type="button">
                        Remove
                      </button>
                    </div>
                    <div className="selected-line-grid">
                      <label>
                        Qty
                        <input
                          min="1"
                          onChange={(e) => updateLine(product.id, "quantity", e.target.value)}
                          type="number"
                          value={lineValues[product.id]?.quantity ?? 1}
                        />
                      </label>
                      <label>
                        Unit price (₹)
                        <input
                          min="0"
                          onChange={(e) => updateLine(product.id, "unit_price", e.target.value)}
                          type="number"
                          value={lineValues[product.id]?.unit_price ?? ""}
                          placeholder="0"
                        />
                      </label>
                      <label>
                        Discount (₹)
                        <input
                          min="0"
                          onChange={(e) => updateLine(product.id, "discount_amount", e.target.value)}
                          type="number"
                          value={lineValues[product.id]?.discount_amount ?? ""}
                          placeholder="0"
                        />
                      </label>
                    </div>
                  </article>
                ))}
              </div>

              {/* Totals */}
              <div className="invoice-totals-v2">
                <span>Subtotal: ₹{totals.subtotal.toFixed(2)}</span>
                <span>Discount: ₹{totals.discount.toFixed(2)}</span>
                <strong>Total: ₹{totals.total.toFixed(2)}</strong>
              </div>
            </div>
          )}

          {/* Remarks */}
          <label>
            Remarks (optional)
            <textarea name="remarks" onChange={updateSale} rows="2" value={sale.remarks} />
          </label>

          <Button className="wide-field" disabled={!canWrite || isSubmitting} tone="primary" type="submit">
            {isSubmitting ? "Generating..." : "Generate Invoice →"}
          </Button>
        </form>
      )}

      {/* ── Recent Invoices ── */}
      {invoices.length > 0 && (
        <div className="workspace-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">History</p>
              <h3>Recent invoices</h3>
            </div>
            <span className="admin-count">{invoices.length}</span>
          </div>
          <div>
            {invoices.map((invoice) => (
              <Link className="invoice-row-v2" key={invoice.id} to={`/sales/invoices/${invoice.id}`}>
                <div>
                  <code style={{ fontSize: "0.78rem" }}>{invoice.invoice_number}</code>
                  <strong style={{ display: "block", fontSize: "0.88rem", color: "var(--text-strong)", marginTop: "2px" }}>
                    {invoice.customer_name || "Walk-in customer"}
                  </strong>
                </div>
                <strong style={{ color: "var(--clr-sales)", fontFamily: "var(--mono)", fontSize: "0.95rem" }}>
                  ₹{Number(invoice.total_amount).toFixed(2)}
                </strong>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default SalesPage;
