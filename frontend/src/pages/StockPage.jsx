import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import Button from "../components/Button.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatStatus, productStatuses } from "../constants/productStatuses.js";

const defaultFilters = {
  search: "",
  product_type: "",
  paint_color: "",
  current_status: "",
};

function StockPage() {
  const [summary, setSummary] = useState([]);
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showProducts, setShowProducts] = useState(false);

  async function loadInventory(activeFilters = filters) {
    setIsLoading(true);
    setError("");
    try {
      const [summaryData, productsData] = await Promise.all([
        apiRequest("/api/stock/summary"),
        apiRequest(
          `/api/products${
            activeFilters.search || activeFilters.current_status
              ? `?${new URLSearchParams(
                  Object.fromEntries(
                    Object.entries({
                      search: activeFilters.search,
                      status: activeFilters.current_status,
                    }).filter(([, value]) => value)
                  )
                )}`
              : ""
          }`
        ),
      ]);
      setSummary(summaryData.summary);
      setProducts(productsData.products);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadInventory(); }, []);

  const maxQuantity = useMemo(
    () => Math.max(...summary.map((item) => item.quantity), 10),
    [summary]
  );

  const filteredSummary = useMemo(
    () =>
      summary.filter((item) => {
        const typeMatch =
          !filters.product_type ||
          item.product_type_name.toLowerCase().includes(filters.product_type.toLowerCase()) ||
          item.product_type_code.toLowerCase().includes(filters.product_type.toLowerCase());
        const colorMatch =
          !filters.paint_color ||
          item.paint_color.toLowerCase().includes(filters.paint_color.toLowerCase());
        const statusMatch = !filters.current_status || item.current_status === filters.current_status;
        return typeMatch && colorMatch && statusMatch;
      }),
    [filters, summary]
  );

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const typeMatch =
          !filters.product_type ||
          product.product_type_name?.toLowerCase().includes(filters.product_type.toLowerCase()) ||
          product.product_type_code?.toLowerCase().includes(filters.product_type.toLowerCase());
        const colorMatch =
          !filters.paint_color ||
          (product.paint_color || "Unpainted").toLowerCase().includes(filters.paint_color.toLowerCase());
        return typeMatch && colorMatch;
      }),
    [filters.paint_color, filters.product_type, products]
  );

  function updateFilters(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function applyFilters(event) {
    event.preventDefault();
    loadInventory(filters);
  }

  function resetFilters() {
    setFilters(defaultFilters);
    loadInventory(defaultFilters);
  }

  const totalInStock = summary.filter((s) => s.current_status === "IN_STOCK").reduce((sum, s) => sum + s.quantity, 0);
  const totalPaintPending = summary.filter((s) => s.current_status === "PAINTING_PENDING").reduce((sum, s) => sum + s.quantity, 0);

  return (
    <section className="page-section inventory-page animate-fade-in" style={{ paddingBottom: "24px" }}>
      {/* ── Header ── */}
      <div className="page-header-v3" style={{ "--section-color": "var(--clr-stock)" }}>
        <div className="page-header-v3-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z" />
          </svg>
        </div>
        <div>
          <p className="page-header-v3-eyebrow">Inventory</p>
          <h1 className="page-header-v3-title">Stock Levels</h1>
        </div>
      </div>

      {/* ── Quick summary chips ── */}
      {!isLoading && (
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "120px", border: "1px solid var(--border)", borderRadius: "14px", background: "var(--clr-stock-soft)", padding: "12px 14px", borderColor: "rgba(16,185,129,0.25)" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#10b981", fontFamily: "var(--mono)", lineHeight: 1 }}>{totalInStock}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--muted)", fontFamily: "var(--mono)", fontWeight: "700", textTransform: "uppercase", marginTop: "4px" }}>In Stock</div>
          </div>
          <div style={{ flex: 1, minWidth: "120px", border: "1px solid var(--border)", borderRadius: "14px", background: "var(--clr-build-soft)", padding: "12px 14px", borderColor: "rgba(245,158,11,0.25)" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#f59e0b", fontFamily: "var(--mono)", lineHeight: 1 }}>{totalPaintPending}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--muted)", fontFamily: "var(--mono)", fontWeight: "700", textTransform: "uppercase", marginTop: "4px" }}>Pending Paint</div>
          </div>
          <div style={{ flex: 1, minWidth: "120px", border: "1px solid var(--border)", borderRadius: "14px", background: "var(--surface)", padding: "12px 14px" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "var(--text-strong)", fontFamily: "var(--mono)", lineHeight: 1 }}>{filteredSummary.length}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--muted)", fontFamily: "var(--mono)", fontWeight: "700", textTransform: "uppercase", marginTop: "4px" }}>SKU Groups</div>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="workspace-card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Filters</p>
            <h3>Search &amp; filter stock</h3>
          </div>
        </div>
        <form onSubmit={applyFilters} style={{ display: "grid", gap: "12px" }}>
          <label>
            Search
            <input name="search" onChange={updateFilters} placeholder="Product code, batch, color..." value={filters.search} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <label>
              Product type
              <input name="product_type" onChange={updateFilters} placeholder="ALM2D..." value={filters.product_type} />
            </label>
            <label>
              Paint color
              <input name="paint_color" onChange={updateFilters} placeholder="Blue, Grey..." value={filters.paint_color} />
            </label>
          </div>
          <label>
            Status
            <select name="current_status" onChange={updateFilters} value={filters.current_status}>
              <option value="">All statuses</option>
              {productStatuses.map((status) => (
                <option key={status} value={status}>{formatStatus(status)}</option>
              ))}
            </select>
          </label>
          <div style={{ display: "flex", gap: "10px" }}>
            <Button tone="secondary" type="button" onClick={resetFilters} style={{ flex: 1 }}>Reset</Button>
            <Button tone="primary" type="submit" style={{ flex: 2 }}>Apply Filters</Button>
          </div>
        </form>
      </div>

      {error ? <p className="error-message">{error}</p> : null}

      {/* ── Stock tiles ── */}
      <div>
        <div className="v3-section-header">
          <p className="v3-section-title">SKU Groups</p>
          <span className="admin-count">{filteredSummary.length} groups</span>
        </div>

        {isLoading ? (
          <div style={{ display: "grid", gap: "10px" }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-box" style={{ height: "120px" }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {!filteredSummary.length ? (
              <p className="empty-state">No stock groups match the current filters.</p>
            ) : null}
            {filteredSummary.map((item) => {
              const densityPct = Math.max(Math.min((item.quantity / maxQuantity) * 100, 100), 5);
              const isInStock = item.current_status === "IN_STOCK";
              const accentColor = isInStock ? "#10b981" : item.current_status === "PAINTING_PENDING" ? "#f59e0b" : "var(--primary-strong)";
              return (
                <article
                  className="inventory-tile-v2"
                  key={`${item.product_type_id}-${item.size_display}-${item.doors}-${item.weight_class}-${item.paint_color}-${item.current_status}`}
                  style={{ borderLeftWidth: "3px", borderLeftColor: accentColor }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "10px" }}>
                    <div style={{ minWidth: 0 }}>
                      <code style={{ fontSize: "0.75rem" }}>{item.product_type_code}</code>
                      <h3 style={{ margin: "2px 0 2px", fontSize: "0.95rem", fontWeight: "700" }}>{item.product_type_name}</h3>
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                        {item.doors || "2-Door"} · {item.weight_class || "Heavy"} · {item.paint_color}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <strong style={{ fontSize: "2rem", fontFamily: "var(--mono)", color: accentColor, lineHeight: 1 }}>
                        {item.quantity}
                      </strong>
                      <span style={{ display: "block", fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: "700" }}>Units</span>
                    </div>
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.05)", height: "4px", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ background: accentColor, width: `${densityPct}%`, height: "100%", borderRadius: "2px", transition: "width 0.4s ease" }} />
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "10px", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.72rem", background: "var(--surface-higher)", padding: "3px 8px", borderRadius: "6px", color: "var(--muted-strong)", fontWeight: "600" }}>
                        {item.size_display}
                      </span>
                      <span style={{ fontSize: "0.72rem", background: "var(--surface-higher)", padding: "3px 8px", borderRadius: "6px", color: "var(--muted-strong)", fontWeight: "600" }}>
                        {item.doors === "4-Door" ? "4D" : "2D"}-{item.weight_class === "Lightweight" ? "L" : "H"}
                      </span>
                    </div>
                    <StatusBadge status={item.current_status}>{formatStatus(item.current_status)}</StatusBadge>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Product list toggle ── */}
      {!isLoading && filteredProducts.length > 0 && (
        <div className="workspace-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Product Records</p>
              <h3>Individual items</h3>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="admin-count">{filteredProducts.length}</span>
              <button
                className="action-btn-v2"
                onClick={() => setShowProducts((v) => !v)}
                style={{ padding: "4px 12px", fontSize: "0.78rem", minHeight: "32px" }}
                type="button"
              >
                {showProducts ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          {showProducts && (
            <div>
              {filteredProducts.map((product) => (
                <Link className="product-stream-row" key={product.id} to={`/products/${product.id}`}>
                  <div className="stream-row-main">
                    <code>{product.product_code}</code>
                    <strong>{product.product_type_name} ({product.doors || "2D"} | {product.weight_class || "Heavy"})</strong>
                    <span>{product.size_label || `${product.width} × ${product.height}`} · {product.manufacturing_date?.slice(0, 10)}</span>
                  </div>
                  <div className="stream-row-side">
                    <span>{product.paint_color || "Unpainted"}</span>
                    <StatusBadge status={product.current_status}>{formatStatus(product.current_status)}</StatusBadge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default StockPage;
