import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../api';
import { Expense } from '../types';
import { TrendingDown, Plus, Search, Calendar, DollarSign, X } from 'lucide-react';

export const ExpensesView: React.FC = () => {
  const { activeBranchId, branches } = useAuth();
  const { notify } = useNotification();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number>(5000);
  const [category, setCategory] = useState<any>('RENT');
  const [branchId, setBranchId] = useState(branches[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<any>('MPESA');
  const [paymentReference, setPaymentReference] = useState('');
  const [description, setDescription] = useState('');

  // M-Pesa B2C / B2B Disburse states
  const [b2cPhone, setB2cPhone] = useState('');
  const [b2bShortcode, setB2bShortcode] = useState('');
  const [isDisbursing, setIsDisbursing] = useState(false);

  const handleDisburseMpesa = async () => {
    if (paymentMethod === 'MPESA_B2C') {
      if (!b2cPhone.trim()) {
        notify({ type: 'WARNING', title: 'Phone Required', message: 'Enter recipient phone for B2C payout' });
        return;
      }
      setIsDisbursing(true);
      try {
        const res = await api.initiateMpesaB2C({ phone: b2cPhone.trim(), amount });
        notify({
          type: 'SUCCESS',
          title: 'M-Pesa B2C Initiated',
          message: res.message || `KES ${amount} payout sent to ${b2cPhone}`
        });
        setPaymentReference(res.transactionId || `B2C-${Date.now()}`);
      } catch (err: any) {
        notify({ type: 'ERROR', title: 'B2C Payout Failed', message: err.message });
      } finally {
        setIsDisbursing(false);
      }
    } else if (paymentMethod === 'MPESA_B2B') {
      if (!b2bShortcode.trim()) {
        notify({ type: 'WARNING', title: 'Shortcode Required', message: 'Enter Paybill/Till shortcode for B2B payment' });
        return;
      }
      setIsDisbursing(true);
      try {
        const res = await api.initiateMpesaB2B({ shortcode: b2bShortcode.trim(), amount });
        notify({
          type: 'SUCCESS',
          title: 'M-Pesa B2B Initiated',
          message: res.message || `KES ${amount} payment sent to ${b2bShortcode}`
        });
        setPaymentReference(res.transactionId || `B2B-${Date.now()}`);
      } catch (err: any) {
        notify({ type: 'ERROR', title: 'B2B Payment Failed', message: err.message });
      } finally {
        setIsDisbursing(false);
      }
    }
  };

  const fetchExpenses = async () => {
    try {
      const data = await api.getExpenses({
        branchId: activeBranchId,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
      });
      setExpenses(data);
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Error', message: err.message });
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [activeBranchId, selectedCategory]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createExpense({
        branchId,
        category,
        title,
        description,
        amount,
        paymentMethod,
        paymentReference,
      });

      notify({ type: 'SUCCESS', title: 'Expense Recorded', message: `${title} - KES ${amount.toLocaleString()}` });
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      fetchExpenses();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Error', message: err.message });
    }
  };

  const totalExpenseSum = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Operational Expense Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Store rentals, electricity, logistics, tailor wages, and overheads tracked by branch.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-[#030A91] text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5 text-[#FACB00]" />
          <span>Record New Expense</span>
        </button>
      </div>

      {/* Summary card & category filter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs sm:col-span-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Incurred in View:
          </span>
          <h3 className="text-2xl font-black text-rose-600 mt-1">
            KES {totalExpenseSum.toLocaleString()}
          </h3>
          <span className="text-xs text-slate-500 mt-0.5 block">{expenses.length} records</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs sm:col-span-2 flex items-center justify-between">
          <div className="w-full">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Filter by Category:
            </label>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {['ALL', 'RENT', 'UTILITIES', 'SALARIES', 'LOGISTICS', 'PACKAGING', 'MAINTENANCE'].map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                      selectedCategory === cat
                        ? 'bg-[#030A91] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <th className="py-3 px-4">Expense #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Title / Description</th>
                <th className="py-3 px-3">Branch</th>
                <th className="py-3 px-3">Payment Tender</th>
                <th className="py-3 px-4 text-right">Amount (KES)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{e.expenseNumber}</td>
                  <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{e.incurredDate}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                      {e.category}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 block">{e.title}</span>
                    {e.description && (
                      <span className="text-[10px] text-slate-500 truncate max-w-[200px] block">
                        {e.description}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-medium">{e.branchName}</td>
                  <td className="py-3 px-3 text-slate-700 font-semibold uppercase text-[10px]">
                    {e.paymentMethod} {e.paymentReference ? `(${e.paymentReference})` : ''}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-rose-600">
                    KES {e.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                      <DollarSign className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No Operational Expenses Recorded Yet</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5 mb-4">
                      Record store rent, electricity, logistics, artisan wages, and overheads tracked by branch.
                    </p>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="inline-flex items-center px-3.5 py-1.5 bg-[#030A91] text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1 text-[#FACB00]" />
                      <span>Record First Expense</span>
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-[#030A91] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Record Store Expense</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Expense Title:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. October Store Rent"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Amount (KES):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Category:
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="RENT">Rent & Tenancy</option>
                    <option value="UTILITIES">Electricity & Water</option>
                    <option value="SALARIES">Tailor & Staff Wages</option>
                    <option value="LOGISTICS">Transport & Fuel</option>
                    <option value="PACKAGING">Packaging & Bags</option>
                    <option value="MAINTENANCE">Sewing Machine Servicing</option>
                    <option value="OFFICE">Office Stationery</option>
                    <option value="OTHER">Other Operational Expense</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Branch Attribution:
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Payment Channel:
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="MPESA">Standard M-PESA</option>
                    <option value="MPESA_B2C">M-Pesa B2C (Staff / Tailor Payout)</option>
                    <option value="MPESA_B2B">M-Pesa B2B (Paybill / Supplier Payout)</option>
                    <option value="BANK_TRANSFER">Bank EFT / Cheque</option>
                    <option value="CASH">Petty Cash</option>
                  </select>
                </div>
              </div>

              {/* M-Pesa B2C Payout Details */}
              {paymentMethod === 'MPESA_B2C' && (
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                    <span>M-Pesa B2C Staff / Tailor Disbursement</span>
                    <span className="text-[10px] text-emerald-700">Daraja API</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={b2cPhone}
                      onChange={(e) => setB2cPhone(e.target.value)}
                      placeholder="e.g. 0712345678"
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleDisburseMpesa}
                      disabled={isDisbursing}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      {isDisbursing ? 'Sending...' : 'Disburse B2C'}
                    </button>
                  </div>
                </div>
              )}

              {/* M-Pesa B2B Payout Details */}
              {paymentMethod === 'MPESA_B2B' && (
                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-blue-900">
                    <span>M-Pesa B2B Paybill / Till Disbursement</span>
                    <span className="text-[10px] text-blue-700">Daraja API</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={b2bShortcode}
                      onChange={(e) => setB2bShortcode(e.target.value)}
                      placeholder="e.g. 522522 or 600100"
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-lg font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleDisburseMpesa}
                      disabled={isDisbursing}
                      className="px-3 py-1.5 bg-[#030A91] hover:bg-blue-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      {isDisbursing ? 'Sending...' : 'Disburse B2B'}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Reference Code / Voucher #:
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. QKJ88192 or KPLC-8819"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Description Notes:
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  rows={2}
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#030A91] text-white text-xs font-bold hover:bg-blue-900"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
