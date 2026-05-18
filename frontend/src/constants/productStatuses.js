export const productStatuses = [
  "MANUFACTURED",
  "PAINTING_PENDING",
  "PAINTED",
  "IN_STOCK",
  "RESERVED",
  "DISPATCHED",
  "SOLD",
  "RETURNED",
  "DAMAGED",
  "UNDER_SERVICE",
];

export function formatStatus(status) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
