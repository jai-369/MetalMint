import { useEffect, useState } from "react";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

const blankForm = {
  name: "",
  email: "",
  password: "",
  role: "staff",
};

function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadUsers() {
    setIsLoading(true);
    setError("");

    try {
      const data = await apiRequest("/api/admin/users");
      setUsers(data.users);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function handleChange(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      await apiRequest("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm(blankForm);
      setMessage(`User created. ${form.email} can sign in immediately with the temporary password.`);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateStatus(user, isActive) {
    if (user.id === currentUser.id && !isActive) {
      setError("You cannot disable your own signed-in admin account.");
      setMessage("");
      return;
    }

    if (!isActive && !window.confirm(`Disable user ${user.email}? They will not be able to sign in.`)) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await apiRequest(`/api/admin/users/${user.id}/${isActive ? "enable" : "disable"}`, {
        method: "PATCH",
      });
      setMessage(`${user.email} ${isActive ? "enabled" : "disabled"}.`);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function resetPassword(user) {
    if (!window.confirm(`Reset password for ${user.email}?`)) {
      return;
    }

    const password = window.prompt(`Enter a new password for ${user.email}`);

    if (!password) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await apiRequest(`/api/admin/users/${user.id}/reset-password`, {
        method: "PATCH",
        body: JSON.stringify({ password }),
      });
      setMessage(`Password reset for ${user.email}.`);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteUser(user) {
    if (user.id === currentUser.id) {
      setError("You cannot delete your own signed-in admin account.");
      setMessage("");
      return;
    }

    if (!window.confirm(`Delete user ${user.email}? This cannot be undone.`)) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await apiRequest(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });
      setMessage(`${user.email} deleted.`);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const activeAdminCount = users.filter((user) => user.role === "admin" && user.is_active).length;

  function isProtectedAdmin(user) {
    return user.role === "admin" && user.is_active && activeAdminCount <= 1;
  }

  return (
    <section className="page-section admin-master-page">
      <PageHeader eyebrow="Admin" icon="users" title="Users" />

      <section className="admin-editor-panel">
        <div className="admin-panel-heading">
          <div>
            <p className="eyebrow">Provision User</p>
            <h3>Create internal account</h3>
          </div>
        </div>

        <form className="admin-master-form admin-user-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input name="name" onChange={handleChange} placeholder="Operator name" required value={form.name} />
          </label>
          <label>
            Email
            <input
              className="technical-input"
              name="email"
              onChange={handleChange}
              placeholder="user@factorytrack.local"
              required
              type="email"
              value={form.email}
            />
          </label>
          <label>
            Temporary password
            <input
              name="password"
              onChange={handleChange}
              placeholder="Set temporary password"
              required
              type="password"
              value={form.password}
            />
          </label>
          <label>
            Role
            <select name="role" onChange={handleChange} value={form.role}>
              <option value="staff">Staff</option>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button className="button primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Creating..." : "Create user"}
          </button>
        </form>
      </section>

      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      <section className="admin-list-panel table-wrap responsive-table">
        <div className="admin-panel-heading">
          <div>
            <p className="eyebrow">Personnel</p>
            <h3>User list</h3>
            <p className="muted">The final active admin account stays protected so the workspace is never locked out.</p>
          </div>
          <span className="admin-count">{users.length} records</span>
        </div>
        {isLoading ? (
          <p className="table-empty">Loading users...</p>
        ) : (
          <>
            {!users.length ? <p className="empty-state">No users found.</p> : null}
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <StatusBadge className={`role-${user.role}`} status={`ROLE_${user.role.toUpperCase()}`}>
                        {user.role}
                      </StatusBadge>
                    </td>
                    <td>
                      <StatusBadge status={user.is_active ? "ACTIVE" : "DISABLED"}>
                        {user.is_active ? "Active" : "Disabled"}
                      </StatusBadge>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="button small secondary" onClick={() => resetPassword(user)} type="button">
                          Reset
                        </button>
                        <button
                          className="button small secondary"
                          disabled={user.id === currentUser.id || isProtectedAdmin(user)}
                          onClick={() => updateStatus(user, !user.is_active)}
                          type="button"
                        >
                          {user.is_active ? "Disable" : "Enable"}
                        </button>
                        <button
                          className="button small danger"
                          disabled={user.id === currentUser.id || isProtectedAdmin(user)}
                          onClick={() => deleteUser(user)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mobile-card-list admin-card-list">
              {users.map((user) => (
                <article className="admin-record-card user-record-card" key={user.id}>
                  <div className="admin-record-top">
                    <div className="user-identity">
                      <span>{(user.name || "?").slice(0, 2).toUpperCase()}</span>
                      <div>
                        <h3>{user.name}</h3>
                        <code>{user.email}</code>
                      </div>
                    </div>
                    <StatusBadge status={user.is_active ? "ACTIVE" : "DISABLED"}>
                      {user.is_active ? "Active" : "Disabled"}
                    </StatusBadge>
                  </div>
                  <dl>
                    <div>
                      <dt>Role</dt>
                      <dd>
                        <StatusBadge className={`role-${user.role}`} status={`ROLE_${user.role.toUpperCase()}`}>
                          {user.role}
                        </StatusBadge>
                      </dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{user.email}</dd>
                    </div>
                  </dl>
                  <div className="table-actions">
                    <button className="button small secondary" onClick={() => resetPassword(user)} type="button">
                      Reset
                    </button>
                    <button
                      className="button small secondary"
                      disabled={user.id === currentUser.id || isProtectedAdmin(user)}
                      onClick={() => updateStatus(user, !user.is_active)}
                      type="button"
                    >
                      {user.is_active ? "Disable" : "Enable"}
                    </button>
                    <button
                      className="button small danger"
                      disabled={user.id === currentUser.id || isProtectedAdmin(user)}
                      onClick={() => deleteUser(user)}
                      type="button"
                    >
                      Delete
                    </button>
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

export default AdminUsersPage;
