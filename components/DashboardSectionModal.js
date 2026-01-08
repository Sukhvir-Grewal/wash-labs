import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiActivity,
  FiBarChart2,
  FiDollarSign,
  FiGrid,
  FiImage,
  FiTrendingUp,
  FiX,
} from "react-icons/fi";
import RevenueChart from "./RevenueChart";
import ExpensesCard from "./ExpensesCard";
import ProfitsCard from "./ProfitsCard";
import PerformanceEfficiencyCard from "./PerformanceEfficiencyCard";
import StatusCalendar from "./StatusCalendar";
import GalleryManager from "./GalleryManager";
import {
  normalizeBookingStatus,
  isCompletedBookingStatus,
  resolveBookingRevenue,
} from "../lib/bookingUtils";

const iconMap = {
  services: FiGrid,
  gallery: FiImage,
  revenue: FiTrendingUp,
  expenses: FiDollarSign,
  profit: FiBarChart2,
  pe: FiActivity,
};

const monthFormatter = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" });
const expenseCategoryLabels = {
  "one-time": "Equipment",
  chemicals: "Chemicals",
  labor: "Labor",
  travel: "Travel",
  utilities: "Utilities",
  marketing: "Marketing",
  other: "Other",
};

const VEHICLE_PRICE_OPTIONS = [
  { key: "sedan", label: "Sedan", adjustment: 0 },
  { key: "suv", label: "SUV", adjustment: 20 },
  { key: "truck", label: "Truck", adjustment: 40 },
];

