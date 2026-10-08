import React, { useState, useEffect, useRef } from 'react';
import { Sale, PaymentReceipt } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Printer,
  Mail,
  CheckCircle2,
  Download,
  Copy,
  Check,
  X,
  FileText,
  Sliders,
  QrCode,
  ShieldCheck,
  Store
} from 'lucide-react';
import { api } from '../api';
import { useNotification } from '../context/NotificationContext';

interface ReceiptModalProps {
  sale?: Sale | null;
  receipt?: PaymentReceipt | null;
  qrCodeDataUrl?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale: initialSale,
  receipt,
  qrCodeDataUrl: initialQrCode,
  isOpen,
  onClose,
}) => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const [activeSale, setActiveSale] = useState<Sale | null>(initialSale || null);
  const [qrCode, setQrCode] = useState<string>(initialQrCode || '');
  const [rollWidth, setRollWidth] = useState<'80mm' | '58mm'>('80mm');
  const [emailInput, setEmailInput] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const receiptRef = useRef<HTMLDivElement>(null);

  // Sync state when props change
  useEffect(() => {
    setActiveSale(initialSale || null);
    setQrCode(initialQrCode || '');
  }, [initialSale, initialQrCode]);

  // If receipt is provided without sale items, attempt to load associated sale
  useEffect(() => {
    if (!initialSale && receipt?.saleId) {
      api
        .getSale(receipt.saleId)
        .then((s) => {
          setActiveSale(s);
          if (s.kraQrCodeUrl && !qrCode) {
            setQrCode(s.kraQrCodeUrl);
          }
        })
        .catch(() => {
          // Sale details unavailable; fallback to payment receipt fields
        });
    }
  }, [receipt, initialSale, qrCode]);

  // Keyboard shortcut listener: P to print, Esc to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey) {
        // Prevent typing P into email field
        if ((e.target as HTMLElement)?.tagName !== 'INPUT') {
          e.preventDefault();
          handleThermalPrint();
        }
      } else if (e.key === 'p' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleThermalPrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, rollWidth, activeSale, receipt]);

  if (!isOpen || (!activeSale && !receipt)) return null;

  const receiptNumber = activeSale?.receiptNumber || receipt?.receiptNumber || 'RCP-UNKNOWN';
  const customerName = activeSale?.customerName || receipt?.customerName || 'Walk-In Customer';
  const branchName = activeSale?.branchName || receipt?.branchName || 'Nairobi CBD Flagship (HQ)';
  const totalAmount = activeSale?.totalAmount ?? (receipt?.amount || 0);
  const paymentMethod = activeSale?.paymentMethod || receipt?.paymentMethod || 'CASH';
  const paymentRef = activeSale?.paymentReference || receipt?.paymentReference || '';
  const cuInvoiceNumber = activeSale?.cuInvoiceNumber || receipt?.cuNumber || '013000000001001';
  const controlCode = activeSale?.kraControlCode || 'A98F-21BC-77E0-4491';
  const timestamp = activeSale?.createdAt || receipt?.createdAt || new Date().toISOString();
  // Always show served by the currently logged-in user, falling back to document creator
  const servedByName = user?.name || activeSale?.cashierName || receipt?.receivedByName || 'Active Terminal Officer';
  const cashierName = servedByName;

  // ==========================================
  // THERMAL PRINT ENGINE (ISOLATED IFRAME)
  // ==========================================
  const handleThermalPrint = () => {
    setIsPrinting(true);

    const printableContent = receiptRef.current;
    if (!printableContent) {
      window.print();
      setIsPrinting(false);
      return;
    }

    const widthMm = rollWidth === '58mm' ? 58 : 80;
    const bodyWidthMm = rollWidth === '58mm' ? 48 : 72;
    const fontSizePt = rollWidth === '58mm' ? '8.5pt' : '9.5pt';

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      setIsPrinting(false);
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Thermal Receipt - ${receiptNumber}</title>
          <style>
            @page {
              size: ${widthMm}mm auto;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #fff;
              color: #000;
              width: 100%;
            }
            body {
              padding: 2.5mm;
              width: ${bodyWidthMm}mm;
              max-width: ${bodyWidthMm}mm;
              margin: 0 auto;
              font-family: 'Courier New', Courier, monospace, monospace;
              font-size: ${fontSizePt};
              line-height: 1.22;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            * {
              box-sizing: border-box;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-bold { font-weight: bold; }
            .font-black { font-weight: 900; }
            .uppercase { text-transform: uppercase; }
            .dashed-line {
              border-bottom: 1px dashed #000;
              margin: 4px 0;
            }
            .solid-line {
              border-bottom: 1px solid #000;
              margin: 4px 0;
            }
            .double-line {
              border-bottom: 3px double #000;
              margin: 4px 0;
            }
            .row {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
            }
            .qr-container {
              text-align: center;
              margin: 6px auto;
            }
            .qr-container img {
              width: ${rollWidth === '58mm' ? '24mm' : '30mm'};
              height: ${rollWidth === '58mm' ? '24mm' : '30mm'};
              display: inline-block;
            }
            .barcode-strip {
              display: flex;
              justify-content: center;
              height: 24px;
              overflow: hidden;
              margin: 4px 0;
              letter-spacing: -1px;
            }
          </style>
        </head>
        <body>
          ${printableContent.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      try {
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn('Iframe print error, falling back to window.print:', err);
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          setIsPrinting(false);
        }, 1200);
      }
    }, 300);
  };

  // Generate plain-text ASCII slip for clipboard or SMS
  const generateTextSlip = (): string => {
    const divider = '------------------------------------------';
    let text = `NAISIA TEXTILES LTD\n`;
    text += `SCHOOL UNIFORMS & APPAREL ERP\n`;
    text += `Biashara Street, Nairobi\n`;
    text += `Tel: 0792021496 / 0112264870 • support@naisiaetextiles.com\n`;
    text += `${divider}\n`;
    text += `RECEIPT #: ${receiptNumber}\n`;
    text += `DATE:      ${new Date(timestamp).toLocaleString()}\n`;
    text += `BRANCH:    ${branchName}\n`;
    text += `SERVED BY: ${servedByName}\n`;
    text += `CUSTOMER:  ${customerName}\n`;
    text += `${divider}\n`;
    text += `ITEM                    QTY   PRICE   TOTAL\n`;

    if (activeSale?.items) {
      for (const it of activeSale.items) {
        const nameDesc = `${it.productName} (${it.size})`.slice(0, 22).padEnd(23);
        const qty = String(it.quantity).padStart(3);
        const pr = String(it.unitPrice).padStart(7);
        const tot = String(it.total).padStart(7);
        text += `${nameDesc} ${qty} ${pr} ${tot}\n`;
      }
    } else {
      text += `General Payment Tender                ${totalAmount.toLocaleString()}\n`;
    }

    text += `${divider}\n`;
    if (activeSale) {
      text += `SUBTOTAL (Excl. VAT):      KES ${activeSale.subtotal.toLocaleString()}\n`;
      text += `VAT 16%:                   KES ${activeSale.totalTax.toLocaleString()}\n`;
      if (activeSale.totalDiscount > 0) {
        text += `DISCOUNT:                 -KES ${activeSale.totalDiscount.toLocaleString()}\n`;
      }
    }
    text += `TOTAL PAID:                KES ${totalAmount.toLocaleString()}\n`;
    text += `PAYMENT TENDER:            ${paymentMethod} ${paymentRef ? `(${paymentRef})` : ''}\n`;
    text += `${divider}\n`;
    text += `KRA eTIMS CU INVOICE:      ${cuInvoiceNumber}\n`;
    text += `KRA INTERNAL HASH:         ${controlCode}\n`;
    text += `${divider}\n`;
    text += `THANK YOU FOR SHOPPING AT NAISIA TEXTILES\n`;
    text += `Exchanges accepted within 7 days with this receipt.\n`;
    return text;
  };

  const handleCopyText = async () => {
    try {
      const text = generateTextSlip();
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      notify({ type: 'SUCCESS', title: 'Receipt Copied', message: 'Thermal receipt text copied to clipboard' });
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      notify({ type: 'ERROR', title: 'Copy Failed', message: 'Could not access clipboard' });
    }
  };

  const handleDownloadHtml = () => {
    const text = generateTextSlip();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Naisiae_Receipt_${receiptNumber}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    notify({ type: 'SUCCESS', title: 'Receipt Saved', message: `Downloaded receipt file ${receiptNumber}` });
  };

  const handleSendEmail = async () => {
    if (!emailInput || !emailInput.includes('@')) {
      notify({ type: 'WARNING', title: 'Invalid Email', message: 'Please enter a valid customer email address' });
      return;
    }
    setIsSendingEmail(true);
    try {
      if (receipt?.id) {
        await api.emailReceipt(receipt.id, emailInput);
      }
      notify({
        type: 'SUCCESS',
        title: 'Receipt Emailed',
        message: `Receipt ${receiptNumber} sent successfully to ${emailInput}`,
      });
      setEmailInput('');
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Email Failed', message: err.message || 'Could not send receipt email' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none thermal-print-portal">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* ==================================================== */}
        {/* MODAL CONTROLS HEADER (HIDDEN DURING PRINT)          */}
        {/* ==================================================== */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between no-print print:hidden shrink-0">
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
                  Thermal Receipt Preview
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">
                {receiptNumber} • Served by: <strong className="text-slate-800 font-semibold">{servedByName}</strong>
              </p>
            </div>
          </div>

          {/* Paper Roll Width Toggle */}
          <div className="flex items-center space-x-1.5 bg-slate-200/80 p-0.5 rounded-xl text-[11px] font-bold">
            <button
              onClick={() => setRollWidth('80mm')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                rollWidth === '80mm'
                  ? 'bg-white text-[#030A91] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              80mm Roll
            </button>
            <button
              onClick={() => setRollWidth('58mm')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                rollWidth === '58mm'
                  ? 'bg-white text-[#030A91] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              58mm Roll
            </button>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action Bar (Print, Copy, Download) */}
        <div className="px-5 py-2.5 bg-blue-50/60 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2 no-print print:hidden shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleThermalPrint}
              disabled={isPrinting}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-[#030A91] text-white text-xs font-black hover:bg-blue-900 shadow-md shadow-blue-900/20 active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4 mr-1.5 text-[#FACB00]" />
              <span>{isPrinting ? 'Printing...' : `Print Thermal (${rollWidth})`}</span>
            </button>

            <button
              onClick={handleCopyText}
              className="inline-flex items-center px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shadow-2xs"
              title="Copy receipt text to clipboard"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadHtml}
              className="inline-flex items-center px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shadow-2xs"
              title="Save receipt slip file"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-slate-500" />
              <span className="hidden sm:inline">Save</span>
            </button>
          </div>

          <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
            Press <strong className="font-mono text-slate-700">P</strong> to Print • <strong className="font-mono text-slate-700">ESC</strong> to Close
          </span>
        </div>

        {/* ==================================================== */}
        {/* THERMAL PAPER VISUAL PREVIEW CONTAINER               */}
        {/* ==================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/50 flex justify-center items-start">
          {/* Realistic Thermal Paper Roll Container */}
          <div
            className={`bg-[#FFFFFF] text-slate-900 shadow-xl border border-slate-300 transition-all duration-200 relative overflow-hidden select-text ${
              rollWidth === '58mm' ? 'w-[280px] max-w-[280px]' : 'w-[360px] max-w-[360px]'
            }`}
            style={{
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Serrated Top Edge */}
            <div className="w-full h-2.5 bg-gradient-to-r from-slate-100 via-white to-slate-100 flex items-center justify-between border-b border-dashed border-slate-300 px-1 opacity-70">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-200/80 -mt-1"></div>
              ))}
            </div>

            {/* PRINTABLE RECEIPT CONTENT ELEMENT */}
            <div
              id="printable-receipt"
              ref={receiptRef}
              className={`p-4 font-mono text-slate-900 ${
                rollWidth === '58mm' ? 'roll-58mm text-[10px]' : 'text-[11px]'
              }`}
              style={{ lineHeight: 1.25 }}
            >
              {/* Store Brand & Location */}
              <div className="text-center pb-2.5 border-b border-dashed border-slate-800">
                <h1 className="text-base font-black tracking-wider uppercase text-black">
                  NAISIA TEXTILES LTD
                </h1>
                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mt-0.5">
                  SCHOOL UNIFORMS & APPAREL ERP
                </p>
                <p className="text-[10px] text-slate-600 mt-1">
                  Biashara Street, Nairobi CBD • P.O. Box 48291
                </p>
                <p className="text-[10px] text-slate-600">
                  Tel: 0792021496 / 0112264870 • support@naisiaetextiles.com • naisiaetextiles.com
                </p>
                <div className="mt-1.5 text-[9.5px] font-bold text-black">
                  PIN: P051839281Z • VAT REGISTERED
                </div>
                <div className="text-[9px] text-slate-500">
                  ETR OSCU SERIAL: NAISIAE-OSCU-001
                </div>
              </div>

              {/* Station & Transaction Header */}
              <div className="py-2 border-b border-dashed border-slate-800 space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-600">RECEIPT NO:</span>
                  <strong className="text-black font-black">{receiptNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">STATION:</span>
                  <span className="font-bold text-black truncate max-w-[190px]">{branchName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-bold">SERVED BY:</span>
                  <span className="font-bold text-black truncate max-w-[190px]">{servedByName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">CUSTOMER:</span>
                  <span className="font-bold text-black truncate max-w-[190px]">{customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">DATE/TIME:</span>
                  <span>{new Date(timestamp).toLocaleString()}</span>
                </div>
              </div>

              {/* Itemized Table Header */}
              <div className="py-2 border-b border-dashed border-slate-800">
                <div className="flex justify-between font-bold text-[9.5px] pb-1 border-b border-slate-400 uppercase">
                  <span>ITEM [SIZE]</span>
                  <span className="text-right">QTY x PRICE = TOTAL</span>
                </div>

                {/* Items List */}
                {activeSale?.items && activeSale.items.length > 0 ? (
                  <div className="space-y-1.5 mt-1.5">
                    {activeSale.items.map((item, idx) => (
                      <div key={idx} className="text-[10px]">
                        <div className="font-bold text-black leading-tight">
                          {item.productName}
                        </div>
                        <div className="flex justify-between text-slate-600 text-[9px] mt-0.5">
                          <span>
                            Size {item.size} • {item.school}
                          </span>
                          <span>
                            {item.quantity} x {item.unitPrice.toLocaleString()} ={' '}
                            <strong className="font-bold text-black">{item.total.toLocaleString()}</strong>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-1.5 text-slate-600 text-xs flex justify-between">
                    <span>Payment Tender</span>
                    <strong className="text-black">KES {totalAmount.toLocaleString()}</strong>
                  </div>
                )}
              </div>

              {/* Financial Subtotals & Tax Breakdown */}
              <div className="py-2 border-b border-dashed border-slate-800 space-y-1 text-[10px]">
                {activeSale && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Subtotal (Net Excl. VAT):</span>
                      <span>KES {activeSale.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Standard 16% VAT:</span>
                      <span>KES {activeSale.totalTax.toLocaleString()}</span>
                    </div>
                    {activeSale.totalDiscount > 0 && (
                      <div className="flex justify-between font-bold text-black">
                        <span>Discount Savings:</span>
                        <span>-KES {activeSale.totalDiscount.toLocaleString()}</span>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between text-xs sm:text-sm font-black pt-1 border-t border-slate-400 text-black">
                  <span>TOTAL PAYABLE:</span>
                  <span>KES {totalAmount.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-[10px] pt-1">
                  <span className="text-slate-600">Payment Tender:</span>
                  <span className="font-bold text-black uppercase">
                    {paymentMethod} {paymentRef ? `[${paymentRef}]` : ''}
                  </span>
                </div>

                {activeSale && (
                  <>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-600">Amount Tendered:</span>
                      <span>KES {activeSale.amountTendered.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-600">Change Given:</span>
                      <strong className="font-bold text-black">
                        KES {activeSale.changeGiven.toLocaleString()}
                      </strong>
                    </div>
                  </>
                )}
              </div>

              {/* KRA eTIMS Fiscal Compliance Block */}
              <div className="py-2.5 border-b border-dashed border-slate-800 text-center space-y-1 text-[9.5px]">
                <div className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                  KRA eTIMS FISCALIZED RECEIPT
                </div>

                <div className="text-slate-700">
                  Control Unit (CU) No: <strong className="text-black">{cuInvoiceNumber}</strong>
                </div>

                <div className="text-slate-700">
                  Internal Fiscal Hash: <span className="font-mono text-black text-[9px]">{controlCode}</span>
                </div>

                {/* QR Code image for KRA verification */}
                {qrCode ? (
                  <div className="qr-container flex flex-col items-center justify-center my-1.5">
                    <img
                      src={qrCode}
                      alt="KRA eTIMS QR Code"
                      className="w-24 h-24 sm:w-28 sm:h-28 border border-slate-300 rounded p-1 bg-white"
                    />
                    <span className="text-[8.5px] text-slate-500 mt-1">
                      Scan to verify on official KRA iTax Portal
                    </span>
                  </div>
                ) : (
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[9px] text-slate-500 my-1">
                    https://itax.kra.go.ke/KRA-Portal/
                  </div>
                )}
              </div>

              {/* Barcode Graphic & Footer */}
              <div className="pt-2 text-center text-[9px] text-slate-600 space-y-1">
                {/* Simulated Thermal Barcode Lines */}
                <div className="barcode-strip my-1">
                  <div className="w-full flex items-center justify-center space-x-0.5 opacity-80">
                    {Array.from({ length: 32 }).map((_, i) => (
                      <div
                        key={i}
                        className={`bg-black h-5 ${
                          i % 3 === 0 ? 'w-1' : i % 5 === 0 ? 'w-1.5' : 'w-0.5'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="font-mono text-[9px] text-slate-700 tracking-wider">
                  *{receiptNumber}*
                </p>

                <p className="font-black text-slate-900 uppercase mt-1">
                  SERVED BY: {servedByName.toUpperCase()}
                </p>
                <p className="font-bold text-slate-800 uppercase mt-0.5">
                  THANK YOU FOR CHOOSING NAISIA TEXTILES
                </p>
                <p className="text-slate-500">Quality Uniforms for Kenyan Schools</p>
                <p className="text-[8.5px] text-slate-400">
                  Goods in original condition exchangeable within 7 days upon presentation of this receipt.
                </p>
              </div>
            </div>

            {/* Serrated Bottom Edge */}
            <div className="w-full h-2.5 bg-gradient-to-r from-slate-100 via-white to-slate-100 flex items-center justify-between border-t border-dashed border-slate-300 px-1 opacity-70">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-200/80 -mb-1"></div>
              ))}
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* EMAIL DISPATCH DRAWER (HIDDEN DURING PRINT)          */}
        {/* ==================================================== */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 no-print print:hidden shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="customer@example.com"
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#030A91]"
              />
            </div>
            <button
              onClick={handleSendEmail}
              disabled={isSendingEmail || !emailInput}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 disabled:opacity-50 transition-colors shadow-xs"
            >
              <Mail className="w-3.5 h-3.5 mr-1.5" />
              <span>{isSendingEmail ? 'Sending...' : 'Email Customer Copy'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
