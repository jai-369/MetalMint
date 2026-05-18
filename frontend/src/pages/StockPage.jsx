import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatStatus, productStatuses } from "../constants/productStatuses.js";

function StockPage() {
  const [summary, setSummary] = useState([]);
  const [filters, setFilters] = useState({ product_type: "", paint_color: "", current_status: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      setIsLoading(true);
      setError("");

      try {
        const data = await apiRequest("/api/stock/summary");
        setSummary(data.summary);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadSummary();
  }, []);

  const filteredSummary = useMemo(
    () =>
      summary.filter((item) => {
        const typeMatch =
          !filters.product_type ||
          item.product_type_name.toLowerCase().includes(filters.product_type.toLowerCase()) ||
          item.product_type_code.toLowerCase().includes(filters.product_type.toLowerCase());
        const colorMatch =
          !filters.paint_color || item.paint_color.toLowerCase().includes(filters.paint_color.toLowerCase());
        const statusMatch = !filters.current_status || item.current_status === filters.current_status;

        return typeMatch && colorMatch && statusMatch;
      }),
    [filters, summary]
  );

  function handleChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function resetFilters() {
    setFilters({ product_type: "", paint_color: "", current_status: "" });
  }

  return (
    <section className="page-section stock-page">
      <PageHeader eyebrow="Inventory" icon="stock" title="Stock" />

      <section className="stock-filter-panel">
        <div>
          <p className="eyebrow">Filters</p>
          <h3>Stock filters</h3>
        </div>
        <div className="stock-filter-grid">
          <label>
            Product type
            <input
              name="product_type"
              onChange={handleChange}
              placeholder="ALM2D or Almirah"
              value={filters.product_type}
            />
          </label>
          <label>
            Paint color
            <input name="paint_color" onChange={handleChange} placeholder="Unpainted, Blue..." value={filters.paint_color} />
          </label>
          <label>
            Status
            <select name="current_status" onChange={handleChange} value={filters.current_status}>
              <option value="">All statuses</option>
              {productStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </label>
          <div className="stock-filter-actions">
            <button className="button secondary" onClick={resetFilters} type="button">
              Reset
            </button>
          </div>
        </div>
      </section>

      {error ? <p className="error-message">{error}</p> : null}

      {isLoading ? (
        <p className="state-card">Loading stock summary...</p>
      ) : (
        <section className="stock-inventory-grid">
          {!filteredSummary.length ? <p className="empty-state wide">No stock groups match the current filters.</p> : null}
          {filteredSummary.map((item) => (
            <article
              className="inventory-tile"
              key={`${item.product_type_id}-${item.size_display}-${item.paint_color}-${item.current_status}`}
            >
              <div className="inventory-tile-main">
                <div>
                  <code>ID: {item.product_type_code}</code>
                  <h3>{item.product_type_name}</h3>
                </div>
                <div className="inventory-quantity">
                  <strong>{item.quantity}</strong>
                  <span>Qty</span>
                </div>
              </div>
              <dl className="inventory-tile-meta">
                <div>
                  <dt>Size</dt>
                  <dd>{item.size_display}</dd>
                </div>
                <div>
                  <dt>Color</dt>
                  <dd>{item.paint_color}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <StatusBadge status={item.current_status}>{formatStatus(item.current_status)}</StatusBadge>
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </section>
      )}
    </section>
  );
}

export default StockPage;
