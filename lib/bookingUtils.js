export const normalizeBookingStatus = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const isCompletedBookingStatus = (status) => {
  const normalized = normalizeBookingStatus(status);
  return normalized === "complete" || normalized === "completed" || normalized === "paid" || normalized === "settled";
};

export const coerceMoneyValue = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "").trim();
    if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") {
      return null;
    }
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const resolveBookingRevenue = (booking = {}) => {
  if (!booking) return 0;
  const primaryFields = [
    "amount",
    "total",
    "totalAmount",
    "totalPrice",
    "finalAmount",
    "grandTotal",
    "due",
    "invoiceTotal",
  ];

  for (const field of primaryFields) {
    if (field in booking) {
      const parsed = coerceMoneyValue(booking[field]);
      if (parsed != null) return parsed;
    }
  }

  let derivedTotal = 0;
  let hasDerived = false;

  const base = coerceMoneyValue(booking.baseSum);
  if (base != null) {
    derivedTotal += base;
    hasDerived = true;
  }

  const travel = coerceMoneyValue(booking.travelExpense);
  if (travel != null) {
    derivedTotal += travel;
    hasDerived = true;
  }

  const tip = coerceMoneyValue(booking.tip);
  if (tip != null) {
    derivedTotal += tip;
    hasDerived = true;
  }

  const discount = coerceMoneyValue(booking.discount);
  if (discount != null) {
    derivedTotal -= discount;
    hasDerived = true;
  }

  if (hasDerived && Number.isFinite(derivedTotal) && derivedTotal !== 0) {
    return derivedTotal;
  }

  if (Array.isArray(booking.perCarTotals)) {
    const perCarSum = booking.perCarTotals.reduce((sum, entry) => {
      const parsed = coerceMoneyValue(entry);
      return sum + (parsed != null ? parsed : 0);
    }, 0);
    if (perCarSum) return perCarSum;
  }

  if (Array.isArray(booking.vehicles)) {
    const vehicleSum = booking.vehicles.reduce((sum, vehicle) => {
      const parsed = coerceMoneyValue(vehicle?.lineTotal);
      return sum + (parsed != null ? parsed : 0);
    }, 0);
    if (vehicleSum) return vehicleSum;
  }

  return 0;
};
