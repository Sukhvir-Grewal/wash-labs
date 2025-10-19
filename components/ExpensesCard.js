import { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const CATEGORIES = [
  { key: 'one-time', label: 'Equipment' }, // one-time purchases like vacuum
  { key: 'chemicals', label: 'Chemicals' },
  { key: 'other', label: 'Other' },
];

export default function ExpensesCard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    date: '',
    amount: '', // base amount before tax
    includeTax: false,
    supplier: '',
    productName: '',
    category: 'one-time',
  });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/expenses');
      const data = await res.json();
      if (res.ok && data.success) setItems(data.items || []);
      else setError(data.error || 'Failed to load expenses');
    } catch (e) {
      setError(e.message || 'Failed to load expenses');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function addExpense(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const base = Number(form.amount || 0);
      const taxRate = form.includeTax ? 0.15 : 0;
      const finalAmount = base * (1 + taxRate);
      const body = {
        date: form.date,
        amount: Number(finalAmount.toFixed(2)),
        baseAmount: Number(base.toFixed(2)),
        taxIncluded: !!form.includeTax,
        taxRate,
        category: form.category,
        supplier: form.supplier,
        productName: form.productName,
      };
      const res = await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok && data.success) {
        setItems(prev => [data.item, ...prev]);
        setForm({ date: '', amount: '', includeTax: form.includeTax, supplier: '', productName: '', category: form.category });
      } else setError(data.error || 'Failed to add');
    } catch (e) { setError(e.message || 'Failed to add'); }
    setSubmitting(false);
  }

  const monthly = useMemo(() => {
    const map = {};
    for (const it of items) {
      const key = (it.date || '').slice(0,7); // YYYY-MM
      const cat = it.category || 'other';
      if (!map[key]) map[key] = { total: 0, byCat: { 'one-time': 0, 'chemicals': 0, 'other': 0 } };
      map[key].total += Number(it.amount || 0);
      map[key].byCat[cat] += Number(it.amount || 0);
    }
    const keys = Object.keys(map).sort();
    return { keys, map };
  }, [items]);

  const chartData = useMemo(() => {
    const labels = monthly.keys;
    const data = {
      labels,
      datasets: [
        { label: 'Total', data: labels.map(k => monthly.map[k].total), backgroundColor: 'rgba(239,68,68,0.6)' },
      ],
    };
    return data;
  }, [monthly]);

  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } } };

  return (
    <div className="bg-white rounded-xl shadow p-6 border border-blue-100">
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-semibold text-blue-700">Expenses</div>
      </div>
      {/* Add form */}
      <form onSubmit={addExpense} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <div className="md:col-span-1">
          <label className="text-xs text-gray-600">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full px-3 py-2 rounded border border-blue-200 text-gray-700 focus:text-black placeholder:text-gray-600 caret-black"
            required
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-gray-600">Product name</label>
          <input
            type="text"
            value={form.productName}
            onChange={e => setForm(f => ({ ...f, productName: e.target.value }))}
            placeholder="e.g., Vacuum, Foam Cannon"
            className="w-full px-3 py-2 rounded border border-blue-200 text-gray-700 focus:text-black placeholder:text-gray-600 caret-black"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-gray-600">Supplier</label>
          <input
            type="text"
            value={form.supplier}
            onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
            placeholder="e.g., Canadian Tire"
            className="w-full px-3 py-2 rounded border border-blue-200 text-gray-700 focus:text-black placeholder:text-gray-600 caret-black"
          />
        </div>
        <div className="md:col-span-1">
          <label className="text-xs text-gray-600">Category</label>
          <select
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="w-full px-3 py-2 rounded border border-blue-200 text-gray-700 focus:text-black caret-black"
          >
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
        <div className="md:col-span-1">
          <label className="text-xs text-gray-600">Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full pl-6 pr-3 py-2 rounded border border-blue-200 text-gray-700 focus:text-black placeholder:text-gray-600 caret-black"
              placeholder="0.00"
              required
            />
          </div>
          <div className="mt-2">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.includeTax}
                onChange={e => setForm(f => ({ ...f, includeTax: e.target.checked }))}
              />
              Include NS tax (15%)
            </label>
            {form.amount !== '' && !isNaN(Number(form.amount)) && (
              <div className="text-xs text-gray-600 mt-1">
                Total: <span className="font-semibold text-gray-900">${(Number(form.amount) * (form.includeTax ? 1.15 : 1)).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="md:col-span-6">
          <button type="submit" disabled={submitting} className="px-4 py-2 rounded bg-blue-600 text-white font-semibold">{submitting ? 'Adding...' : 'Add Expense'}</button>
        </div>
      </form>
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      {/* Chart */}
      <div className="w-full mt-4 bg-white rounded-lg p-2" style={{ height: '240px' }}>
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
