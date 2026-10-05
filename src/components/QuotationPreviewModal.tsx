import React, { useState } from 'react';
import { Quotation } from '../types';
import {
  Printer,
  Mail,
  Download,
  X,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Building,
  ArrowRight
} from 'lucide-react';
import { api } from '../api';
import { useNotification } from '../context/NotificationContext';
import { StatusBadge } from './StatusBadge';

interface QuotationPreviewModalProps {
  quotation: Quotation | null;
  isOpen: boolean;
  onClose: () => void;
  onConvertToInvoice?: (quoteId: string) => void;
}

export const QuotationPreviewModal: React.FC<QuotationPreviewModalProps> = ({
  quotation,
  isOpen,
  onClose,
  onConvertToInvoice,
}) => {
  const { notify } = useNotification();
  const [emailInput, setEmailInput] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Sync recipient email when quotation opens
  React.useEffect(() => {
    if (quotation?.customerEmail) {
      setEmailInput(quotation.customerEmail);
    }
  }, [quotation]);

  if (!isOpen || !quotation) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    if (!emailInput || !emailInput.includes('@')) {
      notify({ type: 'WARNING', title: 'Invalid Email', message: 'Please enter a valid recipient email address' });
      return;
    }

    setIsSendingEmail(true);
    try {
      await api.emailQuotation(quotation.id, emailInput);
      notify({
        type: 'SUCCESS',
        title: 'Quotation Dispatched',
        message: `Quotation ${quotation.quotationNumber} sent successfully to ${emailInput}`,
      });
    } catch (err: any) {
      notify({
        type: 'ERROR',
        title: 'Email Failed',
        message: err.message || 'Could not send quotation email',
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
            <div className="w-8 h-8 rounded-xl bg-[#030A91] text-[#FACB00] flex items-center justify-center font-black text-xs shadow-xs">
              NT
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-xs sm:text-sm block">
                Official Quotation Preview
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                {quotation.quotationNumber}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onConvertToInvoice && quotation.status !== 'CONVERTED' && (
              <button
                onClick={() => {
                  onClose();
                  onConvertToInvoice(quotation.id);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                <span>Convert to Invoice</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-[#030A91] hover:bg-blue-900 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5 text-[#FACB00]" />
              <span>Print Quotation</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Quotation Sheet */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6 text-xs text-slate-800 bg-white">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-5">
            <div>
              <div className="inline-block bg-[#030A91] text-[#FACB00] font-black px-2.5 py-1 rounded-lg text-sm mb-2">
                NAISIA TEXTILES LTD
              </div>
              <h1 className="text-xl font-black text-[#030A91] tracking-tight">
                NAISIA TEXTILES LTD
              </h1>
              <p className="text-[11px] text-slate-600 font-semibold uppercase tracking-wider">
                Institutional & School Uniforms Manufacturers
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Biashara Street, Nairobi CBD • P.O. Box 48291 - 00100 GPO
              </p>
              <p className="text-[10px] text-slate-500">
                Tel: +254 722 001 100 • support@naisiaetextiles.com
              </p>
              <p className="text-[10px] font-bold text-slate-700 mt-0.5">
                KRA PIN: P051839281Z • VAT Registered
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs uppercase font-black px-2.5 py-1 rounded-md bg-blue-50 text-[#030A91] border border-blue-200">
                FORMAL QUOTATION
              </span>
              <h2 className="text-base font-black text-slate-900 mt-2 font-mono">
                {quotation.quotationNumber}
              </h2>
              <div className="text-[11px] text-slate-500 space-y-0.5 mt-1 font-mono">
                <p>Date: {new Date(quotation.createdAt).toLocaleDateString()}</p>
                <p className="text-amber-700 font-bold">Valid Until: {quotation.validUntil}</p>
              </div>
              <div className="mt-2">
                <StatusBadge status={quotation.status} type="invoice" />
              </div>
            </div>
          </div>

          {/* Client & School Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                Quotation Prepared For:
              </span>
              <p className="font-extrabold text-sm text-slate-900">{quotation.customerName}</p>
              {quotation.schoolOrOrg && (
                <p className="font-bold text-xs text-[#030A91] mt-0.5">
                  School / Institution: {quotation.schoolOrOrg}
                </p>
              )}
              {quotation.customerEmail && (
                <p className="text-slate-500 mt-0.5">{quotation.customerEmail}</p>
              )}
              {quotation.customerPhone && (
                <p className="text-slate-500">{quotation.customerPhone}</p>
              )}
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-right">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                Estimator & Issuing Branch:
              </span>
              <p className="font-bold text-slate-900">{quotation.createdByName || 'Naisia Sales Team'}</p>
              <p className="text-slate-600">Nairobi CBD Flagship Station</p>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                Standard School Production & Delivery Terms
              </p>
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
                  <th className="py-2.5 px-3 text-right">Unit Price (KES)</th>
                  <th className="py-2.5 px-3 text-right">Line Total (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotation.items.map((item, idx) => (
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
                      {item.unitPrice.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {item.total.toLocaleString()}
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
                <span>Subtotal (Net Excl. VAT):</span>
                <span>KES {quotation.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>16% Standard VAT:</span>
                <span>KES {quotation.taxAmount.toLocaleString()}</span>
              </div>
              {quotation.discountAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Discount Applied:</span>
                  <span>-KES {quotation.discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-[#030A91] border-t-2 border-slate-300 pt-1.5">
                <span>Total Estimate:</span>
                <span>KES {quotation.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-[10px] text-slate-600 space-y-1">
            <p className="font-bold uppercase tracking-wider text-slate-800">
              Terms & Delivery Conditions:
            </p>
            <p>1. {quotation.terms || 'Prices inclusive of 16% VAT. Valid for 30 calendar days from issue date.'}</p>
            <p>2. Payment Terms: 50% deposit upon order confirmation; 50% balance upon final batch dispatch.</p>
            <p>3. Production turnaround for custom school crest monograms: 7–14 working days.</p>
          </div>
        </div>

        {/* Email Dispatch Drawer (Hidden on Print) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-2 no-print print:hidden shrink-0">
          <div className="relative flex-1 w-full">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="school.director@example.com"
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
