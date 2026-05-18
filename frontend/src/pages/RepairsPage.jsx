import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import PageHeader from "../components/PageHeader.jsx";
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

  useEffect(() => {
    loadRepairs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRepairs = useMemo(() => repairs, [repairs]);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateFilters(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
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
        body: JSON.stringify({
          ...form,
          service_charge: Number(form.service_charge || 0),
        }),
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
    <section className="page-section commerce-page repair-page">
      <PageHeader eyebrow="Service" icon="repair" title="Repair" />

      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      <section className="commerce-filter-panel">
        <div>
          <p className="eyebrow">Repair Jobs</p>
          <h3>Search service records</h3>
        </div>
        <form className="commerce-filter-grid" onSubmit={applyFilters}>
          <label>
            Search
            <input name="search" onChange={updateFilters} placeholder="Invoice, customer, phone, product..." value={filters.search} />
          </label>
          <label>
            Status
            <select name="repair_status" onChange={updateFilters} value={filters.repair_status}>
              <option value="">All statuses</option>
              {repairStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatRepairStatus(status)}
                </option>
              ))}
            </select>
          </label>
          <button className="button secondary" type="submit">
            Apply
          </button>
        </form>
      </section>

      <div className="commerce-layout">
        <section className="commerce-form-panel">
          <div className="panel-header">
            <h3>New repair entry</h3>
            <span className="admin-count">Service invoice</span>
          </div>
          <form className="commerce-form" onSubmit={createRepair}>
            <label>
              Product type
              <input name="product_type" onChange={updateForm} required value={form.product_type} />
            </label>
            <label>
              Category
              <input name="product_category" onChange={updateForm} value={form.product_category} />
            </label>
            <label>
              Brand
              <input name="brand" onChange={updateForm} value={form.brand} />
            </label>
            <label>
              Model
              <input name="model" onChange={updateForm} value={form.model} />
            </label>
            <label className="wide-field">
              Product condition
              <textarea name="product_condition" onChange={updateForm} rows="2" value={form.product_condition} />
            </label>
            <label className="wide-field">
              Service needed
              <textarea name="service_description" onChange={updateForm} required rows="3" value={form.service_description} />
            </label>
            <label className="wide-field">
              Problem reported
              <textarea name="problem_reported" onChange={updateForm} rows="2" value={form.problem_reported} />
            </label>
            <label>
              Estimated duration
              <input name="estimated_duration" onChange={updateForm} placeholder="3 days" value={form.estimated_duration} />
            </label>
            <label>
              Customer name
              <input name="customer_name" onChange={updateForm} required value={form.customer_name} />
            </label>
            <label>
              Phone
              <input name="customer_phone" onChange={updateForm} value={form.customer_phone} />
            </label>
            <label className="wide-field">
              Place / location
              <textarea name="customer_location" onChange={updateForm} rows="2" value={form.customer_location} />
            </label>
            <label>
              Start date
              <input name="service_start_date" onChange={updateForm} type="date" value={form.service_start_date} />
            </label>
            <label>
              Expected delivery
              <input name="expected_delivery_date" onChange={updateForm} type="date" value={form.expected_delivery_date} />
            </label>
            <label>
              Service charge
              <input min="0" name="service_charge" onChange={updateForm} type="number" value={form.service_charge} />
            </label>
            <label>
              Status
              <select name="repair_status" onChange={updateForm} value={form.repair_status}>
                {repairStatuses.map((status) => (
                  <option key={status} value={status}>
                    {formatRepairStatus(status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="wide-field">
              Remarks
              <textarea name="remarks" onChange={updateForm} rows="2" value={form.remarks} />
            </label>
            <button className="button primary wide-field" disabled={!canWrite || isSubmitting} type="submit">
              {isSubmitting ? "Generating..." : "Generate Service Invoice"}
            </button>
          </form>
        </section>

        <section className="commerce-list-panel">
          <div className="panel-header">
            <h3>Service timeline</h3>
            <span className="admin-count">{filteredRepairs.length} records</span>
          </div>
          {isLoading ? <p className="state-card">Loading repair jobs...</p> : null}
          <div className="repair-card-grid">
            {!isLoading && !filteredRepairs.length ? <p className="empty-state">No repair jobs found.</p> : null}
            {filteredRepairs.map((repair) => (
              <Link className="repair-card" key={repair.id} to={`/repairs/${repair.id}`}>
                <div className="repair-card-top">
                  <code>{repair.service_invoice_number}</code>
                  <StatusBadge status={repair.repair_status}>{formatRepairStatus(repair.repair_status)}</StatusBadge>
                </div>
                <h3>{repair.customer_name}</h3>
                <p>{repair.product_type}</p>
                <dl>
                  <div>
                    <dt>Phone</dt>
                    <dd>{repair.customer_phone || "-"}</dd>
                  </div>
                  <div>
                    <dt>Expected</dt>
                    <dd>{repair.expected_delivery_date ? new Date(repair.expected_delivery_date).toLocaleDateString() : "-"}</dd>
                  </div>
                </dl>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

export default RepairsPage;
