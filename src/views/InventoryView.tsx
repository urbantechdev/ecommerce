import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../api';
import { InventoryItem } from '../types';
import {
  Layers,
  Search,
  Filter,
  AlertTriangle,
  History,
  SlidersHorizontal,
  Package,
  ArrowDownRight,
  ArrowUpRight,
  X,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { SkuImageManagerModal } from '../components/SkuImageManagerModal';

export const InventoryView: React.FC = () => {
  const { branches, activeBranchId, canAccessFinancials, user } = useAuth();
  const { notify } = useNotification();

  const [activeTab, setActiveTab] = useState<'STOCK' | 'ALERTS' | 'MOVEMENTS'>('STOCK');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>(activeBranchId);
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('ALL');

  // Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustNewStock, setAdjustNewStock] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('PHYSICAL_COUNT');
  const [adjustNotes, setAdjustNotes] = useState<string>('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  // SKU Image Files Modal
  const [isSkuImageModalOpen, setIsSkuImageModalOpen] = useState(false);
  const [selectedSkuForModal, setSelectedSkuForModal] = useState<string | undefined>(undefined);
  const [allProducts, setAllProducts] = useState<any[]>([]);

  const handleOpenSkuModal = async (sku?: string) => {
    setSelectedSkuForModal(sku);
    if (allProducts.length === 0) {
      try {
        const prods = await api.getProducts();
        setAllProducts(prods);
      } catch (e) {
        // fallback
      }
    }
    setIsSkuImageModalOpen(true);
  };

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const [invData, alertData, moveData] = await Promise.all([
        api.getInventory({ branchId: selectedBranchFilter }),
        api.getInventoryAlerts(),
        api.getInventoryMovements({ branchId: selectedBranchFilter }),
      ]);
      setInventory(invData);
      setAlerts(alertData);
      setMovements(moveData);
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Error loading inventory', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [selectedBranchFilter]);

  const schools = Array.from(new Set(inventory.map((i) => i.school))).filter(Boolean);

  const filteredInventory = inventory.filter((item) => {
    if (selectedSchoolFilter !== 'ALL' && item.school !== selectedSchoolFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.productName.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.school.toLowerCase().includes(q) ||
        item.barcode.includes(q)
      );
    }
    return true;
  });

  const openAdjustModal = (item: InventoryItem) => {
    setAdjustItem(item);
    setAdjustNewStock(item.currentStock);
    setAdjustReason('PHYSICAL_COUNT');
    setAdjustNotes('');
    setIsAdjustModalOpen(true);
  };

  const handleConfirmAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem) return;

    setIsSubmittingAdjust(true);
    try {
      await api.adjustInventory({
        productId: adjustItem.productId,
        variantId: adjustItem.variantId,
        branchId: adjustItem.branchId,
        newStock: Number(adjustNewStock),
        reason: adjustReason,
        notes: adjustNotes,
      });

      notify({
        type: 'SUCCESS',
        title: 'Stock Adjusted',
        message: `${adjustItem.sku} stock updated to ${adjustNewStock} at ${adjustItem.branchName}`,
      });

      setIsAdjustModalOpen(false);
      fetchInventory();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Adjustment Failed', message: err.message });
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Multi-Branch Inventory Synchronization
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized stock visibility with atomic stock movements and automated restock alerts.
          </p>
        </div>

        {/* Header Actions & Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenSkuModal()}
            className="inline-flex items-center px-3.5 py-2 bg-gradient-to-r from-blue-700 to-[#030A91] hover:from-blue-800 hover:to-blue-950 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-[#FACB00]" />
            <span>SKU Image Files & Categories</span>
          </button>

          {/* Tab Switcher */}
          <div className="flex items-center bg-white border border-slate-200 p-1 rounded-xl shadow-xs text-xs font-bold">
            <button
              onClick={() => setActiveTab('STOCK')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
                activeTab === 'STOCK'
                  ? 'bg-[#030A91] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Stock Levels ({filteredInventory.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('ALERTS')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
                activeTab === 'ALERTS'
                  ? 'bg-[#030A91] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Low Stock Alerts ({alerts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('MOVEMENTS')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
                activeTab === 'MOVEMENTS'
                  ? 'bg-[#030A91] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Stock Ledger</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: STOCK LEVELS                                  */}
      {/* ==================================================== */}
      {activeTab === 'STOCK' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search uniform item, SKU, school, or barcode..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91]"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#030A91]"
              >
                <option value="all">All Branches (Consolidated)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedSchoolFilter}
                onChange={(e) => setSelectedSchoolFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#030A91]"
              >
                <option value="ALL">All Schools</option>
                {schools.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stock Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                    <th className="py-3 px-4">School & Garment</th>
                    <th className="py-3 px-3">Size / SKU</th>
                    <th className="py-3 px-3">Branch</th>
                    <th className="py-3 px-3 text-center">Available Stock</th>
                    <th className="py-3 px-3">Threshold</th>
                    {canAccessFinancials && <th className="py-3 px-3 text-right">Cost Value</th>}
                    <th className="py-3 px-3 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInventory.map((item) => (
                    <tr key={`${item.variantId}-${item.branchId}`} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div
                            onClick={() => handleOpenSkuModal(item.sku)}
                            className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 cursor-pointer group hover:border-[#030A91]"
                            title="Click to view/change SKU photo"
                          >
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.sku}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300 group-hover:text-amber-600 group-hover:bg-amber-50">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{item.productName}</span>
                            <span className="text-[10px] text-slate-500 uppercase font-semibold">
                              {item.school} • {item.category}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-black text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          Size {item.size}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                          {item.sku}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {item.branchName}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-black text-xs px-2 py-0.5 rounded-full inline-block ${
                            item.currentStock === 0
                              ? 'bg-rose-100 text-rose-800'
                              : item.isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.currentStock} units
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        Min: {item.reorderLevel} | Reorder: {item.reorderQuantity}
                      </td>
                      {canAccessFinancials && (
                        <td className="py-3 px-3 text-right font-medium text-slate-600">
                          KES {item.totalValuationCost.toLocaleString()}
                        </td>
                      )}
                      <td className="py-3 px-3 text-right font-bold text-[#030A91]">
                        KES {item.sellingPrice.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {canAccessFinancials ? (
                          <button
                            onClick={() => openAdjustModal(item)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#030A91] hover:text-white text-slate-700 text-[11px] font-bold transition-colors"
                          >
                            Adjust
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Read-only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredInventory.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No uniform inventory records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: AUTOMATED RESTOCK ALERTS                      */}
      {/* ==================================================== */}
      {activeTab === 'ALERTS' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-amber-950">
                  Automated Low Stock & Replenishment Monitor
                </h4>
                <p className="text-[11px] text-amber-800">
                  Items currently at or below minimum threshold. Generate Purchase Orders or transfer from central store.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.map((a) => (
              <div
                key={a.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{a.school}</span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        a.urgency === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800 animate-pulse'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {a.urgency}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 mt-1">{a.productName}</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                    Branch: <strong>{a.branchName}</strong> | Size: <strong>{a.size}</strong>
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Current Available:</span>
                    <span className="font-black text-rose-600 text-sm">{a.currentStock} units</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Suggested Reorder:</span>
                    <span className="font-bold text-slate-800">{a.suggestedReorder} units</span>
                  </div>
                </div>
              </div>
            ))}

            {alerts.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">All uniform stocks are healthy!</p>
                <p className="text-xs text-slate-500">No items are currently below their reorder threshold.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: STOCK MOVEMENTS LEDGER                        */}
      {/* ==================================================== */}
      {activeTab === 'MOVEMENTS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Immutable Stock Movement Ledger
            </h3>
            <span className="text-xs text-slate-500">Last 200 physical inventory transactions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase bg-white">
                  <th className="py-3 px-4">Date/Time</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Item / SKU</th>
                  <th className="py-3 px-3">Branch</th>
                  <th className="py-3 px-3 text-center">Movement</th>
                  <th className="py-3 px-3 text-center">Balance</th>
                  <th className="py-3 px-3">Ref & Reason</th>
                  <th className="py-3 px-4">Authorized By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(m.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          m.type === 'SALE'
                            ? 'bg-blue-100 text-blue-800'
                            : m.type === 'PURCHASE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.type === 'TRANSFER_IN' || m.type === 'TRANSFER_OUT'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block truncate max-w-[180px]">
                        {m.productName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">{m.sku}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-700">{m.branchName}</td>
                    <td className="py-3 px-3 text-center font-bold">
                      <span
                        className={`inline-flex items-center ${
                          m.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">
                      {m.newStock} units
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <span className="font-mono text-xs font-bold text-slate-900 block">
                        {m.referenceNumber}
                      </span>
                      <span className="text-[10px] text-slate-500">{m.reason || 'N/A'}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{m.userName}</td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* STOCK ADJUSTMENT MODAL                               */}
      {/* ==================================================== */}
      {isAdjustModalOpen && adjustItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-[#030A91] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#FACB00]">
                  Audit Stock Adjustment
                </span>
                <h3 className="font-bold text-sm">{adjustItem.productName}</h3>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-white/70 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAdjust} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Branch:</span>
                  <span className="font-bold">{adjustItem.branchName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SKU / Size:</span>
                  <span className="font-bold">
                    {adjustItem.sku} (Size: {adjustItem.size})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Stock:</span>
                  <span className="font-black text-slate-900">{adjustItem.currentStock} units</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  New Physical Stock Count:
                </label>
                <input
                  type="number"
                  min="0"
                  value={adjustNewStock}
                  onChange={(e) => setAdjustNewStock(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Mandatory Audit Reason:
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#030A91]"
                >
                  <option value="PHYSICAL_COUNT">Routine Stocktake / Cycle Count</option>
                  <option value="DAMAGED_GOODS">Damaged / Stained / Defective Fabric</option>
                  <option value="OPENING_BALANCE">Initial Opening Balance Entry</option>
                  <option value="CORRECTION">Data Entry Discrepancy Correction</option>
                  <option value="RETURN">Customer Return Reconciliation</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Notes & Authorization Reference:
                </label>
                <textarea
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Audit conducted with store manager..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91]"
                  rows={2}
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust}
                  className="flex-1 py-2 rounded-xl bg-[#030A91] text-white text-xs font-bold hover:bg-blue-900 disabled:opacity-50"
                >
                  {isSubmittingAdjust ? 'Updating...' : 'Commit Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* SKU Image Files & Category Uploader Modal */}
      {isSkuImageModalOpen && (
        <SkuImageManagerModal
          isOpen={isSkuImageModalOpen}
          onClose={() => setIsSkuImageModalOpen(false)}
          products={allProducts}
          onRefresh={async () => {
            const prods = await api.getProducts();
            setAllProducts(prods);
            await fetchInventory();
          }}
          initialSku={selectedSkuForModal}
        />
      )}
    </div>
  );
};
