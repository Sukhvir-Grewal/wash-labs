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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Service Catalog</h3>
          <p className="text-sm text-slate-400">Review pricing, add-ons, and duration at a glance.</p>
        </div>
        <Link
          href="/admin-services"
          className="inline-flex items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
        >
          Manage Services
        </Link>
      </div>
      {servicesLoading ? (
        <div className="py-12 text-center text-sm text-slate-400">Loading services...</div>
      ) : servicesError ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {servicesError}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60">
          <table className="min-w-full divide-y divide-slate-800/70 text-sm">
            <thead className="bg-slate-900/80 text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Service</th>
                <th className="px-4 py-3 text-left font-semibold">Base Price</th>
                <th className="px-4 py-3 text-left font-semibold">Duration</th>
                <th className="px-4 py-3 text-left font-semibold">Add-ons</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {services.map((service) => (
                <tr key={service._id || service.title}>
                  <td className="px-4 py-4 align-top">
                    <div className="font-semibold text-slate-100">{service.title}</div>
                    {service.description && (
                      <div className="mt-1 text-xs text-slate-400">{service.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 align-top">${Number(service.basePrice || 0).toFixed(2)}</td>
                  <td className="px-4 py-4 align-top">
                    {service.durationMinutes
                      ? `${service.durationMinutes} min`
                      : service.duration
                      ? `${service.duration} hr`
                      : "--"}
                  </td>
                  <td className="px-4 py-4 align-top">
                    {Array.isArray(service.addOns) && service.addOns.length ? (
                      <ul className="space-y-1 text-xs text-slate-300">
                        {service.addOns.map((addon) => (
                          <li key={addon.name} className="flex items-center justify-between">
                            <span>{addon.name}</span>
                            <span className="text-slate-400">${Number(addon.price || 0).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-slate-500">No add-ons</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative max-h-[90vh] w-[94vw] max-w-5xl overflow-y-auto rounded-3xl border border-slate-800/80 bg-slate-950/95 p-8 shadow-2xl"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/80 text-slate-200 hover:bg-slate-800 transition"
            aria-label="Close section"
          >
            <FiX size={20} />
          </button>
          <div className="flex items-center gap-3 pb-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/70 text-slate-100">
              <Icon size={22} />
            </span>
            <div>
              <h2 className="text-2xl font-semibold text-slate-100">{active.label}</h2>
              <p className="text-sm text-slate-400">{active.hint}</p>
            </div>
          </div>
          <div className="space-y-8 pb-4 text-slate-100">
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
