import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";

function formatCurrency(value) {
  return `Rs. ${Number(value ?? 0).toFixed(2)}`;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "-";
}

function SalesInvoicePage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadInvoice() {
      setIsLoading(true);
      setError("");

      try {
        const data = await apiRequest(`/api/sales/invoices/${id}`);
        setInvoice(data.invoice);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadInvoice();
  }, [id]);

  const itemCount = useMemo(
    () => invoice?.items?.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0) ?? 0,
    [invoice]
  );

  if (isLoading) {
    return <p className="state-card">Loading sales invoice...</p>;
  }

  if (error) {
    return <p className="error-message">{error}</p>;
  }

  if (!invoice) {
    return <p className="empty-state">Invoice not found.</p>;
  }

  return (
    <section className="page-section invoice-page">
      <PageHeader
        action={
          <div className="invoice-actions">
            <button className="button primary" onClick={() => window.print()} type="button">
              Print / Save PDF
            </button>
            <Link className="button secondary" to="/sales">
              Back to Sales
            </Link>
          </div>
        }
        eyebrow="Sales Invoice"
        icon="sales"
        title={invoice.invoice_number}
      />

      <article className="invoice-document">
        <header className="invoice-header">
          <div>
            <p className="eyebrow">MetalMint</p>
            <h2>Sales Invoice</h2>
            <p className="muted">Internal steel furniture dispatch and sales record</p>
          </div>
          <div className="invoice-meta">
            <span>Invoice</span>
            <code>{invoice.invoice_number}</code>
            <span>Date</span>
            <strong>{formatDate(invoice.sale_date)}</strong>
          </div>
        </header>

        <section className="invoice-party-grid">
          <div>
            <p className="eyebrow">Customer</p>
            <h3>{invoice.customer_name || "Walk-in customer"}</h3>
            <p>{invoice.customer_mobile || "-"}</p>
            <p>{invoice.customer_location || "-"}</p>
          </div>
          <div>
            <p className="eyebrow">Created By</p>
            <h3>{invoice.created_by_name || "MetalMint"}</h3>
            <p>{itemCount} product item{itemCount === 1 ? "" : "s"}</p>
          </div>
        </section>

        <div className="invoice-table-wrap">
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Product Code</th>
                <th>Product</th>
                <th>Size</th>
                <th>Color</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Discount</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <code>{item.product_code}</code>
                  </td>
                  <td>
                    {item.product_type_name} <span className="muted mono">({item.product_type_code})</span>
                  </td>
                  <td>{item.size_label || "-"}</td>
                  <td>{item.paint_color || "Unpainted"}</td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.unit_price)}</td>
                  <td>{formatCurrency(item.discount_amount)}</td>
                  <td>{formatCurrency(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="invoice-summary">
          <div>
            <p className="eyebrow">Remarks</p>
            <p>{invoice.remarks || "No remarks."}</p>
          </div>
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatCurrency(invoice.subtotal)}</dd>
            </div>
            <div>
              <dt>Discount</dt>
              <dd>{formatCurrency(invoice.discount_amount)}</dd>
            </div>
            <div className="grand-total">
              <dt>Total</dt>
              <dd>{formatCurrency(invoice.total_amount)}</dd>
            </div>
          </dl>
        </section>
      </article>
    </section>
  );
}

export default SalesInvoicePage;
