import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../api';
import { Quotation, Product, Customer } from '../types';
import {
  FileCheck,
  Plus,
  Search,
  ArrowRight,
  Printer,
  X,
  FileSpreadsheet,
  CheckCircle2,
  Eye
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { QuotationPreviewModal } from '../components/QuotationPreviewModal';

export const QuotationsView: React.FC = () => {
  const { activeBranchId, canAccessFinancials, user } = useAuth();
  const { notify } = useNotification();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);

  // Form states
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [schoolOrOrg, setSchoolOrOrg] = useState('');
  const [quoteItems, setQuoteItems] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [itemQty, setItemQty] = useState(25);
  const [itemDiscount, setItemDiscount] = useState(0);

  const fetchQuotations = async () => {
    try {
      const [qData, pData, cData] = await Promise.all([
        api.getQuotations({ branchId: activeBranchId }),
        api.getProducts({ activeOnly: true }),
        api.getCustomers(),
      ]);
      setQuotations(qData);
      setProducts(pData);
      setCustomers(cData);
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Load Error', message: err.message });
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [activeBranchId]);

  const handleSelectCustomer = (cId: string) => {
    setCustomerId(cId);
    const found = customers.find((c) => c.id === cId);
    if (found) {
      setCustomerName(found.name);
      setCustomerEmail(found.email);
      setCustomerPhone(found.phone);
      setSchoolOrOrg(found.schoolOrOrg || '');
    }
  };

  const handleAddItem = () => {
    const prod = products.find((p) => p.id === selectedProductId);
    const variant = prod?.variants.find((v) => v.id === selectedVariantId);
    if (!prod || !variant) return;

    setQuoteItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        variantId: variant.id,
        productName: prod.name,
        sku: variant.sku,
        size: variant.size,
        quantity: itemQty,
        unitPrice: variant.sellingPrice,
        discountAmount: itemDiscount,
      },
    ]);

    setSelectedProductId('');
    setSelectedVariantId('');
    setItemQty(25);
    setItemDiscount(0);
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteItems.length) {
      notify({ type: 'WARNING', title: 'No Items', message: 'Add at least one uniform item to the quote.' });
      return;
    }

    try {
      const newQuote = await api.createQuotation({
        branchId: activeBranchId,
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        schoolOrOrg,
        items: quoteItems,
      });

      notify({
        type: 'SUCCESS',
        title: 'Quotation Created',
        message: `Quotation ${newQuote.quotationNumber} for ${customerName} successfully created.`,
      });

      setIsModalOpen(false);
      setQuoteItems([]);
      fetchQuotations();
      setPreviewQuotation(newQuote);
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Creation Failed', message: err.message });
    }
  };

  const handleConvertToInvoice = async (quoteId: string) => {
    setIsConverting(true);
    try {
      const res = await api.convertToInvoice(quoteId);
      notify({
        type: 'SUCCESS',
        title: 'Converted to Invoice',
        message: `Quotation converted to official Invoice ${res.invoice.invoiceNumber}`,
      });
      fetchQuotations();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Conversion Failed', message: err.message });
    } finally {
      setIsConverting(false);
    }
  };

  const filteredQuotes = quotations.filter((q) => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        q.quotationNumber.toLowerCase().includes(query) ||
        q.customerName.toLowerCase().includes(query) ||
        (q.schoolOrOrg && q.schoolOrOrg.toLowerCase().includes(query))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Uniform Quotations & Estimates
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create school uniform estimates and seamlessly convert accepted bids into official invoices.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-[#030A91] text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5 text-[#FACB00]" />
          <span>New Quotation</span>
        </button>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quotation #, school, or client..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase bg-slate-50">
                <th className="py-3 px-4">Quote #</th>
                <th className="py-3 px-3">School / Customer</th>
                <th className="py-3 px-3">Valid Until</th>
                <th className="py-3 px-3 text-right">Items</th>
                <th className="py-3 px-3 text-right">Total (KES)</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-center">Convert / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotes.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {q.quotationNumber}
                    <span className="block font-sans text-[10px] text-slate-500 font-normal">
                      Served by: <strong className="text-slate-700">{q.createdByName || user?.name || 'Staff'}</strong>
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 block">{q.customerName}</span>
                    <span className="text-[10px] text-slate-500">{q.schoolOrOrg || 'Individual'}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{q.validUntil}</td>
                  <td className="py-3 px-3 text-right font-medium text-slate-700">
                    {q.items.reduce((s, i) => s + i.quantity, 0)} units
                  </td>
                  <td className="py-3 px-3 text-right font-black text-slate-900">
                    KES {q.totalAmount.toLocaleString()}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={q.status} type="invoice" />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center space-x-1.5">
                      <button
                        onClick={() => setPreviewQuotation(q)}
                        className="inline-flex items-center px-2.5 py-1 bg-blue-50 hover:bg-[#030A91] hover:text-white text-[#030A91] border border-blue-200 rounded-lg text-[10px] font-bold transition-colors shadow-2xs"
                        title="Preview & Print Quotation"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        <span>Preview</span>
                      </button>

                      {q.status !== 'CONVERTED' ? (
                        <button
                          onClick={() => handleConvertToInvoice(q.id)}
                          disabled={isConverting}
                          className="inline-flex items-center px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <FileSpreadsheet className="w-3 h-3 mr-1" />
                          <span>Convert</span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          Invoice Created ✓
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredQuotes.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No quotations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Quotation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-[#030A91] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Create School Uniform Quotation</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Select Customer Account (or enter new):
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="">-- Choose Existing Account --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.schoolOrOrg ? `(${c.schoolOrOrg})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Customer / School Name:
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Email Address:
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Items Section */}
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
                    className="px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="">Select Size...</option>
                    {products
                      .find((p) => p.id === selectedProductId)
                      ?.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          Size {v.size} (KES {v.sellingPrice.toLocaleString()})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex gap-2 items-center">
                  <div className="w-28">
                    <input
                      type="number"
                      min="1"
                      value={itemQty}
                      onChange={(e) => setItemQty(Number(e.target.value))}
                      placeholder="Qty"
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      min="0"
                      value={itemDiscount}
                      onChange={(e) => setItemDiscount(Number(e.target.value))}
                      placeholder="Total Disc KES"
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
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

              {/* Items preview */}
              {quoteItems.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Items on Quotation:
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {quoteItems.map((it, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-slate-100 rounded-lg flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold truncate max-w-[220px]">
                          {it.productName} ({it.size})
                        </span>
                        <span className="font-bold text-[#030A91]">
                          {it.quantity} x KES {it.unitPrice} = KES {(it.quantity * it.unitPrice - it.discountAmount).toLocaleString()}
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
                  Create Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Quotation Preview Modal */}
      <QuotationPreviewModal
        quotation={previewQuotation}
        isOpen={Boolean(previewQuotation)}
        onClose={() => setPreviewQuotation(null)}
        onConvertToInvoice={handleConvertToInvoice}
      />
    </div>
  );
};
