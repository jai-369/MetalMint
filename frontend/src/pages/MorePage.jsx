import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { useTheme } from "../theme/ThemeContext.jsx";

function MorePage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <section className="page-section">
      <PageHeader description="Admin tools, search utilities, and display settings." eyebrow="Menu" icon="more" title="More" />

      <div className="product-card-grid">
        <Link className="product-card utility-card" to="/sales">
          <span className="utility-card-icon" aria-hidden="true"><Icon name="sales" size={18} /></span>
          <h3>Sales</h3>
          <p>Select in-stock products, generate invoices, and print or save PDFs.</p>
        </Link>
        <Link className="product-card utility-card" to="/repairs">
          <span className="utility-card-icon" aria-hidden="true"><Icon name="repair" size={18} /></span>
          <h3>Repair</h3>
          <p>Create service jobs, track progress, and print service invoices.</p>
        </Link>
        <Link className="product-card utility-card" to="/products/search">
          <span className="utility-card-icon" aria-hidden="true"><Icon name="search" size={18} /></span>
          <h3>Advanced Search</h3>
          <p>Find products by code, paint, invoice, customer, or dates.</p>
        </Link>
        <Link className="product-card utility-card" to="/scan">
          <span className="utility-card-icon" aria-hidden="true"><Icon name="scan" size={18} /></span>
          <h3>Scan/Search</h3>
          <p>Open products by QR code or manual product code entry.</p>
        </Link>
        {user.role === "admin" ? (
          <>
            <Link className="product-card utility-card" to="/admin/product-types">
              <span className="utility-card-icon" aria-hidden="true"><Icon name="types" size={18} /></span>
              <h3>Product Types</h3>
              <p>Manage manufacturing product masters.</p>
            </Link>
            <Link className="product-card utility-card" to="/admin/users">
              <span className="utility-card-icon" aria-hidden="true"><Icon name="users" size={18} /></span>
              <h3>Users</h3>
              <p>Create and manage internal accounts.</p>
            </Link>
          </>
        ) : null}
        <button className="product-card utility-card text-left" onClick={toggleTheme} type="button">
          <span className="utility-card-icon" aria-hidden="true"><Icon name={theme === "dark" ? "sun" : "moon"} size={18} /></span>
          <h3>{theme === "dark" ? "Light Mode" : "Dark Mode"}</h3>
          <p>Switch the app color theme for this browser.</p>
        </button>
      </div>
    </section>
  );
}

export default MorePage;
