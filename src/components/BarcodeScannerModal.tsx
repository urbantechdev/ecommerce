import React, { useState } from 'react';
import { Barcode, Search, X, Check, ShoppingBag } from 'lucide-react';
import { Product } from '../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onScan: (skuOrBarcode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  onScan,
}) => {
  const [manualCode, setManualCode] = useState('');

  if (!isOpen) return null;

  // Flatten all barcodes for quick testing
  const allBarcodes: {
    barcode: string;
    sku: string;
    productName: string;
    school: string;
    size: string;
    price: number;
  }[] = [];

  products.forEach((p) => {
    p.variants.forEach((v) => {
      allBarcodes.push({
        barcode: v.barcode,
        sku: v.sku,
        productName: p.name,
        school: p.school,
        size: v.size,
        price: v.sellingPrice,
      });
    });
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      onClose();
    }
  };

  const handleSelectCode = (code: string) => {
    onScan(code);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-[#030A91] text-white">
          <div className="flex items-center space-x-2">
            <Barcode className="w-5 h-5 text-[#FACB00]" />
            <h3 className="font-bold text-base">Barcode Scanner & Laser Simulator</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Laser Scanner Visual simulation */}
          <div className="relative h-24 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-700">
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444] animate-pulse"></div>
            <div className="text-center z-10">
              <Barcode className="w-12 h-12 text-slate-400 mx-auto opacity-40" />
              <p className="text-[11px] text-slate-400 mt-1 font-mono tracking-wide">
                LASER SCANNER ACTIVE • ALIGN BARCODE
              </p>
            </div>
          </div>

          {/* Manual input */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">
              Direct Barcode or SKU Input:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. 616123456789 or NS-SH-WHT-30"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#030A91]"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#030A91] text-white rounded-xl text-sm font-semibold hover:bg-blue-900 transition-colors shadow-sm"
              >
                Scan
              </button>
            </div>
          </form>

          {/* Quick Click Preset Barcodes */}
          <div className="space-y-2 pt-2">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Quick Scan Sample Garments:
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
              {allBarcodes.slice(0, 8).map((b, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectCode(b.barcode)}
                  className="w-full pt-1.5 pb-1 flex items-center justify-between text-left hover:bg-slate-50 p-2 rounded-lg transition-colors group"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-[#030A91]">
                      {b.productName}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Size: {b.size} | Barcode: {b.barcode}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-emerald-600 block">
                      KES {b.price.toLocaleString()}
                    </span>
                    <span className="text-[10px] bg-slate-100 group-hover:bg-[#FACB00] group-hover:text-slate-900 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                      Tap Scan
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
