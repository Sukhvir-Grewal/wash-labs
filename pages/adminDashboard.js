import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiBarChart2,
  FiDollarSign,
  FiGrid,
  FiImage,
  FiTrendingUp,
} from "react-icons/fi";
import AdminAddBooking from "../components/AdminAddBooking";
import AddExpenseModal from "../components/AddExpenseModal";
import DashboardSectionModal from "../components/DashboardSectionModal";
import { isAuthenticated } from "../lib/auth";
import { useSessionRefresh } from "../lib/useSessionRefresh";

/**
 * Server-side authentication check
 * Redirect to login if not authenticated
 */
export async function getServerSideProps(context) {
  console.log('[adminDashboard] getServerSideProps called');
  console.log('[adminDashboard] Cookies:', context.req.headers.cookie);
  
  const authenticated = isAuthenticated(context.req);
  console.log('[adminDashboard] Authenticated:', authenticated);
  
  if (!authenticated) {
    console.log('[adminDashboard] Not authenticated, redirecting to /admin');
    return {
      redirect: {
        destination: '/admin',
        permanent: false,
      },
    };
  }
  
  console.log('[adminDashboard] Authentication successful, rendering dashboard');
  return {
    props: {},
  };
}

export default function AdminDashboard() {
  useSessionRefresh();

  const [bookings, setBookings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [detailBooking, setDetailBooking] = useState(null);
  const [confirmDeleteBooking, setConfirmDeleteBooking] = useState(false);

  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  const [expenseFilter, setExpenseFilter] = useState("all");
  const [selectedExpenseId, setSelectedExpenseId] = useState(null);
  const [expenseDeleteModalOpen, setExpenseDeleteModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(false);
  const [expenseDeleteError, setExpenseDeleteError] = useState("");

  const [activeSection, setActiveSection] = useState(null);

  const formatCurrency = (amount) => `$${Number(amount || 0).toFixed(2)}`;

  const formatDateShort = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return dateStr;
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${months[m - 1]} ${d}`;
  };

  const formatDateLong = (dateStr) => {
    if (!dateStr) return "--";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const [activeBottomPanel, setActiveBottomPanel] = useState(null);

  const metrics = useMemo(() => {
    const completed = bookings.filter((booking) => booking.status === "complete");
    const pending = bookings.filter((booking) => booking.status === "pending");
    const totalRevenue = completed.reduce(
      (sum, booking) => sum + (Number(booking.amount || 0) || 0),
      0
    );
    const pendingRevenue = pending.reduce(
      (sum, booking) => sum + (Number(booking.amount || 0) || 0),
      0
    );
    const totalBookingAmount = completed
      .concat(pending)
      .reduce((sum, booking) => sum + (Number(booking.amount || 0) || 0), 0);
    return {
      totalRevenue,
      pendingRevenue,
      totalBookingAmount,
      completedCount: completed.length,
      pendingCount: pending.length,
      totalBookings: bookings.length,
    };
  }, [bookings]);

  const bookingSummaryText = useMemo(() => {
    if (statusFilter === "pending") {
      return `Pending: ${formatCurrency(metrics.pendingRevenue)}`;
    }
    if (statusFilter === "complete") {
      return `Completed: ${formatCurrency(metrics.totalRevenue)}`;
    }
    return `Total: ${formatCurrency(metrics.totalBookingAmount)} (Completed + Pending)`;
  }, [statusFilter, metrics.pendingRevenue, metrics.totalRevenue, metrics.totalBookingAmount]);

  const expenseFilterLabels = {
    all: "All",
    equipment: "Equipment",
    chemicals: "Chemicals",
    other: "Other",
  };

  const matchExpenseFilter = useCallback(
    (expense) => {
      if (expenseFilter === "all") return true;
      const category = (expense.category || "").toLowerCase();
      if (expenseFilter === "equipment") return category === "one-time";
      if (expenseFilter === "chemicals") return category === "chemicals";
      if (expenseFilter === "other") return category !== "one-time" && category !== "chemicals";
      return true;
    },
    [expenseFilter]
  );

  const filteredExpenses = useMemo(
    () => expenses.filter(matchExpenseFilter),
    [expenses, matchExpenseFilter]
  );

  const [sortExpensesAsc, setSortExpensesAsc] = useState(false);

  const sortedExpenses = useMemo(() => {
    const base = [...filteredExpenses].sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    });
    if (!sortExpensesAsc) return base;
    return base.sort((a, b) => (Number(a.amount) || 0) - (Number(b.amount) || 0));
  }, [filteredExpenses, sortExpensesAsc]);

  const filteredExpenseTotal = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + (Number(expense.amount || 0) || 0), 0),
    [filteredExpenses]
  );

  const expenseTotalSuffix =
    expenseFilter === "all"
      ? ""
      : ` on ${(expenseFilterLabels[expenseFilter] || expenseFilter).toLowerCase()}`;

  const computeTimestamp = (booking) => {
    const dateOk =
      booking.date && /^\d{4}-\d{2}-\d{2}$/.test(booking.date) ? booking.date : "1970-01-01";
    const timeOk = booking.time && /^\d{2}:\d{2}$/.test(booking.time) ? booking.time : "00:00";
    return new Date(`${dateOk}T${timeOk}:00`).getTime();
  };

  const getDisplayBookings = useCallback(() => {
    const list = [...bookings];
    if (statusFilter === "pending") {
      return list
        .filter((booking) => booking.status === "pending")
        .sort((a, b) => computeTimestamp(a) - computeTimestamp(b));
    }
    if (statusFilter === "complete") {
      return list
        .filter((booking) => booking.status === "complete")
        .sort((a, b) => computeTimestamp(b) - computeTimestamp(a));
    }
    const pending = list.filter((booking) => booking.status === "pending");
    const others = list.filter((booking) => booking.status !== "pending");
    if (!pending.length) {
      return others.sort((a, b) => computeTimestamp(b) - computeTimestamp(a));
    }
    const asc = [...pending].sort((a, b) => computeTimestamp(a) - computeTimestamp(b));
    const first = asc[0];
    const remaining = pending
      .filter((booking) => booking !== first)
      .sort((a, b) => computeTimestamp(b) - computeTimestamp(a));
    const othersSorted = others.sort((a, b) => computeTimestamp(b) - computeTimestamp(a));
    return [first, ...remaining, ...othersSorted];
  }, [bookings, statusFilter]);

  const displayBookings = useMemo(() => getDisplayBookings(), [getDisplayBookings]);

  const pendingBookings = useMemo(() => {
    const pending = bookings.filter((booking) => booking.status === "pending");
    return pending.sort((a, b) => computeTimestamp(a) - computeTimestamp(b));
  }, [bookings]);

  const pendingRevenueTotal = useMemo(
    () => pendingBookings.reduce((sum, booking) => sum + (Number(booking.amount || 0) || 0), 0),
    [pendingBookings]
  );

  const nextPendingBooking = pendingBookings[0] || null;

  const refreshBookings = useCallback(async () => {
    const resp = await fetch("/api/get-bookings");
    const data = await resp.json();
    if (resp.ok && data.success) {
      return data.bookings.map((booking) => ({ ...booking, id: booking._id || booking.id }));
    }
    return [];
  }, []);

  const refreshExpenses = useCallback(async () => {
    const resp = await fetch("/api/expenses");
    const data = await resp.json();
    if (resp.ok && data.success) {
      return data.items || [];
    }
    return [];
  }, []);

  const updatePendingToComplete = useCallback(
    async (bookingsList) => {
      const now = new Date();
      const updates = [];
      for (const booking of bookingsList) {
        if (booking.status === "pending" && booking.date && booking.time) {
          const dt = new Date(`${booking.date}T${booking.time}:00`);
          if (dt < now) {
            updates.push(
              fetch(`/api/update-booking-status?id=${booking.id}&status=complete`, {
                method: "PATCH",
              })
            );
          }
        }
      }
      if (updates.length) {
        await Promise.all(updates);
        return true;
      }
      return false;
    },
    []
  );

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const bookingsFromDb = await refreshBookings();
      const needsRefresh = await updatePendingToComplete(bookingsFromDb);
      if (needsRefresh) {
        const refreshed = await refreshBookings();
        setBookings(refreshed);
      } else {
        setBookings(bookingsFromDb);
      }
      const expensesFromDb = await refreshExpenses();
      setExpenses(expensesFromDb);
    } catch (error) {
      setBookings([]);
      setExpenses([]);
    }
    setLoading(false);
  }, [refreshBookings, refreshExpenses, updatePendingToComplete]);

  useEffect(() => {
    bootstrap();
    const intervalId = setInterval(bootstrap, 60000);
    return () => clearInterval(intervalId);
  }, [bootstrap]);

  useEffect(() => {
    setSelectedBookingId(null);
  }, [statusFilter]);

  useEffect(() => {
    setSelectedExpenseId(null);
  }, [expenseFilter]);

  const handleAddFromChild = useCallback(async () => {
    await bootstrap();
    setBookingModalOpen(false);
    setEditingBooking(null);
  }, [bootstrap]);

  const handleEditBooking = (booking) => {
    setEditingBooking(booking);
    setBookingModalOpen(true);
  };

  const handleShowDetail = (booking) => {
    setDetailBooking(booking);
    setConfirmDeleteBooking(false);
  };

  const handleExpenseDeleteRequest = (expense) => {
    setExpenseToDelete(expense);
    setExpenseDeleteError("");
    setExpenseDeleteModalOpen(true);
  };

  const handleExpenseDelete = useCallback(async () => {
    if (!expenseToDelete?._id) return;
    setDeletingExpense(true);
    setExpenseDeleteError("");
    try {
      const resp = await fetch(`/api/expenses?id=${expenseToDelete._id}`, { method: "DELETE" });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data.success === false) {
        throw new Error(data.error || "Failed to delete expense");
      }
      setExpenses((prev) => prev.filter((expense) => expense._id !== expenseToDelete._id));
      setExpenseDeleteModalOpen(false);
      setExpenseToDelete(null);
    } catch (error) {
      setExpenseDeleteError(error.message || "Failed to delete expense");
    }
    setDeletingExpense(false);
  }, [expenseToDelete]);

  const handleBookingDelete = useCallback(async () => {
    if (!detailBooking?.id) return;
    setLoading(true);
    try {
      await fetch(`/api/delete-booking?id=${detailBooking.id}`, { method: "DELETE" });
      const bookingsFromDb = await refreshBookings();
      setBookings(bookingsFromDb);
    } catch (error) {
      setBookings([]);
    }
    setLoading(false);
    setConfirmDeleteBooking(false);
    setDetailBooking(null);
  }, [detailBooking, refreshBookings]);

  const renderBookingManager = () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "#111827" }}>
            Booking History
          </h3>
          <p className="text-sm" style={{ color: "#1f2937" }}>
            Manage every request and edit details as needed.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <span className="hidden text-xs uppercase tracking-wide text-slate-500 sm:inline">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="complete">Complete</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setEditingBooking(null);
              setBookingModalOpen(true);
            }}
            className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-blue-500 to-sky-500 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-[0_12px_24px_-16px_rgba(59,130,246,0.7)] transition hover:shadow-[0_14px_26px_-14px_rgba(99,102,241,0.8)] sm:w-auto"
          >
            New Booking
          </button>
        </div>
      </div>

      <p className="text-xs uppercase tracking-wide" style={{ color: "#1f2937" }}>
        {bookingSummaryText}
      </p>

      <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="inline-block min-w-full align-middle">
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="py-10 text-center text-sm font-semibold text-slate-500">
                Loading bookings...
              </div>
            ) : displayBookings.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-600">
                No bookings to display yet.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Status</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Client</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Amount</th>
                    <th className="hidden md:table-cell px-3 py-2 text-left font-semibold text-slate-700">Date</th>
                    <th className="hidden lg:table-cell px-3 py-2 text-left font-semibold text-slate-700">Time</th>
                    <th className="hidden lg:table-cell px-3 py-2 text-left font-semibold text-slate-700">Vehicle</th>
                    <th className="hidden xl:table-cell px-3 py-2 text-left font-semibold text-slate-700">Service</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-600">
                  {displayBookings.map((booking) => {
                    const isSelected = selectedBookingId === booking.id;
                    const badgeClasses =
                      booking.status === "complete"
                        ? "bg-emerald-100 text-emerald-700"
                        : booking.status === "pending"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600";
                    return (
                      <tr
                        key={booking.id}
                        onClick={() =>
                          setSelectedBookingId((prev) => (prev === booking.id ? null : booking.id))
                        }
                        className={`transition-colors ${
                          isSelected ? "bg-slate-100" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badgeClasses}`}
                          >
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleEditBooking(booking);
                            }}
                            className="truncate text-left text-sm font-semibold text-slate-900 underline-offset-4 hover:underline"
                          >
                            {booking.name}
                          </button>
                        </td>
                        <td className="px-3 py-2">{formatCurrency(booking.amount)}</td>
                        <td className="hidden md:table-cell px-3 py-2">{formatDateShort(booking.date)}</td>
                        <td className="hidden lg:table-cell px-3 py-2">{booking.time || "--"}</td>
                        <td className="hidden lg:table-cell px-3 py-2">{booking.carName || "--"}</td>
                        <td className="hidden xl:table-cell px-3 py-2">{booking.service}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleShowDetail(booking);
                            }}
                            className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-slate-100"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderExpenseManager = () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "#111827" }}>
            Expense History
          </h3>
          <p className="text-sm" style={{ color: "#1f2937" }}>
            Track operational costs and keep margins in check.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <span className="hidden text-xs uppercase tracking-wide text-slate-500 sm:inline">Category</span>
            <select
              value={expenseFilter}
              onChange={(event) => setExpenseFilter(event.target.value)}
              className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">All</option>
              <option value="equipment">Equipment</option>
              <option value="chemicals">Chemicals</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-slate-500">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
              checked={sortExpensesAsc}
              onChange={(event) => setSortExpensesAsc(event.target.checked)}
            />
            <span className="text-slate-600">Amount ↑</span>
          </label>
          <button
            type="button"
            onClick={() => setExpenseModalOpen(true)}
            className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-br from-rose-500 via-fuchsia-500 to-purple-500 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-[0_12px_24px_-16px_rgba(236,72,153,0.7)] transition hover:shadow-[0_14px_26px_-14px_rgba(192,38,211,0.85)] sm:w-auto"
          >
            New Expense
          </button>
        </div>
      </div>

      <p className="text-xs uppercase tracking-wide" style={{ color: "#1f2937" }}>
        Total spent{expenseTotalSuffix}: {formatCurrency(filteredExpenseTotal)}
      </p>

      <div className="flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-10 text-center text-sm font-semibold text-slate-500">
              Loading expenses...
            </div>
          ) : sortedExpenses.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-600">No expenses captured yet.</div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Date</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Item</th>
                  <th className="hidden md:table-cell px-3 py-2 text-left font-semibold text-slate-700">Supplier</th>
                  <th className="hidden lg:table-cell px-3 py-2 text-left font-semibold text-slate-700">Category</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Amount</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-600">
                {sortedExpenses.map((expense) => {
                  const rowId = expense._id || `${expense.date}-${expense.productName}`;
                  const isSelected = selectedExpenseId === rowId;
                  const categoryLabel =
                    expense.category === "one-time"
                      ? "Equipment"
                      : expense.category === "chemicals"
                      ? "Chemicals"
                      : expense.category || "Other";
                  return (
                    <tr
                      key={rowId}
                      onClick={() =>
                        setSelectedExpenseId((prev) => (prev === rowId ? null : rowId))
                      }
                      className={`transition-colors ${
                        isSelected ? "bg-slate-100" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-3 py-2">{formatDateShort(expense.date)}</td>
                      <td className="px-3 py-2 text-slate-700">
                        <span className="block max-w-[10rem] truncate sm:max-w-xs md:max-w-md">
                          {expense.productName || "--"}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-3 py-2">{expense.supplier || "--"}</td>
                      <td className="hidden lg:table-cell px-3 py-2">{categoryLabel}</td>
                      <td className="px-3 py-2">
                        {formatCurrency(expense.amount)}
                        {expense.taxIncluded && (
                          <span className="ml-2 text-[11px] text-slate-500">(tax incl.)</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleExpenseDeleteRequest(expense);
                          }}
                          className="rounded-full border border-rose-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-600 transition hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );

  const renderInsightsMenu = () => (
    <div className="grid gap-3 sm:grid-cols-2">
      {Object.entries(SECTION_CONFIG).map(([key, value]) => {
        const Icon = value.icon;
        return (
          <button
            key={key}
            type="button"
            onClick={() => {
              setActiveSection(key);
              setActiveBottomPanel(null);
            }}
            className="flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Icon size={18} />
            </span>
            <span className="text-sm font-semibold text-slate-900">{value.label}</span>
            <span className="text-xs text-slate-500">{value.hint}</span>
          </button>
        );
      })}
    </div>
  );

  const renderBottomPanelContent = () => {
    switch (activeBottomPanel) {
      case "bookings":
        return renderBookingManager();
      case "expenses":
        return renderExpenseManager();
      case "insights":
        return renderInsightsMenu();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 pt-12 pb-32 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1
              className="text-3xl font-semibold sm:text-4xl"
              style={{ color: "#111827" }}
            >
              Admin Dashboard
            </h1>
            <p className="text-sm" style={{ color: "#1f2937" }}>
              Stay on top of upcoming work and use the bottom bar for history and insights.
            </p>
          </div>
        </header>

        <section className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold" style={{ color: "#111827" }}>
                Create a Booking
              </h2>
              <p className="text-sm" style={{ color: "#1f2937" }}>
                Start a fresh appointment without leaving the dashboard.
              </p>
              <p className="mt-3 text-xs uppercase tracking-wide" style={{ color: "#1f2937" }}>
                {nextPendingBooking
                  ? `Next service: ${formatDateLong(nextPendingBooking.date)} at ${
                      nextPendingBooking.time || "--"
                    }`
                  : "No upcoming services scheduled."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingBooking(null);
                setBookingModalOpen(true);
              }}
              className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-blue-500 to-sky-500 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-[0_12px_24px_-16px_rgba(59,130,246,0.7)] transition hover:shadow-[0_14px_26px_-14px_rgba(99,102,241,0.8)] sm:w-auto"
            >
              New Booking
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-slate-500">Pending</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{pendingBookings.length}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-slate-500">Pending Revenue</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {formatCurrency(pendingRevenueTotal)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-slate-500">All Bookings</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{metrics.totalBookings}</div>
            </div>
          </div>
        </section>

        <section className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold" style={{ color: "#111827" }}>
                Pending bookings
              </h2>
              <p className="text-sm" style={{ color: "#1f2937" }}>
                Review what is coming up next. Open the bottom bar for full history.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveBottomPanel("bookings")}
              className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-slate-100 sm:w-auto"
            >
              Manage all bookings
            </button>
          </header>

          <p className="mt-4 text-xs uppercase tracking-wide" style={{ color: "#1f2937" }}>
            {pendingBookings.length
              ? `Outstanding: ${pendingBookings.length} • ${formatCurrency(pendingRevenueTotal)}`
              : "No pending work right now."}
          </p>

          <div className="mt-4 flex-1 rounded-2xl border border-slate-200 bg-white">
            {loading ? (
              <div className="py-10 text-center text-sm font-semibold text-slate-500">
                Loading bookings...
              </div>
            ) : pendingBookings.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-600">
                Nothing pending. Enjoy the calm before the next rush!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-2 py-2 text-left font-semibold text-slate-700">Client</th>
                      <th className="hidden sm:table-cell px-2 py-2 text-left font-semibold text-slate-700">Service</th>
                      <th className="px-2 py-2 text-left font-semibold text-slate-700">Date</th>
                      <th className="hidden md:table-cell px-2 py-2 text-left font-semibold text-slate-700">Time</th>
                      <th className="hidden lg:table-cell px-2 py-2 text-left font-semibold text-slate-700">Vehicle</th>
                      <th className="px-2 py-2 text-left font-semibold text-slate-700">Amount</th>
                      <th className="px-2 py-2 text-left font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-600">
                    {pendingBookings.map((booking) => {
                      const isSelected = selectedBookingId === booking.id;
                      return (
                        <tr
                          key={booking.id}
                          onClick={() =>
                            setSelectedBookingId((prev) => (prev === booking.id ? null : booking.id))
                          }
                          className={`transition-colors ${
                            isSelected ? "bg-slate-100" : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleEditBooking(booking);
                              }}
                              className="truncate text-left text-sm font-semibold text-slate-900 underline-offset-4 hover:underline"
                            >
                              {booking.name}
                            </button>
                          </td>
                          <td className="hidden sm:table-cell px-2 py-2">{booking.service || "--"}</td>
                          <td className="px-2 py-2">{formatDateShort(booking.date)}</td>
                          <td className="hidden md:table-cell px-2 py-2">{booking.time || "--"}</td>
                          <td className="hidden lg:table-cell px-2 py-2">{booking.carName || "--"}</td>
                          <td className="px-2 py-2">{formatCurrency(booking.amount)}</td>
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleShowDetail(booking);
                              }}
                              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-slate-100"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="pointer-events-none fixed bottom-6 left-1/2 z-40 flex w-[min(92vw,420px)] -translate-x-1/2">
        <div className="pointer-events-auto flex w-full gap-2 rounded-2xl border border-white/40 bg-white/20 p-2 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          {BOTTOM_ACTIONS.map((action) => {
            const Icon = action.icon;
            const isActive = activeBottomPanel === action.key;
            return (
              <button
                key={action.key}
                type="button"
                onClick={() =>
                  setActiveBottomPanel((prev) => (prev === action.key ? null : action.key))
                }
                className={`flex-1 rounded-xl border px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] transition backdrop-blur-lg ${
                  isActive
                    ? "border-white/60 bg-white/60 text-slate-900 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.35)]"
                    : "border-white/30 bg-white/10 text-slate-700 hover:border-white/50 hover:bg-white/30 hover:text-slate-900"
                }`}
              >
                <span className="flex flex-col items-center gap-1">
                  <Icon size={16} />
                  <span>{action.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeBottomPanel && (() => {
        const panelMeta = BOTTOM_PANEL_META[activeBottomPanel] || { title: "", description: "" };
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 backdrop-blur-sm">
            <div className="w-[96vw] max-w-5xl rounded-t-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:rounded-3xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold" style={{ color: "#111827" }}>
                    {panelMeta.title}
                  </h2>
                  <p className="text-sm" style={{ color: "#1f2937" }}>
                    {panelMeta.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveBottomPanel(null)}
                  className="rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
              <div className="mt-6 max-h-[70vh] overflow-y-auto pr-1">
                {renderBottomPanelContent()}
              </div>
            </div>
          </div>
        );
      })()}

      <DashboardSectionModal
        section={activeSection}
        config={SECTION_CONFIG}
        onClose={() => setActiveSection(null)}
        bookings={bookings}
        expenses={expenses}
        metrics={{
          totalRevenue: metrics.totalRevenue,
          pendingRevenue: metrics.pendingRevenue,
          totalBookings: metrics.totalBookings,
          completedCount: metrics.completedCount,
          pendingCount: metrics.pendingCount,
        }}
      />

      {expenseDeleteModalOpen && expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold" style={{ color: "#111827" }}>
              Delete expense
            </h3>
            <p className="mt-3 text-sm" style={{ color: "#1f2937" }}>
              Remove {expenseToDelete.productName || "this entry"} recorded on {" "}
              {formatDateLong(expenseToDelete.date)} for {formatCurrency(expenseToDelete.amount)}?
            </p>
            {expenseDeleteError && (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {expenseDeleteError}
              </p>
            )}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setExpenseDeleteModalOpen(false);
                  setExpenseToDelete(null);
                }}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                disabled={deletingExpense}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExpenseDelete}
                className="rounded-full bg-gradient-to-br from-rose-500 to-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_28px_-18px_rgba(244,63,94,0.8)] transition hover:shadow-[0_18px_28px_-14px_rgba(252,88,107,0.9)] disabled:opacity-60"
                disabled={deletingExpense}
              >
                {deletingExpense ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold" style={{ color: "#111827" }}>
                  Booking details
                </h3>
                <p className="text-sm" style={{ color: "#1f2937" }}>
                  {detailBooking.service}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDetailBooking(null);
                  setConfirmDeleteBooking(false);
                }}
                className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <div className="mt-6 grid gap-3 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Client</span>
                <span className="font-semibold text-slate-900">{detailBooking.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Service date</span>
                <span>{formatDateLong(detailBooking.date)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Time</span>
                <span>{detailBooking.time || "--"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Amount</span>
                <span className="font-semibold text-slate-900">{formatCurrency(detailBooking.amount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-wide text-slate-700">
                  {detailBooking.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Vehicle</span>
                <span>{detailBooking.carName || "--"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Phone</span>
                <span>{detailBooking.phone || "--"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Email</span>
                <span>{detailBooking.email || "--"}</span>
              </div>
              <div>
                <span className="text-slate-500">Add-ons</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Array.isArray(detailBooking.addOns) && detailBooking.addOns.length ? (
                    detailBooking.addOns.map((addon, index) => (
                      <span
                        key={`${addon.label}-${index}`}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                      >
                        {addon.label}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">No add-ons</span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-8 flex items-center justify-end gap-3">
              {!confirmDeleteBooking ? (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteBooking(true)}
                    className="rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    Delete booking
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailBooking(null);
                      setConfirmDeleteBooking(false);
                    }}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteBooking(false)}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBookingDelete}
                    className="rounded-full bg-gradient-to-br from-rose-500 to-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_28px_-18px_rgba(244,63,94,0.8)] transition hover:shadow-[0_18px_28px_-14px_rgba(252,88,107,0.9)]"
                  >
                    Confirm delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <AdminAddBooking
        open={bookingModalOpen}
        onClose={() => {
          setBookingModalOpen(false);
          setEditingBooking(null);
        }}
        onAdd={handleAddFromChild}
        editBooking={editingBooking}
        onEdit={async (updated) => {
          if (!updated.id) return;
          setLoading(true);
          try {
            await fetch(`/api/update-booking?id=${updated.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updated),
            });
            const bookingsFromDb = await refreshBookings();
            setBookings(bookingsFromDb);
          } catch (error) {
            setBookings([]);
          }
          setLoading(false);
          setBookingModalOpen(false);
          setEditingBooking(null);
        }}
      />

      <AddExpenseModal
        open={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSuccess={(newExpense) => {
          setExpenses((prev) => [newExpense, ...prev]);
          setExpenseModalOpen(false);
        }}
      />
    </div>
  );
}

const SECTION_CONFIG = {
  services: {
    label: "Services & Pricing",
    hint: "Update packages, add-ons, and durations.",
    icon: FiGrid,
  },
  gallery: {
    label: "Gallery",
    hint: "Upload, compress, and curate visuals.",
    icon: FiImage,
  },
  revenue: {
    label: "Revenue Trends",
    hint: "Track earned versus pending income.",
    icon: FiTrendingUp,
  },
  expenses: {
    label: "Expense Analytics",
    hint: "Visualize operational spending patterns.",
    icon: FiDollarSign,
  },
  profit: {
    label: "Profitability",
    hint: "Review margin and contribution trends.",
    icon: FiBarChart2,
  },
  pe: {
    label: "P/E & Availability",
    hint: "Gauge efficiency and service capacity.",
    icon: FiActivity,
  },
};

const BOTTOM_ACTIONS = [
  { key: "bookings", label: "Bookings", icon: FiActivity },
  { key: "expenses", label: "Expenses", icon: FiDollarSign },
  { key: "insights", label: "Insights", icon: FiTrendingUp },
];

const BOTTOM_PANEL_META = {
  bookings: {
    title: "Manage Bookings",
    description: "Review every booking, update statuses, and edit clients without leaving this view.",
  },
  expenses: {
    title: "Manage Expenses",
    description: "Capture new spend, tidy up records, and keep a pulse on operating costs.",
  },
  insights: {
    title: "Insights & Sections",
    description: "Jump into deeper analytics, services, and gallery tools when you need them.",
  },
};


