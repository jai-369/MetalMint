import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import Button from "../components/Button.jsx";

const PREPARED_BY = "MetalMint";

const PRINT_MODES = [
  {
    id: "a4",
    label: "A4 Printer",
    description: "Full invoice with item, pricing, and totals layout.",
  },
  {
    id: "thermal",
    label: "Thermal Printer",
    description: "Narrow receipt format for vertical bill printers.",
  },
];

function formatCurrency(value) {
  return `Rs. ${Number(value ?? 0).toFixed(2)}`;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString("en-IN") : "-";
}

function formatDateTime(value) {
  return value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";
}

function SalesInvoicePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canDelete = user.role === "admin";
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [printMode, setPrintMode] = useState("a4");

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

  async function handleDeleteInvoice() {
    if (!canDelete || !invoice) {
      return;
    }

    const confirmed = window.confirm(
      `Delete invoice ${invoice.invoice_number}? Linked sold products will be returned to stock.`
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      await apiRequest(`/api/sales/invoices/${invoice.id}`, {
        method: "DELETE",
      });
      navigate("/sales", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const items = invoice?.items ?? [];
  const lineCount = items.length;
  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0),
    [items]
  );
  const a4Density = useMemo(() => {
    if (lineCount >= 18) return "micro";
    if (lineCount >= 12) return "tight";
    if (lineCount >= 8) return "compact";
    return "regular";
  }, [lineCount]);
  const thermalDensity = useMemo(() => {
    if (lineCount >= 16) return "tight";
    if (lineCount >= 8) return "compact";
    return "regular";
  }, [lineCount]);

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
    <section
      className="page-section sales-invoice-page"
      data-print-density={a4Density}
      data-print-mode={printMode}
    >
      <div className="invoice-toolbar no-print">
        <div>
          <p className="eyebrow">Sales Invoice</p>
          <h2>{invoice.invoice_number}</h2>
        </div>

        <div className="invoice-toolbar-controls">
          <div className="invoice-print-mode-picker" aria-label="Print format" role="radiogroup">
            {PRINT_MODES.map((mode) => (
              <button
                key={mode.id}
                aria-checked={printMode === mode.id}
                className={`invoice-print-mode-card ${printMode === mode.id ? "is-active" : ""}`}
                onClick={() => setPrintMode(mode.id)}
                role="radio"
                type="button"
              >
                <strong>{mode.label}</strong>
                <span>{mode.description}</span>
              </button>
            ))}
          </div>

          <div className="header-actions-inline invoice-toolbar-actions">
            <Button onClick={() => window.print()} tone="primary" type="button">
              Print {printMode === "thermal" ? "Thermal Bill" : "A4 Invoice"}
            </Button>
            {canDelete ? (
              <Button onClick={handleDeleteInvoice} tone="danger" type="button">
                Delete Invoice
              </Button>
            ) : null}
            <Link className="button secondary" to="/sales">
              Back to Sales
            </Link>
          </div>
        </div>
      </div>

      <article className="sales-invoice-screen">
        <header className="sales-invoice-hero">
          <div className="sales-invoice-brand">
            <p className="eyebrow">MetalMint</p>
            <h3>Customer Invoice</h3>
            <p className="muted">Steel furniture billing and dispatch record</p>
          </div>

          <div className="sales-invoice-total-card">
            <span>Total Payable</span>
            <strong>{formatCurrency(invoice.total_amount)}</strong>
            <small>
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </small>
          </div>
        </header>

        <section className="sales-invoice-facts">
          <article className="sales-invoice-fact-card">
            <span>Invoice No.</span>
            <strong>{invoice.invoice_number}</strong>
          </article>
          <article className="sales-invoice-fact-card">
            <span>Sale Date</span>
            <strong>{formatDate(invoice.sale_date)}</strong>
          </article>
          <article className="sales-invoice-fact-card">
            <span>Prepared By</span>
            <strong>{PREPARED_BY}</strong>
          </article>
          <article className="sales-invoice-fact-card">
            <span>Created</span>
            <strong>{formatDateTime(invoice.created_at)}</strong>
          </article>
        </section>

        <section className="sales-invoice-party-grid">
          <article className="sales-invoice-panel">
            <p className="eyebrow">Bill To</p>
            <strong>{invoice.customer_name || "Walk-in customer"}</strong>
            <span>{invoice.customer_mobile || "No mobile number"}</span>
            <span>{invoice.customer_location || "No location added"}</span>
          </article>

          <article className="sales-invoice-panel">
            <p className="eyebrow">Commercial Summary</p>
            <dl className="sales-invoice-summary-list">
              <div>
                <dt>Subtotal</dt>
                <dd>{formatCurrency(invoice.subtotal)}</dd>
              </div>
              <div>
                <dt>Discount</dt>
                <dd>{formatCurrency(invoice.discount_amount)}</dd>
              </div>
              <div className="is-total">
                <dt>Final Total</dt>
                <dd>{formatCurrency(invoice.total_amount)}</dd>
              </div>
            </dl>
          </article>
        </section>

        <section className="sales-invoice-panel">
          <div className="sales-invoice-section-head">
            <div>
              <p className="eyebrow">Line Items</p>
              <h3>Items on this invoice</h3>
            </div>
            <span className="admin-count">{itemCount}</span>
          </div>

          <div className="sales-invoice-items">
            {items.map((item, index) => (
              <article className="sales-invoice-item-card" key={item.id}>
                <div className="sales-invoice-item-top">
                  <div>
                    <span className="sales-invoice-item-index">Item {index + 1}</span>
                    <strong>{item.product_type_name}</strong>
                    <code>{item.product_code}</code>
                  </div>
                  <div className="sales-invoice-line-total">{formatCurrency(item.line_total)}</div>
                </div>

                <p className="sales-invoice-item-meta">
                  {item.size_label || "Custom size"} | {item.paint_color || "Unpainted"}
                </p>

                <dl className="sales-invoice-item-grid">
                  <div>
                    <dt>Qty</dt>
                    <dd>{item.quantity}</dd>
                  </div>
                  <div>
                    <dt>Unit Price</dt>
                    <dd>{formatCurrency(item.unit_price)}</dd>
                  </div>
                  <div>
                    <dt>Discount</dt>
                    <dd>{formatCurrency(item.discount_amount)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="sales-invoice-panel">
          <p className="eyebrow">Remarks</p>
          <p className="sales-invoice-remarks">{invoice.remarks || "No remarks added for this invoice."}</p>
        </section>
      </article>

      <article className="invoice-sheet invoice-sheet-print invoice-sheet-a4 invoice-sheet-portrait" data-density={a4Density}>
        <header className="invoice-sheet-head">
          <div className="invoice-brand-lockup">
            <p className="invoice-brand-name">Metal Mint</p>
            <h3>Sales Invoice</h3>
            <p className="muted">Steel furniture dispatch and sales record</p>
          </div>
          <dl className="invoice-keyfacts">
            <div>
              <dt>Invoice No.</dt>
              <dd>{invoice.invoice_number}</dd>
            </div>
            <div>
              <dt>Invoice Date</dt>
              <dd>{formatDate(invoice.sale_date)}</dd>
            </div>
          </dl>
        </header>

        <section className="invoice-party-block invoice-party-block--single">
          <div>
            <p className="eyebrow">Invoice To</p>
            <strong>{invoice.customer_name || "Walk-in customer"}</strong>
            <span>{invoice.customer_mobile || "-"}</span>
            <span>{invoice.customer_location || "-"}</span>
          </div>
        </section>

        <section className="invoice-sheet-body">
          <table className="invoice-sheet-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Disc.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <code>{item.product_code}</code>
                  </td>
                  <td>
                    <strong>{item.product_type_name}</strong>
                    <span>{item.size_label || "Custom size"}</span>
                    <span>{item.paint_color || "Unpainted"}</span>
                  </td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.unit_price)}</td>
                  <td>{formatCurrency(item.discount_amount)}</td>
                  <td>{formatCurrency(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="invoice-sheet-footer">
          <div className="invoice-notes">
            <p className="eyebrow">Remarks</p>
            <p>{invoice.remarks || "No remarks."}</p>
          </div>
          <dl className="invoice-total-stack">
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

      <article className="invoice-sheet invoice-sheet-print invoice-sheet-thermal" data-density={thermalDensity}>
        <header className="invoice-thermal-head">
          <p className="eyebrow">Metal Mint</p>
          <h3>Sales Bill</h3>
          <strong>{invoice.invoice_number}</strong>
          <span>{formatDate(invoice.sale_date)}</span>
        </header>

        <section className="invoice-thermal-meta">
          <div>
            <span>Customer</span>
            <strong>{invoice.customer_name || "Walk-in customer"}</strong>
          </div>
          <div>
            <span>Mobile</span>
            <strong>{invoice.customer_mobile || "-"}</strong>
          </div>
          <div>
            <span>Location</span>
            <strong>{invoice.customer_location || "-"}</strong>
          </div>
        </section>

        <section className="invoice-thermal-items">
          {items.map((item) => (
            <article className="invoice-thermal-item" key={item.id}>
              <div className="invoice-thermal-item-head">
                <strong>{item.product_type_name}</strong>
                <span>{formatCurrency(item.line_total)}</span>
              </div>
              <p className="invoice-thermal-item-code">{item.product_code}</p>
              <p className="invoice-thermal-item-meta">
                {item.size_label || "Custom size"} | {item.paint_color || "Unpainted"}
              </p>
              <div className="invoice-thermal-item-row">
                <span>Qty {item.quantity}</span>
                <span>Unit {formatCurrency(item.unit_price)}</span>
                <span>Disc. {formatCurrency(item.discount_amount)}</span>
              </div>
            </article>
          ))}
        </section>

        <dl className="invoice-thermal-totals">
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

        <section className="invoice-thermal-notes">
          <p className="eyebrow">Remarks</p>
          <p>{invoice.remarks || "No remarks."}</p>
          <span>Created {formatDateTime(invoice.created_at)}</span>
        </section>
      </article>
    </section>
  );
}

export default SalesInvoicePage;
