import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../api';
import { StockTransfer, Product } from '../types';
import { ArrowLeftRight, Plus, CheckCircle2, Truck, X, AlertCircle } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export const StockTransfersView: React.FC = () => {
  const { branches, user } = useAuth();
  const { notify } = useNotification();

  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New Transfer Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sourceBranchId, setSourceBranchId] = useState(branches[0]?.id || '');
  const [destBranchId, setDestBranchId] = useState(branches[1]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [transferQuantity, setTransferQuantity] = useState(10);
  const [transferNotes, setTransferNotes] = useState('');
  const [transferItems, setTransferItems] = useState<any[]>([]);

  const fetchTransfers = async () => {
    setIsLoading(true);
    try {
      const [tList, pList] = await Promise.all([
        api.getStockTransfers(),
        api.getProducts({ activeOnly: true }),
      ]);
      setTransfers(tList);
      setProducts(pList);
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Error', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const handleAddItemToTransfer = () => {
    const prod = products.find((p) => p.id === selectedProductId);
    const variant = prod?.variants.find((v) => v.id === selectedVariantId);
    if (!prod || !variant) {
      notify({ type: 'WARNING', title: 'Select Item', message: 'Please select product and size variant' });
      return;
    }

    const available = variant.branchStock[sourceBranchId] || 0;
    if (transferQuantity > available) {
      notify({
        type: 'ERROR',
        title: 'Insufficient Source Stock',
        message: `Only ${available} units available at source branch`,
      });
      return;
    }

    setTransferItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        variantId: variant.id,
        productName: prod.name,
        sku: variant.sku,
        size: variant.size,
        quantity: transferQuantity,
      },
    ]);

    setSelectedProductId('');
    setSelectedVariantId('');
    setTransferQuantity(10);
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferItems.length) {
      notify({ type: 'WARNING', title: 'No Items', message: 'Add at least one item to transfer.' });
      return;
    }

    try {
      await api.createStockTransfer({
        sourceBranchId,
        destBranchId,
        items: transferItems,
        notes: transferNotes,
      });

      notify({
        type: 'SUCCESS',
        title: 'Transfer Created',
        message: 'Stock transfer initiated and pending dispatch.',
      });

      setIsModalOpen(false);
      setTransferItems([]);
      setTransferNotes('');
      fetchTransfers();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Creation Failed', message: err.message });
    }
  };

  const handleUpdateStatus = async (transferId: string, status: string) => {
    try {
      await api.updateTransferStatus(transferId, status);
      notify({
        type: 'SUCCESS',
        title: 'Status Updated',
        message: `Transfer updated to ${status}.`,
      });
      fetchTransfers();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Update Failed', message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Inter-Branch Stock Transfers
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Relocate school uniforms securely between branches with dispatch verification and receipt sign-off.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-[#030A91] text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5 text-[#FACB00]" />
          <span>Initiate New Transfer</span>
        </button>
      </div>

      {/* Transfers List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <th className="py-3 px-4">Transfer #</th>
                <th className="py-3 px-3">From (Source)</th>
                <th className="py-3 px-3">To (Destination)</th>
                <th className="py-3 px-3">Items Transferred</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Date Initiated</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {t.transferNumber}
                  </td>
                  <td className="py-3 px-3 text-slate-700 font-semibold">{t.sourceBranchName}</td>
                  <td className="py-3 px-3 text-slate-700 font-semibold">{t.destBranchName}</td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-800">
                      {t.items.reduce((s, i) => s + i.quantity, 0)} units
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      ({t.items.length} line items)
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={t.status} type="transfer" />
                  </td>
                  <td className="py-3 px-3 text-slate-500 text-[11px]">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center space-x-1.5">
                      {t.status === 'PENDING' && (
                        <button
                          onClick={() => handleUpdateStatus(t.id, 'DISPATCHED')}
                          className="px-2.5 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 text-[11px] font-bold"
                        >
                          Dispatch
                        </button>
                      )}
                      {(t.status === 'DISPATCHED' || t.status === 'PENDING') && (
                        <button
                          onClick={() => handleUpdateStatus(t.id, 'RECEIVED')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold"
                        >
                          Confirm Receipt
                        </button>
                      )}
                      {t.status === 'RECEIVED' && (
                        <span className="text-[10px] text-emerald-700 font-bold">
                          ✓ Completed
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {transfers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No stock transfers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Transfer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-[#030A91] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Initiate Inter-Branch Transfer</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Source Branch (From):
                  </label>
                  <select
                    value={sourceBranchId}
                    onChange={(e) => setSourceBranchId(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
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
                    Destination Branch (To):
                  </label>
                  <select
                    value={destBranchId}
                    onChange={(e) => setDestBranchId(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    {branches
                      .filter((b) => b.id !== sourceBranchId)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Add Item Row */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase block">
                  Add Uniform Garment:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      setSelectedVariantId('');
                    }}
                    className="px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="">Select Uniform...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.school}: {p.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedVariantId}
                    disabled={!selectedProductId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    className="px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg disabled:opacity-50"
                  >
                    <option value="">Select Size...</option>
                    {products
                      .find((p) => p.id === selectedProductId)
                      ?.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          Size {v.size} (Avail: {v.branchStock[sourceBranchId] || 0})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex gap-2 items-center pt-1">
                  <div className="w-32">
                    <input
                      type="number"
                      min="1"
                      value={transferQuantity}
                      onChange={(e) => setTransferQuantity(Number(e.target.value))}
                      placeholder="Qty"
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItemToTransfer}
                    className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900"
                  >
                    + Add Item
                  </button>
                </div>
              </div>

              {/* Added items list */}
              {transferItems.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Items to transfer:
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {transferItems.map((it, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-slate-100 rounded-lg flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold truncate max-w-[200px]">
                          {it.productName} (Size {it.size})
                        </span>
                        <span className="font-bold text-[#030A91]">{it.quantity} units</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Transfer Notes / Waybill Ref:
                </label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g. Dispatched via courier for term opening..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-2 flex space-x-2">
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
                  Dispatch Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
