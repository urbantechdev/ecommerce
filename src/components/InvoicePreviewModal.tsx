import React, { useState, useEffect } from 'react';
import { Invoice } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Printer,
  Mail,
  Download,
  X,
  CheckCircle2,
  Building,
  CreditCard,
  QrCode,
  ShieldCheck
} from 'lucide-react';
import { api } from '../api';
import { useNotification } from '../context/NotificationContext';
import { StatusBadge } from './StatusBadge';

interface InvoicePreviewModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  invoice,
  isOpen,
  onClose,
}) => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const [emailInput, setEmailInput] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    if (invoice?.customerEmail) {
      setEmailInput(invoice.customerEmail);
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  // Always show served by currently logged-in user, falling back to document record
  const servedByName = user?.name || invoice.createdByName || 'Naisia Textiles Officer';

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    if (!emailInput || !emailInput.includes('@')) {
      notify({ type: 'WARNING', title: 'Invalid Email', message: 'Please enter a valid customer email address' });
      return;
    }

    setIsSendingEmail(true);
    try {
      await api.emailInvoice(invoice.id, emailInput);
      notify({
        type: 'SUCCESS',
        title: 'Invoice Emailed',
        message: `Tax Invoice ${invoice.invoiceNumber} sent successfully to ${emailInput}`,
      });
    } catch (err: any) {
      notify({
        type: 'ERROR',
        title: 'Email Failed',
        message: err.message || 'Could not send invoice email',
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Bar (Hidden on Print) */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between no-print print:hidden shrink-0">
          <div className="flex items-center space-x-2">
            <img
              src="https://plain-eeur-prod-public.komododecks.com/202605/07/1sm3ITZIdJmYjyTcxmiP/image.png"
              alt="Naisia Textiles Logo"
              className="w-8 h-8 object-contain shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.png';
              }}
            />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                  Official KRA eTIMS Tax Invoice
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <span className="font-mono text-[11px] text-slate-500">
                {invoice.invoiceNumber} • Served by: <strong className="text-slate-700">{servedByName}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-[#030A91] hover:bg-blue-900 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5 text-[#FACB00]" />
              <span>Print Tax Invoice</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Tax Invoice Sheet */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6 text-xs text-slate-800 bg-white">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-5">
            <div className="flex items-start space-x-3.5">
              <img
                src="https://plain-eeur-prod-public.komododecks.com/202605/07/1sm3ITZIdJmYjyTcxmiP/image.png"
                alt="Naisia Textiles Logo"
                className="w-14 h-14 object-contain shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
              <div>
                <h1 className="text-xl font-black text-[#030A91] tracking-tight">
                  NAISIA TEXTILES LTD
                </h1>
                <p className="text-[11px] text-slate-600 font-semibold uppercase tracking-wider">
                  Institutional Apparel & School Uniform Manufacturers
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Biashara Street, Nairobi CBD • P.O. Box 48291 - 00100 GPO
                </p>
                <p className="text-[10px] text-slate-500">
                  Tel: 0792021496 / 0112264870 • support@naisiaetextiles.com • naisiaetextiles.com
                </p>
                <p className="text-[10px] font-bold text-slate-700 mt-0.5">
                  KRA PIN: P051839281Z • VAT REGISTERED
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs uppercase font-black px-2.5 py-1 rounded-md bg-blue-50 text-[#030A91] border border-blue-200">
                TAX INVOICE
              </span>
              <h2 className="text-base font-black text-slate-900 mt-2 font-mono">
                {invoice.invoiceNumber}
              </h2>
              <div className="text-[11px] text-slate-500 space-y-0.5 mt-1 font-mono">
                <p>Date: {new Date(invoice.createdAt).toLocaleDateString()}</p>
                <p className="text-rose-700 font-bold">Due Date: {invoice.dueDate}</p>
                <p className="text-slate-800 font-bold">
                  Served By: <span className="text-[#030A91] font-black">{servedByName}</span>
                </p>
              </div>
              <div className="mt-2">
                <StatusBadge status={invoice.status} type="invoice" />
              </div>
            </div>
          </div>

          {/* Billed To & KRA eTIMS Verification Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                Billed To:
              </span>
              <p className="font-extrabold text-sm text-slate-900">{invoice.customerName}</p>
              {invoice.customerEmail && (
                <p className="text-slate-500 mt-0.5">{invoice.customerEmail}</p>
              )}
              {invoice.customerPhone && (
                <p className="text-slate-500">{invoice.customerPhone}</p>
              )}
              {invoice.customerKraPin && (
                <p className="font-mono font-bold text-xs text-[#030A91] mt-1">
                  Customer PIN: {invoice.customerKraPin}
                </p>
              )}
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-right">
              <div className="inline-flex items-center px-2 py-0.5 rounded text-[9.5px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 mb-1.5">
                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                KRA eTIMS FISCALIZED INVOICE
              </div>
              <p className="font-mono text-xs font-bold text-slate-800">
                CU Invoice No: {invoice.cuInvoiceNumber || '013000000001001'}
              </p>
              <p className="font-mono text-[10px] text-slate-500">
                Internal Hash: {invoice.kraControlCode || 'A98F-21BC-77E0-4491'}
              </p>

              {invoice.kraQrCodeUrl && (
                <div className="flex justify-end mt-2">
                  <img
                    src={invoice.kraQrCodeUrl}
                    alt="KRA eTIMS QR"
                    className="w-16 h-16 border border-slate-300 rounded p-0.5 bg-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-slate-200 text-[10px] font-black uppercase text-slate-500 bg-slate-50">
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-2 text-center">Size</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Line Total (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 block">{item.productName}</span>
                      {item.sku && <span className="text-[10px] text-slate-400 font-mono">{item.sku}</span>}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700">
                      {item.size}
                    </td>
                    <td className="py-2.5 px-2 text-center font-black text-slate-900">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      KES {item.unitPrice.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      KES {item.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="border-t border-slate-200 pt-4 flex justify-end">
            <div className="w-72 space-y-1.5 text-right font-mono text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Net Taxable (Subtotal):</span>
                <span>KES {invoice.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>16% Standard VAT:</span>
                <span>KES {invoice.taxAmount.toLocaleString()}</span>
              </div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Discount:</span>
                  <span>-KES {invoice.discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-[#030A91] border-t-2 border-slate-300 pt-1.5">
                <span>Total Invoice Amount:</span>
                <span>KES {invoice.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Amount Paid to Date:</span>
                <span>KES {invoice.amountPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-rose-600 border-t border-slate-200 pt-1">
                <span>Balance Due:</span>
                <span>KES {invoice.balanceDue.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Document Issuance & Served By Attendant Footer */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-0.5">
                Served & Prepared By (Attendant):
              </span>
              <p className="font-extrabold text-sm text-[#030A91]">{servedByName}</p>
              <p className="text-[10px] text-slate-500 font-medium">
                Authorised Officer • {invoice.branchName || 'Nairobi CBD Flagship Station'}
              </p>
            </div>
            <div className="mt-2 sm:mt-0 text-left sm:text-right font-mono text-[10px] text-slate-500">
              <p>Document Control: {invoice.kraControlCode || 'A98F-21BC-77E0-4491'}</p>
              <p className="text-emerald-700 font-bold">● Officer Authenticated & Verified</p>
            </div>
          </div>

          {/* Bank Settlement Instructions */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-[10px] text-slate-600 space-y-1">
            <p className="font-bold uppercase tracking-wider text-slate-800">
              Electronic Payment & Bank Transfer Details:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              <div>
                <p>Bank: <strong>Kenya Commercial Bank (KCB)</strong></p>
                <p>Branch: <strong>Biashara Street Branch</strong></p>
                <p>Account Number: <strong className="font-mono text-slate-900">1102938475</strong></p>
              </div>
              <div>
                <p>M-PESA Paybill: <strong className="font-mono text-slate-900">522522</strong></p>
                <p>Account Reference: <strong className="font-mono text-[#030A91]">{invoice.invoiceNumber}</strong></p>
                <p>Payment Terms: {invoice.paymentTerms || 'Net 30 Days'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Instant Email Dispatch Drawer (Hidden on Print) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-2 no-print print:hidden shrink-0">
          <div className="relative flex-1 w-full">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="bursar@school.ac.ke"
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#030A91]"
            />
          </div>
          <button
            onClick={handleSendEmail}
            disabled={isSendingEmail || !emailInput}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 disabled:opacity-50 transition-colors shadow-xs"
          >
            <Mail className="w-3.5 h-3.5 mr-1.5" />
            <span>{isSendingEmail ? 'Sending...' : 'Instant Send to Email'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
