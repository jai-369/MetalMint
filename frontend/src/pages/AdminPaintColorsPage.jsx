import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

const blankForm = {
  name: "",
  display_order: "",
  is_active: true,
};

function AdminPaintColorsPage() {
  const [paintColors, setPaintColors] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(editingId);

  const sortedPaintColors = useMemo(
    () =>
      [...paintColors].sort((first, second) => {
        if (first.is_active !== second.is_active) {
          return first.is_active ? -1 : 1;
        }

        if (first.display_order !== second.display_order) {
          return first.display_order - second.display_order;
        }

        return first.name.localeCompare(second.name);
      }),
    [paintColors]
  );

  async function loadPaintColors() {
    setIsLoading(true);
    setError("");

    try {
      const data = await apiRequest("/api/paint-colors?includeInactive=true");
      setPaintColors(data.paint_colors || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPaintColors();
  }, []);

  function resetForm() {
    setForm(blankForm);
    setEditingId(null);
  }

  function handleChange(event) {
    const { checked, name, type, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function startEdit(paintColor) {
    setEditingId(paintColor.id);
    setForm({
      name: paintColor.name,
      display_order: String(paintColor.display_order ?? 0),
      is_active: paintColor.is_active,
    });
    setMessage("");
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const path = isEditing ? `/api/paint-colors/${editingId}` : "/api/paint-colors";
      const method = isEditing ? "PATCH" : "POST";

      await apiRequest(path, {
        method,
        body: JSON.stringify({
          ...form,
          display_order: form.display_order === "" ? 0 : Number(form.display_order),
        }),
      });

      setMessage(isEditing ? "Paint color updated." : "Paint color created.");
      resetForm();
      await loadPaintColors();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleStatus(paintColor) {
    if (
      paintColor.is_active &&
      !window.confirm(`Disable ${paintColor.name}? It will stay on existing records but disappear from new entries.`)
    ) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await apiRequest(`/api/paint-colors/${paintColor.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !paintColor.is_active }),
      });

      setMessage(`${paintColor.name} ${paintColor.is_active ? "disabled" : "enabled"}.`);
      await loadPaintColors();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function softDisable(paintColor) {
    if (!window.confirm(`Soft disable ${paintColor.name}? This keeps history but hides it from new manufacturing.`)) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await apiRequest(`/api/paint-colors/${paintColor.id}`, {
        method: "DELETE",
      });

      setMessage(`${paintColor.name} disabled.`);
      await loadPaintColors();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="page-section admin-master-page">
      <PageHeader eyebrow="Admin" icon="palette" title="Paint Colors" />

      <section className="admin-editor-panel">
        <div className="admin-panel-heading">
          <div>
            <p className="eyebrow">{isEditing ? "Edit Color" : "Create Color"}</p>
            <h3>{isEditing ? "Update color preset" : "Add paint color or combination"}</h3>
          </div>
          {isEditing ? <StatusBadge status="INFO">Editing</StatusBadge> : null}
        </div>

        <form className="admin-master-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input name="name" onChange={handleChange} placeholder="Royal Blue / Grey Combo" required value={form.name} />
          </label>
          <label>
            Display order
            <input
              name="display_order"
              onChange={handleChange}
              placeholder="10"
              type="number"
              value={form.display_order}
            />
          </label>
          <label className="admin-toggle-field">
            <input checked={form.is_active} name="is_active" onChange={handleChange} type="checkbox" />
            <span>
              <strong>Active</strong>
              <small>Visible in new manufacturing and painting forms</small>
            </span>
          </label>
          <div className="form-actions wide-field">
            <button className="button primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : isEditing ? "Update paint color" : "Create paint color"}
            </button>
            {isEditing ? (
              <button className="button secondary" onClick={resetForm} type="button">
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      <section className="admin-list-panel table-wrap responsive-table">
        <div className="admin-panel-heading">
          <div>
            <p className="eyebrow">Color Library</p>
            <h3>Manufacturing paint options</h3>
          </div>
          <span className="admin-count">{sortedPaintColors.length} records</span>
        </div>
        {isLoading ? (
          <p className="table-empty">Loading paint colors...</p>
        ) : (
          <>
            {!sortedPaintColors.length ? <p className="empty-state">No paint colors found.</p> : null}
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedPaintColors.map((paintColor) => (
                  <tr key={paintColor.id}>
                    <td>{paintColor.name}</td>
                    <td>{paintColor.display_order}</td>
                    <td>
                      <StatusBadge status={paintColor.is_active ? "ACTIVE" : "INACTIVE"}>
                        {paintColor.is_active ? "Active" : "Inactive"}
                      </StatusBadge>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="button small secondary" onClick={() => startEdit(paintColor)} type="button">
                          Edit
                        </button>
                        <button className="button small secondary" onClick={() => toggleStatus(paintColor)} type="button">
                          {paintColor.is_active ? "Disable" : "Enable"}
                        </button>
                        {paintColor.is_active ? (
                          <button className="button small secondary" onClick={() => softDisable(paintColor)} type="button">
                            Soft disable
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mobile-card-list admin-card-list">
              {sortedPaintColors.map((paintColor) => (
                <article className="admin-record-card" key={paintColor.id}>
                  <div className="admin-record-top">
                    <div>
                      <h3>{paintColor.name}</h3>
                      <code>Order {paintColor.display_order}</code>
                    </div>
                    <StatusBadge status={paintColor.is_active ? "ACTIVE" : "INACTIVE"}>
                      {paintColor.is_active ? "Active" : "Inactive"}
                    </StatusBadge>
                  </div>
                  <div className="table-actions">
                    <button className="button small secondary" onClick={() => startEdit(paintColor)} type="button">
                      Edit
                    </button>
                    <button className="button small secondary" onClick={() => toggleStatus(paintColor)} type="button">
                      {paintColor.is_active ? "Disable" : "Enable"}
                    </button>
                    {paintColor.is_active ? (
                      <button className="button small secondary" onClick={() => softDisable(paintColor)} type="button">
                        Soft disable
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </section>
  );
}

export default AdminPaintColorsPage;
