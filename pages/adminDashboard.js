import { useEffect, useState } from "react";
import { useCallback } from "react";
import AdminAddBooking from "../components/AdminAddBooking";
import AddExpenseModal from "../components/AddExpenseModal";
import RevenueChart from "../components/RevenueChart";
import StatusCalendar from "../components/StatusCalendar";
import ExpensesCard from "../components/ExpensesCard";
import ProfitsCard from "../components/ProfitsCard";
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
  // Calculate total revenue (exclude pending)
  const totalRevenue = bookings.filter(b => b.status === 'complete').reduce((sum, b) => sum + (b.amount || 0), 0);
  // Pending count and estimated revenue
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const pendingCount = pendingBookings.length;
  const pendingRevenue = pendingBookings.reduce((sum, b) => sum + (b.amount || 0), 0);

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

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center" style={{ color: '#000' }}>Admin Booking Dashboard</h1>
        {/* Revenue summary */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-gradient-to-br from-blue-600 to-blue-400 text-white rounded-xl shadow p-6 flex flex-col items-center justify-center">
            <div className="text-lg font-semibold mb-2">Total Revenue</div>
            <div className="text-3xl font-bold">${totalRevenue}</div>
            <div className="w-full mt-4 mb-2 bg-white rounded-lg p-2">
              <RevenueChart bookings={bookings} />
            </div>
            <div className="text-xs mt-2 text-white/80">(Completed bookings only)</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center justify-center border border-blue-100">
            <div className="text-lg font-semibold mb-2 text-blue-700">Bookings</div>
            {/* Calendar with filter buttons will render its own controls; count removed per request */}
            <div className="w-full mt-2">
              <StatusCalendar bookings={bookings} />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center justify-center border border-blue-100">
            <div className="text-lg font-semibold mb-2 text-blue-700">PE (Pending Estimate)</div>
            <div className="text-3xl font-bold text-blue-900">${pendingRevenue}</div>
            <div className="w-full mt-4 mb-2 bg-white rounded-lg p-2">
              <RevenueChart
                bookings={bookings}
                status="pending"
                datasetLabel="Pending Estimate"
                borderColor="rgb(202, 138, 4)"           
                backgroundColor="rgba(202,138,4,0.2)"   
                pointBackgroundColor="rgb(202, 138, 4)" 
              />
            </div>
            <div className="text-xs mt-2 text-blue-700/70">(Pending bookings)</div>
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
              {activeTab === 'bookings' ? 'Add Booking' : 'Add Expense'}
            </button>
          </div>
          {activeTab === 'bookings' && (
            <>
              {/* Status Filter */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-gray-600">Filter:</span>
                {[
                  { key: 'all', label: 'All' },
                  { key: 'pending', label: 'Pending' },
                  { key: 'complete', label: 'Complete' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setStatusFilter(opt.key)}
                    className={`px-3 py-1 rounded-full text-sm border ${statusFilter === opt.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="py-10 text-center text-blue-600 font-semibold text-lg">Loading bookings...</div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[760px] text-xs sm:text-sm">
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th className="py-2 px-2 sm:px-3 font-semibold" style={{ color: '#000' }}>Status</th>
                        <th className="py-2 px-2 sm:px-3 font-semibold" style={{ color: '#000' }}>Name</th>
                        <th className="py-2 px-2 sm:px-3 font-semibold" style={{ color: '#000' }}>Car</th>
                        <th className="py-2 px-2 sm:px-3 font-semibold" style={{ color: '#000' }}>Service</th>
                        <th className="py-2 px-2 sm:px-3 font-semibold" style={{ color: '#000' }}>Date</th>
                        <th className="py-2 px-2 sm:px-3 font-semibold" style={{ color: '#000' }}>Time</th>
                        <th className="py-2 px-2 sm:px-3 font-semibold" style={{ color: '#000' }}>Amount</th>
                        <th className="py-2 px-2 sm:px-3 font-semibold" style={{ color: '#000' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getDisplayBookings()
                        .map(b => (
                        <tr key={b.id} style={{ background: '#fff', color: '#222' }}>
                          <td className="py-2 px-2 sm:px-3">
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
                          <td className="py-2 px-2 sm:px-3 max-w-[140px] sm:max-w-none truncate" style={{ color: '#222', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleEditBooking(b)}>{b.name}</td>
                          <td className="py-2 px-2 sm:px-3 max-w-[160px] truncate" style={{ color: '#222' }}>{b.carName || "--"}</td>
                          <td className="py-2 px-2 sm:px-3 whitespace-nowrap" style={{ color: '#222' }}>{b.service}</td>
                          <td className="py-2 px-2 sm:px-3 whitespace-nowrap" style={{ color: '#222' }}>{formatDateShort(b.date)}</td>
                          <td className="py-2 px-2 sm:px-3 whitespace-nowrap" style={{ color: '#222' }}>{b.time || "--"}</td>
                          <td className="py-2 px-2 sm:px-3 whitespace-nowrap" style={{ color: '#222' }}>${b.amount}</td>
                          <td className="py-2 px-2 sm:px-3">
                            <button
                              type="button"
                              className="px-3 py-1 text-xs rounded-full border border-blue-200 text-blue-700 hover:bg-blue-50"
                              onClick={() => {
                                setDetailBooking(b);
                                setShowDeleteConfirm(false);
                                setShowDetail(true);
                              }}
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
          {activeTab === 'expenses' && (
            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-10 text-center text-blue-600 font-semibold text-lg">Loading expenses...</div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[760px] text-xs sm:text-sm">
                  <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                      <th className="py-2 px-2 sm:px-3 font-semibold" style={{ color: '#000' }}>Date</th>
                      <th className="py-2 px-2 sm:px-3 font-semibold" style={{ color: '#000' }}>Product</th>
                      <th className="py-2 px-2 sm:px-3 font-semibold" style={{ color: '#000' }}>Supplier</th>
                      <th className="py-2 px-2 sm:px-3 font-semibold" style={{ color: '#000' }}>Category</th>
                      <th className="py-2 px-2 sm:px-3 font-semibold" style={{ color: '#000' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp, idx) => (
                      <tr key={exp._id || idx} style={{ background: '#fff', color: '#222' }}>
                        <td className="py-2 px-2 sm:px-3 whitespace-nowrap" style={{ color: '#222' }}>{formatDateShort(exp.date)}</td>
                        <td className="py-2 px-2 sm:px-3" style={{ color: '#222' }}>{exp.productName || '--'}</td>
                        <td className="py-2 px-2 sm:px-3" style={{ color: '#222' }}>{exp.supplier || '--'}</td>
                        <td className="py-2 px-2 sm:px-3" style={{ color: '#222' }}>
                          {exp.category === 'one-time' ? 'Equipment' : exp.category === 'chemicals' ? 'Chemicals' : 'Other'}
                        </td>
                        <td className="py-2 px-2 sm:px-3 whitespace-nowrap" style={{ color: '#222' }}>
                          ${exp.amount}
                          {exp.taxIncluded && <span className="text-xs text-gray-500 ml-1">(incl tax)</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
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
            onAdd={(payload) => handleAddFromChild(payload)}
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
