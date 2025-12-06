import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [dateFilter, setDateFilter] = useState("all");
  const [dateOrder, setDateOrder] = useState("desc");
  const [priceFilter, setPriceFilter] = useState("all");
  const [selectedExpenseId, setSelectedExpenseId] = useState(null);
  const [expenseDeleteModalOpen, setExpenseDeleteModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(false);
  const [expenseDeleteError, setExpenseDeleteError] = useState("");

  const [activeBottomPanel, setActiveBottomPanel] = useState("bookings");
  const [activeSection, setActiveSection] = useState(null);
  const bookingScrollRef = useRef(null);
  const expenseScrollRef = useRef(null);
  const bottomPanelRef = useRef(null);

  useEffect(() => {
    if (activeBottomPanel === "bookings" && bookingScrollRef.current) {
      bookingScrollRef.current.scrollTop = 0;
    }
    if (activeBottomPanel === "expenses" && expenseScrollRef.current) {
      expenseScrollRef.current.scrollTop = 0;
    }
    if (bottomPanelRef.current) {
      bottomPanelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeBottomPanel]);

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

  const dateFilterLabels = {
    all: "All dates",
    last7: "Last 7 days",
    last30: "Last 30 days",
    thisYear: "This year",
    older: "Older (30+ days)",
  };

  const priceFilterLabels = {
    all: "",
    high: " (Price ↑)",
    low: " (Price ↓)",
  };

  const priceThreshold = useMemo(() => {
    const amounts = expenses
      .map((item) => Number(item.amount || 0))
      .filter((amount) => !Number.isNaN(amount));
    if (amounts.length === 0) return 0;
    const sorted = [...amounts].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }, [expenses]);

  const priceFilterDescription = useMemo(() => {
    if (priceFilter === "high") {
      return `Showing expenses at or above ${formatCurrency(priceThreshold)}.`;
    }
    if (priceFilter === "low") {
      return priceThreshold > 0
        ? `Showing expenses below ${formatCurrency(priceThreshold)}.`
        : "Showing zero-cost expenses only.";
    }
    return "Showing all expense amounts.";
  }, [priceFilter, priceThreshold]);

  const dateFilterDescription = useMemo(() => {
    const currentYear = new Date().getFullYear();
    switch (dateFilter) {
      case "last7":
        return "Limited to expenses from the last 7 days.";
      case "last30":
        return "Limited to expenses from the last 30 days.";
      case "thisYear":
        return `Limited to expenses recorded in ${currentYear}.`;
      case "older":
        return "Showing expenses older than 30 days.";
      default:
        return "Using all expense dates.";
    }
  }, [dateFilter]);

  const orderDescription = dateOrder === "asc"
    ? "Oldest expenses shown first."
    : "Newest expenses shown first.";

  const filterDescriptionText = useMemo(() => {
    return [priceFilterDescription, dateFilterDescription, orderDescription].filter(Boolean).join(" ");
  }, [priceFilterDescription, dateFilterDescription, orderDescription]);

  const activeFilterBadges = useMemo(() => {
    const badges = [];

    if (expenseFilter !== "all") {
      badges.push({
        key: "category",
        text: `Category • ${expenseFilterLabels[expenseFilter] || expenseFilter}`,
      });
    }

    if (dateFilter !== "all") {
      badges.push({
        key: "date",
        text: `Date • ${dateFilterLabels[dateFilter] || dateFilter}`,
      });
    }

    if (priceFilter !== "all") {
      const comparatorText =
        priceFilter === "high"
          ? `≥ ${formatCurrency(priceThreshold)}`
          : priceThreshold > 0
          ? `< ${formatCurrency(priceThreshold)}`
          : "0 only";
      badges.push({
        key: "price",
        text: `${priceFilter === "high" ? "Price ↑" : "Price ↓"} • ${comparatorText}`,
      });
    }

    if (dateOrder === "asc") {
      badges.push({ key: "order", text: "Order • Oldest first" });
    }

    return badges;
  }, [expenseFilter, dateFilter, priceFilter, priceThreshold, dateOrder]);

  const matchExpenseFilter = useCallback(
    (expense) => {
      const category = (expense.category || "").toLowerCase();
      if (expenseFilter === "equipment" && category !== "one-time") return false;
      if (expenseFilter === "chemicals" && category !== "chemicals") return false;
      if (expenseFilter === "other" && (category === "one-time" || category === "chemicals")) return false;

      const matchesDateFilter = () => {
        if (dateFilter === "all") return true;
        if (!expense.date) return false;
        const expenseDate = new Date(expense.date);
        if (Number.isNaN(expenseDate.getTime())) return false;

        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const expenseDay = new Date(
          expenseDate.getFullYear(),
          expenseDate.getMonth(),
          expenseDate.getDate()
        );
        const msPerDay = 24 * 60 * 60 * 1000;
        const diffDays = Math.floor((startOfToday.getTime() - expenseDay.getTime()) / msPerDay);

        switch (dateFilter) {
          case "last7":
            return diffDays >= 0 && diffDays <= 6;
          case "last30":
            return diffDays >= 0 && diffDays <= 29;
          case "thisYear":
            return expenseDay.getFullYear() === startOfToday.getFullYear();
          case "older":
            return diffDays > 29;
          default:
            return true;
        }
      };

      if (!matchesDateFilter()) return false;

      const amount = Number(expense.amount || 0);
      if (!Number.isNaN(amount)) {
        if (priceFilter === "high" && amount < priceThreshold) return false;
        if (priceFilter === "low") {
          if (priceThreshold > 0 && amount >= priceThreshold) return false;
          if (priceThreshold === 0 && amount > 0) return false;
        }
      }

      return true;
    },
    [expenseFilter, dateFilter, priceFilter, priceThreshold]
  );

  const filteredExpenses = useMemo(
    () => expenses.filter(matchExpenseFilter),
    [expenses, matchExpenseFilter]
  );

  const displayExpenses = useMemo(() => {
    const toTime = (value) => new Date(value || 0).getTime();
    const byDateAsc = (a, b) => toTime(a.date) - toTime(b.date);
    const byDateDesc = (a, b) => toTime(b.date) - toTime(a.date);
    const byAmountDesc = (a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0);
    const byAmountAsc = (a, b) => (Number(a.amount) || 0) - (Number(b.amount) || 0);
    const resolveDateOrder = (a, b) => (dateOrder === "asc" ? byDateAsc(a, b) : byDateDesc(a, b));

    if (priceFilter === "high") {
      return [...filteredExpenses].sort((a, b) => {
        const amountCompare = byAmountDesc(a, b);
        if (amountCompare !== 0) return amountCompare;
        return resolveDateOrder(a, b);
      });
    }

    if (priceFilter === "low") {
      return [...filteredExpenses].sort((a, b) => {
        const amountCompare = byAmountAsc(a, b);
        if (amountCompare !== 0) return amountCompare;
        return resolveDateOrder(a, b);
      });
    }

    return [...filteredExpenses].sort(resolveDateOrder);
  }, [filteredExpenses, priceFilter, dateOrder]);

  const filteredExpenseTotal = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + (Number(expense.amount || 0) || 0), 0),
    [filteredExpenses]
  );

  const expenseTotalSuffix = (() => {
    const categorySuffix =
      expenseFilter === "all"
        ? ""
        : ` on ${(expenseFilterLabels[expenseFilter] || expenseFilter).toLowerCase()}`;
    const priceSuffix = priceFilterLabels[priceFilter] || "";
    const dateSuffix =
      dateFilter === "all"
        ? ""
        : ` during ${(dateFilterLabels[dateFilter] || dateFilter).toLowerCase()}`;
    return `${categorySuffix}${priceSuffix}${dateSuffix}`;
  })();

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
  }, [bootstrap]);

  useEffect(() => {
    setSelectedBookingId(null);
  }, [statusFilter]);

  useEffect(() => {
    setSelectedExpenseId(null);
  }, [expenseFilter, priceFilter, dateFilter, dateOrder]);

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
        </div>
      </div>

      <p className="text-xs uppercase tracking-wide" style={{ color: "#1f2937" }}>
        {bookingSummaryText}
      </p>

      <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-x-auto">
            <div ref={bookingScrollRef} className="max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="py-10 text-center text-sm font-semibold text-slate-500">
                  Loading bookings...
                </div>
              ) : displayBookings.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-600">
                  No bookings to display yet.
                </div>
              ) : (
                <table className="w-full min-w-[960px] divide-y divide-slate-200 text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">Status</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">Client</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">Amount</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">Date</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">Time</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">Vehicle</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">Service</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">Actions</th>
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
                        <td className="px-3 py-2 whitespace-nowrap">{formatCurrency(booking.amount)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{formatDateShort(booking.date)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{booking.time || "--"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{booking.carName || "--"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{booking.service}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
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
          <button
            type="button"
            onClick={() => setExpenseModalOpen(true)}
            className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-br from-rose-500 via-fuchsia-500 to-purple-500 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-[0_16px_32px_-20px_rgba(236,72,153,0.7)] transition hover:shadow-[0_18px_36px_-18px_rgba(192,38,211,0.85)] sm:w-auto"
          >
            New Expense
          </button>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_18px_34px_-24px_rgba(15,23,42,0.2)] backdrop-blur-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <label className="group flex flex-col gap-1 rounded-2xl border border-slate-200/70 bg-white/60 px-3 py-2 text-sm text-slate-600 shadow-sm transition hover:border-sky-200/80 hover:bg-sky-50/40">
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Category</span>
                <select
                  value={expenseFilter}
                  onChange={(event) => setExpenseFilter(event.target.value)}
                  aria-describedby="filter-info"
                  className="rounded-full border border-transparent bg-transparent px-3 py-2 text-sm font-semibold text-slate-700 transition focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200/60"
                >
                  <option value="all">All categories</option>
                  <option value="equipment">Equipment</option>
                  <option value="chemicals">Chemicals</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="group flex flex-col gap-1 rounded-2xl border border-slate-200/70 bg-white/60 px-3 py-2 text-sm text-slate-600 shadow-sm transition hover:border-sky-200/80 hover:bg-sky-50/40">
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Date range</span>
                <select
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                  title={dateFilterDescription}
                  aria-describedby="filter-info"
                  className="rounded-full border border-transparent bg-transparent px-3 py-2 text-sm font-semibold text-slate-700 transition focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200/60"
                >
                  <option value="all">All dates</option>
                  <option value="last7">Last 7 days</option>
                  <option value="last30">Last 30 days</option>
                  <option value="thisYear">This year</option>
                  <option value="older">Older (30+ days)</option>
                </select>
              </label>
              <label className="group flex flex-col gap-1 rounded-2xl border border-slate-200/70 bg-white/60 px-3 py-2 text-sm text-slate-600 shadow-sm transition hover:border-sky-200/80 hover:bg-sky-50/40">
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Amount focus</span>
                <select
                  value={priceFilter}
                  onChange={(event) => setPriceFilter(event.target.value)}
                  title={priceFilterDescription}
                  aria-describedby="filter-info"
                  className="rounded-full border border-transparent bg-transparent px-3 py-2 text-sm font-semibold text-slate-700 transition focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200/60"
                >
                  <option value="all">All amounts</option>
                  <option value="high">Price ↑ High spend</option>
                  <option value="low">Price ↓ Value spend</option>
                </select>
              </label>
              <label className="group flex flex-col gap-1 rounded-2xl border border-slate-200/70 bg-white/60 px-3 py-2 text-sm text-slate-600 shadow-sm transition hover:border-sky-200/80 hover:bg-sky-50/40">
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Order</span>
                <select
                  value={dateOrder}
                  onChange={(event) => setDateOrder(event.target.value)}
                  title={orderDescription}
                  aria-describedby="filter-info"
                  className="rounded-full border border-transparent bg-transparent px-3 py-2 text-sm font-semibold text-slate-700 transition focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200/60"
                >
                  <option value="desc">Newest first</option>
                  <option value="asc">Oldest first</option>
                </select>
              </label>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Active Filters</span>
              {activeFilterBadges.length === 0 ? (
                <span className="inline-flex items-center rounded-full bg-slate-100/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 ring-1 ring-inset ring-slate-200/70">
                  None
                </span>
              ) : (
                activeFilterBadges.map((badge) => (
                  <span
                    key={badge.key}
                    className="inline-flex items-center rounded-full bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600 ring-1 ring-inset ring-sky-400/30"
                  >
                    {badge.text}
                  </span>
                ))
              )}
            </div>
            <p id="filter-info" className="text-[11px] text-slate-500 sm:text-right" aria-live="polite">
              {filterDescriptionText}
            </p>
          </div>
        </div>

        <p className="text-xs uppercase tracking-wide" style={{ color: "#1f2937" }}>
          Total spent{expenseTotalSuffix}: {formatCurrency(filteredExpenseTotal)}
        </p>

        <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-x-auto">
              <div ref={expenseScrollRef} className="max-h-[60vh] overflow-y-auto">
                {loading ? (
                  <div className="py-10 text-center text-sm font-semibold text-slate-500">
                    Loading expenses...
                  </div>
                ) : displayExpenses.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-600">No expenses captured yet.</div>
                ) : (
                  <table className="w-full min-w-[720px] divide-y divide-slate-200 text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">Date</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">Item</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">Supplier</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">Category</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">Amount</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-600">
                    {displayExpenses.map((expense) => {
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
                          <td className="px-3 py-2 whitespace-nowrap">
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

  const bottomPanelContent = renderBottomPanelContent();
  const panelMeta = BOTTOM_PANEL_META[activeBottomPanel] || { title: "", description: "" };

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

        {activeBottomPanel === "bookings" && (
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
        )}

        {activeBottomPanel === "bookings" && (
          <section className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <header className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold" style={{ color: "#111827" }}>
                Pending bookings
              </h2>
              <p className="text-sm" style={{ color: "#1f2937" }}>
                Review what is coming up next. Open the bottom bar for full history.
              </p>
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
        )}

        {bottomPanelContent && (
          <section ref={bottomPanelRef} className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold" style={{ color: "#0f172a" }}>
                {panelMeta.title || ""}
              </h2>
              {panelMeta.description ? (
                <p className="text-sm" style={{ color: "#1f2937" }}>
                  {panelMeta.description}
                </p>
              ) : null}
            </div>
            <div className="space-y-6">
              {bottomPanelContent}
            </div>
          </section>
        )}
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
                onClick={() => setActiveBottomPanel(action.key)}
                className={`flex-1 rounded-xl border px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] transition backdrop-blur-lg ${
                  isActive
                    ? "border-sky-200/70 bg-gradient-to-br from-sky-500/40 via-sky-400/35 to-indigo-500/40 text-sky-900 shadow-[0_16px_32px_-20px_rgba(56,189,248,0.7)]"
                    : "border-white/30 bg-white/10 text-slate-700 hover:border-sky-200/50 hover:bg-sky-100/20 hover:text-slate-900"
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
    description: "Track every appointment and update statuses without leaving this view.",
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


