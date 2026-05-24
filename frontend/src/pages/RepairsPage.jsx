import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatRepairStatus, repairStatuses } from "../constants/repairStatuses.js";

const today = new Date().toISOString().slice(0, 10);

const blankRepair = {
  product_type: "",
  product_category: "",
  brand: "",
  model: "",
  product_condition: "",
  service_description: "",
  problem_reported: "",
  estimated_duration: "",
  customer_name: "",
  customer_location: "",
  customer_phone: "",
  service_start_date: today,
  expected_delivery_date: "",
  service_charge: "",
  repair_status: "RECEIVED",
  remarks: "",
};

function RepairsPage() {
  const { user } = useAuth();
  const canWrite = user.role === "admin" || user.role === "staff";
  const navigate = useNavigate();
  const [repairs, setRepairs] = useState([]);
  const [filters, setFilters] = useState({ search: "", repair_status: "" });
  const [form, setForm] = useState(blankRepair);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("list");

  async function loadRepairs() {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.repair_status) params.set("repair_status", filters.repair_status);
      const data = await apiRequest(`/api/repairs${params.toString() ? `?${params}` : ""}`);
      setRepairs(data.repairs);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadRepairs(); }, []); // eslint-disable-line

  const filteredRepairs = useMemo(() => repairs, [repairs]);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function applyFilters(event) {
    event.preventDefault();
    await loadRepairs();
  }

  async function createRepair(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);
    try {
      const data = await apiRequest("/api/repairs", {
        method: "POST",
        body: JSON.stringify({ ...form, service_charge: Number(form.service_charge || 0) }),
      });
      setMessage("Service invoice generated.");
      setForm(blankRepair);
      navigate(`/repairs/${data.repair.id}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="page-section commerce-page repair-page animate-fade-in" style={{ paddingBottom: "24px" }}>
      {/* ── Header ── */}
      <div className="page-header-v3" style={{ "--section-color": "var(--clr-repair)" }}>
        <div className="page-header-v3-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>
        <div>
          <p className="page-header-v3-eyebrow">Service</p>
          <h1 className="page-header-v3-title">Service Desk</h1>
        </div>
      </div>

      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      {/* ── Tab switcher ── */}
      <div style={{ display: "flex", gap: "6px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "4px" }}>
        <button
          onClick={() => setActiveTab("list")}
          style={{
            flex: 1, padding: "8px", borderRadius: "10px", border: "none", fontSize: "0.84rem", fontWeight: "700", cursor: "pointer",
            background: activeTab === "list" ? "var(--clr-repair-soft)" : "transparent",
            color: activeTab === "list" ? "var(--clr-repair)" : "var(--muted)",
            transition: "all 0.2s ease",
          }}
          type="button"
        >
          Active Jobs ({filteredRepairs.length})
        </button>
        {canWrite && (
          <button
            onClick={() => setActiveTab("new")}
            style={{
              flex: 1, padding: "8px", borderRadius: "10px", border: "none", fontSize: "0.84rem", fontWeight: "700", cursor: "pointer",
              background: activeTab === "new" ? "var(--clr-repair-soft)" : "transparent",
              color: activeTab === "new" ? "var(--clr-repair)" : "var(--muted)",
              transition: "all 0.2s ease",
            }}
            type="button"
          >
            + New Job
          </button>
        )}
      </div>

      {/* ── Tab: Active Jobs ── */}
      {activeTab === "list" && (
        <div>
          {/* Search / filter */}
          <form onSubmit={applyFilters} style={{ display: "grid", gap: "10px", marginBottom: "12px" }}>
            <input
              name="search"
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search invoice, customer, phone, product..."
              value={filters.search}
              style={{ borderRadius: "12px" }}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <select
                name="repair_status"
                onChange={(e) => setFilters((f) => ({ ...f, repair_status: e.target.value }))}
                value={filters.repair_status}
                style={{ flex: 1 }}
              >
                <option value="">All statuses</option>
                {repairStatuses.map((status) => (
                  <option key={status} value={status}>{formatRepairStatus(status)}</option>
                ))}
              </select>
              <button className="button secondary" type="submit" style={{ flex: "0 0 auto", minWidth: "80px" }}>
                Search
              </button>
            </div>
          </form>

          {isLoading ? (
            <div style={{ display: "grid", gap: "10px" }}>
              {[1, 2, 3].map((i) => <div key={i} className="skeleton-box" style={{ height: "110px" }} />)}
            </div>
          ) : (
            <div className="repair-card-grid" style={{ display: "grid", gap: "10px" }}>
              {!filteredRepairs.length ? (
                <p className="empty-state">No repair jobs found.</p>
              ) : null}
              {filteredRepairs.map((repair) => (
                <Link className="repair-card" key={repair.id} to={`/repairs/${repair.id}`}>
                  <div className="repair-card-top">
                    <code style={{ fontSize: "0.75rem" }}>{repair.service_invoice_number}</code>
                    <StatusBadge status={repair.repair_status}>{formatRepairStatus(repair.repair_status)}</StatusBadge>
                  </div>
                  <strong style={{ fontSize: "0.95rem", color: "var(--text-strong)" }}>{repair.customer_name}</strong>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>{repair.product_type}</p>
                  <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                      📞 {repair.customer_phone || "—"}
                    </span>
                    {repair.expected_delivery_date && (
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                        📅 {new Date(repair.expected_delivery_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: New Repair ── */}
      {activeTab === "new" && (
        <div className="workspace-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">New Entry</p>
              <h3>Create service job</h3>
            </div>
          </div>
          <form className="commerce-form" onSubmit={createRepair} style={{ display: "grid", gap: "12px" }}>
            {/* Product info */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <label>
                Product type *
                <input name="product_type" onChange={updateForm} required value={form.product_type} placeholder="Almirah, wardrobe..." />
              </label>
              <label>
                Brand
                <input name="brand" onChange={updateForm} value={form.brand} placeholder="Brand name..." />
              </label>
            </div>
            <label>
              Service needed *
              <textarea name="service_description" onChange={updateForm} required rows="3" value={form.service_description} placeholder="Describe the service required..." />
            </label>
            <label>
              Problem reported
              <textarea name="problem_reported" onChange={updateForm} rows="2" value={form.problem_reported} placeholder="What the customer reported..." />
            </label>

            {/* Customer info */}
            <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: "12px", marginTop: "4px" }}>
              <p className="eyebrow" style={{ marginBottom: "10px" }}>Customer Details</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label>
                  Customer name *
                  <input name="customer_name" onChange={updateForm} required value={form.customer_name} />
                </label>
                <label>
                  Phone
                  <input name="customer_phone" onChange={updateForm} value={form.customer_phone} />
                </label>
              </div>
              <label style={{ marginTop: "12px" }}>
                Location
                <textarea name="customer_location" onChange={updateForm} rows="2" value={form.customer_location} />
              </label>
            </div>

            {/* Dates & charges */}
            <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: "12px", marginTop: "4px" }}>
              <p className="eyebrow" style={{ marginBottom: "10px" }}>Schedule &amp; Charges</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label>
                  Start date
                  <input name="service_start_date" onChange={updateForm} type="date" value={form.service_start_date} />
                </label>
                <label>
                  Expected delivery
                  <input name="expected_delivery_date" onChange={updateForm} type="date" value={form.expected_delivery_date} />
                </label>
                <label>
                  Service charge (₹)
                  <input min="0" name="service_charge" onChange={updateForm} type="number" value={form.service_charge} />
                </label>
                <label>
                  Status
                  <select name="repair_status" onChange={updateForm} value={form.repair_status}>
                    {repairStatuses.map((status) => (
                      <option key={status} value={status}>{formatRepairStatus(status)}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label style={{ marginTop: "12px" }}>
                Remarks
                <textarea name="remarks" onChange={updateForm} rows="2" value={form.remarks} />
              </label>
            </div>

            <button className="button primary" disabled={!canWrite || isSubmitting} type="submit" style={{ width: "100%" }}>
              {isSubmitting ? "Generating..." : "Generate Service Invoice →"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}

export default RepairsPage;
