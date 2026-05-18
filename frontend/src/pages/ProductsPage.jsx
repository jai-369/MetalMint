import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatStatus, productStatuses } from "../constants/productStatuses.js";

const today = new Date().toISOString().slice(0, 10);

const blankForm = {
  product_type_id: "",
  width: "",
  height: "",
  depth: "",
  size_label: "",
  material_gauge: "",
  manufacturing_date: today,
  manufacturing_batch: "",
  manufactured_by: "",
  factory_location: "",
  remarks: "",
};

function ProductsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canWrite = user.role === "admin" || user.role === "staff";
  const [products, setProducts] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [searchCode, setSearchCode] = useState("");
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [generatedCode, setGeneratedCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeProductTypes = useMemo(
    () => productTypes.filter((productType) => productType.is_active),
    [productTypes]
  );

  async function loadProductTypes() {
    const data = await apiRequest("/api/product-types");
    setProductTypes(data.product_types);

    if (!form.product_type_id && data.product_types[0]) {
      setForm((current) => ({ ...current, product_type_id: data.product_types[0].id }));
    }
  }

  async function loadProducts(nextFilters = filters) {
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (nextFilters.search) {
        params.set("search", nextFilters.search);
      }

      if (nextFilters.status) {
        params.set("status", nextFilters.status);
      }

      const data = await apiRequest(`/api/products${params.toString() ? `?${params}` : ""}`);
      setProducts(data.products);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    async function loadInitialData() {
      try {
        await Promise.all([loadProductTypes(), loadProducts()]);
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    loadInitialData();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setGeneratedCode("");
    setIsSubmitting(true);

    try {
      const payload = {
        ...form,
        depth: form.depth || null,
      };
      const data = await apiRequest("/api/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setGeneratedCode(data.product.product_code);
      setMessage("Manufactured product created.");
      setForm((current) => ({
        ...blankForm,
        product_type_id: current.product_type_id,
        manufacturing_date: today,
      }));
      await loadProducts();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSearchByCode(event) {
    event.preventDefault();
    setError("");

    try {
      const data = await apiRequest(`/api/products/code/${encodeURIComponent(searchCode.trim())}`);
      navigate(`/products/${data.product.id}`);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function applyFilters(event) {
    event.preventDefault();
    loadProducts(filters);
  }

  return (
    <section className="page-section">
      <PageHeader
        action={
          canWrite ? (
            <a className="button primary" href="#new-product">
              New Product
            </a>
          ) : null
        }
        description="Create and track every manufactured steel product."
        eyebrow="Manufacturing"
        icon="products"
        title="Products"
      />

      <section className="product-code-search-panel">
        <div>
          <p className="eyebrow">Product Identification</p>
          <h3>Open existing product</h3>
        </div>
        <form className="product-code-search" onSubmit={handleSearchByCode}>
          <label>
            Product code search
            <input
              className="technical-input"
              name="searchCode"
              onChange={(event) => setSearchCode(event.target.value.toUpperCase())}
              placeholder="MM-ALM2D-3660-2605-0001"
              required
              value={searchCode}
            />
          </label>
          <button className="button primary" type="submit">
            Open product
          </button>
        </form>
      </section>

      {canWrite ? (
        <form className="product-form product-entry-form" id="new-product" onSubmit={handleSubmit}>
          <header className="product-entry-header wide">
            <div>
              <p className="eyebrow">New product</p>
              <h3>Manufactured product entry</h3>
            </div>
            <p className="muted">Permanent product code is generated after save.</p>
          </header>

          <section className="entry-section wide">
            <header>
              <h4>Manufacturing Details</h4>
            </header>
            <div className="entry-grid">
              <label className="wide-field">
                Product type
                <select name="product_type_id" onChange={handleChange} required value={form.product_type_id}>
                  {activeProductTypes.map((productType) => (
                    <option key={productType.id} value={productType.id}>
                      {productType.code} - {productType.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Width
                <input className="technical-input" name="width" onChange={handleChange} required type="number" value={form.width} />
              </label>
              <label>
                Height
                <input className="technical-input" name="height" onChange={handleChange} required type="number" value={form.height} />
              </label>
              <label>
                Depth
                <input className="technical-input" name="depth" onChange={handleChange} type="number" value={form.depth} />
              </label>
              <label>
                Size label
                <input name="size_label" onChange={handleChange} placeholder="36 x 60" value={form.size_label} />
              </label>
              <label>
                Material gauge
                <input className="technical-input" name="material_gauge" onChange={handleChange} placeholder="20G" value={form.material_gauge} />
              </label>
            </div>
          </section>

          <section className="entry-section wide">
            <header>
              <h4>Production Info</h4>
            </header>
            <div className="entry-grid">
              <label>
                Manufacturing date
                <input
                  className="technical-input"
                  name="manufacturing_date"
                  onChange={handleChange}
                  required
                  type="date"
                  value={form.manufacturing_date}
                />
              </label>
              <label>
                Batch
                <input className="technical-input" name="manufacturing_batch" onChange={handleChange} value={form.manufacturing_batch} />
              </label>
            </div>
          </section>

          <section className="entry-section wide">
            <header>
              <h4>Organization</h4>
            </header>
            <div className="entry-grid">
              <label>
                Manufactured by
                <input name="manufactured_by" onChange={handleChange} value={form.manufactured_by} />
              </label>
              <label>
                Factory location
                <input name="factory_location" onChange={handleChange} value={form.factory_location} />
              </label>
              <label className="wide-field">
                Remarks
                <textarea name="remarks" onChange={handleChange} placeholder="Optional notes regarding production or QA..." rows="3" value={form.remarks} />
              </label>
            </div>
          </section>

          <div className="form-actions wide">
            <button className="button primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Creating..." : "Create manufactured product"}
            </button>
          </div>
        </form>
      ) : null}

      {generatedCode ? (
        <div className="generated-code">
          <span>Generated product code</span>
          <strong>{generatedCode}</strong>
        </div>
      ) : null}

      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      <section className="product-list-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Product List</p>
            <h3>Manufactured products</h3>
          </div>
        </div>

        <form className="filter-bar product-list-filter" onSubmit={applyFilters}>
          <label>
            Search list
            <input
              className="technical-input"
              name="search"
              onChange={handleFilterChange}
              placeholder="Code or batch"
              value={filters.search}
            />
          </label>
          <label>
            Status
            <select name="status" onChange={handleFilterChange} value={filters.status}>
              <option value="">All statuses</option>
              {productStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </label>
          <button className="button secondary" type="submit">
            Apply filters
          </button>
        </form>

        <div className="table-wrap responsive-table product-table">
          {isLoading ? (
            <p className="table-empty">Loading products...</p>
          ) : (
            <>
              {!products.length ? <p className="empty-state">No products found. Create the first manufactured product above.</p> : null}
              <table>
                <thead>
                  <tr>
                    <th>Product Code</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Color</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Batch</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <Link to={`/products/${product.id}`}>
                          <code>{product.product_code}</code>
                        </Link>
                      </td>
                      <td>{product.product_type_code}</td>
                      <td>{product.size_label || `${product.width} x ${product.height}`}</td>
                      <td>{product.paint_color || "Unpainted"}</td>
                      <td>{product.manufacturing_date?.slice(0, 10)}</td>
                      <td>
                        <StatusBadge status={product.current_status}>{formatStatus(product.current_status)}</StatusBadge>
                      </td>
                      <td>{product.manufacturing_batch || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

            <div className="mobile-card-list">
              {products.map((product) => (
                <article className="mobile-record-card" key={product.id}>
                  <div>
                    <h3>{product.product_type_name}</h3>
                    <Link to={`/products/${product.id}`}>
                      <code>{product.product_code}</code>
                    </Link>
                  </div>
                  <StatusBadge status={product.current_status}>{formatStatus(product.current_status)}</StatusBadge>
                  <dl>
                    <div>
                      <dt>Size</dt>
                      <dd>{product.size_label || `${product.width} x ${product.height}`}</dd>
                    </div>
                    <div>
                      <dt>Color</dt>
                      <dd>{product.paint_color || "Unpainted"}</dd>
                    </div>
                    <div>
                      <dt>Manufacturing date</dt>
                      <dd>{product.manufacturing_date?.slice(0, 10)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
            </>
          )}
        </div>
      </section>
    </section>
  );
}

export default ProductsPage;
