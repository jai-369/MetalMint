import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatRepairStatus, repairStatuses } from "../constants/repairStatuses.js";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "-";
}

function DetailRow({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "-"}</dd>
    </div>
  );
}

function RepairInvoicePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const canWrite = user.role === "admin" || user.role === "staff";
  const [repair, setRepair] = useState(null);
  const [nextStatus, setNextStatus] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadRepair() {
    setIsLoading(true);
    setError("");

    try {
      const data = await apiRequest(`/api/repairs/${id}`);
      setRepair(data.repair);
      setNextStatus(data.repair.repair_status);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRepair();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateStatus(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      const data = await apiRequest(`/api/repairs/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ repair_status: nextStatus }),
      });
      setRepair(data.repair);
      setMessage("Repair status updated.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <p className="state-card">Loading service invoice...</p>;
  }

  if (error && !repair) {
    return <p className="error-message">{error}</p>;
  }

  if (!repair) {
    return <p className="empty-state">Repair job not found.</p>;
  }

  return (
    <section className="page-section invoice-page repair-invoice-page">
      <PageHeader
        action={
          <div className="invoice-actions">
            <button className="button primary" onClick={() => window.print()} type="button">
              Print / Save PDF
            </button>
            <Link className="button secondary" to="/repairs">
              Back to Repair
            </Link>
          </div>
        }
        eyebrow="Service Invoice"
        icon="repair"
        title={repair.service_invoice_number}
      />

      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      <article className="invoice-document">
        <header className="invoice-header">
          <div>
            <p className="eyebrow">MetalMint Service</p>
            <h2>{repair.service_invoice_number}</h2>
            <p className="muted">Repair intake and customer delivery record</p>
          </div>
          <div className="invoice-meta">
            <span>Status</span>
            <StatusBadge status={repair.repair_status}>{formatRepairStatus(repair.repair_status)}</StatusBadge>
            <span>Charge</span>
            <strong>Rs. {Number(repair.service_charge ?? 0).toFixed(2)}</strong>
          </div>
        </header>

        <section className="service-status-panel no-print">
          <form onSubmit={updateStatus}>
            <label>
              Repair status
              <select disabled={!canWrite} onChange={(event) => setNextStatus(event.target.value)} value={nextStatus}>
                {repairStatuses.map((status) => (
                  <option key={status} value={status}>
                    {formatRepairStatus(status)}
                  </option>
                ))}
              </select>
            </label>
            <button className="button secondary" disabled={!canWrite || isSaving} type="submit">
              {isSaving ? "Saving..." : "Update Status"}
            </button>
          </form>
        </section>

        <section className="invoice-party-grid">
          <div>
            <p className="eyebrow">Customer / Owner</p>
            <h3>{repair.customer_name}</h3>
            <p>{repair.customer_phone || "-"}</p>
            <p>{repair.customer_location || "-"}</p>
          </div>
          <div>
            <p className="eyebrow">Timeline</p>
            <h3>{formatDate(repair.service_start_date)}</h3>
            <p>Expected delivery: {formatDate(repair.expected_delivery_date)}</p>
            <p>Duration: {repair.estimated_duration || "-"}</p>
          </div>
        </section>

        <section className="invoice-detail-grid">
          <div>
            <h3>Product Details</h3>
            <dl>
              <DetailRow label="Type" value={repair.product_type} />
              <DetailRow label="Category" value={repair.product_category} />
              <DetailRow label="Brand" value={repair.brand} />
              <DetailRow label="Model" value={repair.model} />
              <DetailRow label="Condition" value={repair.product_condition} />
            </dl>
          </div>
          <div>
            <h3>Service Details</h3>
            <dl>
              <DetailRow label="Service needed" value={repair.service_description} />
              <DetailRow label="Problem reported" value={repair.problem_reported} />
              <DetailRow label="Remarks" value={repair.remarks} />
              <DetailRow label="Created by" value={repair.created_by_name} />
            </dl>
          </div>
        </section>
      </article>
    </section>
  );
}

export default RepairInvoicePage;