export default function DashboardSectionModal({
  section,
  config,
  onClose,
  bookings = [],
  expenses = [],
  metrics = {},
}) {
  const active = section ? config[section] : null;
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState("");
  const [services, setServices] = useState([]);
  const [serviceVehicleSelection, setServiceVehicleSelection] = useState({});
  const [revenueRange, setRevenueRange] = useState("6m");
  const [revenueStatusFilter, setRevenueStatusFilter] = useState("complete");
  const [revenueChartType, setRevenueChartType] = useState("line");
  const fullScreenSections = useMemo(
    () => new Set(["services", "gallery", "revenue", "expenses", "profit", "pe"]),
    [],
  );
  const isFullScreenLayout = fullScreenSections.has(section);

  useEffect(() => {
    if (section !== "services" || services.length || servicesLoading) {
      return;
    }
    (async () => {
      try {
        setServicesLoading(true);
        const resp = await fetch("/api/services");
        const data = await resp.json();
        if (resp.ok && Array.isArray(data.services)) {
          setServices(data.services);
          setServicesError("");
        } else {
          throw new Error(data?.error || "Unable to load services");
        }
      } catch (error) {
        setServicesError(error?.message || "Unable to load services");
      } finally {
        setServicesLoading(false);
      }
    })();
  }, [section, services.length, servicesLoading]);

  const normalizedBookings = useMemo(
    () =>
      bookings.map((booking) => ({
        ...booking,
        __normalizedStatus: normalizeBookingStatus(booking.status),
        __resolvedAmount: resolveBookingRevenue(booking),
      })),
    [bookings],
  );

  const groupBookingsByMonth = (list = []) => {
    const map = new Map();
    list.forEach((booking) => {
      if (!booking?.date) {
        return;
      }
      const key = booking.date.slice(0, 7);
      if (!key) {
        return;
      }
      const amount = Number(booking.__resolvedAmount ?? resolveBookingRevenue(booking) ?? 0) || 0;
      map.set(key, (map.get(key) || 0) + amount);
    });
    return Array.from(map.entries())
      .map(([key, total]) => ({
        key,
        total,
        label: monthFormatter.format(new Date(`${key}-01`)),
      }))
      .sort((a, b) => (a.key < b.key ? 1 : -1));
  };

  const filteredRevenueBookings = useMemo(() => {
    const target = normalizeBookingStatus(revenueStatusFilter);
    const statusFiltered = normalizedBookings.filter((booking) => {
      if (target === "all") {
        return true;
      }
      if (target === "complete") {
        return isCompletedBookingStatus(booking.__normalizedStatus);
      }
      return booking.__normalizedStatus === target;
    });
    if (revenueRange === "all") {
      return statusFiltered;
    }
    const monthsLimit = { "3m": 3, "6m": 6, "12m": 12 }[revenueRange];
    if (!monthsLimit) {
      return statusFiltered;
    }
    const now = new Date();
    return statusFiltered.filter((booking) => {
      if (!booking.date) {
        return false;
      }
      const bookingDate = new Date(`${booking.date}T00:00:00`);
      if (Number.isNaN(bookingDate.getTime())) {
        return false;
      }
      const diffMonths =
        (now.getFullYear() - bookingDate.getFullYear()) * 12 + now.getMonth() - bookingDate.getMonth();
      return diffMonths <= monthsLimit - 1;
    });
  }, [normalizedBookings, revenueRange, revenueStatusFilter]);

  const filteredMonthlyRevenue = useMemo(
    () => groupBookingsByMonth(filteredRevenueBookings),
    [filteredRevenueBookings],
  );

  const rangeServiceBreakdown = useMemo(() => {
    const map = new Map();
    filteredRevenueBookings.forEach((booking) => {
      const key = booking.service || "Unknown";
      const amount = Number(
        booking.__resolvedAmount ?? resolveBookingRevenue(booking) ?? 0,
      ) || 0;
      map.set(key, {
        count: (map.get(key)?.count || 0) + 1,
        revenue: (map.get(key)?.revenue || 0) + amount,
      });
    });
    return Array.from(map.entries())
      .map(([serviceName, stats]) => ({ serviceName, ...stats }))
      .sort((a, b) => b.revenue - a.revenue || b.count - a.count);
  }, [filteredRevenueBookings]);

  const expenseBreakdown = useMemo(() => {
    const map = new Map();
    expenses.forEach((item) => {
      const key = (item.category || "other").toLowerCase();
      const existing = map.get(key) || { total: 0, items: [] };
      existing.total += Number(item.amount || 0) || 0;
      existing.items.push(item);
      map.set(key, existing);
    });
    return Array.from(map.entries())
      .map(([category, details]) => ({ category, ...details }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0),
    [expenses],
  );

  if (!active) {
    return null;
  }

  const Icon = iconMap[section] || FiGrid;

  const renderServices = () => (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/95 p-6 text-slate-900 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.25)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold" style={{ color: "#0f172a" }}>Service Catalog</h3>
          <p className="text-sm" style={{ color: "#1f2937" }}>Quick glance at packages, pricing, and timing.</p>
        </div>
        <Link
          href="/admin-services"
          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-sky-200 hover:bg-slate-50"
        >
          Manage Services
        </Link>
      </div>
      {servicesLoading ? (
        <div className="py-12 text-center text-sm" style={{ color: "#1f2937" }}>Loading services...</div>
      ) : servicesError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm" style={{ color: "#9f1239" }}>
          {servicesError}
        </div>
      ) : (
        <div className="space-y-4">
          {services.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm shadow-sm" style={{ color: "#1f2937" }}>
              No services configured yet. Add one from the services dashboard.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {services.map((service, index) => {
                const durationLabel = service.durationMinutes
                  ? `${service.durationMinutes} min`
                  : service.duration
                  ? `${service.duration} hr`
                  : "--";
                const addOns = Array.isArray(service.addOns) ? service.addOns : [];
                const coerceNumber = (value) => {
                  if (typeof value === "number") {
                    return Number.isFinite(value) ? value : null;
                  }
                  const numeric = Number(value);
                  return Number.isFinite(numeric) ? numeric : null;
                };
                const basePriceValue = coerceNumber(service.basePrice);
                const revivePriceValue = coerceNumber(service.revivePrice);
                const serviceKey =
                  service.id || service._id?.toString?.() || `${service.title || "service"}-${index}`;
                const selectedVehicleKey =
                  serviceVehicleSelection[serviceKey] || VEHICLE_PRICE_OPTIONS[0].key;
                const selectedVehicleOption =
                  VEHICLE_PRICE_OPTIONS.find((option) => option.key === selectedVehicleKey) ||
                  VEHICLE_PRICE_OPTIONS[0];
                const standardPriceValue =
                  basePriceValue != null
                    ? basePriceValue + selectedVehicleOption.adjustment
                    : null;
                const revivePriceValueAdjusted =
                  revivePriceValue != null
                    ? revivePriceValue + selectedVehicleOption.adjustment
                    : null;
                const formatCurrency = (value) =>
                  value != null ? `$${value.toFixed(2)}` : "--";

                return (
                  <div
                    key={service._id || service.title || index}
                    className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_48px_-36px_rgba(15,23,42,0.3)] transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_30px_60px_-40px_rgba(56,189,248,0.35)]"
                  >
                    <div className="relative flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                          Service
                        </div>
                        <h4 className="text-xl font-semibold" style={{ color: "#111827" }}>{service.title}</h4>
                        {service.description && (
                          <p className="text-sm line-clamp-3" style={{ color: "#1f2937" }}>{service.description}</p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {VEHICLE_PRICE_OPTIONS.map((option) => {
                            const isActive = option.key === selectedVehicleOption.key;
                            const optionPriceLabel =
                              basePriceValue != null
                                ? formatCurrency(basePriceValue + option.adjustment)
                                : "--";
                            const baseClasses =
                              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition";
                            const activeClasses =
                              "border-sky-400 bg-sky-50 text-sky-900 shadow-[0_12px_24px_-18px_rgba(56,189,248,0.5)]";
                            const inactiveClasses =
                              "border-slate-200 bg-slate-100 text-slate-600 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700";
                            return (
                              <button
                                key={`${serviceKey}-${option.key}`}
                                type="button"
                                onClick={() =>
                                  setServiceVehicleSelection((prev) => ({
                                    ...prev,
                                    [serviceKey]: option.key,
                                  }))
                                }
                                className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
                                aria-pressed={isActive}
                              >
                                <span>{option.label}</span>
                                <span className="text-[11px] font-normal text-slate-500">
                                  {optionPriceLabel}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "#475569" }}>Base</span>
                        <div className="text-3xl font-semibold text-slate-900">
                          {formatCurrency(standardPriceValue)}
                        </div>
                        {revivePriceValueAdjusted != null && (
                          <div className="mt-1 text-sm font-semibold text-sky-600">
                            Revive {formatCurrency(revivePriceValueAdjusted)}
                          </div>
                        )}
                        <div className="mt-2 inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {durationLabel}
                        </div>
                      </div>
                    </div>
                    <div className="relative mt-5 space-y-4 text-sm" style={{ color: "#1f2937" }}>
                      <div className="flex gap-4 text-xs" style={{ color: "#475569" }}>
                        <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <span className="block text-[11px] uppercase tracking-[0.18em]" style={{ color: "#475569" }}>Source</span>
                          <span className="mt-1 block font-semibold" style={{ color: "#0f172a" }}>{service.tier || "Core Package"}</span>
                        </div>
                        <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <span className="block text-[11px] uppercase tracking-[0.18em]" style={{ color: "#475569" }}>Status</span>
                          <span className="mt-1 block font-semibold" style={{ color: "#047857" }}>Active</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "#475569" }}>Add-ons</span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {addOns.length ? (
                            addOns.map((addon) => (
                              <span
                                key={`${service._id || service.title}-${addon.name}`}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-700"
                              >
                                <span style={{ color: "#0f172a" }}>{addon.name}</span>
                                <span style={{ color: "#475569" }}>{formatCurrency(coerceNumber(addon.price))}</span>
                              </span>
                            ))
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-500">
                              No add-ons configured
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderRevenue = () => {
    const accent = "#2563eb";
    const rangeLabels = { "3m": "Last 3 months", "6m": "Last 6 months", "12m": "Last 12 months", all: "All-time" };
    const rangeLabel = rangeLabels[revenueRange] || "All-time";
    const statusLabel = revenueStatusFilter === "complete" ? "Completed & paid bookings" : "All booking statuses";

    const formatCurrency = (value, decimals = 0) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value || 0);

    const formatCurrencyAuto = (value) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: value < 1000 ? 2 : 0,
        maximumFractionDigits: value < 1000 ? 2 : 0,
      }).format(value || 0);

    const revenueSum = filteredMonthlyRevenue.reduce((sum, row) => sum + row.total, 0);
    const avgMonthlyRevenue = filteredMonthlyRevenue.length ? revenueSum / filteredMonthlyRevenue.length : 0;
    const latestMonth = filteredMonthlyRevenue[0] || null;
    const prevMonth = filteredMonthlyRevenue[1] || null;
    let monthGrowthLabel = "—";
    let monthGrowthColor = "#475569";
    if (latestMonth && prevMonth) {
      if (prevMonth.total === 0) {
        monthGrowthLabel = "New activity";
        monthGrowthColor = accent;
      } else {
        const growth = (latestMonth.total - prevMonth.total) / prevMonth.total;
        monthGrowthLabel = `${growth >= 0 ? "+" : ""}${(growth * 100).toFixed(1)}% vs prev.`;
        monthGrowthColor = growth >= 0 ? "#16a34a" : "#dc2626";
      }
    }

    const topRevenueMonth = filteredMonthlyRevenue.reduce((best, row) => (row.total > (best?.total ?? -Infinity) ? row : best), null);
    const topMonthLabel = topRevenueMonth ? monthFormatter.format(new Date(`${topRevenueMonth.key}-01`)) : "—";
    const topMonthValue = topRevenueMonth ? formatCurrencyAuto(topRevenueMonth.total) : "—";

    const rangeBookingsCount = filteredRevenueBookings.length;
    const avgTicketValue = rangeBookingsCount ? revenueSum / rangeBookingsCount : 0;

    const topService = rangeServiceBreakdown[0] || null;
    const topServiceName = topService ? topService.serviceName : "—";
    const topServiceRevenueLabel = topService ? formatCurrencyAuto(topService.revenue) : "—";
    const topServiceCountLabel = topService ? `${topService.count} booking${topService.count === 1 ? "" : "s"}` : "Awaiting bookings";

    const monthsObserved = filteredMonthlyRevenue.length;
    const monthsDescriptor = monthsObserved ? `${monthsObserved} month${monthsObserved === 1 ? "" : "s"}` : "No activity yet";
    const hasRevenueData = filteredMonthlyRevenue.length > 0;

    const summaryCards = [
      {
        label: "Revenue collected",
        primary: formatCurrency(revenueSum, 0),
        secondary: monthGrowthLabel,
        secondaryColor: monthGrowthColor,
        caption: latestMonth ? `Latest: ${latestMonth.label}` : "Awaiting first month",
      },
      {
        label: "Avg monthly revenue",
        primary: formatCurrency(avgMonthlyRevenue, 0),
        secondary: monthsDescriptor,
        secondaryColor: "#475569",
        caption: `Scope: ${rangeLabel.toLowerCase()}`,
      },
      {
        label: "Avg ticket value",
        primary: formatCurrency(avgTicketValue, avgTicketValue < 1000 ? 2 : 0),
        secondary: rangeBookingsCount ? `${rangeBookingsCount} booking${rangeBookingsCount === 1 ? "" : "s"}` : "No bookings yet",
        secondaryColor: "#475569",
        caption: topService ? `Top: ${topServiceName}` : "Awaiting bookings",
      },
      {
        label: "Top performer",
        primary: topServiceName,
        secondary: topServiceRevenueLabel,
        secondaryColor: accent,
        caption: topServiceCountLabel,
      },
    ];

    const controlChip = (active) =>
      `rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-blue-600 text-white border-blue-600 shadow-[0_8px_18px_rgba(37,99,235,0.22)]"
          : "bg-white text-blue-600 border-blue-100 hover:border-blue-200"
      }`;

    const selectClass =
      "sm:hidden w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm font-semibold text-blue-700";

    const topServices = rangeServiceBreakdown.slice(0, 6);
    const maxServiceRevenue = topServices.reduce((max, entry) => Math.max(max, entry.revenue || 0), 0);
    const monthlyRows = filteredMonthlyRevenue.slice(0, 8);

    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.18)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h3 className="text-2xl font-semibold" style={{ color: "#0f172a" }}>
                Revenue Performance
              </h3>
              <p className="text-sm leading-6" style={{ color: "#2563eb" }}>
                See headline figures first, then drill into trends, service mix, and monthly pacing.
              </p>
            </div>
            <div className="w-full max-w-xs sm:hidden">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#475569" }}>
                Range
              </label>
              <select
                className={selectClass}
                value={revenueRange}
                onChange={(event) => setRevenueRange(event.target.value)}
              >
                <option value="3m">Last 3 months</option>
                <option value="6m">Last 6 months</option>
                <option value="12m">Last 12 months</option>
                <option value="all">All-time</option>
              </select>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#475569" }}>
                  {card.label}
                </p>
                <div className="mt-2 text-2xl font-semibold" style={{ color: "#0f172a" }}>
                  {card.primary}
                </div>
                <p className="mt-1 text-xs font-semibold" style={{ color: card.secondaryColor }}>
                  {card.secondary}
                </p>
                <p className="mt-1 text-xs" style={{ color: "#64748b" }}>
                  {card.caption}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="hidden flex-wrap items-center justify-between gap-3 sm:flex">
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "3m", label: "3M" },
                  { value: "6m", label: "6M" },
                  { value: "12m", label: "12M" },
                  { value: "all", label: "All" },
                ].map((entry) => (
                  <button
                    key={entry.value}
                    type="button"
                    onClick={() => setRevenueRange(entry.value)}
                    className={controlChip(revenueRange === entry.value)}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { value: "complete", label: "Completed" },
                  { value: "all", label: "All status" },
                ].map((entry) => (
                  <button
                    key={entry.value}
                    type="button"
                    onClick={() => setRevenueStatusFilter(entry.value)}
                    className={controlChip(revenueStatusFilter === entry.value)}
                  >
                    {entry.label}
                  </button>
                ))}
                <span className="ml-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "#475569" }}>
                  Chart
                </span>
                {[
                  { value: "line", label: "Line" },
                  { value: "area", label: "Area" },
                  { value: "bar", label: "Bar" },
                  { value: "doughnut", label: "Donut" },
                ].map((entry) => (
                  <button
                    key={entry.value}
                    type="button"
                    onClick={() => setRevenueChartType(entry.value)}
                    className={controlChip(revenueChartType === entry.value)}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:hidden">
              <label className="mt-4 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#475569" }}>
                Status
              </label>
              <select
                className={`${selectClass} mt-1`}
                value={revenueStatusFilter}
                onChange={(event) => setRevenueStatusFilter(event.target.value)}
              >
                <option value="complete">Completed</option>
                <option value="all">All status</option>
              </select>
              <label className="mt-4 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#475569" }}>
                Chart type
              </label>
              <select
                className={`${selectClass} mt-1`}
                value={revenueChartType}
                onChange={(event) => setRevenueChartType(event.target.value)}
              >
                <option value="line">Line</option>
                <option value="area">Area</option>
                <option value="bar">Bar</option>
                <option value="doughnut">Donut</option>
              </select>
            </div>

            <div className="mt-6 h-[320px] sm:h-[320px] lg:h-[360px]">
              <RevenueChart
                bookings={filteredRevenueBookings}
                status="all"
                datasetLabel={`${statusLabel} (${rangeLabel.toLowerCase()})`}
                borderColor="rgb(37, 99, 235)"
                backgroundColor={revenueChartType === "area" ? "rgba(37, 99, 235, 0.16)" : "rgba(37, 99, 235, 0.12)"}
                pointBackgroundColor="rgb(37, 99, 235)"
                accentColor={accent}
                chartType={revenueChartType}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
              <h3 className="text-lg font-semibold" style={{ color: "#0f172a" }}>
                Top services
              </h3>
              <p className="text-sm" style={{ color: "#2563eb" }}>
                Ranked by revenue share from {statusLabel.toLowerCase()} within {rangeLabel.toLowerCase()}.
              </p>
              {topServices.length ? (
                <ul className="mt-5 space-y-4">
                  {topServices.map((service) => {
                    const share = revenueSum ? (service.revenue / revenueSum) * 100 : 0;
                    const width = maxServiceRevenue ? Math.max((service.revenue / maxServiceRevenue) * 100, 4) : 0;
                    return (
                      <li key={service.serviceName} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between text-sm font-semibold" style={{ color: "#0f172a" }}>
                          <span>{service.serviceName}</span>
                          <span>{formatCurrencyAuto(service.revenue)}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs" style={{ color: "#475569" }}>
                          <span>{service.count} booking{service.count === 1 ? "" : "s"}</span>
                          <span>{share ? `${share.toFixed(0)}% revenue` : "—"}</span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${width}%`, backgroundColor: accent }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm" style={{ color: "#475569" }}>
                  No booking data available for this range.
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
              <h3 className="text-lg font-semibold" style={{ color: "#0f172a" }}>
                Monthly pacing
              </h3>
              <p className="text-sm" style={{ color: "#2563eb" }}>
                {statusLabel} grouped by month across {rangeLabel.toLowerCase()}.
              </p>
              {hasRevenueData ? (
                <ul className="mt-5 space-y-3">
                  {monthlyRows.map((row) => {
                    const isTop = topRevenueMonth && row.key === topRevenueMonth.key;
                    return (
                      <li key={row.key} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: isTop ? accent : "#0f172a" }}>
                            {row.label}
                          </p>
                          <p className="text-xs" style={{ color: "#64748b" }}>
                            {isTop ? "Highest month" : "In range"}
                          </p>
                        </div>
                        <span className="text-sm font-semibold" style={{ color: "#0f172a" }}>
                          {formatCurrencyAuto(row.total)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm" style={{ color: "#475569" }}>
                  No revenue recorded yet for this selection.
                </div>
              )}
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium" style={{ color: "#475569" }}>
                Top month: <span style={{ color: "#0f172a" }}>{topMonthLabel}</span> · {topMonthValue}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderExpenses = () => {
    const formatCurrency = (value, decimals = 0) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value || 0);

    const categoryLabel = (key) => expenseCategoryLabels[key?.toLowerCase?.()] || key?.replace(/-/g, " ") || "Other";

    return (
      <div className="space-y-8">
        <ExpensesCard expenses={expenses} />
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.18)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-semibold" style={{ color: "#0f172a" }}>Category Ledger</h3>
              <p className="text-sm" style={{ color: "#475569" }}>
                Drill into every purchase to audit spend, validate vendor invoices, and spot cost spikes early.
              </p>
            </div>
            <div
              className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide"
              style={{ color: "#be123c" }}
            >
              {expenses.length} line item{expenses.length === 1 ? "" : "s"}
            </div>
          </div>
          {expenseBreakdown.length ? (
            <div className="mt-6 space-y-5">
              {expenseBreakdown.map((entry) => (
                <div key={entry.category} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-lg font-semibold" style={{ color: "#0f172a" }}>
                        {categoryLabel(entry.category)}
                      </h4>
                      <p className="text-xs" style={{ color: "#64748b" }}>
                        {entry.items.length} expense{entry.items.length === 1 ? "" : "s"} · {formatCurrency(entry.total, 0)}
                      </p>
                    </div>
                    <div
                      className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "#475569" }}
                    >
                      {totalExpenses ? ((entry.total / totalExpenses) * 100).toFixed(1) : "0.0"}% of spend
                    </div>
                  </div>
                  <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Date</th>
                          <th className="px-4 py-3 text-left font-semibold">Item</th>
                          <th className="px-4 py-3 text-left font-semibold">Supplier</th>
                          <th className="px-4 py-3 text-right font-semibold">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {entry.items.slice(0, 10).map((item) => (
                          <tr
                            key={item._id || `${item.date}-${item.productName}`}
                            className="hover:bg-slate-50"
                          >
                            <td className="px-4 py-3" style={{ color: "#475569" }}>
                              {formatDate(item.date)}
                            </td>
                            <td className="px-4 py-3" style={{ color: "#0f172a" }}>
                              {item.productName || "—"}
                            </td>
                            <td className="px-4 py-3" style={{ color: "#475569" }}>
                              {item.supplier || "—"}
                            </td>
                            <td className="px-4 py-3 text-right" style={{ color: "#ef4444" }}>
                              {formatCurrency(Number(item.amount) || 0, 2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="mt-8 rounded-2xl border border-dashed border-rose-200 bg-rose-50 px-6 py-10 text-center text-sm"
              style={{ color: "#be123c" }}
            >
              No expenses have been recorded yet.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderProfit = () => {
    const totalRevenue = Number(metrics.totalRevenue || 0);
    const netProfit = totalRevenue - totalExpenses;
    const completedCount = bookings.filter((booking) => booking.status === "complete").length;
    const avgTicket = completedCount ? totalRevenue / completedCount : 0;
    const profitMargin = totalRevenue ? (netProfit / totalRevenue) * 100 : 0;

    const formatCurrency = (value, fractionDigits = 0) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(value || 0);

    const quickStats = [
      {
        title: "Lifetime Net Profit",
        value: formatCurrency(netProfit, 0),
        subtitle: `Margin ${profitMargin.toFixed(1)}%`,
        accent: netProfit >= 0 ? "#16a34a" : "#dc2626",
      },
      {
        title: "Revenue vs Expenses",
        value: formatCurrency(totalRevenue, 0),
        subtitle: `Expenses ${formatCurrency(totalExpenses, 0)}`,
        accent: "#2563eb",
      },
      {
        title: "Avg. Ticket Value",
        value: formatCurrency(avgTicket, avgTicket < 100 ? 2 : 0),
        subtitle: `${completedCount} completed booking${completedCount === 1 ? "" : "s"}`,
        accent: "#0ea5e9",
      },
      {
        title: "Pending Pipeline",
        value: `${metrics.pendingCount || 0}`,
        subtitle: "Bookings awaiting completion",
        accent: "#f97316",
      },
    ];

    return (
      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickStats.map((stat) => (
            <div
              key={stat.title}
              className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#047857" }}>
                {stat.title}
              </p>
              <p className="mt-2 text-2xl font-semibold" style={{ color: "#064e3b" }}>
                {stat.value}
              </p>
              <p className="mt-1 text-xs font-semibold" style={{ color: stat.accent }}>
                {stat.subtitle}
              </p>
            </div>
          ))}
        </div>
        <ProfitsCard bookings={bookings} expenses={expenses} />
      </div>
    );
  };

  const renderPe = () => (
    <div className="space-y-8">
      <PerformanceEfficiencyCard bookings={bookings} expenses={expenses} metrics={metrics} />
      <div className="rounded-3xl border border-teal-100 bg-white/95 p-6 shadow-[0_24px_60px_-32px_rgba(13,148,136,0.16)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold" style={{ color: "#0f766e" }}>
              Scheduling Outlook
            </h3>
            <p className="text-sm" style={{ color: "#0f172a" }}>
              Heatmap of upcoming commitments to spot bottlenecks, padding, or overbooked days.
            </p>
          </div>
          <div className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-4 py-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "#0f766e" }}>
            {metrics.pendingCount || 0} pending · {metrics.completedCount || 0} completed
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-teal-100 bg-white p-4">
          <StatusCalendar bookings={bookings} />
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (section) {
      case "services":
        return renderServices();
      case "gallery":
        return <GalleryManager />;
      case "revenue":
        return renderRevenue();
      case "expenses":
        return renderExpenses();
      case "profit":
        return renderProfit();
      case "pe":
        return renderPe();
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key={section}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={
          isFullScreenLayout
            ? "fixed inset-0 z-50 flex"
            : "fixed inset-0 z-50 flex items-center justify-center"
        }
        style={{ backgroundColor: "rgba(15, 23, 42, 0.35)", backdropFilter: "blur(24px)" }}
      >
        <motion.div
          initial={isFullScreenLayout ? { opacity: 0, y: 40 } : { opacity: 0, scale: 0.94, y: 30 }}
          animate={isFullScreenLayout ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
          exit={isFullScreenLayout ? { opacity: 0, y: 20 } : { opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className={
            isFullScreenLayout
              ? "relative flex h-full w-full flex-col overflow-y-auto bg-white px-6 py-6 text-slate-900 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] sm:px-10 sm:py-8"
              : "relative max-h-[90vh] w-[94vw] max-w-5xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-8 text-slate-900 shadow-[0_40px_70px_-40px_rgba(15,23,42,0.4)]"
          }
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 shadow transition hover:bg-slate-200"
            aria-label="Close section"
          >
            <FiX size={20} />
          </button>
          <div className="flex items-center gap-3 pb-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100" style={{ color: "#1f2937" }}>
              <Icon size={22} />
            </span>
            <div>
              <h2 className="text-2xl font-semibold" style={{ color: "#0f172a" }}>{active.label}</h2>
              <p className="text-sm" style={{ color: "#1f2937" }}>{active.hint}</p>
            </div>
          </div>
          <div className="space-y-8 pb-4">
            {renderContent()}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function InsightPill({ label, value, accent }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${accent} px-5 py-4 text-slate-50 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.9)]`}
    >
      <div className="text-xs uppercase tracking-wide text-slate-100/70">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-50">{value}</div>
    </div>
  );
}

function formatDate(input) {
  if (!input) return "--";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}
