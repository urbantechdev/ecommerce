import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../api';
import { PaymentReceipt } from '../types';
import { Receipt, Search, Printer, Mail, ExternalLink } from 'lucide-react';
import { ReceiptModal } from '../components/ReceiptModal';

export const ReceiptsView: React.FC = () => {
  const { activeBranchId, user } = useAuth();
  const { notify } = useNotification();

  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Selected receipt for thermal modal
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchReceipts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getReceipts({
        branchId: activeBranchId,
        search: searchQuery.trim() || undefined,
      });
      setReceipts(data);
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Error', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [activeBranchId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReceipts();
  };

  const handleViewReceipt = (receipt: PaymentReceipt) => {
    setSelectedReceipt(receipt);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Sales & Payment Receipts Archive
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Historical payment receipts, customer copies, and KRA eTIMS fiscal confirmations.
          </p>
        </div>
      </div>

      {/* Search Header */}
      <form onSubmit={handleSearchSubmit} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search receipt #, customer name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91]"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-[#030A91] text-white rounded-xl text-xs font-bold hover:bg-blue-900 shadow-xs"
        >
          Search
        </button>
      </form>

      {/* Receipts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Branch</th>
                <th className="py-3 px-3">Served By</th>
                <th className="py-3 px-3">Payment Method</th>
                <th className="py-3 px-3 text-right">Amount (KES)</th>
                <th className="py-3 px-3">KRA CU #</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipts.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {r.receiptNumber}
                  </td>
                  <td className="py-3 px-3 text-slate-500 text-[11px] font-mono">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{r.customerName}</td>
                  <td className="py-3 px-3 text-slate-600">{r.branchName}</td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{r.receivedByName || user?.name || 'Active Attendant'}</td>
                  <td className="py-3 px-3">
                    <span className="font-bold uppercase text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                      {r.paymentMethod} {r.paymentReference ? `(${r.paymentReference})` : ''}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-black text-slate-900">
                    KES {r.amount.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                    {r.cuNumber || '013000000000001'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleViewReceipt(r)}
                      className="inline-flex items-center px-2.5 py-1 bg-blue-50 hover:bg-[#030A91] hover:text-white text-[#030A91] border border-blue-200 rounded-lg text-[11px] font-bold transition-colors shadow-2xs"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1" />
                      <span>Preview & Print</span>
                    </button>
                  </td>
                </tr>
              ))}
              {receipts.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No receipts recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <ReceiptModal
        receipt={selectedReceipt}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
