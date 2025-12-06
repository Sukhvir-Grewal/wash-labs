import { useEffect, useMemo, useState } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

const RANGE_LIMITS = { "3m": 3, "6m": 6, "12m": 12 };
const RANGE_LABELS = {
  "3m": "Last 3 months",
  "6m": "Last 6 months",
  "12m": "Last 12 months",
  all: "All-time",
};

const CATEGORY_LABELS = {
  "one-time": "Equipment",
  chemicals: "Chemicals",
  labor: "Labor",
  travel: "Travel",
  utilities: "Utilities",
  marketing: "Marketing",
  other: "Other",
};

const CATEGORY_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
];

const numberFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatCurrency(value, fractionDigits = 0) {
  if (!Number.isFinite(value)) return "$0";
  return numberFormatter.format(Number(value)).replace(/\.00$/, fractionDigits === 0 ? "" : ".00");
}

function formatDateLabel(input) {
  if (!input) return "--";
  const date = new Date(`${input}T00:00:00`);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatMonthKey(key) {
  if (!key) return "--";
  const parts = key.split("-");
  if (parts.length !== 2) return key;
  const [year, month] = parts;
  const monthIndex = Number(month) - 1;
  if (Number.isNaN(monthIndex)) return key;
  const label = new Date(Number(year), monthIndex, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
  return label;
}

export default function ExpensesCard({ expenses }) {
  const controlled = Array.isArray(expenses);
  const [items, setItems] = useState(controlled ? expenses : []);
  const [loading, setLoading] = useState(!controlled);
  const [error, setError] = useState("");
  const [range, setRange] = useState("6m");
  const [chartView, setChartView] = useState("timeline");
  const [timelineType, setTimelineType] = useState("bar");

  useEffect(() => {
    if (controlled) {
      setItems(expenses || []);
      setLoading(false);
    }
  }, [controlled, expenses]);

  useEffect(() => {
    if (controlled) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/expenses");
        const data = await response.json();
        if (!active) return;
        if (response.ok && data.success && Array.isArray(data.items)) {
          setItems(data.items);
        } else {
          throw new Error(data.error || "Failed to load expenses");
        }
      } catch (fetchError) {
        if (active) {
          setError(fetchError.message || "Failed to load expenses");
          setItems([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [controlled]);

  const filteredItems = useMemo(() => {
    if (!items.length) return [];
    if (range === "all") return items;
    const monthsLimit = RANGE_LIMITS[range];
    if (!monthsLimit) return items;
    const now = new Date();
    return items.filter((item) => {
      if (!item.date) return false;
      const expenseDate = new Date(`${item.date}T00:00:00`);
      if (Number.isNaN(expenseDate.getTime())) return false;
      const diffMonths = (now.getFullYear() - expenseDate.getFullYear()) * 12 + now.getMonth() - expenseDate.getMonth();
      return diffMonths <= monthsLimit - 1;
    });
  }, [items, range]);

  const monthlyTotals = useMemo(() => {
    const map = new Map();
    filteredItems.forEach((item) => {
      const key = (item.date || "").slice(0, 7);
      if (!key) return;
      const amount = Number(item.amount) || 0;
      const entry = map.get(key) || { total: 0, count: 0 };
      entry.total += amount;
      entry.count += 1;
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .map(([key, entry]) => ({ key, label: formatMonthKey(key), total: entry.total, count: entry.count }))
      .sort((a, b) => (a.key > b.key ? 1 : -1));
  }, [filteredItems]);

  const totalSpend = useMemo(
    () => filteredItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [filteredItems]
  );

  const averageExpense = filteredItems.length ? totalSpend / filteredItems.length : 0;
  const averageMonthlySpend = monthlyTotals.length ? totalSpend / monthlyTotals.length : 0;

  const categoryTotals = useMemo(() => {
    const map = new Map();
    let total = 0;
    filteredItems.forEach((item) => {
      const amount = Number(item.amount) || 0;
      total += amount;
      const key = (item.category || "other").toLowerCase();
      const entry = map.get(key) || { total: 0, count: 0 };
      entry.total += amount;
      entry.count += 1;
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .map(([key, entry]) => ({
        key,
        label: CATEGORY_LABELS[key] || key.replace(/-/g, " "),
        total: entry.total,
        count: entry.count,
        percentage: total ? (entry.total / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredItems]);

  const supplierTotals = useMemo(() => {
    const map = new Map();
    filteredItems.forEach((item) => {
      const amount = Number(item.amount) || 0;
      const supplier = item.supplier || "Unknown supplier";
      const entry = map.get(supplier) || { total: 0, count: 0 };
      entry.total += amount;
      entry.count += 1;
      map.set(supplier, entry);
    });
    return Array.from(map.entries())
      .map(([supplier, stats]) => ({ supplier, ...stats }))
      .sort((a, b) => b.total - a.total);
  }, [filteredItems]);

  const largestExpenses = useMemo(() => {
    return [...filteredItems]
      .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
      .slice(0, 5);
  }, [filteredItems]);

  const recentExpenses = useMemo(() => {
    return [...filteredItems]
      .sort((a, b) => {
        const aTime = new Date(`${a.date || ""}T00:00:00`).getTime();
        const bTime = new Date(`${b.date || ""}T00:00:00`).getTime();
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [filteredItems]);

  const latestMonth = monthlyTotals.at(-1) || null;
  const previousMonth = monthlyTotals.at(-2) || null;
  let monthGrowthLabel = "—";
  let monthGrowthColor = "#475569";
  if (latestMonth && previousMonth) {
    if (previousMonth.total === 0) {
      monthGrowthLabel = "New spend";
      monthGrowthColor = "#2563eb";
    } else {
      const growth = (latestMonth.total - previousMonth.total) / previousMonth.total;
      monthGrowthLabel = `${growth >= 0 ? "+" : ""}${(growth * 100).toFixed(1)}% vs prev.`;
      monthGrowthColor = growth >= 0 ? "#dc2626" : "#16a34a";
    }
  }

  const rangeLabel = RANGE_LABELS[range] || "All-time";
  const monthsDescriptor = monthlyTotals.length
    ? `${monthlyTotals.length} month${monthlyTotals.length === 1 ? "" : "s"} tracked`
    : "No monthly data";

  const topCategory = categoryTotals[0] || null;
  const topSupplier = supplierTotals[0] || null;

  const summaryCards = [
    {
      title: `Total Spend (${rangeLabel})`,
      value: formatCurrency(totalSpend, 0),
      accent: monthGrowthColor,
      subtitle: monthGrowthLabel,
    },
    {
      title: "Avg. Monthly Spend",
      value: formatCurrency(averageMonthlySpend, 0),
      subtitle: monthsDescriptor,
    },
    {
      title: "Avg. Expense",
      value: formatCurrency(averageExpense, averageExpense < 1000 ? 2 : 0),
      subtitle: `${filteredItems.length} record${filteredItems.length === 1 ? "" : "s"}`,
    },
    {
      title: "Top Category",
      value: topCategory ? topCategory.label : "Awaiting data",
      subtitle: topCategory
        ? `${topCategory.count} purchases · ${formatCurrency(topCategory.total, 0)}`
        : "No expenses in range",
    },
  ];

  const timelineLabels = monthlyTotals.map((entry) => entry.label);
  const timelineValues = monthlyTotals.map((entry) => entry.total);

  const timelineDataset = {
    label: `Expenses (${rangeLabel.toLowerCase()})`,
    data: timelineValues,
    borderColor: "#ef4444",
    backgroundColor: timelineType === "area" ? "rgba(239, 68, 68, 0.18)" : "rgba(239, 68, 68, 0.2)",
    fill: timelineType === "area",
    tension: 0.3,
    pointRadius: timelineType === "bar" ? 0 : 4,
    pointBackgroundColor: "#ef4444",
    pointBorderColor: "#ffffff",
    borderWidth: timelineType === "bar" ? 0 : 2,
  };

  const timelineData = {
    labels: timelineLabels,
    datasets: [timelineDataset],
  };

  const timelineOptions = {
    responsive: true,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0f172a",
        borderColor: "#0f172a",
        borderWidth: 1,
        titleColor: "#f8fafc",
        bodyColor: "#f8fafc",
        callbacks: {
          label: ({ formattedValue }) => formatCurrency(Number(formattedValue), 0),
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#0f172a" },
        grid: { color: "#e2e8f0" },
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#0f172a" },
        grid: { color: "#f1f5f9" },
      },
    },
  };

  const categoryChartData = {
    labels: categoryTotals.map((entry) => entry.label),
    datasets: [
      {
        label: "Category share",
        data: categoryTotals.map((entry) => entry.total),
        backgroundColor: categoryTotals.map((_, index) => CATEGORY_COLORS[index % CATEGORY_COLORS.length]),
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const categoryChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "right",
        labels: { color: "#0f172a", font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          label: ({ label, formattedValue }) => `${label}: ${formatCurrency(Number(formattedValue), 0)}`,
        },
      },
    },
  };

  const ChartComponent = timelineType === "bar" ? Bar : Line;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.12)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-2xl font-semibold" style={{ color: "#0f172a" }}>
            Expense Analytics
          </h3>
          <p className="text-sm" style={{ color: "#2563eb" }}>
            Monitor cash outflow, spot spending surges, and keep an eye on vendors and categories that drive costs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["3m", "6m", "12m", "all"].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRange(value)}
              className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition"
              style={
                range === value
                  ? {
                      backgroundColor: "#2563eb",
                      borderColor: "#2563eb",
                      color: "#ffffff",
                      boxShadow: "0 12px 30px rgba(37, 99, 235, 0.25)",
                    }
                  : {
                      backgroundColor: "#ffffff",
                      borderColor: "rgba(37, 99, 235, 0.22)",
                      color: "#2563eb",
                    }
              }
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm" style={{ color: "#b91c1c" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-20 text-center text-sm" style={{ color: "#475569" }}>
          Loading expense analytics...
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#475569" }}>
                  {card.title}
                </p>
                <p className="mt-2 text-2xl font-semibold" style={{ color: "#0f172a" }}>
                  {card.value}
                </p>
                {card.subtitle && (
                  <p className="mt-2 text-xs font-medium" style={{ color: card.accent || "#64748b" }}>
                    {card.subtitle}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "#475569" }}>
              View
            </div>
            {[{ value: "timeline", label: "Timeline" }, { value: "categories", label: "Categories" }].map((control) => (
              <button
                key={control.value}
                type="button"
                onClick={() => setChartView(control.value)}
                className="rounded-full border px-4 py-1.5 text-xs font-semibold transition"
                style={
                  chartView === control.value
                    ? {
                        backgroundColor: "#2563eb",
                        borderColor: "#2563eb",
                        color: "#ffffff",
                      }
                    : {
                        backgroundColor: "#ffffff",
                        borderColor: "rgba(37, 99, 235, 0.22)",
                        color: "#2563eb",
                      }
                }
              >
                {control.label}
              </button>
            ))}

            {chartView === "timeline" && (
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#475569" }}>
                  Chart
                </span>
                {["bar", "line", "area"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTimelineType(type)}
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                    style={
                      timelineType === type
                        ? {
                            backgroundColor: "#fef2f2",
                            borderColor: "#ef4444",
                            color: "#b91c1c",
                          }
                        : {
                            backgroundColor: "#ffffff",
                            borderColor: "rgba(239, 68, 68, 0.25)",
                            color: "#ef4444",
                          }
                    }
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {chartView === "timeline" ? (
              timelineLabels.length ? (
                <div style={{ minHeight: 260 }}>
                  <ChartComponent data={timelineData} options={timelineOptions} />
                </div>
              ) : (
                <div className="py-16 text-center text-sm" style={{ color: "#475569" }}>
                  No expenses recorded for the selected range.
                </div>
              )
            ) : categoryTotals.length ? (
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                <div className="lg:w-1/2" style={{ minHeight: 260 }}>
                  <Doughnut data={categoryChartData} options={categoryChartOptions} />
                </div>
                <div className="flex-1 space-y-3">
                  {categoryTotals.slice(0, 6).map((entry, index) => (
                    <div key={entry.key} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between text-sm font-semibold" style={{ color: "#0f172a" }}>
                        <span>{entry.label}</span>
                        <span>{formatCurrency(entry.total, 0)}</span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-white/70">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${Math.min(100, entry.percentage).toFixed(1)}%`,
                            backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                          }}
                        />
                      </div>
                      <p className="mt-2 text-xs" style={{ color: "#64748b" }}>
                        {entry.count} expense{entry.count === 1 ? "" : "s"} · {entry.percentage.toFixed(1)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-sm" style={{ color: "#475569" }}>
                No categorized expenses within this range.
              </div>
            )}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="text-base font-semibold" style={{ color: "#0f172a" }}>
                Top Vendors
              </h4>
              <p className="text-xs" style={{ color: "#64748b" }}>
                Suppliers ranked by total spend.
              </p>
              {supplierTotals.length ? (
                <div className="mt-4 space-y-3">
                  {supplierTotals.slice(0, 5).map((entry, index) => (
                    <div key={entry.supplier} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>
                          {index + 1}. {entry.supplier}
                        </p>
                        <p className="text-xs" style={{ color: "#64748b" }}>
                          {entry.count} purchase{entry.count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: "#ef4444" }}>
                        {formatCurrency(entry.total, 0)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm" style={{ color: "#64748b" }}>
                  Vendor data unavailable for this range.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="text-base font-semibold" style={{ color: "#0f172a" }}>
                Largest Expenses
              </h4>
              <p className="text-xs" style={{ color: "#64748b" }}>
                High-ticket items that may need review.
              </p>
              {largestExpenses.length ? (
                <div className="mt-4 space-y-3">
                  {largestExpenses.map((expense) => (
                    <div key={expense._id || `${expense.date}-${expense.productName}`} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>
                          {expense.productName || expense.category || "Expense"}
                        </p>
                        <span className="text-sm font-semibold" style={{ color: "#ef4444" }}>
                          {formatCurrency(Number(expense.amount) || 0, 0)}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs" style={{ color: "#64748b" }}>
                        <span>{formatDateLabel(expense.date)}</span>
                        <span>•</span>
                        <span>{expense.supplier || "Unknown supplier"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm" style={{ color: "#64748b" }}>
                  No expenses recorded yet.
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="text-base font-semibold" style={{ color: "#0f172a" }}>
              Recent Activity
            </h4>
            <p className="text-xs" style={{ color: "#64748b" }}>
              Last five expenses logged within the selected range.
            </p>
            {recentExpenses.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Date</th>
                      <th className="px-4 py-3 text-left font-semibold">Item</th>
                      <th className="px-4 py-3 text-left font-semibold">Supplier</th>
                      <th className="px-4 py-3 text-left font-semibold">Category</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {recentExpenses.map((expense) => (
                      <tr key={expense._id || `${expense.date}-${expense.productName}-${expense.amount}`} className="hover:bg-slate-50">
                        <td className="px-4 py-3" style={{ color: "#475569" }}>
                          {formatDateLabel(expense.date)}
                        </td>
                        <td className="px-4 py-3" style={{ color: "#0f172a" }}>
                          {expense.productName || "—"}
                        </td>
                        <td className="px-4 py-3" style={{ color: "#475569" }}>
                          {expense.supplier || "—"}
                        </td>
                        <td className="px-4 py-3" style={{ color: "#475569" }}>
                          {CATEGORY_LABELS[(expense.category || "other").toLowerCase()] || expense.category || "Other"}
                        </td>
                        <td className="px-4 py-3 text-right" style={{ color: "#ef4444" }}>
                          {formatCurrency(Number(expense.amount) || 0, 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm" style={{ color: "#64748b" }}>
                No recent expenses available.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
