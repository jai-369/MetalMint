export const repairStatuses = [
  "RECEIVED",
  "IN_PROGRESS",
  "READY_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

export function formatRepairStatus(status) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
