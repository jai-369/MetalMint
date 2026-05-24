import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatStatus, productStatuses } from "../constants/productStatuses.js";

const blankFilters = {
  product_code: "",
  product_type_id: "",
  current_status: "",
  width: "",
  height: "",
  size_label: "",
  paint_color: "",
  manufacturing_batch: "",
  manufactured_by: "",
  painted_by: "",
  manufacturing_date_from: "",
  manufacturing_date_to: "",
  created_at_from: "",
  created_at_to: "",
  invoice_number: "",
  customer_mobile: "",
  customer_name: "",
  dispatch_date: "",
};

function ProductSearchPage() {
  const navigate = useNavigate();
  const [productTypes, setProductTypes] = useState([]);
  const [products, setProducts] = useState([]);
  const [quickCode, setQuickCode] = useState("");
  const [filters, setFilters] = useState(blankFilters);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const activeFilters = useMemo(
    () => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "")),
    [filters]
  );

  useEffect(() => {
    async function loadProductTypes() {
      try {
        const data = await apiRequest("/api/product-types");
        setProductTypes(data.product_types);
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    loadProductTypes();
    runSearch({});
  }, []);

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({
      ...current,
      [name]: name === "product_code" ? value.toUpperCase() : value,
    }));
  }

  async function runSearch(nextFilters = activeFilters) {
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams(nextFilters);
      const data = await apiRequest(`/api/products${params.toString() ? `?${params}` : ""}`);
      setProducts(data.products);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function openByCode(event) {
    event.preventDefault();
    setError("");

    try {
      const data = await apiRequest(`/api/products/code/${encodeURIComponent(quickCode.trim())}`);
      navigate(`/products/${data.product.id}`);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function submitFilters(event) {
    event.preventDefault();
    runSearch(activeFilters);
  }

  function resetFilters() {
    setFilters(blankFilters);
    runSearch({});
  }

  return (
    <section className="page-section search-page">
      <PageHeader
        eyebrow="Products"
        icon="search"
        title="Search"
      />

      <section className="search-command-panel">
        <form className="search-code-form" onSubmit={openByCode}>
          <label>
            Product code
            <input
              autoFocus
              className="technical-input"
              name="quickCode"
              onChange={(event) => setQuickCode(event.target.value.toUpperCase())}
              placeholder="P2405601"
              required
              value={quickCode}
            />
          </label>
          <button className="button primary" type="submit">
            Open Product
          </button>
        </form>
      </section>

      <details className="advanced-search-panel">
        <summary>
          <span>Advanced Filters</span>
          <span>{Object.keys(activeFilters).length} active</span>
        </summary>
        <form className="advanced-filter-grid" onSubmit={submitFilters}>
          <label>
            Product code starts with
            <input name="product_code" onChange={handleFilterChange} value={filters.product_code} />
          </label>
          <label>
            Product type
            <select name="product_type_id" onChange={handleFilterChange} value={filters.product_type_id}>
              <option value="">All types</option>
              {productTypes.map((productType) => (
                <option key={productType.id} value={productType.id}>
                  {productType.code} - {productType.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select name="current_status" onChange={handleFilterChange} value={filters.current_status}>
              <option value="">All statuses</option>
              {productStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Width
            <input name="width" onChange={handleFilterChange} type="number" value={filters.width} />
          </label>
          <label>
            Height
            <input name="height" onChange={handleFilterChange} type="number" value={filters.height} />
          </label>
          <label>
            Size label
            <input name="size_label" onChange={handleFilterChange} value={filters.size_label} />
          </label>
          <label>
            Paint color
            <input name="paint_color" onChange={handleFilterChange} value={filters.paint_color} />
          </label>
          <label>
            Batch
            <input name="manufacturing_batch" onChange={handleFilterChange} value={filters.manufacturing_batch} />
          </label>
          <label>
            Manufactured by
            <input name="manufactured_by" onChange={handleFilterChange} value={filters.manufactured_by} />
          </label>
          <label>
            Painted by
            <input name="painted_by" onChange={handleFilterChange} value={filters.painted_by} />
          </label>
          <label>
            Invoice number
            <input name="invoice_number" onChange={handleFilterChange} value={filters.invoice_number} />
          </label>
          <label>
            Customer mobile
            <input name="customer_mobile" onChange={handleFilterChange} value={filters.customer_mobile} />
          </label>
          <label>
            Customer name
            <input name="customer_name" onChange={handleFilterChange} value={filters.customer_name} />
          </label>
          <label>
            Dispatch date
            <input name="dispatch_date" onChange={handleFilterChange} type="date" value={filters.dispatch_date} />
          </label>
          <label>
            Manufacturing from
            <input
              name="manufacturing_date_from"
              onChange={handleFilterChange}
              type="date"
              value={filters.manufacturing_date_from}
            />
          </label>
          <label>
            Manufacturing to
            <input
              name="manufacturing_date_to"
              onChange={handleFilterChange}
              type="date"
              value={filters.manufacturing_date_to}
            />
          </label>
          <label>
            Created from
            <input
              name="created_at_from"
              onChange={handleFilterChange}
              type="date"
              value={filters.created_at_from}
            />
          </label>
          <label>
            Created to
            <input name="created_at_to" onChange={handleFilterChange} type="date" value={filters.created_at_to} />
          </label>
          <div className="form-actions wide-field">
            <button className="button primary" type="submit">
              Search
            </button>
            <button className="button secondary" onClick={resetFilters} type="button">
              Reset
            </button>
          </div>
        </form>
      </details>

      {error ? <p className="error-message">{error}</p> : null}

      {isLoading ? (
        <p className="state-card">Searching products...</p>
      ) : (
        <section className="search-results-panel">
          <div className="section-row">
            <div>
              <p className="eyebrow">Results</p>
              <h3>{products.length} products found</h3>
            </div>
          </div>
          <div className="search-result-grid">
          {!products.length ? <p className="empty-state wide">No products match the current search.</p> : null}
          {products.map((product) => (
            <Link className="search-result-card" key={product.id} to={`/products/${product.id}`}>
              <div className="search-result-top">
                <code>{product.product_code}</code>
                <StatusBadge status={product.current_status}>{formatStatus(product.current_status)}</StatusBadge>
              </div>
              <div className="search-result-main">
                <h3>{product.product_type_name}</h3>
                <p>{product.product_type_code || "Product"} manufacturing record</p>
              </div>
              <dl className="search-result-meta">
                <div>
                  <dt>Size</dt>
                  <dd>{product.size_label || `${product.width} x ${product.height}`}</dd>
                </div>
                <div>
                  <dt>Color</dt>
                  <dd>{product.paint_color || "Unpainted"}</dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>{product.manufacturing_date?.slice(0, 10)}</dd>
                </div>
                <div>
                  <dt>Batch</dt>
                  <dd>{product.manufacturing_batch || "-"}</dd>
                </div>
                <div>
                  <dt>Invoice</dt>
                  <dd>{product.invoice_number || "-"}</dd>
                </div>
                <div>
                  <dt>Customer</dt>
                  <dd>{product.customer_name || "-"}</dd>
                </div>
              </dl>
            </Link>
          ))}
          </div>
        </section>
      )}
    </section>
  );
}

export default ProductSearchPage;
