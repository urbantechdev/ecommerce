import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../api';
import { PurchaseOrder, Supplier, Product } from '../types';
import { CreditCard, Plus, Search, CheckCircle2, Truck, X } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export const PurchasesView: React.FC = () => {
  const { activeBranchId, branches } = useAuth();
  const { notify } = useNotification();

  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);

  // Form states
  const [supplierId, setSupplierId] = useState('');
  const [branchId, setBranchId] = useState(branches[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [qty, setQty] = useState(50);
  const [unitCost, setUnitCost] = useState(600);
  const [poItems, setPoItems] = useState<any[]>([]);
  const [notes, setNotes] = useState('');

  const fetchPurchases = async () => {
    try {
      const [poData, sData, pData] = await Promise.all([
        api.getPurchases({ branchId: activeBranchId }),
        api.getSuppliers(),
        api.getProducts({ activeOnly: true }),
      ]);
      setPurchases(poData);
      setSuppliers(sData);
      setProducts(pData);
      if (sData.length) setSupplierId(sData[0].id);
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Error', message: err.message });
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [activeBranchId]);

  const handleAddItem = () => {
    const prod = products.find((p) => p.id === selectedProductId);
    const variant = prod?.variants.find((v) => v.id === selectedVariantId);
    if (!prod || !variant) return;

    setPoItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        variantId: variant.id,
        productName: prod.name,
        sku: variant.sku,
        size: variant.size,
        quantityOrdered: qty,
        unitCost: unitCost || variant.costPrice,
      },
    ]);

    setSelectedProductId('');
    setSelectedVariantId('');
    setQty(50);
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poItems.length) {
      notify({ type: 'WARNING', title: 'No Items', message: 'Add at least one uniform item to the PO.' });
      return;
    }

    try {
      await api.createPurchase({
        supplierId,
        branchId,
        items: poItems,
        notes,
      });

      notify({ type: 'SUCCESS', title: 'PO Created', message: 'Purchase order issued to supplier.' });
      setIsModalOpen(false);
      setPoItems([]);
      fetchPurchases();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Creation Failed', message: err.message });
    }
  };

  const handleReceiveGoods = async (poId: string) => {
    setIsReceiving(true);
    try {
      await api.receivePurchase(poId);
      notify({
        type: 'SUCCESS',
        title: 'Goods Received (GRN)',
        message: 'Uniforms inspected and added to physical branch stock. Supplier balance updated.',
      });
      fetchPurchases();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Error', message: err.message });
    } finally {
      setIsReceiving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Purchase Orders & Goods Received Notes (GRN)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Procure raw fabrics, knitwear, and uniform garments with automatic inventory restocking on delivery.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-[#030A91] text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5 text-[#FACB00]" />
          <span>Create Purchase Order</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <th className="py-3 px-4">PO #</th>
                <th className="py-3 px-3">Supplier / Miller</th>
                <th className="py-3 px-3">Destination Branch</th>
                <th className="py-3 px-3 text-right">Items (Units)</th>
                <th className="py-3 px-3 text-right">Total Cost (KES)</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-center">GRN Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{po.poNumber}</td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{po.supplierName}</td>
                  <td className="py-3 px-3 text-slate-600">{po.branchName}</td>
                  <td className="py-3 px-3 text-right font-medium">
                    {po.items.reduce((s, i) => s + i.quantityOrdered, 0)} units
                  </td>
                  <td className="py-3 px-3 text-right font-black text-slate-900">
                    KES {po.totalAmount.toLocaleString()}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={po.status} type="po" />
                  </td>
                  <td className="py-3 px-4 text-center">
                    {po.status === 'ORDERED' ? (
                      <button
                        onClick={() => handleReceiveGoods(po.id)}
                        disabled={isReceiving}
                        className="inline-flex items-center px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        <span>Confirm GRN</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-medium">
                        Restocked {po.receivedAt ? new Date(po.receivedAt).toLocaleDateString() : ''}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No purchase orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New PO Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-[#030A91] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Issue Purchase Order (PO)</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Select Supplier:
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Receiving Branch:
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Add items */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase block">
                  Add Item to PO:
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
                    onChange={(e) => {
                      setSelectedVariantId(e.target.value);
                      const prod = products.find((p) => p.id === selectedProductId);
                      const v = prod?.variants.find((vr) => vr.id === e.target.value);
                      if (v) setUnitCost(v.costPrice);
                    }}
                    className="px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="">Select Size...</option>
                    {products
                      .find((p) => p.id === selectedProductId)
                      ?.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          Size {v.size} (Cost: KES {v.costPrice})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex gap-2 items-center">
                  <div className="w-24">
                    <input
                      type="number"
                      min="1"
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value))}
                      placeholder="Qty"
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      min="1"
                      value={unitCost}
                      onChange={(e) => setUnitCost(Number(e.target.value))}
                      placeholder="Unit Cost"
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Items in PO */}
              {poItems.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Items on Purchase Order:
                  </span>
                  <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                    {poItems.map((it, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-slate-100 rounded-lg flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold truncate max-w-[200px]">
                          {it.productName} ({it.size})
                        </span>
                        <span className="font-bold text-[#030A91]">
                          {it.quantityOrdered} x KES {it.unitCost} = KES {(it.quantityOrdered * it.unitCost).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                  Issue Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
