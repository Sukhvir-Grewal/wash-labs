import { useMemo, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
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

function formatMonthKey(key) {
  if (!key) return "--";
  const [year, month] = key.split("-");
  const numericMonth = Number(month) - 1;
  if (Number.isNaN(numericMonth)) return key;
  const label = new Date(Number(year), numericMonth, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
  return label;
}

function buildMonthlySnapshot(bookings, expenses) {
  const map = new Map();
  const ensureEntry = (key) => {
    if (!key) return null;
    if (!map.has(key)) {
      map.set(key, {
        key,
        revenue: 0,
        expenses: 0,
        bookingCount: 0,
      });
    }
    return map.get(key);
  };

  (bookings || []).forEach((booking) => {
    if (!booking?.date || booking.status !== "complete") return;
    const key = booking.date.slice(0, 7);
    const amount = Number(booking.amount) || 0;
    const entry = ensureEntry(key);
    if (!entry) return;
    entry.revenue += amount;
    entry.bookingCount += 1;
  });

  (expenses || []).forEach((expense) => {
    if (!expense?.date) return;
    const key = expense.date.slice(0, 7);
    const amount = Number(expense.amount) || 0;
    const entry = ensureEntry(key);
    if (!entry) return;
    entry.expenses += amount;
  });

  return Array.from(map.values())
    .map((entry) => {
      const profit = entry.revenue - entry.expenses;
      const margin = entry.revenue ? (profit / entry.revenue) * 100 : 0;
      return {
        ...entry,
        label: formatMonthKey(entry.key),
        profit,
        margin,
      };
    })
    .filter((entry) => entry.revenue || entry.expenses)
    .sort((a, b) => (a.key > b.key ? 1 : -1));
}

export default function ProfitsCard({ bookings = [], expenses = [] }) {
  const [range, setRange] = useState("6m");
  const [chartView, setChartView] = useState("net");
  const [netChartType, setNetChartType] = useState("area");

  const monthlySnapshots = useMemo(() => buildMonthlySnapshot(bookings, expenses), [bookings, expenses]);

  const filteredMonthly = useMemo(() => {
    if (!monthlySnapshots.length) return [];
    if (range === "all") return monthlySnapshots;
    const limit = RANGE_LIMITS[range];
    if (!limit) return monthlySnapshots;
    const now = new Date();
    return monthlySnapshots.filter((entry) => {
      const [year, month] = entry.key.split("-");
      const y = Number(year);
      const m = Number(month) - 1;
      if (Number.isNaN(y) || Number.isNaN(m)) return false;
      const diffMonths = (now.getFullYear() - y) * 12 + now.getMonth() - m;
      return diffMonths <= limit - 1;
    });
  }, [monthlySnapshots, range]);

  const totalRevenue = useMemo(
    () => filteredMonthly.reduce((sum, entry) => sum + entry.revenue, 0),
    [filteredMonthly]
  );
  const totalExpenses = useMemo(
    () => filteredMonthly.reduce((sum, entry) => sum + entry.expenses, 0),
    [filteredMonthly]
  );
  const totalProfit = totalRevenue - totalExpenses;
  const marginPercent = totalRevenue ? (totalProfit / totalRevenue) * 100 : 0;
  const avgMonthlyProfit = filteredMonthly.length ? totalProfit / filteredMonthly.length : 0;
  const avgMargin = filteredMonthly.length
    ? filteredMonthly.reduce((sum, entry) => sum + entry.margin, 0) / filteredMonthly.length
    : 0;
  const positiveMonths = filteredMonthly.filter((entry) => entry.profit > 0).length;
  const negativeMonths = filteredMonthly.filter((entry) => entry.profit < 0).length;
  const rangeLabel = RANGE_LABELS[range] || "All-time";

  const bestMonth = filteredMonthly.reduce(
    (best, entry) => (entry.profit > (best?.profit ?? -Infinity) ? entry : best),
    null
  );
  const toughestMonth = filteredMonthly.reduce(
    (worst, entry) => (entry.profit < (worst?.profit ?? Infinity) ? entry : worst),
    null
  );

  const latestMonth = filteredMonthly.at(-1) || null;
  const previousMonth = filteredMonthly.at(-2) || null;
  let monthDeltaLabel = "—";
  let monthDeltaColor = "#0f172a";
  if (latestMonth && previousMonth) {
    if (previousMonth.profit === 0) {
      monthDeltaLabel = latestMonth.profit >= 0 ? "Positive momentum" : "Negative momentum";
      monthDeltaColor = latestMonth.profit >= 0 ? "#16a34a" : "#dc2626";
    } else {
      const growth = ((latestMonth.profit - previousMonth.profit) / Math.abs(previousMonth.profit)) * 100;
      monthDeltaLabel = `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}% vs prior month`;
      monthDeltaColor = growth >= 0 ? "#16a34a" : "#dc2626";
    }
  }

  const timelineLabels = filteredMonthly.map((entry) => entry.label);
  const netProfitValues = filteredMonthly.map((entry) => Number(entry.profit.toFixed(2)));
  const revenueValues = filteredMonthly.map((entry) => Number(entry.revenue.toFixed(2)));
  const expenseValues = filteredMonthly.map((entry) => Number(entry.expenses.toFixed(2)));
  const marginValues = filteredMonthly.map((entry) => Number(entry.margin.toFixed(2)));

  const netDataset = {
    label: "Net profit",
    data: netProfitValues,
    borderColor: "#16a34a",
    backgroundColor:
      netChartType === "bar"
        ? netProfitValues.map((value) => (value >= 0 ? "rgba(34,197,94,0.65)" : "rgba(239,68,68,0.7)"))
        : "rgba(34,197,94,0.18)",
    borderWidth: netChartType === "bar" ? 0 : 2,
    fill: netChartType === "area",
    tension: 0.32,
    pointRadius: netChartType === "bar" ? 0 : 4,
    pointBackgroundColor: netChartType === "bar" ? undefined : "#16a34a",
    pointBorderColor: netChartType === "bar" ? undefined : "#ffffff",
    pointHoverRadius: netChartType === "bar" ? 0 : 5,
    maxBarThickness: 32,
    borderRadius: netChartType === "bar" ? 10 : undefined,
  };

  const netChartData = {
    labels: timelineLabels,
    datasets: [netDataset],
  };

  const netChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
        ticks: {
          color: "#0f172a",
          callback: (value) => formatCurrency(Number(value), 0),
        },
        grid: { color: "#f1f5f9" },
      },
    },
  };

  const comparisonData = {
    labels: timelineLabels,
    datasets: [
      {
        label: "Revenue",
        data: revenueValues,
        backgroundColor: "rgba(37,99,235,0.65)",
        borderRadius: 10,
        maxBarThickness: 32,
      },
      {
        label: "Expenses",
        data: expenseValues,
        backgroundColor: "rgba(239,68,68,0.7)",
        borderRadius: 10,
        maxBarThickness: 32,
      },
    ],
  };

  const comparisonOptions = {
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
        beginAtZero: true,
        ticks: {
          color: "#0f172a",
          callback: (value) => formatCurrency(Number(value), 0),
        },
        grid: { color: "#f1f5f9" },
      },
    },
  };

  const marginData = {
    labels: timelineLabels,
    datasets: [
      {
        label: "Margin %",
        data: marginValues,
        borderColor: "#0ea5e9",
        backgroundColor: "rgba(14,165,233,0.18)",
        tension: 0.35,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: "#0ea5e9",
        pointBorderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const marginOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ({ formattedValue }) => `${Number(formattedValue).toFixed(1)}% margin`,
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

  const ChartComponent = netChartType === "bar" ? Bar : Line;
  const hasData = filteredMonthly.length > 0;

  const summaryCards = [
    {
      title: `Net Profit (${rangeLabel})`,
      value: formatCurrency(totalProfit, 0),
      subtitle: `Margin ${formatPercent(marginPercent)}`,
      accent: totalProfit >= 0 ? "#16a34a" : "#dc2626",
    },
    {
      title: "Revenue vs. Expenses",
      value: formatCurrency(totalRevenue, 0),
      subtitle: `Expenses ${formatCurrency(totalExpenses, 0)}`,
      accent: "#2563eb",
    },
    {
      title: "Avg. Monthly Profit",
      value: formatCurrency(avgMonthlyProfit, 0),
      subtitle: `${filteredMonthly.length} month${filteredMonthly.length === 1 ? "" : "s"} tracked`,
      accent: "#10b981",
    },
    {
      title: "Win / Loss Months",
      value: `${positiveMonths} / ${negativeMonths}`,
      subtitle: `Avg margin ${formatPercent(avgMargin)}`,
      accent: "#0ea5e9",
    },
  ];

  const insightItems = [
    {
      label: "Best month",
      value: bestMonth ? `${bestMonth.label} · ${formatCurrency(bestMonth.profit, 0)}` : "Awaiting data",
      tone: "#16a34a",
    },
    {
      label: "Toughest month",
      value: toughestMonth ? `${toughestMonth.label} · ${formatCurrency(toughestMonth.profit, 0)}` : "—",
      tone: "#dc2626",
    },
    {
      label: "Booked jobs",
      value: filteredMonthly.reduce((sum, entry) => sum + entry.bookingCount, 0).toString(),
      tone: "#2563eb",
    },
    {
      label: "Month-over-month",
      value: monthDeltaLabel,
      tone: monthDeltaColor,
    },
  ];

  const monthlyTableRows = [...filteredMonthly].sort((a, b) => (a.key > b.key ? -1 : 1));

  return (
    <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-[0_24px_60px_-32px_rgba(16,185,129,0.18)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <h3 className="text-2xl font-semibold" style={{ color: "#064e3b" }}>
            Profitability Outlook
          </h3>
          <p className="text-sm leading-6" style={{ color: "#047857" }}>
            Compare revenue against operational spend, watch margins, and pinpoint months that drive growth or drag.
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
                      backgroundColor: "#10b981",
                      borderColor: "#10b981",
                      color: "#ffffff",
                      boxShadow: "0 12px 30px rgba(16, 185, 129, 0.25)",
                    }
                  : {
                      backgroundColor: "#ffffff",
                      borderColor: "rgba(16, 185, 129, 0.25)",
                      color: "#047857",
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
          <div key={card.title} className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#047857" }}>
              {card.title}
            </p>
            <p className="mt-2 text-2xl font-semibold" style={{ color: "#064e3b" }}>
              {card.value}
            </p>
            <p className="mt-1 text-xs font-semibold" style={{ color: card.accent }}>
              {card.subtitle}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "#047857" }}>
          View
        </div>
        {[
          { value: "net", label: "Net Profit" },
          { value: "comparison", label: "Revenue vs Expenses" },
          { value: "margin", label: "Margin %" },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setChartView(option.value)}
            className="rounded-full border px-4 py-1.5 text-xs font-semibold transition"
            style={
              chartView === option.value
                ? {
                    backgroundColor: "#10b981",
                    borderColor: "#10b981",
                    color: "#ffffff",
                  }
                : {
                    backgroundColor: "#ffffff",
                    borderColor: "rgba(16, 185, 129, 0.25)",
                    color: "#047857",
                  }
            }
          >
            {option.label}
          </button>
        ))}

        {chartView === "net" && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#047857" }}>
              Chart
            </span>
            {["bar", "line", "area"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setNetChartType(type)}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                style={
                  netChartType === type
                    ? {
                        backgroundColor: "#ecfdf5",
                        borderColor: "#0f766e",
                        color: "#0f766e",
                      }
                    : {
                        backgroundColor: "#ffffff",
                        borderColor: "rgba(15, 118, 110, 0.3)",
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

      <div className="mt-6 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        {!hasData ? (
          <div className="py-16 text-center text-sm" style={{ color: "#047857" }}>
            No profitability records for the selected range yet.
          </div>
        ) : chartView === "comparison" ? (
          <div style={{ minHeight: 260 }}>
            <Bar data={comparisonData} options={comparisonOptions} />
          </div>
        ) : chartView === "margin" ? (
          <div style={{ minHeight: 260 }}>
            <Line data={marginData} options={marginOptions} />
          </div>
        ) : (
          <div style={{ minHeight: 260 }}>
            <ChartComponent data={netChartData} options={netChartOptions} />
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <h4 className="text-base font-semibold" style={{ color: "#064e3b" }}>
            Key insights
          </h4>
          <div className="mt-4 space-y-3 text-sm">
            {insightItems.map((item) => (
              <div key={item.label} className="rounded-xl border border-emerald-100 bg-white px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#047857" }}>
                  {item.label}
                </div>
                <div className="mt-1 text-sm font-semibold" style={{ color: item.tone }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <h4 className="text-base font-semibold" style={{ color: "#064e3b" }}>
            Profit health
          </h4>
          <p className="text-xs" style={{ color: "#047857" }}>
            Keep margins resilient by balancing acquisition costs and operational efficiency.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <div className="text-xs uppercase tracking-wide" style={{ color: "#047857" }}>
                Positive streak
              </div>
              <div className="mt-1 text-xl font-semibold" style={{ color: "#065f46" }}>
                {positiveMonths || 0}
              </div>
              <div className="text-xs" style={{ color: "#047857" }}>
                Months netted gains
              </div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3">
              <div className="text-xs uppercase tracking-wide" style={{ color: "#dc2626" }}>
                Loss months
              </div>
              <div className="mt-1 text-xl font-semibold" style={{ color: "#dc2626" }}>
                {negativeMonths || 0}
              </div>
              <div className="text-xs" style={{ color: "#64748b" }}>
                Focus on trimming spend
              </div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3">
              <div className="text-xs uppercase tracking-wide" style={{ color: "#2563eb" }}>
                Revenue coverage
              </div>
              <div className="mt-1 text-xl font-semibold" style={{ color: "#1d4ed8" }}>
                {totalExpenses ? (totalRevenue / totalExpenses).toFixed(2) : "—"}
              </div>
              <div className="text-xs" style={{ color: "#64748b" }}>
                Revenue ÷ expenses
              </div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3">
              <div className="text-xs uppercase tracking-wide" style={{ color: "#0ea5e9" }}>
                Avg margin
              </div>
              <div className="mt-1 text-xl font-semibold" style={{ color: "#0ea5e9" }}>
                {formatPercent(avgMargin)}
              </div>
              <div className="text-xs" style={{ color: "#64748b" }}>
                Across tracked months
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <h4 className="text-base font-semibold" style={{ color: "#064e3b" }}>
          Monthly breakdown
        </h4>
        <p className="text-xs" style={{ color: "#047857" }}>
          Review recent months to verify margins and course-correct.</p>
        {!hasData ? (
          <div className="mt-6 rounded-xl border border-dashed border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-sm" style={{ color: "#047857" }}>
            No entries to display.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-emerald-100">
            <table className="min-w-full divide-y divide-emerald-100 text-sm">
              <thead className="bg-emerald-50 text-emerald-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Month</th>
                  <th className="px-4 py-3 text-left font-semibold">Revenue</th>
                  <th className="px-4 py-3 text-left font-semibold">Expenses</th>
                  <th className="px-4 py-3 text-left font-semibold">Net Profit</th>
                  <th className="px-4 py-3 text-left font-semibold">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100 bg-white">
                {monthlyTableRows.map((entry) => (
                  <tr key={entry.key} className="hover:bg-emerald-50/60">
                    <td className="px-4 py-3" style={{ color: "#065f46" }}>
                      {entry.label}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#0f172a" }}>
                      {formatCurrency(entry.revenue, 0)}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#dc2626" }}>
                      {formatCurrency(entry.expenses, 0)}
                    </td>
                    <td className="px-4 py-3" style={{ color: entry.profit >= 0 ? "#16a34a" : "#dc2626" }}>
                      {formatCurrency(entry.profit, 0)}
                    </td>
                    <td className="px-4 py-3" style={{ color: entry.margin >= 0 ? "#0ea5e9" : "#dc2626" }}>
                      {formatPercent(entry.margin)}
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
