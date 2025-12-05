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

  const peRatio = useMemo(() => {
    if (!totalExpenses) return null;
    if (!metrics.totalRevenue) return null;
    return metrics.totalRevenue / totalExpenses;
  }, [metrics.totalRevenue, totalExpenses]);

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

  const renderRevenue = () => (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <InsightPill label="Completed Revenue" value={`$${Number(metrics.totalRevenue || 0).toFixed(2)}`} accent="from-blue-500 to-indigo-500" />
        <InsightPill label="Pending" value={`$${Number(metrics.pendingRevenue || 0).toFixed(2)}`} accent="from-amber-400 to-orange-500" />
        <InsightPill label="Bookings" value={`${metrics.totalBookings || 0}`} accent="from-emerald-400 to-green-500" />
      </div>
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6">
        <h3 className="text-base font-semibold text-slate-100">Revenue Timeline</h3>
        <p className="text-sm text-slate-400 mb-4">Monthly trend across all completed bookings.</p>
        <div className="rounded-xl border border-slate-800/60 bg-slate-950/80 p-4">
          <RevenueChart bookings={bookings} />
        </div>
      </div>
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6">
        <h3 className="text-base font-semibold text-slate-100">Top Services</h3>
        <p className="text-sm text-slate-400 mb-4">Most requested bookings ranked by revenue contribution.</p>
        <div className="overflow-hidden rounded-xl border border-slate-800/70">
          <table className="min-w-full divide-y divide-slate-800/70 text-sm text-slate-200">
            <thead className="bg-slate-900/80 text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Service</th>
                <th className="px-4 py-3 text-left font-semibold">Bookings</th>
                <th className="px-4 py-3 text-left font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {serviceBreakdown.map((service) => (
                <tr key={service.serviceName}>
                  <td className="px-4 py-3 text-slate-100">{service.serviceName}</td>
                  <td className="px-4 py-3">{service.count}</td>
                  <td className="px-4 py-3">${service.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6">
        <h3 className="text-base font-semibold text-slate-100">Monthly Revenue</h3>
        <p className="text-sm text-slate-400 mb-4">Completed revenue grouped by month.</p>
        <div className="overflow-hidden rounded-xl border border-slate-800/70">
          <table className="min-w-full divide-y divide-slate-800/70 text-sm text-slate-200">
            <thead className="bg-slate-900/80 text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Month</th>
                <th className="px-4 py-3 text-left font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {monthlyRevenue.map((row) => (
                <tr key={row.key}>
                  <td className="px-4 py-3">{row.label}</td>
                  <td className="px-4 py-3">${row.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderExpenses = () => (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <InsightPill label="Lifetime Spend" value={`$${totalExpenses.toFixed(2)}`} accent="from-rose-500 to-red-500" />
        <InsightPill label="Records" value={`${expenses.length}`} accent="from-slate-500 to-slate-600" />
        <InsightPill label="Avg. Expense" value={`$${(totalExpenses / Math.max(expenses.length || 1, 1)).toFixed(2)}`} accent="from-fuchsia-500 to-purple-600" />
      </div>
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6">
        <h3 className="text-base font-semibold text-slate-100">Expense Analytics</h3>
        <p className="text-sm text-slate-400 mb-4">Interactive visualizations of spending habits.</p>
        <div className="rounded-xl border border-slate-800/60 bg-white/95 p-4 text-slate-900">
          <ExpensesCard />
        </div>
      </div>
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6">
        <h3 className="text-base font-semibold text-slate-100">Category Breakdown</h3>
        <p className="text-sm text-slate-400 mb-4">Where operational dollars are allocated.</p>
        <div className="space-y-4">
          {expenseBreakdown.map((entry) => (
            <div key={entry.category} className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="capitalize text-slate-100">{entry.category.replace("-", " ")}</span>
                <span className="font-semibold text-slate-200">${entry.total.toFixed(2)}</span>
              </div>
              <div className="mt-4 overflow-auto">
                <table className="min-w-full text-xs text-slate-300">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="px-2 py-2 text-left">Date</th>
                      <th className="px-2 py-2 text-left">Item</th>
                      <th className="px-2 py-2 text-left">Supplier</th>
                      <th className="px-2 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {entry.items.slice(0, 10).map((item) => (
                      <tr key={item._id || `${item.date}-${item.productName}`}
                        className="hover:bg-slate-800/40">
                        <td className="px-2 py-2">{formatDate(item.date)}</td>
                        <td className="px-2 py-2">{item.productName || "--"}</td>
                        <td className="px-2 py-2">{item.supplier || "--"}</td>
                        <td className="px-2 py-2 text-right">${Number(item.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderProfit = () => (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <InsightPill label="Total Profit" value={`$${Number(metrics.totalRevenue - totalExpenses).toFixed(2)}`} accent="from-emerald-500 to-green-500" />
        <InsightPill label="Revenue" value={`$${Number(metrics.totalRevenue || 0).toFixed(2)}`} accent="from-blue-500 to-indigo-500" />
        <InsightPill label="Expenses" value={`$${totalExpenses.toFixed(2)}`} accent="from-rose-500 to-red-500" />
      </div>
      <div className="rounded-2xl border border-slate-800/80 bg-white/95 p-4 text-slate-900">
        <ProfitsCard bookings={bookings} />
      </div>
    </div>
  );

  const renderPe = () => (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6">
        <h3 className="text-base font-semibold text-slate-100">Performance Efficiency</h3>
        <p className="text-sm text-slate-400 mb-4">
          Ratio of generated revenue over operational spend. Track efficiency over time.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <InsightPill label="P/E Ratio" value={peRatio ? peRatio.toFixed(2) : "--"} accent="from-purple-500 to-violet-500" />
          <InsightPill label="Completed Bookings" value={`${metrics.completedCount || 0}`} accent="from-blue-500 to-sky-500" />
          <InsightPill label="Pending Bookings" value={`${metrics.pendingCount || 0}`} accent="from-amber-500 to-orange-500" />
        </div>
      </div>
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6">
        <h3 className="text-base font-semibold text-slate-100">Scheduling Outlook</h3>
        <p className="text-sm text-slate-400 mb-4">Availability heatmap for the upcoming period.</p>
        <div className="rounded-xl border border-slate-800/70 bg-white/95 p-4 text-slate-900">
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
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: "rgba(15, 23, 42, 0.35)", backdropFilter: "blur(24px)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative max-h-[90vh] w-[94vw] max-w-5xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-8 text-slate-900 shadow-[0_40px_70px_-40px_rgba(15,23,42,0.4)]"
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
