import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import Button from "../components/Button.jsx";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatStatus, productStatuses } from "../constants/productStatuses.js";
import { getPrinterState, subscribeToPrinterState, printProductLabel } from "../utils/bluetoothPrinter.js";

const today = new Date().toISOString().slice(0, 10);

const sharedDefaults = {
  manufacturing_date: today,
  manufacturing_batch: "",
  factory_location: "",
  paint_color: "",
};

const skuDimensions = {
  "ALM744819": { width: 48, height: 74, depth: 19, size_label: "74 x 48 x 19" },
  "ALM743819": { width: 38, height: 74, depth: 19, size_label: "74 x 38 x 19" },
  "ALM743817": { width: 38, height: 74, depth: 17, size_label: "74 x 38 x 17" },
  "ALM743419": { width: 34, height: 74, depth: 19, size_label: "74 x 34 x 19" },
  "ALM743417": { width: 34, height: 74, depth: 17, size_label: "74 x 34 x 17" },
  "ALM663417": { width: 34, height: 66, depth: 17, size_label: "66 x 34 x 17" },
  "ALM663015": { width: 30, height: 66, depth: 15, size_label: "66 x 30 x 15" },
  "ALM543015": { width: 30, height: 54, depth: 15, size_label: "54 x 30 x 15" },
  "ALM543415": { width: 34, height: 54, depth: 15, size_label: "54 x 34 x 15" },
};

function buildRow(productTypeId = "", firstTypeCode = "") {
  const dims = skuDimensions[firstTypeCode] || { width: "48", height: "74", depth: "19", size_label: "74 x 48 x 19" };
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    product_type_id: productTypeId,
    is_custom: false,
    width: dims.width.toString(),
    height: dims.height.toString(),
    depth: dims.depth.toString(),
    size_label: dims.size_label,
    doors: "2-Door",
    weight_class: "Heavy",
    material_gauge: "18G",
    remarks: "",
  };
}

function ProductsSkeleton() {
  return (
    <div className="page-section manufacturing-page" style={{ paddingBottom: "32px" }}>
      <div className="skeleton-box" style={{ height: "80px", marginBottom: "20px" }}></div>
      <div className="workspace-card skeleton-box" style={{ height: "400px" }}></div>
    </div>
  );
}

function ProductsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canWrite = user.role === "admin" || user.role === "staff";

  const [products, setProducts] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [paintColors, setPaintColors] = useState([]);
  
  const [productionMode, setProductionMode] = useState("single"); // "single" or "batch"
  const [sharedFields, setSharedFields] = useState(sharedDefaults);
  const [selectedFabricators, setSelectedFabricators] = useState([]);
  const [selectedPainters, setSelectedPainters] = useState([]);
  
  const [rows, setRows] = useState([]);
  const [searchCode, setSearchCode] = useState("");
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [createdProducts, setCreatedProducts] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRecentlyBuilt, setShowRecentlyBuilt] = useState(false);

  // BLE status
  const [printerConnected, setPrinterConnected] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToPrinterState((state) => {
      setPrinterConnected(state.connected);
    });
    return unsubscribe;
  }, []);

  const activeProductTypes = useMemo(
    () => productTypes.filter((productType) => productType.is_active),
    [productTypes]
  );

  async function loadEmployees() {
    try {
      const data = await apiRequest("/api/employees");
      setEmployees(data.employees || []);
    } catch (err) {
      console.error("Failed to load employees roster:", err);
    }
  }

  async function loadPaintColors() {
    const data = await apiRequest("/api/paint-colors");
    setPaintColors(data.paint_colors || []);
  }

  async function loadProductTypes() {
    const data = await apiRequest("/api/product-types");
    setProductTypes(data.product_types);

    const firstActive = data.product_types.find((productType) => productType.is_active);
    const firstActiveId = firstActive?.id ?? "";
    const firstActiveCode = firstActive?.code ?? "";

    setRows([buildRow(firstActiveId, firstActiveCode)]);
  }

  async function loadProducts(nextFilters = filters) {
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (nextFilters.search) {
        params.set("search", nextFilters.search);
      }
      if (nextFilters.status) {
        params.set("status", nextFilters.status);
      }

      const data = await apiRequest(`/api/products${params.toString() ? `?${params}` : ""}`);
      setProducts(data.products || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    async function loadInitialData() {
      try {
        await Promise.all([loadProductTypes(), loadProducts(), loadEmployees(), loadPaintColors()]);
      } catch (requestError) {
        setError(requestError.message);
      }
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    if (sharedFields.paint_color || !paintColors.length) {
      return;
    }

    setSharedFields((current) => ({
      ...current,
      paint_color: paintColors[0].name,
    }));
  }, [paintColors, sharedFields.paint_color]);

  // Filter only active employees for team rosters
  const activeFabricatorsList = useMemo(
    () => employees.filter((e) => e.is_active && e.role === "fabricator"),
    [employees]
  );

  const activePaintersList = useMemo(
    () => employees.filter((e) => e.is_active && e.role === "painter"),
    [employees]
  );

  function updateSharedField(event) {
    const { name, value } = event.target;
    setSharedFields((current) => ({ ...current, [name]: value }));
  }

  function updateRow(rowId, field, value) {
    setRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
  }

  const handleModelChange = (rowId, val) => {
    if (val === "CUSTOM") {
      const defaultType = activeProductTypes[0]?.id || "";
      setRows((current) =>
        current.map((row) =>
          row.id === rowId
            ? {
                ...row,
                product_type_id: defaultType,
                is_custom: true,
                width: "",
                height: "",
                depth: "",
                size_label: "Custom Order",
              }
            : row
        )
      );
    } else {
      const selectedType = activeProductTypes.find((t) => t.id === val);
      const dims = skuDimensions[selectedType?.code] || { width: "", height: "", depth: "", size_label: "" };
      setRows((current) =>
        current.map((row) =>
          row.id === rowId
            ? {
                ...row,
                product_type_id: val,
                is_custom: false,
                width: dims.width.toString(),
                height: dims.height.toString(),
                depth: dims.depth.toString(),
                size_label: dims.size_label,
              }
            : row
        )
      );
    }
  };

  function addRow() {
    const firstActive = activeProductTypes[0];
    setRows((current) => [...current, buildRow(firstActive?.id ?? "", firstActive?.code ?? "")]);
  }

  function duplicateRow(rowId) {
    setRows((current) => {
      const row = current.find((item) => item.id === rowId);
      return row ? [...current, { ...row, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, remarks: row.remarks }] : current;
    });
  }

  function removeRow(rowId) {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== rowId) : current));
  }

  function clearBatch() {
    const firstActive = activeProductTypes[0];
    setRows([buildRow(firstActive?.id ?? "", firstActive?.code ?? "")]);
    setSharedFields(sharedDefaults);
    setSelectedFabricators([]);
    setSelectedPainters([]);
    setCreatedProducts([]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setCreatedProducts([]);
    setIsSubmitting(true);

    try {
      const payload = {
        products: rows.map((row) => ({
          ...sharedFields,
          product_type_id: row.product_type_id,
          width: Number(row.width),
          height: Number(row.height),
          depth: row.depth ? Number(row.depth) : null,
          size_label: row.is_custom ? `${row.width} x ${row.height} x ${row.depth}` : row.size_label,
          doors: row.doors,
          weight_class: row.weight_class,
          is_custom: row.is_custom,
          material_gauge: row.material_gauge,
          remarks: row.remarks,
          manufactured_by_ids: selectedFabricators,
          painted_by_ids: selectedPainters,
          paint_color: selectedPainters.length > 0 ? (sharedFields.paint_color || "Standard") : null,
        })),
      };

      const data = await apiRequest("/api/products/batch", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setMessage(
        data.products.length === 1
          ? "Manufactured almirah created successfully."
          : `${data.products.length} manufactured almirahs created successfully.`
      );
      setCreatedProducts(data.products);
      clearBatch();
      await loadProducts();

      // Trigger auto-printing if enabled and BLE connected
      if (autoPrint && printerConnected) {
        for (const prod of data.products) {
          try {
            await printProductLabel(prod);
          } catch (printErr) {
            console.error("BLE printing failed for code", prod.product_code, printErr);
          }
        }
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSearchByCode(event) {
    event.preventDefault();
    setError("");

    try {
      const data = await apiRequest(`/api/products/code/${encodeURIComponent(searchCode.trim())}`);
      navigate(`/products/${data.product.id}`);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function applyFilters(event) {
    event.preventDefault();
    loadProducts(filters);
  }

  function getProductCodePreview(row) {
    let body = "DDMMY";

    if (sharedFields.manufacturing_date) {
      const match = String(sharedFields.manufacturing_date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        body = `${match[3]}${match[2]}${match[1].slice(-1)}`;
      }
    }

    return `P${body}NN`;
  }

  function toggleFabricator(empId) {
    setSelectedFabricators((current) =>
      current.includes(empId) ? current.filter((id) => id !== empId) : [...current, empId]
    );
  }

  function togglePainter(empId) {
    setSelectedPainters((current) =>
      current.includes(empId) ? current.filter((id) => id !== empId) : [...current, empId]
    );
  }

  if (isLoading && products.length === 0) {
    return <ProductsSkeleton />;
  }

  return (
    <section className="page-section manufacturing-page animate-fade-in" style={{ paddingBottom: "40px" }}>
      <div className="page-header-v3" style={{ "--section-color": "var(--clr-build)" }}>
        <div className="page-header-v3-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 20h20" /><path d="M5 20V8l7-6 7 6v12" /><path d="M9 20v-5h6v5" />
          </svg>
        </div>
        <div>
          <p className="page-header-v3-eyebrow">Production</p>
          <h1 className="page-header-v3-title">Build Wardrobe</h1>
        </div>
      </div>

      {/* Segmented Switch for Production Mode */}
      <div className="segmented-switch" style={{ display: "flex", background: "var(--surface-high)", padding: "4px", borderRadius: "12px", border: "1px solid var(--border)", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => {
            setProductionMode("single");
            setRows(prev => prev.slice(0, 1));
          }}
          style={{
            flex: 1,
            minHeight: "40px",
            border: 0,
            borderRadius: "8px",
            background: productionMode === "single" ? "var(--primary-strong)" : "transparent",
            color: productionMode === "single" ? "var(--primary-text)" : "var(--muted)",
            fontWeight: "700",
            cursor: "pointer",
            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            fontSize: "13px"
          }}
        >
          Single Almirah
        </button>
        <button
          type="button"
          onClick={() => setProductionMode("batch")}
          style={{
            flex: 1,
            minHeight: "40px",
            border: 0,
            borderRadius: "8px",
            background: productionMode === "batch" ? "var(--primary-strong)" : "transparent",
            color: productionMode === "batch" ? "var(--primary-text)" : "var(--muted)",
            fontWeight: "700",
            cursor: "pointer",
            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            fontSize: "13px"
          }}
        >
          Batch Production
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* FORM CONFIGURATOR */}
        {canWrite ? (
          <form className="workspace-card" onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Step 1: Batch / Shared Details */}
            <div style={{ display: "grid", gap: "14px" }}>
              <div style={{ borderBottom: "1px solid var(--border-soft)", paddingBottom: "8px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "750", color: "var(--text-strong)" }}>1. Production Batch Info</h3>
              </div>
              <div style={{ display: "grid", gap: "12px" }}>
                <label>
                  Manufacturing Date
                  <input
                    name="manufacturing_date"
                    onChange={updateSharedField}
                    required
                    type="date"
                    value={sharedFields.manufacturing_date}
                    style={{ minHeight: "44px" }}
                  />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <label>
                    Batch ID (Optional)
                    <input
                      className="technical-input"
                      name="manufacturing_batch"
                      onChange={updateSharedField}
                      placeholder="e.g. BATCH-A1"
                      value={sharedFields.manufacturing_batch}
                      style={{ minHeight: "44px" }}
                    />
                  </label>
                  <label>
                    Location (Optional)
                    <input
                      name="factory_location"
                      placeholder="e.g. Unit 2"
                      onChange={updateSharedField}
                      value={sharedFields.factory_location}
                      style={{ minHeight: "44px" }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Step 2: Wardrobes Configuration */}
            <div style={{ display: "grid", gap: "14px" }}>
              <div style={{ borderBottom: "1px solid var(--border-soft)", paddingBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "750", color: "var(--text-strong)" }}>2. Wardrobe Attributes</h3>
                {productionMode === "batch" && (
                  <span className="status-badge small status-info">{rows.length} Items</span>
                )}
              </div>

              {productionMode === "single" ? (
                // Single wardrobe setup
                <div style={{ display: "grid", gap: "14px" }}>
                  <label>
                    Standard SKU Model
                    <select
                      onChange={(event) => handleModelChange(rows[0].id, event.target.value)}
                      required
                      value={rows[0].is_custom ? "CUSTOM" : rows[0].product_type_id}
                      style={{ minHeight: "44px" }}
                    >
                      {activeProductTypes.map((productType) => (
                        <option key={productType.id} value={productType.id}>
                          {productType.code} ({skuDimensions[productType.code]?.size_label} in)
                        </option>
                      ))}
                      <option value="CUSTOM">-- Custom Order Dimensions --</option>
                    </select>
                  </label>

                  {rows[0].is_custom && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "var(--surface-low)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                      <label style={{ gridColumn: "span 2" }}>Custom Label Name
                        <input
                          placeholder="e.g. Custom Locker Wardrobe"
                          value={rows[0].remarks}
                          onChange={(e) => updateRow(rows[0].id, "remarks", e.target.value)}
                          style={{ minHeight: "40px" }}
                        />
                      </label>
                      <label>Width (in)
                        <input
                          type="number"
                          required
                          value={rows[0].width}
                          placeholder="in inches"
                          onChange={(e) => updateRow(rows[0].id, "width", e.target.value)}
                          style={{ minHeight: "40px" }}
                        />
                      </label>
                      <label>Height (in)
                        <input
                          type="number"
                          required
                          value={rows[0].height}
                          placeholder="in inches"
                          onChange={(e) => updateRow(rows[0].id, "height", e.target.value)}
                          style={{ minHeight: "40px" }}
                        />
                      </label>
                      <label>Depth (in)
                        <input
                          type="number"
                          required
                          value={rows[0].depth}
                          placeholder="in inches"
                          onChange={(e) => updateRow(rows[0].id, "depth", e.target.value)}
                          style={{ minHeight: "40px" }}
                        />
                      </label>
                      <label>Gauge
                        <input
                          value={rows[0].material_gauge}
                          placeholder="e.g. 18G"
                          onChange={(e) => updateRow(rows[0].id, "material_gauge", e.target.value)}
                          style={{ minHeight: "40px" }}
                        />
                      </label>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.06em" }}>Doors</span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {["2-Door", "4-Door"].map((doorOpt) => (
                          <button
                            key={doorOpt}
                            type="button"
                            onClick={() => updateRow(rows[0].id, "doors", doorOpt)}
                            style={{
                              flex: 1,
                              minHeight: "44px",
                              border: "1px solid var(--border)",
                              borderRadius: "8px",
                              background: rows[0].doors === doorOpt ? "var(--primary-strong)" : "var(--surface-low)",
                              color: rows[0].doors === doorOpt ? "var(--primary-text)" : "var(--text)",
                              fontWeight: "700",
                              cursor: "pointer",
                              fontSize: "13px"
                            }}
                          >
                            {doorOpt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.06em" }}>Weight</span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {["Lightweight", "Heavy"].map((weightOpt) => (
                          <button
                            key={weightOpt}
                            type="button"
                            onClick={() => updateRow(rows[0].id, "weight_class", weightOpt)}
                            style={{
                              flex: 1,
                              minHeight: "44px",
                              border: "1px solid var(--border)",
                              borderRadius: "8px",
                              background: rows[0].weight_class === weightOpt ? "var(--primary-strong)" : "var(--surface-low)",
                              color: rows[0].weight_class === weightOpt ? "var(--primary-text)" : "var(--text)",
                              fontWeight: "700",
                              cursor: "pointer",
                              fontSize: "13px"
                            }}
                          >
                            {weightOpt === "Lightweight" ? "Light" : "Heavy"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {!rows[0].is_custom && (
                    <label>
                      Remarks / Details
                      <input
                        placeholder="Additional specs (e.g. double lockers, special locks)"
                        value={rows[0].remarks}
                        onChange={(event) => updateRow(rows[0].id, "remarks", event.target.value)}
                        style={{ minHeight: "44px" }}
                      />
                    </label>
                  )}
                </div>
              ) : (
                // Batch wardrobe list
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {rows.map((row, index) => (
                    <div
                      key={row.id}
                      style={{
                        padding: "14px",
                        border: "1px solid var(--border)",
                        borderRadius: "12px",
                        background: "var(--surface-low)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: "13px" }}>Almirah #{index + 1}</strong>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="button small secondary"
                            style={{ minHeight: "30px", padding: "4px 8px", fontSize: "11px" }}
                            onClick={() => duplicateRow(row.id)}
                          >
                            Copy
                          </button>
                          <button
                            type="button"
                            className="button small danger"
                            style={{ minHeight: "30px", padding: "4px 8px", fontSize: "11px" }}
                            disabled={rows.length === 1}
                            onClick={() => removeRow(row.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <label>
                        Model SKU
                        <select
                          onChange={(e) => handleModelChange(row.id, e.target.value)}
                          required
                          value={row.is_custom ? "CUSTOM" : row.product_type_id}
                          style={{ minHeight: "38px", fontSize: "12px" }}
                        >
                          {activeProductTypes.map((pt) => (
                            <option key={pt.id} value={pt.id}>
                              {pt.code} ({skuDimensions[pt.code]?.size_label} in)
                            </option>
                          ))}
                          <option value="CUSTOM">Custom Size</option>
                        </select>
                      </label>

                      {row.is_custom && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <label>W (in)
                            <input
                              type="number"
                              value={row.width}
                              placeholder="in"
                              onChange={(e) => updateRow(row.id, "width", e.target.value)}
                              style={{ minHeight: "36px", fontSize: "12px" }}
                            />
                          </label>
                          <label>H (in)
                            <input
                              type="number"
                              value={row.height}
                              placeholder="in"
                              onChange={(e) => updateRow(row.id, "height", e.target.value)}
                              style={{ minHeight: "36px", fontSize: "12px" }}
                            />
                          </label>
                        </div>
                      )}

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <select
                          value={row.doors}
                          onChange={(e) => updateRow(row.id, "doors", e.target.value)}
                          style={{ minHeight: "38px", fontSize: "12px" }}
                        >
                          <option value="2-Door">2-Door</option>
                          <option value="4-Door">4-Door</option>
                        </select>
                        <select
                          value={row.weight_class}
                          onChange={(e) => updateRow(row.id, "weight_class", e.target.value)}
                          style={{ minHeight: "38px", fontSize: "12px" }}
                        >
                          <option value="Lightweight">Lightweight</option>
                          <option value="Heavy">Heavy</option>
                        </select>
                      </div>

                      <input
                        placeholder="Remarks / Description"
                        value={row.remarks}
                        onChange={(e) => updateRow(row.id, "remarks", e.target.value)}
                        style={{ minHeight: "38px", fontSize: "12px" }}
                      />
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addRow}
                    className="button secondary"
                    style={{ minHeight: "44px", width: "100%", borderStyle: "dashed" }}
                  >
                    + Add Another Almirah Row
                  </button>
                </div>
              )}
            </div>

            {/* Step 3: Assign Team Roster */}
            <div style={{ display: "grid", gap: "14px" }}>
              <div style={{ borderBottom: "1px solid var(--border-soft)", paddingBottom: "8px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "750", color: "var(--text-strong)" }}>3. Roster Assignments</h3>
              </div>

              {/* Fabricators */}
              <div>
                <span style={{ display: "block", fontSize: "11px", color: "var(--muted)", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                  Fabricated By (Builders)
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {activeFabricatorsList.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => toggleFabricator(emp.id)}
                      className={`roster-pill ${selectedFabricators.includes(emp.id) ? "active" : ""}`}
                      style={{
                        minHeight: "40px",
                        padding: "6px 14px",
                        fontSize: "12px",
                        borderRadius: "20px",
                      }}
                    >
                      {emp.name}
                    </button>
                  ))}
                  {activeFabricatorsList.length === 0 && (
                    <span className="muted" style={{ fontSize: "12px" }}>No active fabricators in roster.</span>
                  )}
                </div>
              </div>

              {/* Painters */}
              <div>
                <span style={{ display: "block", fontSize: "11px", color: "var(--muted)", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                  Painted By
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {activePaintersList.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => togglePainter(emp.id)}
                      className={`roster-pill ${selectedPainters.includes(emp.id) ? "active" : ""}`}
                      style={{
                        minHeight: "40px",
                        padding: "6px 14px",
                        fontSize: "12px",
                        borderRadius: "20px",
                      }}
                    >
                      {emp.name}
                    </button>
                  ))}
                  {activePaintersList.length === 0 && (
                    <span className="muted" style={{ fontSize: "12px" }}>No active painters in roster.</span>
                  )}
                </div>
              </div>

              {/* Paint Color selection (visible if painters selected) */}
              {selectedPainters.length > 0 && (
                <label style={{ animation: "dropdownFade 0.2s ease" }}>
                  Finish Paint Color
                  <input
                    list="manufacturing-paint-colors"
                    name="paint_color"
                    onChange={updateSharedField}
                    placeholder="Royal Blue / Grey Combo"
                    value={sharedFields.paint_color}
                    style={{ minHeight: "44px" }}
                  />
                  <datalist id="manufacturing-paint-colors">
                    {paintColors.map((color) => (
                      <option key={color.id} value={color.name} />
                    ))}
                  </datalist>
                </label>
              )}
            </div>

            {/* Step 4: Submission & Auto numbering */}
            <div style={{ display: "grid", gap: "14px", borderTop: "1px solid var(--border-soft)", paddingTop: "16px" }}>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="checkbox-label" style={{ minHeight: "36px", margin: 0, textTransform: "none", fontSize: "13px" }}>
                  <input
                    type="checkbox"
                    checked={autoPrint}
                    onChange={(e) => setAutoPrint(e.target.checked)}
                  />
                  Auto-Print thermal label on BLE pair
                </label>
                {autoPrint && (
                  <span style={{ fontSize: "11px", fontWeight: "700", color: printerConnected ? "var(--success)" : "var(--secondary)" }}>
                    {printerConnected ? "Connected" : "Offline"}
                  </span>
                )}
              </div>

              {/* Product Code / Serial ID Preview */}
              <div
                style={{
                  background: "rgba(173, 198, 255, 0.05)",
                  border: "1px dashed rgba(173, 198, 255, 0.25)",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <span style={{ fontSize: "10px", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.06em", fontFamily: "var(--mono)" }}>
                  Serial ID (System Auto-Assigned)
                </span>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <code style={{ fontSize: "13px", color: "var(--primary-strong)" }}>
                    {getProductCodePreview(rows[0])}
                  </code>
                  <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "600" }}>Sequential</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={clearBatch}
                  className="button secondary"
                  style={{ minHeight: "48px", flex: 1 }}
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="button primary"
                  style={{ minHeight: "48px", flex: 2 }}
                >
                  {isSubmitting ? "Saving..." : `Create ${rows.length} Almirah${rows.length === 1 ? "" : "s"}`}
                </button>
              </div>
            </div>

          </form>
        ) : null}

        {/* BATCH CREATION RESULTS */}
        {createdProducts.length ? (
          <section className="workspace-card" style={{ padding: "16px", border: "1px solid var(--success)", background: "var(--success-soft)" }}>
            <h3 style={{ fontSize: "13px", fontWeight: "800", color: "var(--success)", marginBottom: "8px" }}>
              ✓ Almirahs Registered in Stock
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {createdProducts.map((p) => (
                <Link
                  key={p.id}
                  to={`/products/${p.id}`}
                  style={{
                    fontSize: "11px",
                    fontFamily: "var(--mono)",
                    background: "var(--surface)",
                    border: "1px solid var(--border-soft)",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    textDecoration: "none",
                    color: "var(--text-strong)",
                  }}
                >
                  {p.product_code}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {message ? <p className="success-message">{message}</p> : null}
        {error ? <p className="error-message">{error}</p> : null}

        {/* CODE SEARCH PANEL */}
        <div className="workspace-card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "750", marginBottom: "12px" }}>Find Almirah by Serial ID</h3>
          <form onSubmit={handleSearchByCode} style={{ display: "flex", gap: "8px" }}>
            <input
              className="technical-input"
              onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
              placeholder="e.g. P2405601"
              required
              value={searchCode}
              style={{ minHeight: "44px", flex: 1 }}
            />
            <button type="submit" className="button secondary" style={{ minHeight: "44px", padding: "0 16px" }}>
              Find
            </button>
          </form>
        </div>

        {/* RECENTLY MANUFACTURED LIST */}
        <section className="workspace-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "750" }}>Recently Built</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="button secondary"
                aria-expanded={showRecentlyBuilt}
                onClick={() => setShowRecentlyBuilt((current) => !current)}
                style={{ minHeight: "36px", padding: "0 14px", fontSize: "12px" }}
              >
                {showRecentlyBuilt ? "Hide list" : "Show list"}
              </button>
              <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)" }}>Last {products.slice(0, 5).length} items</span>
            </div>
          </div>

          <form onSubmit={applyFilters} style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
            <input
              className="technical-input"
              name="search"
              onChange={(e) => setFilters((current) => ({ ...current, search: e.target.value }))}
              placeholder="Filter by code or paint color"
              value={filters.search}
              style={{ minHeight: "40px", fontSize: "12px", flex: 1 }}
            />
            <button type="submit" className="button secondary" style={{ minHeight: "40px", padding: "0 12px", fontSize: "12px" }}>
              Filter
            </button>
          </form>

          {isLoading ? (
            <p className="empty-state">Loading build records...</p>
          ) : products.length === 0 ? (
            <p className="empty-state">No manufacturing records.</p>
          ) : !showRecentlyBuilt ? (
            <p className="empty-state">List hidden. Tap show list to expand recently built items.</p>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {products.slice(0, 15).map((product) => (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1px solid var(--border-soft)",
                    background: "var(--surface)",
                    textDecoration: "none",
                  }}
                >
                  <div style={{ display: "grid", gap: "4px" }}>
                    <code style={{ fontSize: "12px", fontWeight: "700", color: "var(--primary)" }}>
                      {product.product_code}
                    </code>
                    <span style={{ fontSize: "12px", color: "var(--text-strong)", fontWeight: "600" }}>
                      {product.product_type_name}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                      {product.doors || "2-Door"} • {product.weight_class || "Heavy"} • {product.paint_color || "Unpainted"}
                    </span>
                  </div>
                  <StatusBadge status={product.current_status} className="small">
                    {formatStatus(product.current_status)}
                  </StatusBadge>
                </Link>
              ))}
            </div>
          )}
        </section>

      </div>
    </section>
  );
}

export default ProductsPage;
