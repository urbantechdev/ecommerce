import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../api';
import { Invoice, Product, Customer } from '../types';
import {
  FileSpreadsheet,
  Plus,
  Search,
  CreditCard,
  Ban,
  Printer,
  X,
  CheckCircle2,
  DollarSign,
  Mail,
  Send,
  Eye,
  Trash2,
  Building,
  User,
  Layers,
  Sparkles
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { InvoicePreviewModal } from '../components/InvoicePreviewModal';

export const InvoicesView: React.FC = () => {
  const { activeBranchId, branches, canAccessFinancials, user } = useAuth();
  const { notify } = useNotification();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);

  // Pay Modal
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'BANK_TRANSFER' | 'MPESA' | 'CASH'>('BANK_TRANSFER');
  const [payRef, setPayRef] = useState('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Void Modal
  const [selectedInvoiceForVoid, setSelectedInvoiceForVoid] = useState<Invoice | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isSubmittingVoid, setIsSubmittingVoid] = useState(false);

  // Invoice Preview Modal
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  // Custom Invoice Creation Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [targetBranchId, setTargetBranchId] = useState(activeBranchId === 'all' ? branches[0]?.id : activeBranchId);

  // Customer fields
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerKraPin, setCustomerKraPin] = useState('');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [paymentTerms, setPaymentTerms] = useState('Net 14 Days');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [sendEmailImmediately, setSendEmailImmediately] = useState(true);

  // Line items state
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [itemType, setItemType] = useState<'CATALOG' | 'CUSTOM'>('CATALOG');

  // Catalog item selector
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [catalogQty, setCatalogQty] = useState(25);
  const [catalogPrice, setCatalogPrice] = useState(1000);

  // Custom item inputs
  const [customItemName, setCustomItemName] = useState('');
  const [customItemSize, setCustomItemSize] = useState('Standard');
  const [customItemQty, setCustomItemQty] = useState(10);
  const [customItemPrice, setCustomItemPrice] = useState(1200);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [invData, prodData, custList] = await Promise.all([
        api.getInvoices({
          branchId: activeBranchId,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        }),
        api.getProducts({ activeOnly: true }),
        api.getCustomers(),
      ]);
      setInvoices(invData);
      setProducts(prodData);
      setCustomers(custList);
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Error', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeBranchId, statusFilter]);

  // When customer is selected from dropdown
  const handleSelectCustomer = (cId: string) => {
    setSelectedCustomerId(cId);
    if (!cId) return;
    const found = customers.find((c) => c.id === cId);
    if (found) {
      setCustomerName(found.name);
      setCustomerEmail(found.email || '');
      setCustomerPhone(found.phone || '');
      setCustomerKraPin(found.kraPin || '');
    }
  };

  // Add Item to Custom Invoice Draft
  const handleAddCatalogItem = () => {
    const prod = products.find((p) => p.id === selectedProductId);
    const variant = prod?.variants.find((v) => v.id === selectedVariantId);
    if (!prod || !variant) return;

    const unitPrice = catalogPrice || variant.sellingPrice;
    const total = catalogQty * unitPrice;

    setInvoiceItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        variantId: variant.id,
        productName: prod.name,
        sku: variant.sku,
        size: variant.size,
        quantity: catalogQty,
        unitPrice,
        discountAmount: 0,
        total,
      },
    ]);

    setSelectedProductId('');
    setSelectedVariantId('');
    setCatalogQty(25);
  };

  const handleAddCustomItem = () => {
    if (!customItemName.trim()) {
      notify({ type: 'WARNING', title: 'Name Required', message: 'Enter custom item description' });
      return;
    }

    const total = customItemQty * customItemPrice;
    setInvoiceItems((prev) => [
      ...prev,
      {
        productName: customItemName.trim(),
        size: customItemSize.trim() || 'Standard',
        quantity: customItemQty,
        unitPrice: customItemPrice,
        discountAmount: 0,
        total,
      },
    ]);

    setCustomItemName('');
    setCustomItemSize('Standard');
    setCustomItemQty(10);
  };

  const handleRemoveItem = (index: number) => {
    setInvoiceItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculate totals
  const totalPayable = invoiceItems.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = Number((totalPayable - totalPayable / 1.16).toFixed(2));
  const subtotalNet = Number((totalPayable - taxAmount).toFixed(2));

  // Handle Custom Invoice Submit
  const handleCreateCustomInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      notify({ type: 'WARNING', title: 'Customer Required', message: 'Please specify customer or school name' });
      return;
    }
    if (!invoiceItems.length) {
      notify({ type: 'WARNING', title: 'Items Required', message: 'Add at least one line item to the invoice' });
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const payload = {
        branchId: targetBranchId,
        customerId: selectedCustomerId || undefined,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerKraPin: customerKraPin.trim() || undefined,
        items: invoiceItems,
        dueDate,
        paymentTerms,
        notes: invoiceNotes,
      };

      const newInv = await api.createInvoice(payload);

      let emailed = false;
      if (sendEmailImmediately && customerEmail.trim()) {
        try {
          await api.emailInvoice(newInv.id, customerEmail.trim());
          emailed = true;
        } catch (emailErr) {
          console.warn('Instant email dispatch warning:', emailErr);
        }
      }

      notify({
        type: 'SUCCESS',
        title: 'Custom Invoice Created',
        message: `Invoice ${newInv.invoiceNumber} (KES ${newInv.totalAmount.toLocaleString()}) created${
          emailed ? ` and emailed to ${customerEmail}` : ''
        }.`,
      });

      setIsCreateModalOpen(false);
      // Reset form
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setCustomerKraPin('');
      setSelectedCustomerId('');
      setInvoiceItems([]);
      setInvoiceNotes('');

      // Refresh list & open preview modal directly
      fetchData();
      setPreviewInvoice(newInv);
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Creation Failed', message: err.message || 'Could not create invoice' });
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        (inv.cuInvoiceNumber && inv.cuInvoiceNumber.includes(q))
      );
    }
    return true;
  });

  const handleOpenPayModal = (inv: Invoice) => {
    setSelectedInvoiceForPay(inv);
    setPaymentAmount(inv.balanceDue);
    setPayMethod('BANK_TRANSFER');
    setPayRef(`EFT-${Date.now().toString().slice(-6)}`);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPay || paymentAmount <= 0) return;

    setIsSubmittingPay(true);
    try {
      await api.recordInvoicePayment(selectedInvoiceForPay.id, {
        amount: paymentAmount,
        paymentMethod: payMethod,
        paymentReference: payRef,
      });

      notify({
        type: 'SUCCESS',
        title: 'Payment Recorded',
        message: `Settlement of KES ${paymentAmount.toLocaleString()} recorded for ${selectedInvoiceForPay.invoiceNumber}`,
      });

      setSelectedInvoiceForPay(null);
      fetchData();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Payment Failed', message: err.message });
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const handleConfirmVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForVoid || !voidReason.trim()) return;

    setIsSubmittingVoid(true);
    try {
      await api.voidInvoice(selectedInvoiceForVoid.id, voidReason);
      notify({
        type: 'SUCCESS',
        title: 'Invoice Voided',
        message: `Invoice ${selectedInvoiceForVoid.invoiceNumber} has been voided.`,
      });
      setSelectedInvoiceForVoid(null);
      setVoidReason('');
      fetchData();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Void Failed', message: err.message });
    } finally {
      setIsSubmittingVoid(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Custom Invoice Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Institutional & School Invoices
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            KRA eTIMS compliant tax invoices, custom billing, and instant email dispatch.
          </p>
        </div>

        {canAccessFinancials && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-[#030A91] text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5 text-[#FACB00]" />
            <span>Create Custom Invoice</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoice number, customer name, KRA CU #..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91]"
          />
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#030A91]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ISSUED">Issued / Pending</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Fully Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="VOIDED">Voided</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase bg-slate-50">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-3">Billed To (School/Client)</th>
                <th className="py-3 px-3">Due Date</th>
                <th className="py-3 px-3 text-right">Total (KES)</th>
                <th className="py-3 px-3 text-right">Balance Due</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">KRA CU #</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {inv.invoiceNumber}
                    <span className="block font-sans text-[10px] text-slate-500 font-normal">
                      Served by: <strong className="text-slate-700">{inv.createdByName || user?.name || 'Staff'}</strong>
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 block">{inv.customerName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{inv.customerEmail || inv.customerPhone || 'N/A'}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{inv.dueDate}</td>
                  <td className="py-3 px-3 text-right font-black text-slate-900">
                    KES {inv.totalAmount.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-black">
                    <span className={inv.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                      KES {inv.balanceDue.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={inv.status} type="invoice" />
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                    {inv.cuInvoiceNumber || 'Pending eTIMS'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center space-x-1.5">
                      <button
                        onClick={() => setPreviewInvoice(inv)}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-[#030A91] hover:text-white text-[#030A91] border border-blue-200 text-[10px] font-bold transition-colors shadow-2xs"
                        title="Preview & Print Official Tax Invoice"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        <span>Preview</span>
                      </button>

                      {canAccessFinancials && inv.status !== 'PAID' && inv.status !== 'VOIDED' && (
                        <button
                          onClick={() => handleOpenPayModal(inv)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 border border-emerald-200 font-bold text-[10px] transition-colors"
                        >
                          Pay
                        </button>
                      )}

                      {canAccessFinancials && inv.status !== 'PAID' && inv.status !== 'VOIDED' && (
                        <button
                          onClick={() => setSelectedInvoiceForVoid(inv)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Void Invoice"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================== */}
      {/* CREATE CUSTOM INVOICE MODAL                          */}
      {/* ==================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            <div className="p-4 sm:p-5 bg-[#030A91] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-[#FACB00]" />
                <h3 className="font-black text-sm sm:text-base">
                  Create Custom Tax Invoice
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomInvoice} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Customer / School Selection */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider block">
                  1. Customer & School Details
                </span>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Select Existing Client (or type custom details below):
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="">-- Choose Existing Client / School --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.schoolOrOrg ? `(${c.schoolOrOrg})` : ''} - {c.email || c.phone}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Customer / Institution Name:
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Nairobi School Board of Management"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Customer Email (for instant sending):
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="bursar@school.ac.ke"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Phone Number:
                    </label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+254 7..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Customer KRA PIN:
                    </label>
                    <input
                      type="text"
                      value={customerKraPin}
                      onChange={(e) => setCustomerKraPin(e.target.value.toUpperCase())}
                      placeholder="P05..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Branch Station:
                    </label>
                    <select
                      value={targetBranchId}
                      onChange={(e) => setTargetBranchId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Line Items Builder */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                    2. Invoice Items
                  </span>

                  <div className="flex items-center space-x-1 bg-slate-200 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setItemType('CATALOG')}
                      className={`px-2 py-0.5 rounded ${
                        itemType === 'CATALOG' ? 'bg-white text-[#030A91]' : 'text-slate-600'
                      }`}
                    >
                      From Uniform Catalog
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemType('CUSTOM')}
                      className={`px-2 py-0.5 rounded ${
                        itemType === 'CUSTOM' ? 'bg-white text-[#030A91]' : 'text-slate-600'
                      }`}
                    >
                      Custom Item / Service
                    </button>
                  </div>
                </div>

                {itemType === 'CATALOG' ? (
                  /* Catalog Item Adder */
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end bg-white p-3 rounded-xl border border-slate-200">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        Select Uniform Garment:
                      </label>
                      <select
                        value={selectedProductId}
                        onChange={(e) => {
                          setSelectedProductId(e.target.value);
                          setSelectedVariantId('');
                        }}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                      >
                        <option value="">-- Choose Product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.school})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        Size:
                      </label>
                      <select
                        value={selectedVariantId}
                        onChange={(e) => {
                          setSelectedVariantId(e.target.value);
                          const prod = products.find((p) => p.id === selectedProductId);
                          const v = prod?.variants.find((vr) => vr.id === e.target.value);
                          if (v) setCatalogPrice(v.sellingPrice);
                        }}
                        disabled={!selectedProductId}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                      >
                        <option value="">-- Size --</option>
                        {products
                          .find((p) => p.id === selectedProductId)
                          ?.variants.map((v) => (
                            <option key={v.id} value={v.id}>
                              Size {v.size} (KES {v.sellingPrice})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="flex space-x-1 items-end">
                      <div className="w-16">
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">
                          Qty:
                        </label>
                        <input
                          type="number"
                          value={catalogQty}
                          onChange={(e) => setCatalogQty(Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCatalogItem}
                        disabled={!selectedProductId || !selectedVariantId}
                        className="flex-1 py-1.5 bg-[#030A91] text-white rounded-lg text-xs font-bold hover:bg-blue-900 disabled:opacity-40"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Custom Item Adder */
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end bg-white p-3 rounded-xl border border-slate-200">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        Custom Description:
                      </label>
                      <input
                        type="text"
                        value={customItemName}
                        onChange={(e) => setCustomItemName(e.target.value)}
                        placeholder="e.g. Custom Monogram Crest Embroidery"
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        Specification / Size:
                      </label>
                      <input
                        type="text"
                        value={customItemSize}
                        onChange={(e) => setCustomItemSize(e.target.value)}
                        placeholder="e.g. Standard, Batch"
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        Unit Price (KES):
                      </label>
                      <input
                        type="number"
                        value={customItemPrice}
                        onChange={(e) => setCustomItemPrice(Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>

                    <div className="flex space-x-1 items-end">
                      <div className="w-16">
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">
                          Qty:
                        </label>
                        <input
                          type="number"
                          value={customItemQty}
                          onChange={(e) => setCustomItemQty(Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCustomItem}
                        disabled={!customItemName.trim()}
                        className="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-40"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                )}

                {/* Added items list */}
                {invoiceItems.length > 0 && (
                  <div className="space-y-1.5 mt-2 max-h-40 overflow-y-auto">
                    {invoiceItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{item.productName}</span>
                          <span className="text-[10px] text-slate-500 block">
                            Size: {item.size} • {item.quantity} units @ KES {item.unitPrice.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3">
                          <span className="font-mono font-black text-slate-900">
                            KES {item.total.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Due Date & Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                    Invoice Due Date:
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                    Payment Terms:
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Net 14 Days">Net 14 Days</option>
                    <option value="Net 30 Days">Net 30 Days</option>
                    <option value="50% Deposit, 50% on Delivery">50% Deposit, 50% on Delivery</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Invoice Notes & Terms:
                </label>
                <textarea
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder="e.g. Formal purchase order reference #PO-8821. Delivery to main school store."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  rows={2}
                />
              </div>

              {/* Totals Summary */}
              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-center justify-between">
                <div className="space-y-0.5 text-slate-600 text-xs">
                  <p>Net Subtotal: <strong className="font-mono">KES {subtotalNet.toLocaleString()}</strong></p>
                  <p>16% Standard VAT: <strong className="font-mono">KES {taxAmount.toLocaleString()}</strong></p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Invoice Payable</span>
                  <span className="text-lg font-black text-[#030A91] font-mono">
                    KES {totalPayable.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Instant Email Checkbox */}
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-emerald-700" />
                  <div>
                    <span className="font-bold text-emerald-900 text-xs block">
                      Instant Email Dispatch
                    </span>
                    <span className="text-[10px] text-emerald-700">
                      Send official eTIMS invoice copy to client email immediately upon creation.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={sendEmailImmediately}
                  onChange={(e) => setSendEmailImmediately(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate || !invoiceItems.length}
                  className="flex-1 py-2.5 rounded-xl bg-[#030A91] text-white text-xs font-bold hover:bg-blue-900 shadow-sm disabled:opacity-50 flex items-center justify-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5 text-[#FACB00]" />
                  <span>
                    {isSubmittingCreate
                      ? 'Issuing Invoice...'
                      : sendEmailImmediately && customerEmail
                      ? 'Create & Send Invoice'
                      : 'Create Custom Invoice'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {selectedInvoiceForPay && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-[#030A91] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                Record Payment - {selectedInvoiceForPay.invoiceNumber}
              </h3>
              <button
                onClick={() => setSelectedInvoiceForPay(null)}
                className="text-white/70 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-800">{selectedInvoiceForPay.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Invoice:</span>
                  <span>KES {selectedInvoiceForPay.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Balance Due:</span>
                  <span className="font-black text-rose-600">KES {selectedInvoiceForPay.balanceDue.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Settlement Amount (KES):
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  max={selectedInvoiceForPay.balanceDue}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Payment Method:
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-xs"
                >
                  <option value="BANK_TRANSFER">Bank Transfer / RTGS / EFT</option>
                  <option value="MPESA">M-PESA Paybill</option>
                  <option value="CASH">Cash Deposit</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Bank Reference / M-PESA Code:
                </label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. QJD78192K9 or KCB-EFT-8812"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs"
                  required
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForPay(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPay}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmittingPay ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {selectedInvoiceForVoid && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-rose-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Void Invoice {selectedInvoiceForVoid.invoiceNumber}</h3>
              <button
                onClick={() => setSelectedInvoiceForVoid(null)}
                className="text-white/70 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmVoid} className="p-5 space-y-4 text-xs">
              <p className="text-xs text-rose-800 bg-rose-50 p-3 rounded-xl border border-rose-200">
                Warning: Invoices cannot be permanently deleted. Voiding will mark this document as VOIDED, reverse balances, and log an immutable audit event.
              </p>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Mandatory Void Reason:
                </label>
                <textarea
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Order cancelled by school board before uniform fabrication..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  rows={3}
                  required
                />
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForVoid(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVoid}
                  className="flex-1 py-2 rounded-xl bg-rose-700 text-white text-xs font-bold hover:bg-rose-800 disabled:opacity-50"
                >
                  {isSubmittingVoid ? 'Voiding...' : 'Commit Void'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Tax Invoice Preview Modal */}
      <InvoicePreviewModal
        invoice={previewInvoice}
        isOpen={Boolean(previewInvoice)}
        onClose={() => setPreviewInvoice(null)}
      />
    </div>
  );
};
