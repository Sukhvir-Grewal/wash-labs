import { useEffect, useState } from "react";
import { useCallback } from "react";
import AdminAddBooking from "../components/AdminAddBooking";
import AddExpenseModal from "../components/AddExpenseModal";
import RevenueChart from "../components/RevenueChart";
import StatusCalendar from "../components/StatusCalendar";
import ExpensesCard from "../components/ExpensesCard";
import ProfitsCard from "../components/ProfitsCard";
import EyeToggle from "../components/EyeToggle";
import dynamic from 'next/dynamic';
const VisitorsCard = dynamic(() => import('../components/VisitorsCard'), { ssr: false });
import { useRouter } from "next/router";

export default function AdminDashboard() {
  // Format date as 'oct-19'
  function formatDateShort(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
    const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
    return `${months[m - 1]}-${d}`;
  }
  const formatCurrency = (amount) => `$${Number(amount || 0).toFixed(2)}`;
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [detailBooking, setDetailBooking] = useState(null);
  const [editBooking, setEditBooking] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("bookings"); // "bookings" or "expenses"
  const [showRevenueChart, setShowRevenueChart] = useState(false);
  const [showPendingChart, setShowPendingChart] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [selectedExpenseId, setSelectedExpenseId] = useState(null);
  const [expenseFilter, setExpenseFilter] = useState('all');
  // Expense delete modal state
  const [showExpenseDelete, setShowExpenseDelete] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(false);
  const [expenseDeleteError, setExpenseDeleteError] = useState("");
  // Calculate total revenue (exclude pending)
  const totalRevenue = bookings.filter(b => b.status === 'complete').reduce((sum, b) => sum + Number(b.amount || 0), 0);
  // Pending count and estimated revenue
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const pendingCount = pendingBookings.length;
  const pendingRevenue = pendingBookings.reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const completedCount = bookings.filter(b => b.status === 'complete').length;
  const totalBookingsCount = bookings.length;
  const totalBookingAmount = bookings
    .filter(b => b.status === 'complete' || b.status === 'pending')
    .reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const bookingSummaryText = statusFilter === 'pending'
    ? `Pending: ${formatCurrency(pendingRevenue)}`
    : statusFilter === 'complete'
    ? `Completed: ${formatCurrency(totalRevenue)}`
    : `Total: ${formatCurrency(totalBookingAmount)} (Completed + Pending)`;

  // After a successful add from the child modal, refresh from DB and close the modal
  const handleAddFromChild = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/get-bookings");
      const data = await resp.json();
      if (resp.ok && data.success) {
        setBookings(data.bookings.map(b => ({ ...b, id: b._id || b.id })));
      } else {
        setBookings([]);
      }
    } catch {
      setBookings([]);
    }
    setLoading(false);
    setShowAdd(false);
    setEditBooking(null);
  }, []);

  // Fetch bookings from MongoDB
  const updatePendingToComplete = useCallback(async (bookingsList) => {
    const now = new Date();
    const updates = [];
    for (const b of bookingsList) {
      if (b.status === 'pending' && b.date && b.time) {
        const dt = new Date(`${b.date}T${b.time}:00`);
        if (dt < now) {
          // Update status in MongoDB
          updates.push(fetch(`/api/update-booking-status?id=${b.id}&status=complete`, { method: 'PATCH' }));
        }
      }
    }
    if (updates.length > 0) {
      await Promise.all(updates);
      // Refetch bookings after updates
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    async function fetchBookingsAndUpdate() {
      setLoading(true);
      try {
        const resp = await fetch("/api/get-bookings");
        const data = await resp.json();
        if (resp.ok && data.success) {
          const bookingsArr = data.bookings.map(b => ({ ...b, id: b._id || b.id }));
          // Check and update pending bookings
          const didUpdate = await updatePendingToComplete(bookingsArr);
          if (didUpdate) {
            // Refetch after update
            const resp2 = await fetch("/api/get-bookings");
            const data2 = await resp2.json();
            if (resp2.ok && data2.success) {
              setBookings(data2.bookings.map(b => ({ ...b, id: b._id || b.id })));
            } else {
              setBookings([]);
            }
          } else {
            setBookings(bookingsArr);
          }
        } else {
          setBookings([]);
        }
        // Also fetch expenses
        const expRes = await fetch('/api/expenses');
        const expData = await expRes.json();
        if (expRes.ok && expData.success) {
          setExpenses(expData.items || []);
        }
      } catch {
        setBookings([]);
        setExpenses([]);
      }
      setLoading(false);
    }
    fetchBookingsAndUpdate();
  }, [updatePendingToComplete]);

  useEffect(() => {
    setSelectedExpenseId(null);
  }, [expenseFilter]);

  useEffect(() => {
    setSelectedBookingId(null);
  }, [statusFilter]);

  // Show booking details modal
  const handleShowDetail = (booking) => {
    setDetailBooking(booking);
    setShowDeleteConfirm(false);
    setShowDetail(true);
  };

  // Edit booking: open modal with data
  const handleEditBooking = (booking) => {
    setEditBooking(booking);
    setShowAdd(true);
  };

  // Compute display order: place oldest pending first, then newer pending, then others (newest-first)
  const computeTimestamp = (b) => {
    const dateOk = b.date && /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : '1970-01-01';
    const timeOk = b.time && /^\d{2}:\d{2}$/.test(b.time) ? b.time : '00:00';
    return new Date(`${dateOk}T${timeOk}:00`).getTime();
  };

  const getDisplayBookings = () => {
    const list = [...bookings];
    if (statusFilter === 'pending') {
      const pending = list.filter(b => b.status === 'pending');
      if (pending.length === 0) return [];
      // Oldest pending first
      const pendingAsc = [...pending].sort((a, b) => computeTimestamp(a) - computeTimestamp(b));
      const first = pendingAsc[0];
      const remaining = pending
        .filter(b => b !== first)
        .sort((a, b) => computeTimestamp(b) - computeTimestamp(a)); // newest next
      return [first, ...remaining];
    }
    if (statusFilter === 'complete') {
      return list
        .filter(b => b.status === 'complete')
        .sort((a, b) => computeTimestamp(b) - computeTimestamp(a));
    }
    // statusFilter === 'all'
    const pending = list.filter(b => b.status === 'pending');
    const others = list.filter(b => b.status !== 'pending');
    if (pending.length === 0) {
      return others.sort((a, b) => computeTimestamp(b) - computeTimestamp(a));
    }
    const pendingAsc = [...pending].sort((a, b) => computeTimestamp(a) - computeTimestamp(b));
    const first = pendingAsc[0];
    const remaining = pending
      .filter(b => b !== first)
      .sort((a, b) => computeTimestamp(b) - computeTimestamp(a));
    const othersSorted = others.sort((a, b) => computeTimestamp(b) - computeTimestamp(a));
    return [first, ...remaining, ...othersSorted];
  };

  const expenseFilterLabels = {
    all: 'All',
    equipment: 'Equipment',
    chemicals: 'Chemicals',
    other: 'Other',
  };

  const matchExpenseFilter = (exp) => {
    if (expenseFilter === 'all') return true;
    const category = (exp.category || '').toLowerCase();
    if (expenseFilter === 'equipment') return category === 'one-time';
    if (expenseFilter === 'chemicals') return category === 'chemicals';
    if (expenseFilter === 'other') return category !== 'one-time' && category !== 'chemicals';
    return true;
  };

  const filteredExpenses = expenses.filter(matchExpenseFilter);
  const filteredExpenseTotal = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const expenseTotalSuffix = expenseFilter === 'all'
    ? ''
    : ` on ${(expenseFilterLabels[expenseFilter] || expenseFilter).toLowerCase()}`;

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center" style={{ color: '#000' }}>Admin Booking Dashboard</h1>
        {/* Revenue summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-gradient-to-br from-blue-600 to-blue-400 text-white rounded-xl shadow p-6 flex flex-col">
            <div className="w-full flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold">Total Revenue</div>
                <div className="text-3xl font-bold mt-1">${totalRevenue}</div>
                <div className="text-xs mt-2 text-white/80">(Completed bookings only)</div>
              </div>
              <EyeToggle
                open={showRevenueChart}
                onToggle={() => setShowRevenueChart(prev => !prev)}
                label="total revenue chart"
              />
            </div>
            <div
              style={{
                width: '100%',
                overflow: 'hidden',
                transition: 'max-height 0.35s ease, margin-top 0.2s ease',
                maxHeight: showRevenueChart ? '320px' : '0px',
                marginTop: showRevenueChart ? '16px' : '0px',
              }}
            >
              <div className="w-full bg-white rounded-lg p-2">
                <RevenueChart bookings={bookings} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex flex-col border border-blue-100 text-blue-900">
            <div className="w-full flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold text-blue-700">Bookings</div>
                <div className="text-3xl font-bold mt-1">{totalBookingsCount}</div>
                <div className="text-xs mt-2 text-blue-600/70">
                  Pending {pendingCount} • Complete {completedCount}
                </div>
              </div>
              <EyeToggle
                open={showCalendar}
                onToggle={() => setShowCalendar(prev => !prev)}
                label="bookings calendar"
              />
            </div>
            <div
              style={{
                width: '100%',
                overflow: 'hidden',
                transition: 'max-height 0.35s ease, margin-top 0.2s ease',
                maxHeight: showCalendar ? '420px' : '0px',
                marginTop: showCalendar ? '16px' : '0px',
              }}
            >
              <div className="bg-white rounded-lg p-2 text-gray-900 border border-blue-50">
                <StatusCalendar bookings={bookings} />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-400 text-white rounded-xl shadow p-6 flex flex-col">
            <div className="w-full flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold">Pending Estimates</div>
                <div className="text-3xl font-bold mt-1">${pendingRevenue}</div>
              </div>
              <EyeToggle
                open={showPendingChart}
                onToggle={() => setShowPendingChart(prev => !prev)}
                label="pending revenue chart"
              />
            </div>
            <div
              style={{
                width: '100%',
                overflow: 'hidden',
                transition: 'max-height 0.35s ease, margin-top 0.2s ease',
                maxHeight: showPendingChart ? '320px' : '0px',
                marginTop: showPendingChart ? '16px' : '0px',
              }}
            >
              <div className="w-full bg-white rounded-lg p-2">
                <RevenueChart
                  bookings={bookings}
                  status="pending"
                  datasetLabel="Pending Estimate"
                  borderColor="rgb(202, 138, 4)"
                  backgroundColor="rgba(202,138,4,0.2)"
                  pointBackgroundColor="rgb(202, 138, 4)"
                />
              </div>
            </div>
          </div>
        </div>
        {/* Expenses and Profits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <ExpensesCard />
          <ProfitsCard bookings={bookings} />
        </div>
        {/* Optional: Visitors (GA4) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <VisitorsCard />
        </div>
        {/* Booking/Expense list with tabs */}
        <div className="bg-white rounded-xl shadow p-6 border border-blue-100 mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('bookings')}
                className={`text-xl font-bold ${activeTab === 'bookings' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-gray-400'}`}
              >
                Bookings
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('expenses')}
                className={`text-xl font-bold ${activeTab === 'expenses' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-gray-400'}`}
              >
                Expenses
              </button>
            </div>
            <button
              className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              onClick={() => setShowAdd(true)}
            >
              +ADD
            </button>
          </div>
          {activeTab === 'bookings' && (
            <>
              {/* Status Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
                <label className="text-sm text-gray-600" htmlFor="booking-filter">Filter:</label>
                <select
                  id="booking-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="px-3 py-2 text-sm border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="complete">Complete</option>
                </select>
              </div>
              {bookingSummaryText && (
                <p className="text-xs text-gray-500 mb-4">{bookingSummaryText}</p>
              )}
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="py-10 text-center text-blue-600 font-semibold text-lg">Loading bookings...</div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[720px] text-xs">
                    <thead>
                      <tr style={{ background: '#f5f5f5' }} className="text-[11px] uppercase tracking-wide">
                        <th className="border border-gray-200 py-2 px-2 font-semibold" style={{ color: '#000' }}>Status</th>
                        <th className="border border-gray-200 py-2 px-2 font-semibold" style={{ color: '#000' }}>Name</th>
                        <th className="border border-gray-200 py-2 px-2 font-semibold" style={{ color: '#000' }}>$</th>
                        <th className="border border-gray-200 py-2 px-2 font-semibold" style={{ color: '#000' }}>Date</th>
                        <th className="border border-gray-200 py-2 px-2 font-semibold" style={{ color: '#000' }}>Time</th>
                        <th className="border border-gray-200 py-2 px-2 font-semibold" style={{ color: '#000' }}>Car</th>
                        <th className="border border-gray-200 py-2 px-2 font-semibold" style={{ color: '#000' }}>Service</th>
                        <th className="border border-gray-200 py-2 px-2 font-semibold" style={{ color: '#000' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getDisplayBookings().map(b => {
                        const isSelected = selectedBookingId === b.id;
                        return (
                          <tr
                            key={b.id}
                            onClick={() => setSelectedBookingId(prev => (prev === b.id ? null : b.id))}
                            className={`text-[11px] cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                            style={{ color: '#222', background: isSelected ? '#e9f2ff' : '#fff' }}
                          >
                          <td className="border border-gray-200 py-2 px-2">
                            <span
                              aria-label={b.status}
                              className={`px-3 py-1 rounded-full text-xs font-bold ${b.status === "complete" ? "bg-green-200 text-green-800" : b.status === "pending" ? "bg-yellow-200 text-yellow-800" : "bg-gray-200 text-gray-800"}`}
                            >
                              <span className="sm:hidden">
                                {b.status === 'complete' ? 'C' : b.status === 'pending' ? 'P' : (b.status?.[0]?.toUpperCase() || '')}
                              </span>
                              <span className="hidden sm:inline">{b.status}</span>
                            </span>
                          </td>
                          <td
                            className="border border-gray-200 py-2 px-2 max-w-[140px] truncate"
                            style={{ color: '#222', cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => handleEditBooking(b)}
                          >
                            {b.name}
                          </td>
                          <td className="border border-gray-200 py-2 px-2 text-[11px] font-semibold text-gray-600 whitespace-nowrap">${b.amount}</td>
                          <td className="border border-gray-200 py-2 px-2 whitespace-nowrap" style={{ color: '#222' }}>{formatDateShort(b.date)}</td>
                          <td className="border border-gray-200 py-2 px-2 whitespace-nowrap" style={{ color: '#222' }}>{b.time || "--"}</td>
                          <td className="border border-gray-200 py-2 px-2 max-w-[140px] truncate" style={{ color: '#222' }}>{b.carName || "--"}</td>
                          <td className="border border-gray-200 py-2 px-2 whitespace-nowrap" style={{ color: '#222' }}>{b.service}</td>
                          <td className="border border-gray-200 py-2 px-2">
                            <button
                              type="button"
                              className="px-3 py-1 text-xs rounded-full border border-blue-200 text-blue-700 hover:bg-blue-50"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleShowDetail(b);
                              }}
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
            </>
          )}
          {activeTab === 'expenses' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                <label className="text-sm text-gray-600" htmlFor="expense-filter">Filter:</label>
                <select
                  id="expense-filter"
                  value={expenseFilter}
                  onChange={(event) => setExpenseFilter(event.target.value)}
                  className="px-3 py-2 text-sm border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="all">All</option>
                  <option value="equipment">Equipment</option>
                  <option value="chemicals">Chemicals</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Total spent{expenseTotalSuffix}: ${filteredExpenseTotal.toFixed(2)}
              </p>
              <div className="overflow-x-auto">
              {loading ? (
                <div className="py-10 text-center text-blue-600 font-semibold text-lg">Loading expenses...</div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[680px] text-[11px]">
                  <thead>
                    <tr style={{ background: '#f5f5f5' }} className="uppercase tracking-wide">
                      <th className="border border-gray-200 py-2 px-2 font-semibold" style={{ color: '#000' }}>Date</th>
                      <th className="border border-gray-200 py-2 px-2 font-semibold" style={{ color: '#000' }}>Product</th>
                      <th className="border border-gray-200 py-2 px-2 font-semibold" style={{ color: '#000' }}>Supplier</th>
                      <th className="border border-gray-200 py-2 px-2 font-semibold" style={{ color: '#000' }}>Category</th>
                      <th className="border border-gray-200 py-2 px-2 font-semibold" style={{ color: '#000' }}>Amount</th>
                      <th className="border border-gray-200 py-2 px-2 font-semibold" style={{ color: '#000' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((exp, idx) => {
                      const rowId = exp._id || idx;
                      const isSelected = selectedExpenseId === rowId;
                      return (
                        <tr
                          key={rowId}
                          onClick={() => setSelectedExpenseId(prev => (prev === rowId ? null : rowId))}
                          className={`text-[11px] cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                          style={{ color: '#222', background: isSelected ? '#e9f2ff' : '#fff' }}
                        >
                        <td className="border border-gray-200 py-2 px-2 whitespace-nowrap" style={{ color: '#222' }}>{formatDateShort(exp.date)}</td>
                        <td className="border border-gray-200 py-2 px-2 max-w-[140px] truncate" style={{ color: '#222' }}>{exp.productName || '--'}</td>
                        <td className="border border-gray-200 py-2 px-2 max-w-[140px] truncate" style={{ color: '#222' }}>{exp.supplier || '--'}</td>
                        <td className="border border-gray-200 py-2 px-2 whitespace-nowrap" style={{ color: '#222' }}>
                          {exp.category === 'one-time' ? 'Equipment' : exp.category === 'chemicals' ? 'Chemicals' : exp.category || 'Other'}
                        </td>
                        <td className="border border-gray-200 py-2 px-2 whitespace-nowrap" style={{ color: '#111' }}>
                          ${Number(exp.amount || 0).toFixed(2)}
                          {exp.taxIncluded && <span className="text-[10px] text-gray-500 ml-1">(incl tax)</span>}
                        </td>
                        <td className="border border-gray-200 py-2 px-2">
                          <button
                            type="button"
                            className="px-3 py-1 text-xs rounded-full border border-red-200 text-red-700 hover:bg-red-50"
                            onClick={(event) => {
                              event.stopPropagation();
                              setExpenseDeleteError("");
                              setExpenseToDelete(exp);
                              setShowExpenseDelete(true);
                            }}
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
            </>
          )}
        </div>
        {/* Expense delete confirmation modal */}
        {showExpenseDelete && expenseToDelete && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-blue-100">
              <h3 className="text-xl font-bold mb-4 text-center" style={{ color: '#000' }}>Delete Expense</h3>
              <p className="text-sm text-gray-700 mb-6 text-center">
                Are you sure you want to delete this expense?
                <br />
                <span className="font-semibold">{formatDateShort(expenseToDelete.date)}</span>
                {" • "}
                <span className="font-semibold">{expenseToDelete.productName || 'Item'}</span>
                {" • $"}
                <span className="font-semibold">{expenseToDelete.amount}</span>
              </p>
              {expenseDeleteError && (
                <div className="text-red-600 text-sm mb-3 text-center">{expenseDeleteError}</div>
              )}
              <div className="mt-2 flex gap-3">
                <button
                  className="w-1/2 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 text-blue-700 font-semibold"
                  onClick={() => { setShowExpenseDelete(false); setExpenseToDelete(null); }}
                  disabled={deletingExpense}
                >
                  Cancel
                </button>
                <button
                  className="w-1/2 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50"
                  onClick={async () => {
                    if (!expenseToDelete?._id) return;
                    setDeletingExpense(true);
                    setExpenseDeleteError("");
                    try {
                      const resp = await fetch(`/api/expenses?id=${expenseToDelete._id}`, { method: 'DELETE' });
                      const data = await resp.json().catch(() => ({}));
                      if (!resp.ok || data.success === false) {
                        throw new Error(data.error || 'Failed to delete');
                      }
                      setExpenses(prev => prev.filter(e => (e._id !== expenseToDelete._id)));
                      setShowExpenseDelete(false);
                      setExpenseToDelete(null);
                    } catch (err) {
                      setExpenseDeleteError(err.message || 'Failed to delete expense');
                    }
                    setDeletingExpense(false);
                  }}
                  disabled={deletingExpense}
                >
                  {deletingExpense ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Booking details modal */}
        {showDetail && detailBooking && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-blue-100">
              <h3 className="text-xl font-bold mb-6 text-center" style={{ color: '#888' }}>Booking Details</h3>
              <div className="space-y-3 text-gray-800">
                <div><span className="font-semibold">Name:</span> {detailBooking.name}</div>
                <div><span className="font-semibold">Service:</span> {detailBooking.service}</div>
                <div><span className="font-semibold">Car:</span> {detailBooking.carName || "--"}</div>
                <div><span className="font-semibold">Car Type:</span> {detailBooking.carType || "--"}</div>
                {detailBooking.addOns && detailBooking.addOns.length > 0 && (
                  <div>
                    <span className="font-semibold">Add-Ons:</span>
                    <ul className="list-disc ml-6 mt-1">
                      {detailBooking.addOns.map((a, i) => (
                        <li key={i}>{a.label}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div><span className="font-semibold">Date:</span> {formatDateShort(detailBooking.date)}</div>
                <div><span className="font-semibold">Time:</span> {detailBooking.time || "--"}</div>
                <div><span className="font-semibold">Amount:</span> ${detailBooking.amount}</div>
                <div><span className="font-semibold">Status:</span> {detailBooking.status}</div>
                <div><span className="font-semibold">Phone:</span> {detailBooking.phone}</div>
                <div><span className="font-semibold">Email:</span> {detailBooking.email}</div>
                <div><span className="font-semibold">Location:</span> {detailBooking.location}</div>
                
              </div>
              <div className="mt-8 flex gap-3">
                {!showDeleteConfirm ? (
                  <>
                    <button
                      className="w-1/2 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      Delete
                    </button>
                    <button
                      className="w-1/2 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                      onClick={() => {
                        setShowDetail(false);
                        setShowDeleteConfirm(false);
                      }}
                    >
                      Close
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="w-1/2 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 text-blue-700 font-semibold"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="w-1/2 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
                      onClick={async () => {
                        if (!detailBooking?.id) return;
                        setLoading(true);
                        try {
                          await fetch(`/api/delete-booking?id=${detailBooking.id}`, { method: 'DELETE' });
                        } catch {}
                        // Refresh bookings from DB
                        try {
                          const resp = await fetch("/api/get-bookings");
                          const data = await resp.json();
                          if (resp.ok && data.success) {
                            setBookings(data.bookings.map(b => ({ ...b, id: b._id || b.id })));
                          } else {
                            setBookings([]);
                          }
                        } catch {
                          setBookings([]);
                        }
                        setLoading(false);
                        setShowDeleteConfirm(false);
                        setShowDetail(false);
                        setDetailBooking(null);
                      }}
                    >
                      Confirm Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Add booking modal (component) */}
        {activeTab === 'bookings' && (
          <AdminAddBooking
            open={showAdd}
            onClose={() => { setShowAdd(false); setEditBooking(null); }}
            onAdd={handleAddFromChild}
            editBooking={editBooking}
            onEdit={async (updated) => {
              // PATCH to API
              if (!updated.id) return;
              setLoading(true);
              try {
                await fetch(`/api/update-booking?id=${updated.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updated),
                });
              } catch {}
              // Refresh bookings
              try {
                const resp = await fetch("/api/get-bookings");
                const data = await resp.json();
                if (resp.ok && data.success) {
                  setBookings(data.bookings.map(b => ({ ...b, id: b._id || b.id })));
                } else {
                  setBookings([]);
                }
              } catch {
                setBookings([]);
              }
              setLoading(false);
              setShowAdd(false);
              setEditBooking(null);
            }}
          />
        )}
        {/* Add expense modal */}
        {activeTab === 'expenses' && (
          <AddExpenseModal
            open={showAdd}
            onClose={() => setShowAdd(false)}
            onSuccess={async (newItem) => {
              setExpenses(prev => [newItem, ...prev]);
              setShowAdd(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
