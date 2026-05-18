import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

const blankForm = {
  name: "",
  code: "",
  category: "",
  description: "",
  is_active: true,
};

function AdminProductTypesPage() {
  const [productTypes, setProductTypes] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(editingId);

  const sortedProductTypes = useMemo(
    () =>
      [...productTypes].sort((first, second) => {
        if (first.is_active !== second.is_active) {
          return first.is_active ? -1 : 1;
        }

        return first.name.localeCompare(second.name);
      }),
    [productTypes]
  );

  async function loadProductTypes() {
    setIsLoading(true);
    setError("");

    try {
      const data = await apiRequest("/api/product-types?includeInactive=true");
      setProductTypes(data.product_types);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProductTypes();
  }, []);

  function resetForm() {
    setForm(blankForm);
    setEditingId(null);
  }

  function handleChange(event) {
    const { checked, name, type, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : name === "code" ? value.toUpperCase() : value,
    }));
  }

  function startEdit(productType) {
    setEditingId(productType.id);
    setForm({
      name: productType.name,
      code: productType.code,
      category: productType.category ?? "",
      description: productType.description ?? "",
      is_active: productType.is_active,
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
      const path = isEditing ? `/api/product-types/${editingId}` : "/api/product-types";
      const method = isEditing ? "PATCH" : "POST";

      await apiRequest(path, {
        method,
        body: JSON.stringify(form),
      });

      setMessage(isEditing ? "Product type updated." : "Product type created.");
      resetForm();
      await loadProductTypes();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleStatus(productType) {
    if (
      productType.is_active &&
      !window.confirm(`Disable product type ${productType.code}? Existing products will keep this type.`)
    ) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await apiRequest(`/api/product-types/${productType.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !productType.is_active }),
      });

      setMessage(`${productType.code} ${productType.is_active ? "disabled" : "enabled"}.`);
      await loadProductTypes();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function softDisable(productType) {
    if (!window.confirm(`Soft disable ${productType.code}? This keeps history but hides it from new entries.`)) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await apiRequest(`/api/product-types/${productType.id}`, {
        method: "DELETE",
      });

      setMessage(`${productType.code} disabled.`);
      await loadProductTypes();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="page-section admin-master-page">
      <PageHeader eyebrow="Admin" icon="types" title="Product Types" />

      <section className="admin-editor-panel">
        <div className="admin-panel-heading">
          <div>
            <p className="eyebrow">{isEditing ? "Edit Type" : "Create Type"}</p>
            <h3>{isEditing ? "Update product master" : "Add new product type"}</h3>
          </div>
          {isEditing ? <StatusBadge status="INFO">Editing</StatusBadge> : null}
        </div>

        <form className="admin-master-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input name="name" onChange={handleChange} placeholder="2 Door Almirah" required value={form.name} />
          </label>
          <label>
            Code
            <input
              className="technical-input"
              name="code"
              onChange={handleChange}
              pattern="[A-Z0-9]+"
              placeholder="ALM2D"
              required
              value={form.code}
            />
          </label>
          <label>
            Category
            <input name="category" onChange={handleChange} placeholder="Almirah" value={form.category} />
          </label>
          <label className="admin-toggle-field">
            <input checked={form.is_active} name="is_active" onChange={handleChange} type="checkbox" />
            <span>
              <strong>Active</strong>
              <small>Available for new manufacturing entries</small>
            </span>
          </label>
          <label className="wide-field">
            Description
            <textarea
              name="description"
              onChange={handleChange}
              placeholder="Internal notes or product family details"
              rows="3"
              value={form.description}
            />
          </label>
          <div className="form-actions wide-field">
            <button className="button primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : isEditing ? "Update product type" : "Create product type"}
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
            <p className="eyebrow">Master List</p>
            <h3>Existing product types</h3>
          </div>
          <span className="admin-count">{sortedProductTypes.length} records</span>
        </div>
        {isLoading ? (
          <p className="table-empty">Loading product types...</p>
        ) : (
          <>
            {!sortedProductTypes.length ? <p className="empty-state">No product types found.</p> : null}
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedProductTypes.map((productType) => (
                  <tr key={productType.id}>
                    <td>{productType.name}</td>
                    <td>
                      <code>{productType.code}</code>
                    </td>
                    <td>{productType.category || "-"}</td>
                    <td>
                      <StatusBadge status={productType.is_active ? "ACTIVE" : "INACTIVE"}>
                        {productType.is_active ? "Active" : "Inactive"}
                      </StatusBadge>
                    </td>
                    <td>{productType.description || "-"}</td>
                    <td>
                      <div className="table-actions">
                        <button className="button small secondary" onClick={() => startEdit(productType)} type="button">
                          Edit
                        </button>
                        <button
                          className="button small secondary"
                          onClick={() => toggleStatus(productType)}
                          type="button"
                        >
                          {productType.is_active ? "Disable" : "Enable"}
                        </button>
                        {productType.is_active ? (
                          <button
                            className="button small secondary"
                            onClick={() => softDisable(productType)}
                            type="button"
                          >
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
              {sortedProductTypes.map((productType) => (
                <article className="admin-record-card" key={productType.id}>
                  <div className="admin-record-top">
                    <div>
                      <h3>{productType.name}</h3>
                      <code>{productType.code}</code>
                    </div>
                    <StatusBadge status={productType.is_active ? "ACTIVE" : "INACTIVE"}>
                      {productType.is_active ? "Active" : "Inactive"}
                    </StatusBadge>
                  </div>
                  <dl>
                    <div>
                      <dt>Category</dt>
                      <dd>{productType.category || "-"}</dd>
                    </div>
                    <div>
                      <dt>Description</dt>
                      <dd>{productType.description || "-"}</dd>
                    </div>
                  </dl>
                  <div className="table-actions">
                    <button className="button small secondary" onClick={() => startEdit(productType)} type="button">
                      Edit
                    </button>
                    <button
                      className="button small secondary"
                      onClick={() => toggleStatus(productType)}
                      type="button"
                    >
                      {productType.is_active ? "Disable" : "Enable"}
                    </button>
                    {productType.is_active ? (
                      <button className="button small secondary" onClick={() => softDisable(productType)} type="button">
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

export default AdminProductTypesPage;
