import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatStatus } from "../constants/productStatuses.js";
import { useAuth } from "../auth/AuthContext.jsx";

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
  const [filters, setFilters] = useState({ search: "", category: "", product_type: "" });
  const [sale, setSale] = useState(blankSale);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    loadSalesData();
  }, []);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const query = filters.search.trim().toLowerCase();
        const category = filters.category.trim().toLowerCase();
        const type = filters.product_type.trim().toLowerCase();
        const haystack = [
          product.product_code,
          product.product_type_code,
          product.product_type_name,
          product.product_type_category,
          product.size_label,
          product.paint_color,
          product.manufacturing_batch,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          (!query || haystack.includes(query)) &&
          (!category ||
            product.product_type_category?.toLowerCase().includes(category) ||
            product.product_type_name?.toLowerCase().includes(category)) &&
          (!type || product.product_type_code?.toLowerCase().includes(type))
        );
      }),
    [filters, products]
  );

  const totals = useMemo(() => {
    const subtotal = selected.reduce((sum, product) => {
      const values = lineValues[product.id] ?? {};
      return sum + Number(values.quantity ?? 1) * Number(values.unit_price ?? 0);
    }, 0);
    const lineDiscount = selected.reduce((sum, product) => sum + Number(lineValues[product.id]?.discount_amount ?? 0), 0);
    const invoiceDiscount = Number(sale.discount_amount || 0);
    const discount = lineDiscount + invoiceDiscount;

    return {
      subtotal,
      discount,
      total: Math.max(subtotal - discount, 0),
    };
  }, [lineValues, sale.discount_amount, selected]);

  function updateFilters(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

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
    <section className="page-section commerce-page">
      <PageHeader eyebrow="Sales" icon="sales" title="Sales" />

      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      <section className="commerce-filter-panel">
        <div>
          <p className="eyebrow">In Stock</p>
          <h3>Select products for sale</h3>
        </div>
        <div className="commerce-filter-grid">
          <label>
            Product / SKU search
            <input name="search" onChange={updateFilters} placeholder="Code, product name, size, color..." value={filters.search} />
          </label>
          <label>
            Category
            <input name="category" onChange={updateFilters} placeholder="Almirah, cabinet..." value={filters.category} />
          </label>
          <label>
            Type code
            <input className="technical-input" name="product_type" onChange={updateFilters} placeholder="ALM2D" value={filters.product_type} />
          </label>
        </div>
      </section>

      {isLoading ? (
        <p className="state-card">Loading sales data...</p>
      ) : (
        <div className="commerce-layout">
          <section className="commerce-list-panel">
            <div className="panel-header">
              <h3>Available stock</h3>
              <span className="admin-count">{filteredProducts.length} in stock</span>
            </div>
            <div className="commerce-product-grid">
              {!filteredProducts.length ? <p className="empty-state">No in-stock products match this search.</p> : null}
              {filteredProducts.map((product) => {
                const isSelected = selected.some((item) => item.id === product.id);
                return (
                  <button
                    className={`commerce-product-card${isSelected ? " selected" : ""}`}
                    key={product.id}
                    onClick={() => toggleProduct(product)}
                    type="button"
                  >
                    <div>
                      <code>{product.product_code}</code>
                      <StatusBadge status={product.current_status}>{formatStatus(product.current_status)}</StatusBadge>
                    </div>
                    <h3>{product.product_type_name}</h3>
                    <dl>
                      <div>
                        <dt>Size</dt>
                        <dd>{product.size_label || `${product.width} x ${product.height}`}</dd>
                      </div>
                      <div>
                        <dt>Color</dt>
                        <dd>{product.paint_color || "Unpainted"}</dd>
                      </div>
                    </dl>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="commerce-form-panel">
            <div className="panel-header">
              <h3>Invoice details</h3>
              <span className="admin-count">{selected.length} selected</span>
            </div>
            <form className="commerce-form" onSubmit={createInvoice}>
              <label>
                Customer name
                <input name="customer_name" onChange={updateSale} value={sale.customer_name} />
              </label>
              <label>
                Customer mobile
                <input name="customer_mobile" onChange={updateSale} value={sale.customer_mobile} />
              </label>
              <label>
                Sale date
                <input name="sale_date" onChange={updateSale} type="date" value={sale.sale_date} />
              </label>
              <label>
                Invoice discount
                <input name="discount_amount" onChange={updateSale} type="number" value={sale.discount_amount} />
              </label>
              <label className="wide-field">
                Customer location
                <textarea name="customer_location" onChange={updateSale} rows="2" value={sale.customer_location} />
              </label>

              <div className="selected-lines wide-field">
                {selected.map((product) => (
                  <article className="selected-line" key={product.id}>
                    <div>
                      <code>{product.product_code}</code>
                      <strong>{product.product_type_name}</strong>
                    </div>
                    <label>
                      Qty
                      <input
                        min="1"
                        onChange={(event) => updateLine(product.id, "quantity", event.target.value)}
                        type="number"
                        value={lineValues[product.id]?.quantity ?? 1}
                      />
                    </label>
                    <label>
                      Price
                      <input
                        min="0"
                        onChange={(event) => updateLine(product.id, "unit_price", event.target.value)}
                        type="number"
                        value={lineValues[product.id]?.unit_price ?? ""}
                      />
                    </label>
                    <label>
                      Discount
                      <input
                        min="0"
                        onChange={(event) => updateLine(product.id, "discount_amount", event.target.value)}
                        type="number"
                        value={lineValues[product.id]?.discount_amount ?? ""}
                      />
                    </label>
                  </article>
                ))}
              </div>

              <div className="invoice-totals wide-field">
                <span>Subtotal: Rs. {totals.subtotal.toFixed(2)}</span>
                <span>Discount: Rs. {totals.discount.toFixed(2)}</span>
                <strong>Total: Rs. {totals.total.toFixed(2)}</strong>
              </div>

              <label className="wide-field">
                Remarks
                <textarea name="remarks" onChange={updateSale} rows="2" value={sale.remarks} />
              </label>
              <button className="button primary wide-field" disabled={!canWrite || isSubmitting} type="submit">
                {isSubmitting ? "Generating..." : "Generate Sales Invoice"}
              </button>
            </form>
          </section>
        </div>
      )}

      <section className="commerce-list-panel">
        <div className="panel-header">
          <h3>Recent sales invoices</h3>
        </div>
        <div className="invoice-list">
          {!invoices.length ? <p className="empty-state">No sales invoices yet.</p> : null}
          {invoices.map((invoice) => (
            <Link className="invoice-row" key={invoice.id} to={`/sales/invoices/${invoice.id}`}>
              <code>{invoice.invoice_number}</code>
              <span>{invoice.customer_name || "Walk-in customer"}</span>
              <strong>Rs. {Number(invoice.total_amount).toFixed(2)}</strong>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}

export default SalesPage;
