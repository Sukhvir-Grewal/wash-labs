import { useMemo, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

Chart.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, Filler);

const RANGE_LIMITS = { "3m": 3, "6m": 6, "12m": 12 };
const RANGE_LABELS = { "3m": "Last 3 months", "6m": "Last 6 months", "12m": "Last 12 months", all: "All-time" };

function formatCurrency(value, fractionDigits = 0) {
  if (!Number.isFinite(value)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

function formatPercent(value, fractionDigits = 1) {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(fractionDigits)}%`;
}

function formatRatio(value, fractionDigits = 2) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(fractionDigits)}×`;
}

function formatMonthKey(key) {
  if (!key) return "--";
  const [year, month] = key.split("-");
  const numericMonth = Number(month) - 1;
  if (Number.isNaN(numericMonth)) return key;
  return new Date(Number(year), numericMonth, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function buildMonthlyPerformance(bookings = [], expenses = []) {
  const map = new Map();
  const ensureEntry = (key) => {
    if (!key) return null;
    if (!map.has(key)) {
      map.set(key, {
        key,
        revenue: 0,
        expenses: 0,
        completed: 0,
        scheduled: 0,
        pending: 0,
      });
    }
    return map.get(key);
  };

  bookings.forEach((booking = {}) => {
    if (!booking.date) return;
    const key = booking.date.slice(0, 7);
    const entry = ensureEntry(key);
    if (!entry) return;
    entry.scheduled += 1;
    const status = booking.status || "";
    const amount = Number(booking.amount) || 0;
    if (status === "complete") {
      entry.completed += 1;
      entry.revenue += amount;
    } else {
      entry.pending += 1;
    }
  });

  expenses.forEach((expense = {}) => {
    if (!expense.date) return;
    const key = expense.date.slice(0, 7);
    const entry = ensureEntry(key);
    if (!entry) return;
    entry.expenses += Number(expense.amount) || 0;
  });

  return Array.from(map.values())
    .map((entry) => {
      const efficiency = entry.expenses ? entry.revenue / entry.expenses : entry.revenue ? entry.revenue : 0;
      const margin = entry.revenue ? ((entry.revenue - entry.expenses) / entry.revenue) * 100 : 0;
      const completionRate = entry.scheduled ? (entry.completed / entry.scheduled) * 100 : 0;
      return {
        ...entry,
        label: formatMonthKey(entry.key),
        efficiency,
        margin,
        completionRate,
      };
    })
    .filter((entry) => entry.revenue || entry.expenses || entry.scheduled)
    .sort((a, b) => (a.key > b.key ? 1 : -1));
}

export default function PerformanceEfficiencyCard({ bookings = [], expenses = [], metrics = {} }) {
  const [range, setRange] = useState("6m");
  const [chartView, setChartView] = useState("efficiency");
  const [effChartType, setEffChartType] = useState("area");

  const monthlyData = useMemo(() => buildMonthlyPerformance(bookings, expenses), [bookings, expenses]);

  const filteredMonthly = useMemo(() => {
    if (!monthlyData.length) return [];
    if (range === "all") return monthlyData;
    const limit = RANGE_LIMITS[range];
    if (!limit) return monthlyData;
    const now = new Date();
    return monthlyData.filter((entry) => {
      const [year, month] = entry.key.split("-");
      const y = Number(year);
      const m = Number(month) - 1;
      if (Number.isNaN(y) || Number.isNaN(m)) return false;
      const diffMonths = (now.getFullYear() - y) * 12 + now.getMonth() - m;
      return diffMonths <= limit - 1;
    });
  }, [monthlyData, range]);

  const totalRevenue = filteredMonthly.reduce((sum, entry) => sum + entry.revenue, 0);
  const totalExpenses = filteredMonthly.reduce((sum, entry) => sum + entry.expenses, 0);
  const totalCompleted = filteredMonthly.reduce((sum, entry) => sum + entry.completed, 0);
  const totalScheduled = filteredMonthly.reduce((sum, entry) => sum + entry.scheduled, 0);
  const totalPending = filteredMonthly.reduce((sum, entry) => sum + entry.pending, 0);

  const efficiencyRatio = totalExpenses ? totalRevenue / totalExpenses : totalRevenue ? totalRevenue : 0;
  const completionRate = totalScheduled ? (totalCompleted / totalScheduled) * 100 : 0;
  const avgMonthlyBookings = filteredMonthly.length ? totalCompleted / filteredMonthly.length : 0;
  const avgCompletion = filteredMonthly.length
    ? filteredMonthly.reduce((sum, entry) => sum + entry.completionRate, 0) / filteredMonthly.length
    : 0;
  const rangeLabel = RANGE_LABELS[range] || "All-time";

  const bestEfficiency = filteredMonthly.reduce(
    (best, entry) => (entry.efficiency > (best?.efficiency ?? -Infinity) ? entry : best),
    null,
  );
  const lowestEfficiency = filteredMonthly.reduce(
    (worst, entry) => (entry.efficiency < (worst?.efficiency ?? Infinity) ? entry : worst),
    null,
  );

  const timelineLabels = filteredMonthly.map((entry) => entry.label);
  const efficiencyValues = filteredMonthly.map((entry) => Number(entry.efficiency.toFixed(2)));
  const revenueValues = filteredMonthly.map((entry) => Number(entry.revenue.toFixed(2)));
  const expenseValues = filteredMonthly.map((entry) => Number(entry.expenses.toFixed(2)));
  const completionValues = filteredMonthly.map((entry) => Number(entry.completionRate.toFixed(2)));
  const pendingValues = filteredMonthly.map((entry) => entry.pending);
  const completedValues = filteredMonthly.map((entry) => entry.completed);

  const ChartComponent = effChartType === "bar" ? Bar : Line;
  const hasData = filteredMonthly.length > 0;

  const efficiencyDataset = {
    label: "Efficiency ratio",
    data: efficiencyValues,
    borderColor: "#0f766e",
    backgroundColor:
      effChartType === "bar"
        ? efficiencyValues.map((value) => (value >= 1 ? "rgba(14,165,233,0.35)" : "rgba(244,63,94,0.35)"))
        : "rgba(15,118,110,0.18)",
    borderWidth: effChartType === "bar" ? 0 : 2,
    fill: effChartType === "area",
    tension: 0.32,
    pointRadius: effChartType === "bar" ? 0 : 4,
    pointBackgroundColor: effChartType === "bar" ? undefined : "#0f766e",
    pointBorderColor: effChartType === "bar" ? undefined : "#ffffff",
    pointHoverRadius: effChartType === "bar" ? 0 : 5,
    maxBarThickness: 32,
    borderRadius: effChartType === "bar" ? 10 : undefined,
  };

  const efficiencyChartData = { labels: timelineLabels, datasets: [efficiencyDataset] };

  const efficiencyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ({ formattedValue }) => `${Number(formattedValue).toFixed(2)}× coverage`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#0f172a" },
        grid: { color: "#e2e8f0" },
      },
      y: {
        ticks: { color: "#0f172a" },
        grid: { color: "#f1f5f9" },
      },
    },
  };

  const coverageData = {
    labels: timelineLabels,
    datasets: [
      {
        label: "Revenue",
        data: revenueValues,
        backgroundColor: "rgba(14,165,233,0.65)",
        borderRadius: 10,
        maxBarThickness: 32,
      },
      {
        label: "Expenses",
        data: expenseValues,
        backgroundColor: "rgba(249,115,22,0.7)",
        borderRadius: 10,
        maxBarThickness: 32,
      },
    ],
  };

  const coverageOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        labels: { color: "#0f172a", font: { size: 12 } },
      },
      tooltip: {
        callbacks: {
          label: ({ dataset, formattedValue }) => `${dataset.label}: ${formatCurrency(Number(formattedValue), 0)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#0f172a" },
        grid: { color: "#e2e8f0" },
      },
      y: {
        ticks: {
          color: "#0f172a",
          callback: (value) => formatCurrency(Number(value), 0),
        },
        grid: { color: "#f1f5f9" },
      },
    },
  };

  const completionData = {
    labels: timelineLabels,
    datasets: [
      {
        label: "Completion rate",
        data: completionValues,
        borderColor: "#14b8a6",
        backgroundColor: "rgba(20,184,166,0.18)",
        tension: 0.35,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: "#14b8a6",
        pointBorderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const completionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ({ formattedValue }) => `${Number(formattedValue).toFixed(1)}% completed`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#0f172a" },
        grid: { color: "#e2e8f0" },
      },
      y: {
        ticks: {
          color: "#0f172a",
          callback: (value) => `${Number(value).toFixed(0)}%`,
        },
        grid: { color: "#f1f5f9" },
      },
    },
  };

  const bookingsData = {
    labels: timelineLabels,
    datasets: [
      {
        label: "Completed",
        data: completedValues,
        backgroundColor: "rgba(34,197,94,0.7)",
        borderRadius: 10,
        maxBarThickness: 32,
      },
      {
        label: "Open",
        data: pendingValues,
        backgroundColor: "rgba(244,63,94,0.65)",
        borderRadius: 10,
        maxBarThickness: 32,
      },
    ],
  };

  const bookingsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        labels: { color: "#0f172a", font: { size: 12 } },
      },
    },
    scales: {
      x: {
        ticks: { color: "#0f172a" },
        grid: { color: "#e2e8f0" },
      },
      y: {
        ticks: { color: "#0f172a" },
        grid: { color: "#f1f5f9" },
      },
    },
  };

  const summaryCards = [
    {
      title: `Efficiency (${rangeLabel})`,
      value: formatRatio(efficiencyRatio),
      subtitle: `${formatCurrency(totalRevenue, 0)} revenue vs ${formatCurrency(totalExpenses, 0)} expenses`,
      accent: efficiencyRatio >= 1 ? "#0f766e" : "#f97316",
    },
    {
      title: "Completion rate",
      value: formatPercent(completionRate),
      subtitle: `${totalCompleted} of ${totalScheduled || 0} bookings finished`,
      accent: "#14b8a6",
    },
    {
      title: "Avg. monthly jobs",
      value: `${avgMonthlyBookings.toFixed(1)}`,
      subtitle: `${filteredMonthly.length} month${filteredMonthly.length === 1 ? "" : "s"} observed`,
      accent: "#0ea5e9",
    },
    {
      title: "Active pipeline",
      value: `${totalPending} open`,
      subtitle: metrics.pendingCount != null ? `${metrics.pendingCount} pending overall` : "Monitoring upcoming work",
      accent: "#f97316",
    },
  ];

  const insightItems = [
    {
      label: "Peak efficiency",
      value: bestEfficiency ? `${bestEfficiency.label} · ${formatRatio(bestEfficiency.efficiency)}` : "Awaiting data",
      tone: "#0f766e",
    },
    {
      label: "Lowest coverage",
      value: lowestEfficiency ? `${lowestEfficiency.label} · ${formatRatio(lowestEfficiency.efficiency)}` : "—",
      tone: "#f43f5e",
    },
    {
      label: "Avg completion",
      value: formatPercent(avgCompletion),
      tone: "#14b8a6",
    },
    {
      label: "Completed total",
      value: `${totalCompleted} jobs`,
      tone: "#22c55e",
    },
  ];

  const monthlyTableRows = [...filteredMonthly].sort((a, b) => (a.key > b.key ? -1 : 1));

  return (
    <div className="rounded-3xl border border-teal-100 bg-white p-6 shadow-[0_24px_60px_-32px_rgba(13,148,136,0.16)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <h3 className="text-2xl font-semibold" style={{ color: "#0f766e" }}>
            Performance Efficiency
          </h3>
          <p className="text-sm" style={{ color: "#0f172a" }}>
            Track how well revenue covers operating spend, how quickly jobs close, and where pipeline bottlenecks form.
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
                      backgroundColor: "#0f766e",
                      borderColor: "#0f766e",
                      color: "#ffffff",
                      boxShadow: "0 12px 30px rgba(15, 118, 110, 0.25)",
                    }
                  : {
                      backgroundColor: "#ffffff",
                      borderColor: "rgba(15, 118, 110, 0.25)",
                      color: "#0f766e",
                    }
              }
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.title} className="rounded-2xl border border-teal-100 bg-teal-50 px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#0f766e" }}>
              {card.title}
            </p>
            <p className="mt-2 text-2xl font-semibold" style={{ color: "#0f172a" }}>
              {card.value}
            </p>
            <p className="mt-1 text-xs font-semibold" style={{ color: card.accent }}>
              {card.subtitle}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "#0f766e" }}>
          View
        </div>
        {[
          { value: "efficiency", label: "Efficiency" },
          { value: "coverage", label: "Revenue vs Expenses" },
          { value: "completion", label: "Completion Rate" },
          { value: "bookings", label: "Bookings Mix" },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setChartView(option.value)}
            className="rounded-full border px-4 py-1.5 text-xs font-semibold transition"
            style={
              chartView === option.value
                ? {
                    backgroundColor: "#0f766e",
                    borderColor: "#0f766e",
                    color: "#ffffff",
                  }
                : {
                    backgroundColor: "#ffffff",
                    borderColor: "rgba(15, 118, 110, 0.25)",
                    color: "#0f766e",
                  }
            }
          >
            {option.label}
          </button>
        ))}

        {chartView === "efficiency" && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#0f766e" }}>
              Chart
            </span>
            {["bar", "line", "area"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setEffChartType(type)}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                style={
                  effChartType === type
                    ? {
                        backgroundColor: "#f0fdfa",
                        borderColor: "#14b8a6",
                        color: "#0f766e",
                      }
                    : {
                        backgroundColor: "#ffffff",
                        borderColor: "rgba(20, 184, 166, 0.3)",
                        color: "#0f766e",
                      }
                }
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
        {!hasData ? (
          <div className="py-16 text-center text-sm" style={{ color: "#0f766e" }}>
            No efficiency data for the selected range yet.
          </div>
        ) : chartView === "coverage" ? (
          <div style={{ minHeight: 260 }}>
            <Bar data={coverageData} options={coverageOptions} />
          </div>
        ) : chartView === "completion" ? (
          <div style={{ minHeight: 260 }}>
            <Line data={completionData} options={completionOptions} />
          </div>
        ) : chartView === "bookings" ? (
          <div style={{ minHeight: 260 }}>
            <Bar data={bookingsData} options={bookingsOptions} />
          </div>
        ) : (
          <div style={{ minHeight: 260 }}>
            <ChartComponent data={efficiencyChartData} options={efficiencyChartOptions} />
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-teal-100 bg-teal-50 p-5">
          <h4 className="text-base font-semibold" style={{ color: "#0f766e" }}>
            Highlights
          </h4>
          <div className="mt-4 space-y-3 text-sm">
            {insightItems.map((item) => (
              <div key={item.label} className="rounded-xl border border-teal-100 bg-white px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#0f766e" }}>
                  {item.label}
                </div>
                <div className="mt-1 text-sm font-semibold" style={{ color: item.tone }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
          <h4 className="text-base font-semibold" style={{ color: "#0f766e" }}>
            Completion health
          </h4>
          <p className="text-xs" style={{ color: "#0f172a" }}>
            Stay ahead of backlog build-up by monitoring completion trends and pending workload.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
              <div className="text-xs uppercase tracking-wide" style={{ color: "#0f766e" }}>
                Completed jobs
              </div>
              <div className="mt-1 text-xl font-semibold" style={{ color: "#0f172a" }}>
                {totalCompleted}
              </div>
              <div className="text-xs" style={{ color: "#0f766e" }}>
                In selected range
              </div>
            </div>
            <div className="rounded-xl border border-teal-100 bg-white px-4 py-3">
              <div className="text-xs uppercase tracking-wide" style={{ color: "#f97316" }}>
                Open jobs
              </div>
              <div className="mt-1 text-xl font-semibold" style={{ color: "#f97316" }}>
                {totalPending}
              </div>
              <div className="text-xs" style={{ color: "#64748b" }}>
                Need scheduling or completion
              </div>
            </div>
            <div className="rounded-xl border border-teal-100 bg-white px-4 py-3">
              <div className="text-xs uppercase tracking-wide" style={{ color: "#14b8a6" }}>
                Avg completion
              </div>
              <div className="mt-1 text-xl font-semibold" style={{ color: "#14b8a6" }}>
                {formatPercent(avgCompletion)}
              </div>
              <div className="text-xs" style={{ color: "#64748b" }}>
                Across tracked months
              </div>
            </div>
            <div className="rounded-xl border border-teal-100 bg-white px-4 py-3">
              <div className="text-xs uppercase tracking-wide" style={{ color: "#0ea5e9" }}>
                Avg jobs / month
              </div>
              <div className="mt-1 text-xl font-semibold" style={{ color: "#0ea5e9" }}>
                {avgMonthlyBookings.toFixed(1)}
              </div>
              <div className="text-xs" style={{ color: "#64748b" }}>
                Completed pace
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
        <h4 className="text-base font-semibold" style={{ color: "#0f766e" }}>
          Monthly operations ledger
        </h4>
        <p className="text-xs" style={{ color: "#0f172a" }}>
          Compare revenue coverage, completion rate, and backlog for each month.
        </p>
        {!hasData ? (
          <div className="mt-6 rounded-xl border border-dashed border-teal-200 bg-teal-50 px-4 py-6 text-center text-sm" style={{ color: "#0f766e" }}>
            No entries to display.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-teal-100">
            <table className="min-w-full divide-y divide-teal-100 text-sm">
              <thead className="bg-teal-50 text-teal-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Month</th>
                  <th className="px-4 py-3 text-left font-semibold">Revenue</th>
                  <th className="px-4 py-3 text-left font-semibold">Expenses</th>
                  <th className="px-4 py-3 text-left font-semibold">Efficiency</th>
                  <th className="px-4 py-3 text-left font-semibold">Completed</th>
                  <th className="px-4 py-3 text-left font-semibold">Pending</th>
                  <th className="px-4 py-3 text-left font-semibold">Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-100 bg-white">
                {monthlyTableRows.map((entry) => (
                  <tr key={entry.key} className="hover:bg-teal-50/60">
                    <td className="px-4 py-3" style={{ color: "#0f172a" }}>
                      {entry.label}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#0f172a" }}>
                      {formatCurrency(entry.revenue, 0)}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#f97316" }}>
                      {formatCurrency(entry.expenses, 0)}
                    </td>
                    <td className="px-4 py-3" style={{ color: entry.efficiency >= 1 ? "#0f766e" : "#f43f5e" }}>
                      {formatRatio(entry.efficiency)}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#0f172a" }}>
                      {entry.completed}
                    </td>
                    <td className="px-4 py-3" style={{ color: entry.pending ? "#f97316" : "#0f766e" }}>
                      {entry.pending}
                    </td>
                    <td className="px-4 py-3" style={{ color: entry.completionRate >= 70 ? "#0f766e" : "#f43f5e" }}>
                      {formatPercent(entry.completionRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
