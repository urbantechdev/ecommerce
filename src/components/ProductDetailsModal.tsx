import React, { useState, useEffect, useRef } from 'react';
import { X, Tag, Layers, Maximize2, Building, Barcode, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { StatusBadge } from './StatusBadge';
import { normalizeImageUrl } from '../views/ProductsView';

interface ProductDetailsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (product: Product) => void;
  onManagePhotos?: (product: Product) => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product,
  isOpen,
  onClose,
  onEdit,
  onManagePhotos,
}) => {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [isInactive, setIsInactive] = useState(false);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = () => {
    setIsInactive(false);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      setIsInactive(true);
    }, 10000);
  };

  useEffect(() => {
    resetTimer();
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [isOpen]);

  if (!isOpen || !product) return null;

  // Active display image (product image or variant image)
  const currentImageUrl = activeImage || product.imageUrl || selectedVariant?.imageUrl || '';

  // Calculate total stock across all variants and branches
  const totalStockAcrossAllVariants = product.variants.reduce((total, v) => {
    const variantStock = Object.values(v.branchStock || {}).reduce(
      (sum, qty) => sum + (Number(qty) || 0),
      0
    );
    return total + variantStock;
  }, 0);

  // Collect all unique variant images
  const allImages: { url: string; label: string }[] = [];
  if (product.imageUrl) {
    allImages.push({ url: product.imageUrl, label: 'Main Catalog Photo' });
  }
  product.variants.forEach((v) => {
    if (v.imageUrl && !allImages.some((img) => img.url === v.imageUrl)) {
      allImages.push({ url: v.imageUrl, label: `Size ${v.size} (${v.sku})` });
    }
  });

  return (
    <div 
      onMouseMove={resetTimer}
      onClick={resetTimer}
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex justify-start p-0 overflow-y-auto animate-in fade-in duration-300"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white w-full max-w-2xl h-full shadow-2xl overflow-y-auto border-r border-slate-200 flex flex-col animate-in slide-in-from-left duration-300 ease-out transition-opacity duration-700 ${
          isInactive ? 'opacity-25 hover:opacity-100' : 'opacity-100'
        }`}
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#02066F] via-[#030A91] to-[#0a12b3] text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center space-x-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/15">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-7 h-7 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#FACB00] text-[#030A91] tracking-wider">
                  Product Preview
                </span>
                <span className="text-white/60 text-xs hidden sm:inline">•</span>
                <span className="text-white/80 text-xs font-semibold truncate hidden sm:inline">
                  {product.school}
                </span>
              </div>
              <h3 className="font-black text-sm sm:text-base leading-tight truncate text-white mt-0.5">
                {product.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Close Preview (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Main Visual Display & Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Left: Product Image Box */}
            <div className="space-y-3">
              <div className="relative aspect-square w-full bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center group">
                {currentImageUrl ? (
                  <>
                    <img
                      src={normalizeImageUrl(currentImageUrl)}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo.png';
                      }}
                    />
                    <button
                      onClick={() => setIsZoomed(true)}
                      className="absolute bottom-3 right-3 p-2 rounded-xl bg-slate-900/70 hover:bg-slate-900 text-white shadow-md backdrop-blur-xs transition-all cursor-pointer opacity-90 hover:opacity-100"
                      title="Enlarge Image"
                    >
                      <Maximize2 className="w-4 h-4 text-[#FACB00]" />
                    </button>
                  </>
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#030A91] mx-auto flex items-center justify-center">
                      <Tag className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-xs font-bold text-slate-400">No Image Attached</p>
                    <p className="text-[11px] text-slate-400">
                      Upload photos in product edit or SKU photos modal
                    </p>
                  </div>
                )}

                {/* Badges on Image */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/95 text-slate-800 shadow-xs backdrop-blur-xs">
                    {product.school}
                  </span>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#030A91] text-white shadow-xs">
                    {product.taxCategory === 'VAT_16' ? '16% VAT' : 'Zero Rated'}
                  </span>
                </div>
              </div>

              {/* Alternate Variant Photos Thumbnails Carousel */}
              {allImages.length > 1 && (
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                    Available Photo Views ({allImages.length}):
                  </span>
                  <div className="flex space-x-2 overflow-x-auto pb-1.5 scrollbar-thin">
                    {allImages.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveImage(img.url)}
                        className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                          currentImageUrl === img.url
                            ? 'border-[#030A91] ring-2 ring-[#030A91]/20 scale-105'
                            : 'border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100'
                        }`}
                        title={img.label}
                      >
                        <img
                          src={normalizeImageUrl(img.url)}
                          alt={img.label}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/logo.png';
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Product Metadata & Pricing Highlights */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {product.category} • {product.gender}
                  </span>
                  <StatusBadge status={product.active ? 'ACTIVE' : 'INACTIVE'} />
                </div>
                <h2 className="text-xl font-black text-slate-900 leading-snug">{product.name}</h2>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {product.description ||
                    'Standard official school uniform manufactured to exact institutional color codes and fabric specifications.'}
                </p>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Institution</span>
                  <span className="font-extrabold text-slate-900 truncate block mt-0.5">
                    {product.school}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Sector</span>
                  <span className="font-extrabold text-slate-900 truncate block mt-0.5">
                    {product.sector || 'SECONDARY'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Stock</span>
                  <span className="font-black text-emerald-700 block mt-0.5 font-mono">
                    {totalStockAcrossAllVariants.toLocaleString()} units
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Price Range</span>
                  <span className="font-black text-[#030A91] block mt-0.5 font-mono">
                    KES{' '}
                    {Math.min(...product.variants.map((v) => v.sellingPrice || 0)).toLocaleString()} -{' '}
                    {Math.max(...product.variants.map((v) => v.sellingPrice || 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                {onEdit && (
                  <button
                    onClick={() => {
                      onClose();
                      onEdit(product);
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#030A91] hover:bg-blue-900 text-white font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
                  >
                    <span>Edit Product Details</span>
                  </button>
                )}
                {onManagePhotos && (
                  <button
                    onClick={() => {
                      onClose();
                      onManagePhotos(product);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <span>SKU Photos</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Size Variants Table */}
          <div className="space-y-2.5 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center">
                <Layers className="w-4 h-4 mr-1.5 text-[#030A91]" />
                <span>Size Variants & Branch Inventory ({product.variants.length})</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                Tap a variant to preview SKU details
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Color</th>
                    <th className="py-2.5 px-3 text-right">Selling Price</th>
                    <th className="py-2.5 px-3 text-right">Branch Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {product.variants.map((v) => {
                    const variantTotalStock = Object.values(v.branchStock || {}).reduce(
                      (sum, qty) => sum + (Number(qty) || 0),
                      0
                    );
                    const isSelected = selectedVariant?.id === v.id;

                    return (
                      <tr
                        key={v.id}
                        onClick={() => {
                          setSelectedVariant(v);
                          if (v.imageUrl) setActiveImage(v.imageUrl);
                        }}
                        className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 font-bold' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-black text-slate-900">Size {v.size}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{v.sku}</td>
                        <td className="py-2.5 px-3 text-slate-600">{v.color || 'Standard'}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#030A91]">
                          KES {v.sellingPrice.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`inline-block font-mono font-extrabold px-2 py-0.5 rounded-md text-[11px] ${
                              variantTotalStock > 10
                                ? 'bg-emerald-50 text-emerald-700'
                                : variantTotalStock > 0
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {variantTotalStock} units
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center space-x-2 text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Naisia Textiles Enterprise Product Record</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </div>

      {/* Fullscreen Zoom Lightbox */}
      {isZoomed && currentImageUrl && (
        <div
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white p-2 rounded-xl bg-white/10 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={normalizeImageUrl(currentImageUrl)}
              alt={product.name}
              className="max-h-[82vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl"
            />
            <span className="text-white text-xs font-bold mt-3 bg-black/40 px-3 py-1 rounded-full">
              {product.name} • {product.school}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
