function normalizeStatus(status) {
  return String(status ?? "UNKNOWN")
    .trim()
    .toUpperCase();
}

function getTone(status) {
  const normalized = normalizeStatus(status);

  if (["ACTIVE", "IN_STOCK", "PAINTED", "SOLD", "PAID", "COMPLETED", "DELIVERED"].includes(normalized)) {
    return "success";
  }

  if (["PAINTING_PENDING", "PENDING", "REPAINT_REQUIRED", "RESERVED", "MANUFACTURED", "RECEIVED"].includes(normalized)) {
    return "warning";
  }

  if (["DAMAGED", "RETURNED", "UNDER_SERVICE", "DISABLED", "INACTIVE", "CANCELLED"].includes(normalized)) {
    return "danger";
  }

  if (["DISPATCHED", "IN_PROGRESS", "READY_FOR_DELIVERY"].includes(normalized)) {
    return "info";
  }

  return "neutral";
}

function formatFallback(status) {
  return normalizeStatus(status)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function StatusBadge({ children, className = "", status }) {
  const tone = getTone(status ?? children);

  return (
    <span className={`status-badge status-${tone} ${className}`.trim()}>
      {children ?? formatFallback(status)}
    </span>
  );
}

export default StatusBadge;
