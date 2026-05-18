import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import Icon from "../components/Icon.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatStatus } from "../constants/productStatuses.js";

const metricConfig = [
  { icon: "dashboard", key: "TOTAL", label: "Total products", tone: "primary" },
  { icon: "repair", key: "PAINTING_PENDING", label: "Painting pending", tone: "warning" },
  { icon: "types", key: "PAINTED", label: "Painted", tone: "success" },
  { icon: "stock", key: "IN_STOCK", label: "In stock", tone: "success" },
  { icon: "products", key: "RESERVED", label: "Reserved", tone: "primary" },
  { icon: "sales", key: "DISPATCHED", label: "Dispatched", tone: "info" },
  { icon: "sales", key: "SOLD", label: "Sold", tone: "success" },
  { icon: "filter", key: "DAMAGED_RETURNED", label: "Damaged/Returned", tone: "danger" },
];

function formatCount(value) {
  return new Intl.NumberFormat("en-IN").format(value ?? 0);
}

function DashboardPage() {
  const { user } = useAuth();
  const canWrite = user.role === "admin" || user.role === "staff";
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const data = await apiRequest("/api/products/stats/dashboard");
        setDashboard(data.dashboard);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, []);

  return (
    <section className="page-section dashboard-page">
      <div className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="eyebrow">Dashboard</p>
          <h2>MetalMint</h2>
          <p className="muted">
            Signed in as <strong>{user.name}</strong> | {user.email}
          </p>
        </div>
        <Link className="button primary dashboard-scan-action" to="/scan">
          <Icon className="button-icon" name="scan" size={16} />
          Scan/Search
        </Link>
      </div>

      <div className="dashboard-quick-actions" aria-label="Dashboard quick actions">
        {canWrite ? (
          <Link className="dashboard-action" to="/products#new-product">
            <span className="nav-icon" aria-hidden="true"><Icon name="plus" size={16} /></span>
            <span>New Product</span>
          </Link>
        ) : null}
        <Link className="dashboard-action" to="/scan">
          <span className="nav-icon" aria-hidden="true"><Icon name="scan" size={16} /></span>
          <span>Scan/Search</span>
        </Link>
        <Link className="dashboard-action" to="/stock">
          <span className="nav-icon" aria-hidden="true"><Icon name="stock" size={16} /></span>
          <span>View Stock</span>
        </Link>
        {user.role === "admin" ? (
          <Link className="dashboard-action" to="/admin/product-types">
            <span className="nav-icon" aria-hidden="true"><Icon name="types" size={16} /></span>
            <span>Product Types</span>
          </Link>
        ) : null}
      </div>

      {isLoading ? <p className="state-card">Loading dashboard...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      {dashboard ? (
        <>
          <div className="metric-grid dashboard-metrics">
            {metricConfig.map((metric) => (
              <div
                className={`metric-card dashboard-metric metric-${metric.tone}`}
                key={metric.key}
              >
                <div className="metric-card-top">
                  <span className="metric-label">{metric.label}</span>
                  <span className="metric-icon" aria-hidden="true"><Icon name={metric.icon} size={16} /></span>
                </div>
                <strong className="metric-value">{formatCount(dashboard.counts[metric.key])}</strong>
              </div>
            ))}
          </div>

          <div className="dashboard-lists">
            <section className="history-panel dashboard-panel">
              <div className="panel-header">
                <h3>Recent product entries</h3>
                <Link to="/products">View all</Link>
              </div>
              {dashboard.recent_products.length ? (
                <div className="dashboard-row-list">
                  {dashboard.recent_products.map((product) => (
                    <Link className="dashboard-row" key={product.id} to={`/products/${product.id}`}>
                      <span className="row-icon" aria-hidden="true"><Icon name="products" size={15} /></span>
                      <div className="row-main">
                        <code>{product.product_code}</code>
                        <span className="row-meta">
                          {product.product_type_code} | {product.size_label || `${product.width} x ${product.height}`}
                        </span>
                      </div>
                      <StatusBadge status={product.current_status}>{formatStatus(product.current_status)}</StatusBadge>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="empty-state">No products have been created yet.</p>
              )}
            </section>

            <section className="history-panel dashboard-panel">
              <div className="panel-header">
                <h3>Recent status changes</h3>
                <Link to="/products/search">Search</Link>
              </div>
              {dashboard.recent_history.length ? (
                <div className="activity-list">
                  {dashboard.recent_history.map((entry) => (
                    <Link className="activity-row" key={entry.id} to={`/products/${entry.manufactured_product_id}`}>
                      <span className="activity-dot" aria-hidden="true" />
                      <div className="row-main">
                        <code>{entry.product_code}</code>
                        <span className="row-meta">{entry.description}</span>
                      </div>
                      <time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleDateString()}</time>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="empty-state">No product history yet.</p>
              )}
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}

export default DashboardPage;
