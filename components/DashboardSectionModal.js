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
  const [revenueRange, setRevenueRange] = useState("6m");
  const [revenueStatusFilter, setRevenueStatusFilter] = useState("complete");
  const [revenueChartType, setRevenueChartType] = useState("line");
  const fullScreenSections = useMemo(
    () => new Set(["services", "gallery", "revenue", "expenses", "profit", "pe"]),
    []
  );
  const isFullScreenLayout = fullScreenSections.has(section);

  useEffect(() => {
    if (section !== "services" || services.length || servicesLoading) return;
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
      } catch (err) {
        setServicesError(err?.message || "Unable to load services");
      } finally {
        setServicesLoading(false);
      }
    })();
  }, [section, services.length, servicesLoading]);

  const monthlyRevenue = useMemo(() => {
    const map = new Map();
    bookings
      .filter((b) => b.status === "complete" && b.date)
      .forEach((booking) => {
        const key = booking.date.slice(0, 7);
        const amount = Number(booking.amount || 0) || 0;
        map.set(key, (map.get(key) || 0) + amount);
      });
    const rows = Array.from(map.entries())
      .map(([key, total]) => ({ key, total, label: monthFormatter.format(new Date(`${key}-01`)) }))
      .sort((a, b) => (a.key < b.key ? 1 : -1));
    return rows;
  }, [bookings]);

  const filteredMonthlyRevenue = useMemo(() => {
    if (!monthlyRevenue.length) {
      return [];
    }
    if (revenueRange === "all") {
      return monthlyRevenue;
    }
    const monthsLimit = { "3m": 3, "6m": 6, "12m": 12 }[revenueRange];
    if (!monthsLimit) {
      return monthlyRevenue;
    }
    const now = new Date();
    return monthlyRevenue.filter((row) => {
      const parts = row.key?.split("-") || [];
      if (parts.length !== 2) {
        return false;
      }
      const monthDate = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
      if (Number.isNaN(monthDate.getTime())) {
        return false;
      }
      const diffMonths = (now.getFullYear() - monthDate.getFullYear()) * 12 + now.getMonth() - monthDate.getMonth();
      return diffMonths <= monthsLimit - 1;
    });
  }, [monthlyRevenue, revenueRange]);

  const serviceBreakdown = useMemo(() => {
    const map = new Map();
    bookings.forEach((booking) => {
      const key = booking.service || "Unknown";
      map.set(key, {
        count: (map.get(key)?.count || 0) + 1,
        revenue: (map.get(key)?.revenue || 0) + (Number(booking.amount || 0) || 0),
      });
    });
    return Array.from(map.entries())
      .map(([serviceName, stats]) => ({ serviceName, ...stats }))
      .sort((a, b) => b.revenue - a.revenue || b.count - a.count);
  }, [bookings]);

  const filteredRevenueBookings = useMemo(() => {
    const statusFiltered = revenueStatusFilter === "all" ? bookings : bookings.filter((booking) => booking.status === revenueStatusFilter);
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
      const diffMonths = (now.getFullYear() - bookingDate.getFullYear()) * 12 + now.getMonth() - bookingDate.getMonth();
      return diffMonths <= monthsLimit - 1;
    });
  }, [bookings, revenueRange, revenueStatusFilter]);

  const rangeServiceBreakdown = useMemo(() => {
    const map = new Map();
    filteredRevenueBookings.forEach((booking) => {
      const key = booking.service || "Unknown";
      map.set(key, {
        count: (map.get(key)?.count || 0) + 1,
        revenue: (map.get(key)?.revenue || 0) + (Number(booking.amount || 0) || 0),
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
    [expenses]
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
              {services.map((service) => {
                const durationLabel = service.durationMinutes
                  ? `${service.durationMinutes} min`
                  : service.duration
                  ? `${service.duration} hr`
                  : "--";
                const addOns = Array.isArray(service.addOns) ? service.addOns : [];
                return (
                  <div
                    key={service._id || service.title}
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
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "#475569" }}>Base</span>
                        <div className="text-3xl font-semibold text-slate-900">
                          ${Number(service.basePrice || 0).toFixed(2)}
                        </div>
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
                                <span style={{ color: "#475569" }}>${Number(addon.price || 0).toFixed(2)}</span>
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
    const accentSoft = "rgba(37, 99, 235, 0.18)";
    const rangeLabels = { "3m": "Last 3 months", "6m": "Last 6 months", "12m": "Last 12 months", all: "All-time" };
    const rangeLabel = rangeLabels[revenueRange] || "All-time";
    const statusLabel = revenueStatusFilter === "complete" ? "Completed bookings" : "All booking statuses";

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

    const rangeButtonStyle = (active) =>
      active
        ? {
            backgroundColor: accent,
            borderColor: accent,
            color: "#ffffff",
            boxShadow: `0 10px 24px ${accentSoft}`,
          }
        : {
            backgroundColor: "#ffffff",
            borderColor: accentSoft,
            color: accent,
          };

    return (
      <div className="space-y-8">
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.18)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h3 className="text-2xl font-semibold" style={{ color: "#0f172a" }}>
                Revenue Performance
              </h3>
              <p className="text-sm leading-6" style={{ color: "#2563eb" }}>
                Track cash flow trends, compare booking momentum, and surface top-performing services at a glance.
              </p>
            </div>
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
                  className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition"
                  style={rangeButtonStyle(revenueRange === entry.value)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {[
              { value: "complete", label: "Completed" },
              { value: "all", label: "All Statuses" },
            ].map((entry) => (
              <button
                key={entry.value}
                type="button"
                onClick={() => setRevenueStatusFilter(entry.value)}
                className="rounded-full border px-4 py-1.5 text-xs font-semibold transition"
                style={rangeButtonStyle(revenueStatusFilter === entry.value)}
              >
                {entry.label}
              </button>
            ))}
            <span className="ml-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "#475569" }}>
              Chart
            </span>
            <div className="flex flex-wrap gap-2">
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
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                  style={rangeButtonStyle(revenueChartType === entry.value)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#475569" }}>
              Revenue ({rangeLabel})
            </p>
            <h4 className="mt-2 text-2xl font-semibold" style={{ color: "#0f172a" }}>
              {formatCurrency(revenueSum, 0)}
            </h4>
            <p className="mt-1 text-xs font-medium" style={{ color: monthGrowthColor }}>
              {monthGrowthLabel}
            </p>
            <p className="mt-2 text-xs" style={{ color: "#64748b" }}>
              Latest month: {latestMonth ? latestMonth.label : "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#475569" }}>
              Avg Monthly Revenue
            </p>
            <h4 className="mt-2 text-2xl font-semibold" style={{ color: "#0f172a" }}>
              {formatCurrency(avgMonthlyRevenue, 0)}
            </h4>
            <p className="mt-2 text-xs" style={{ color: "#64748b" }}>
              Across {monthsDescriptor}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#475569" }}>
              Avg Ticket Value
            </p>
            <h4 className="mt-2 text-2xl font-semibold" style={{ color: "#0f172a" }}>
              {formatCurrency(avgTicketValue, avgTicketValue < 1000 ? 2 : 0)}
            </h4>
            <p className="mt-2 text-xs" style={{ color: "#64748b" }}>
              {rangeBookingsCount ? `${rangeBookingsCount} booking${rangeBookingsCount === 1 ? "" : "s"}` : "No bookings yet"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#475569" }}>
              Top Performer
            </p>
            <h4 className="mt-2 text-lg font-semibold" style={{ color: "#0f172a" }}>
              {topServiceName}
            </h4>
            <p className="mt-1 text-sm font-medium" style={{ color: accent }}>
              {topServiceRevenueLabel}
            </p>
            <p className="mt-2 text-xs" style={{ color: "#64748b" }}>
              {topServiceCountLabel}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
            <h3 className="text-lg font-semibold" style={{ color: "#0f172a" }}>
              Top Services
            </h3>
            <p className="text-sm" style={{ color: "#2563eb" }}>
              Revenue contribution based on {statusLabel.toLowerCase()} within {rangeLabel.toLowerCase()}.
            </p>
            {rangeServiceBreakdown.length ? (
              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Service</th>
                      <th className="px-4 py-3 text-left font-semibold">Bookings</th>
                      <th className="px-4 py-3 text-left font-semibold">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {rangeServiceBreakdown.slice(0, 6).map((service) => (
                      <tr key={service.serviceName} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3" style={{ color: "#0f172a" }}>
                          {service.serviceName}
                        </td>
                        <td className="px-4 py-3" style={{ color: "#475569" }}>
                          {service.count}
                        </td>
                        <td className="px-4 py-3" style={{ color: "#0f172a" }}>
                          {formatCurrencyAuto(service.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm" style={{ color: "#475569" }}>
                No booking data available for this range.
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
            <h3 className="text-lg font-semibold" style={{ color: "#0f172a" }}>
              Monthly Revenue
            </h3>
            <p className="text-sm" style={{ color: "#2563eb" }}>
              {statusLabel} grouped by month for {rangeLabel.toLowerCase()}.
            </p>
            {hasRevenueData ? (
              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Month</th>
                      <th className="px-4 py-3 text-left font-semibold">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredMonthlyRevenue.map((row) => (
                      <tr key={row.key} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3" style={{ color: "#475569" }}>
                          {row.label}
                        </td>
                        <td className="px-4 py-3" style={{ color: "#0f172a" }}>
                          {formatCurrencyAuto(row.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
