import { useState } from 'react';

const CATEGORIES = [
  { key: 'one-time', label: 'Equipment' },
  { key: 'chemicals', label: 'Chemicals' },
  { key: 'vehicle-maintenance', label: 'Vehicle Maintenance' },
  { key: 'other', label: 'Other' },
];

const SUPPLIERS = [
  'Canadian Tire',
  'Walmart',
  'Home Depot',
  'Amazon',
  'Carzilla',
  'Other',
];

export default function AddExpenseModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({
    date: '',
    amount: '',
    includeTax: false,
    supplier: '',
    supplierOther: '',
    productName: '',
    category: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const base = Number(form.amount || 0);
      const taxRate = form.includeTax ? 0.15 : 0;
      const finalAmount = base * (1 + taxRate);
      const supplierValue = form.supplier === 'Other' ? form.supplierOther : form.supplier;
      const body = {
        date: form.date,
        amount: Number(finalAmount.toFixed(2)),
        baseAmount: Number(base.toFixed(2)),
        taxIncluded: !!form.includeTax,
        taxRate,
        category: form.category,
        supplier: supplierValue,
        productName: form.productName,
      };
      const res = await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok && data.success) {
        setForm({ date: '', amount: '', includeTax: form.includeTax, supplier: '', supplierOther: '', productName: '', category: '' });
        if (onSuccess) onSuccess(data.item);
        onClose();
      } else setError(data.error || 'Failed to add');
    } catch (e) {
      setError(e.message || 'Failed to add');
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl border border-blue-100 max-h-[90vh] overflow-y-auto">
    <h3 className="text-xl font-bold mb-6 text-center" style={{ color: '#000' }}>Add Expense</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-2 rounded border border-blue-200 text-gray-700 focus:text-black caret-black"
              required
            />
          </div>
          <div>
            <input
              type="text"
              value={form.productName}
              onChange={e => setForm(f => ({ ...f, productName: e.target.value }))}
              placeholder="Product"
              className="w-full px-3 py-2 rounded border border-blue-200 text-gray-700 focus:text-black placeholder:text-gray-400 caret-black"
            />
          </div>
          <div>
            <select
              value={form.supplier}
              onChange={e => setForm(f => ({ ...f, supplier: e.target.value, supplierOther: '' }))}
              className="w-full px-3 py-2 rounded border border-blue-200 text-gray-700 focus:text-black caret-black"
              required
            >
              <option value="" disabled>Supplier</option>
              {SUPPLIERS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {form.supplier === 'Other' && (
            <div>
              <input
                type="text"
                value={form.supplierOther}
                onChange={e => setForm(f => ({ ...f, supplierOther: e.target.value }))}
                placeholder="Enter supplier name"
                className="w-full px-3 py-2 rounded border border-blue-200 text-gray-700 focus:text-black placeholder:text-gray-400 caret-black"
              />
            </div>
          )}
          <div>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full px-3 py-2 rounded border border-blue-200 text-gray-700 focus:text-black caret-black"
              required
            >
              <option value="" disabled>Category</option>
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full pl-6 pr-3 py-2 rounded border border-blue-200 text-gray-700 focus:text-black placeholder:text-gray-400 caret-black"
                placeholder="Amount"
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded border border-blue-200 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={form.includeTax}
                onChange={e => setForm(f => ({ ...f, includeTax: e.target.checked }))}
              />
              TAX (15%)
            </label>
            {form.amount !== '' && !isNaN(Number(form.amount)) && (
              <div className="text-sm text-gray-600">
                Total: <span className="font-semibold text-gray-900">${(Number(form.amount) * (form.includeTax ? 1.15 : 1)).toFixed(2)}</span>
              </div>
            )}
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 text-blue-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
