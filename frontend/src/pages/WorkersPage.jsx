import { useEffect, useState } from "react";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

const blankForm = { name: "", role: "fabricator" };

const roleColors = {
  fabricator: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", label: "Builder" },
  painter: { bg: "rgba(168,85,247,0.12)", color: "#a855f7", label: "Painter" },
  helper: { bg: "rgba(96,165,250,0.12)", color: "#60a5fa", label: "Helper" },
  supervisor: { bg: "rgba(52,211,153,0.12)", color: "#34d399", label: "Supervisor" },
};

function getInitials(name = "") {
  return name.trim().split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function WorkersPage() {
  const { user } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [editingWorker, setEditingWorker] = useState(null);
  const [editForm, setEditForm] = useState(blankForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  async function loadWorkers() {
    setIsLoading(true);
    setError("");
    try {
      const data = await apiRequest("/api/employees");
      setWorkers(data.employees || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadWorkers(); }, []);

  function handleCreateChange(event) {
    setForm((c) => ({ ...c, [event.target.name]: event.target.value }));
  }

  function handleEditChange(event) {
    setEditForm((c) => ({ ...c, [event.target.name]: event.target.value }));
  }

  async function handleCreateSubmit(event) {
    event.preventDefault();
    setError(""); setMessage(""); setIsSubmitting(true);
    try {
      await apiRequest("/api/employees", { method: "POST", body: JSON.stringify(form) });
      setForm(blankForm);
      setShowAddForm(false);
      setMessage(`"${form.name}" added to roster.`);
      await loadWorkers();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    if (!editingWorker) return;
    setError(""); setMessage(""); setIsSubmitting(true);
    try {
      await apiRequest(`/api/employees/${editingWorker.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editForm.name, role: editForm.role }),
      });
      setEditingWorker(null);
      setMessage("Worker details updated.");
      await loadWorkers();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleWorkerStatus(worker) {
    setError(""); setMessage("");
    try {
      await apiRequest(`/api/employees/${worker.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !worker.is_active }),
      });
      setMessage(`${worker.name} is now ${!worker.is_active ? "active" : "inactive"}.`);
      await loadWorkers();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function startEditing(worker) {
    setEditingWorker(worker);
    setEditForm({ name: worker.name, role: worker.role });
    setShowAddForm(false);
    setError(""); setMessage("");
  }

  const activeWorkers = workers.filter((w) => w.is_active);
  const inactiveWorkers = workers.filter((w) => !w.is_active);
  const canWrite = user.role === "admin" || user.role === "staff";

  return (
    <section className="page-section workers-page-v2 animate-fade-in" style={{ paddingBottom: "24px" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="page-header-v3" style={{ "--section-color": "var(--primary-strong)", flex: 1 }}>
          <div className="page-header-v3-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <p className="page-header-v3-eyebrow">Roster</p>
            <h1 className="page-header-v3-title">Team Members</h1>
          </div>
        </div>
        {canWrite && !editingWorker && (
          <button
            className="button primary"
            onClick={() => { setShowAddForm((v) => !v); setEditingWorker(null); }}
            type="button"
            style={{ minWidth: "80px", padding: "8px 14px", fontSize: "0.84rem" }}
          >
            {showAddForm ? "Cancel" : "+ Add"}
          </button>
        )}
      </div>

      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      {/* ── Add Form ── */}
      {showAddForm && !editingWorker && (
        <div className="workspace-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">New Member</p>
              <h3>Add to roster</h3>
            </div>
          </div>
          <form onSubmit={handleCreateSubmit} style={{ display: "grid", gap: "12px" }}>
            <label>
              Full Name
              <input
                name="name"
                onChange={handleCreateChange}
                placeholder="e.g. Ramesh Kumar"
                required
                value={form.name}
              />
            </label>
            <label>
              Role
              <select name="role" onChange={handleCreateChange} value={form.role}>
                <option value="fabricator">Fabricator (Builder)</option>
                <option value="painter">Painter</option>
                <option value="helper">Helper</option>
                <option value="supervisor">Supervisor</option>
              </select>
            </label>
            <button className="button primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Adding..." : "Add to Roster"}
            </button>
          </form>
        </div>
      )}

      {/* ── Edit Form ── */}
      {editingWorker && (
        <div className="workspace-card" style={{ borderColor: "rgba(99,102,241,0.3)" }}>
          <div className="panel-header">
            <div>
              <p className="eyebrow">Editing</p>
              <h3>{editingWorker.name}</h3>
            </div>
          </div>
          <form onSubmit={handleEditSubmit} style={{ display: "grid", gap: "12px" }}>
            <label>
              Full Name
              <input name="name" onChange={handleEditChange} required value={editForm.name} />
            </label>
            <label>
              Role
              <select name="role" onChange={handleEditChange} value={editForm.role}>
                <option value="fabricator">Fabricator (Builder)</option>
                <option value="painter">Painter</option>
                <option value="helper">Helper</option>
                <option value="supervisor">Supervisor</option>
              </select>
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="button primary" disabled={isSubmitting} type="submit" style={{ flex: 2 }}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
              <button className="button secondary" onClick={() => setEditingWorker(null)} type="button" style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Active Workers ── */}
      <div>
        <div className="v3-section-header">
          <p className="v3-section-title">
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#34d399", display: "inline-block", boxShadow: "0 0 8px rgba(52,211,153,0.5)" }} />
            Active Members
          </p>
          <span className="admin-count">{activeWorkers.length}</span>
        </div>

        {isLoading ? (
          <div style={{ display: "grid", gap: "8px" }}>
            {[1, 2, 3].map((i) => <div key={i} className="skeleton-box" style={{ height: "68px" }} />)}
          </div>
        ) : activeWorkers.length === 0 ? (
          <p className="empty-state">No active workers. Add some using the button above.</p>
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {activeWorkers.map((worker) => {
              const roleStyle = roleColors[worker.role] || roleColors.helper;
              return (
                <div className="v3-worker-card" key={worker.id}>
                  <div className="v3-worker-avatar" style={{ background: `linear-gradient(135deg, ${roleStyle.color}, color-mix(in srgb, ${roleStyle.color} 60%, #000))` }}>
                    {getInitials(worker.name)}
                  </div>
                  <div className="v3-worker-info">
                    <div className="v3-worker-name">{worker.name}</div>
                    <div className="v3-worker-role">
                      <span style={{ background: roleStyle.bg, color: roleStyle.color, padding: "2px 8px", borderRadius: "6px", fontSize: "0.68rem", fontWeight: "700" }}>
                        {roleStyle.label}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    <button
                      onClick={() => startEditing(worker)}
                      className="button small secondary"
                      style={{ padding: "5px 10px", minHeight: "32px", fontSize: "0.75rem" }}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleWorkerStatus(worker)}
                      className="button small secondary"
                      style={{ padding: "5px 10px", minHeight: "32px", fontSize: "0.75rem", color: "var(--danger)" }}
                      type="button"
                    >
                      Disable
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Inactive Workers ── */}
      {inactiveWorkers.length > 0 && (
        <div>
          <div className="v3-section-header">
            <p className="v3-section-title">
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--muted)", display: "inline-block" }} />
              Inactive Members
            </p>
            <span className="admin-count">{inactiveWorkers.length}</span>
          </div>
          <div style={{ display: "grid", gap: "8px", opacity: 0.75 }}>
            {inactiveWorkers.map((worker) => {
              const roleStyle = roleColors[worker.role] || roleColors.helper;
              return (
                <div className="v3-worker-card" key={worker.id} style={{ borderColor: "var(--border-soft)" }}>
                  <div className="v3-worker-avatar" style={{ background: "var(--surface-higher)", filter: "grayscale(1)" }}>
                    {getInitials(worker.name)}
                  </div>
                  <div className="v3-worker-info">
                    <div className="v3-worker-name" style={{ color: "var(--muted-strong)" }}>{worker.name}</div>
                    <div className="v3-worker-role" style={{ color: "var(--muted)" }}>{worker.role} · Inactive</div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    <button
                      onClick={() => startEditing(worker)}
                      className="button small secondary"
                      style={{ padding: "5px 10px", minHeight: "32px", fontSize: "0.75rem" }}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleWorkerStatus(worker)}
                      className="button small secondary"
                      style={{ padding: "5px 10px", minHeight: "32px", fontSize: "0.75rem", color: "var(--success)" }}
                      type="button"
                    >
                      Enable
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export default WorkersPage;
