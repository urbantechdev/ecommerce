import React, { useState, useEffect } from 'react';
import { X, Plus, Palette, ChevronDown, Check } from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { normalizeImageUrl } from '../views/ProductsView';

export interface KnownColor {
  name: string;
  hex: string;
  border?: string;
}

export const COMMON_KNOWN_COLORS: KnownColor[] = [
  { name: 'Navy Blue', hex: '#0B1B3D', border: '#0B1B3D' },
  { name: 'Sky Blue', hex: '#87CEEB', border: '#6BAED6' },
  { name: 'Royal Blue', hex: '#2040B0', border: '#2040B0' },
  { name: 'Bottle Green', hex: '#0F472A', border: '#0F472A' },
  { name: 'Emerald Green', hex: '#046A38', border: '#046A38' },
  { name: 'Maroon / Burgundy', hex: '#6D071A', border: '#6D071A' },
  { name: 'Bright Red', hex: '#C8102E', border: '#C8102E' },
  { name: 'Pure White', hex: '#FFFFFF', border: '#CBD5E1' },
  { name: 'Charcoal Grey', hex: '#374151', border: '#374151' },
  { name: 'Light Grey', hex: '#D1D5DB', border: '#9CA3AF' },
  { name: 'Jet Black', hex: '#111827', border: '#111827' },
  { name: 'Khaki / Beige', hex: '#C3B091', border: '#A8926E' },
  { name: 'Golden Yellow', hex: '#FACB00', border: '#D4AF37' },
  { name: 'Dark Brown', hex: '#4A2C11', border: '#4A2C11' },
  { name: 'Purple', hex: '#582C83', border: '#582C83' },
  { name: 'Standard / Official', hex: '#030A91', border: '#030A91' },
];

export function getColorHex(colorName: string): string {
  const match = COMMON_KNOWN_COLORS.find(
    c => c.name.toLowerCase() === colorName.toLowerCase() ||
         colorName.toLowerCase().includes(c.name.toLowerCase().split(' ')[0])
  );
  if (match) return match.hex;
  const lower = colorName.toLowerCase();
  if (lower.includes('blue')) return '#0B1B3D';
  if (lower.includes('green')) return '#0F472A';
  if (lower.includes('red') || lower.includes('maroon')) return '#6D071A';
  if (lower.includes('white')) return '#FFFFFF';
  if (lower.includes('grey') || lower.includes('gray')) return '#374151';
  if (lower.includes('black')) return '#111827';
  if (lower.includes('khaki') || lower.includes('beige')) return '#C3B091';
  if (lower.includes('yellow') || lower.includes('gold')) return '#FACB00';
  return '#030A91';
}

export function getColorBorder(colorName: string): string {
  const hex = getColorHex(colorName);
  return hex === '#FFFFFF' ? '#CBD5E1' : hex;
}

interface ProductPreviewModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, variant: ProductVariant, chosenColor?: string) => void;
}

export const ProductPreviewModal: React.FC<ProductPreviewModalProps> = ({ product, onClose, onAddToCart }) => {
  const [selectedColor, setSelectedColor] = useState<string>('Navy Blue');
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  useEffect(() => {
    if (product && product.variants.length > 0) {
      // Check if product variants specify a real non-generic color
      const productVariantColors = Array.from(
        new Set(product.variants.map(v => v.color).filter(Boolean))
      ) as string[];

      const firstRealColor = productVariantColors.find(
        c => c && c.toLowerCase() !== 'standard' && c.toLowerCase() !== 'default'
      );

      if (firstRealColor) {
        setSelectedColor(firstRealColor);
      } else {
        setSelectedColor('Navy Blue');
      }
      setSelectedSize(null);
    }
  }, [product]);

  if (!product) return null;

  // Build the list of available colors for the select dropdown:
  // Merges any specific variant colors with the comprehensive list of common known colors
  const productColors = Array.from(
    new Set(product.variants.map(v => v.color).filter(Boolean))
  ) as string[];

  const availableColors: Array<{ name: string; hex: string; border?: string; isProductVariant?: boolean }> = [];

  // Add product's existing variant colors first
  productColors.forEach(col => {
    if (col && !availableColors.some(c => c.name.toLowerCase() === col.toLowerCase())) {
      availableColors.push({
        name: col,
        hex: getColorHex(col),
        border: getColorBorder(col),
        isProductVariant: true,
      });
    }
  });

  // Then add the standard common known colors
  COMMON_KNOWN_COLORS.forEach(col => {
    if (!availableColors.some(c => c.name.toLowerCase() === col.name.toLowerCase())) {
      availableColors.push({
        name: col.name,
        hex: col.hex,
        border: col.border,
      });
    }
  });

  // Variants that match the selected color (or fallback to all variants if product has generic colors)
  const exactColorVariants = product.variants.filter(
    v => (v.color || '').toLowerCase() === (selectedColor || '').toLowerCase()
  );
  const applicableVariants = exactColorVariants.length > 0 ? exactColorVariants : product.variants;

  // Current selected variant with the chosen color attached
  const baseVariant = applicableVariants.find(v => v.size === selectedSize) ||
                      product.variants.find(v => v.size === selectedSize);

  const currentVariant: ProductVariant | null = baseVariant
    ? { ...baseVariant, color: selectedColor }
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-white sm:bg-slate-900/60 sm:backdrop-blur-xs flex sm:items-center sm:justify-center sm:p-4">
      <div className="bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-2xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-md flex flex-col overflow-hidden border-0 sm:border border-slate-200 animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-[#02066F] via-[#030A91] to-[#0412B3] text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] uppercase font-black text-[#FACB00] tracking-widest block mb-0.5 truncate">
              {product.school}
            </span>
            <h3 className="font-black text-sm sm:text-base leading-tight truncate">
              {product.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Product Preview Image Banner */}
          <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 relative group shadow-2xs">
            <div className="scanner-beam" />
            <img 
              src={normalizeImageUrl(product.imageUrl || "")} 
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/logo.png";
              }}
            />
            {/* Sector / Category badge */}
            <div className="absolute top-2.5 left-2.5 z-10">
              <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-white/95 text-[#030A91] shadow-2xs border border-slate-200/60 backdrop-blur-xs">
                {product.category || 'Uniform'}
              </span>
            </div>
          </div>

          {/* 1. COLOR SELECT DROPDOWN */}
          <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <label htmlFor="color-select-dropdown" className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <Palette className="w-3.5 h-3.5 text-[#030A91]" />
                <span>Color Select:</span>
              </label>
              {selectedColor && (
                <span className="text-[10.5px] font-bold text-[#030A91] bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs flex items-center space-x-1.5">
                  <span 
                    className="w-2.5 h-2.5 rounded-full inline-block border shadow-2xs shrink-0" 
                    style={{ 
                      backgroundColor: getColorHex(selectedColor),
                      borderColor: getColorBorder(selectedColor)
                    }} 
                  />
                  <span className="truncate max-w-[120px]">{selectedColor}</span>
                </span>
              )}
            </div>

            {/* Native HTML Select Dropdown */}
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10">
                <span 
                  className="w-4 h-4 rounded-full border shadow-2xs shrink-0 transition-colors" 
                  style={{ 
                    backgroundColor: getColorHex(selectedColor),
                    borderColor: getColorBorder(selectedColor)
                  }} 
                />
              </div>

              <select
                id="color-select-dropdown"
                value={selectedColor}
                onChange={(e) => {
                  setSelectedColor(e.target.value);
                  setSelectedSize(null);
                }}
                className="w-full pl-10 pr-10 py-2.5 bg-white border-2 border-slate-200 hover:border-[#030A91] focus:border-[#030A91] rounded-xl text-xs font-bold text-slate-900 shadow-xs appearance-none transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#030A91]/20"
              >
                {availableColors.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name} {col.isProductVariant ? '(Official School Color)' : ''}
                  </option>
                ))}
              </select>

              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            {/* Quick Tap Color Swatches Scroll Row */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 pt-1.5 scrollbar-none">
              {availableColors.slice(0, 10).map((col) => {
                const isSelected = selectedColor === col.name;
                return (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() => {
                      setSelectedColor(col.name);
                      setSelectedSize(null);
                    }}
                    title={col.name}
                    className={`group flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer shrink-0 ${
                      isSelected 
                        ? 'bg-[#030A91] text-white border-[#030A91] shadow-xs scale-102' 
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 active:scale-95'
                    }`}
                  >
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0 border" 
                      style={{ 
                        backgroundColor: col.hex,
                        borderColor: col.border || col.hex
                      }} 
                    />
                    <span className="truncate max-w-[85px]">{col.name.split('/')[0].trim()}</span>
                    {isSelected && <Check className="w-2.5 h-2.5 text-[#FACB00] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. SIZE SELECTION */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-600">Select Garment Size:</h4>
              {selectedSize && (
                <span className="text-[11px] font-black text-[#030A91] bg-blue-50 px-2 py-0.5 rounded-md">Size {selectedSize}</span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {applicableVariants.map((v) => {
                const stock = Number(
                  Object.values(v.branchStock || {}).reduce((a: number, b: any) => a + Number(b), 0)
                );
                const isOutOfStock = stock <= 0;
                const isSelected = selectedSize === v.size;

                return (
                  <button
                    key={v.id}
                    disabled={isOutOfStock}
                    onClick={() => setSelectedSize(v.size)}
                    className={`flex flex-col items-center justify-center py-2.5 rounded-xl text-xs font-black transition-all border-2 cursor-pointer relative ${
                      isSelected
                        ? "bg-[#030A91] text-[#FACB00] border-[#030A91] shadow-md scale-102"
                        : isOutOfStock 
                          ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50"
                          : "bg-white text-slate-800 border-slate-200 hover:border-[#030A91] hover:bg-blue-50/30"
                    }`}
                  >
                    <span className="font-mono">{v.size}</span>
                    <span className={`text-[8.5px] mt-0.5 ${isSelected ? 'text-white' : isOutOfStock ? 'text-rose-400 font-bold' : 'text-slate-400 font-medium'}`}>
                      {isOutOfStock ? 'Out' : `KES ${v.sellingPrice}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. SELECTED DETAIL DISPLAY */}
          {selectedSize && currentVariant && (
            <div className="bg-blue-50/70 rounded-2xl p-4 border border-blue-200/80 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
              <div>
                <div className="text-[10px] font-black text-[#030A91] uppercase tracking-wider">
                  Price ({selectedColor} • Size {selectedSize})
                </div>
                <div className="text-xl font-black text-[#030A91] mt-0.5">
                  KES {currentVariant.sellingPrice.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Inventory</div>
                <div className="text-xs font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-emerald-200 inline-block mt-0.5">
                  ✓ Ready for Dispatch
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 border-t border-slate-100 bg-white shrink-0">
          <button
            disabled={!selectedColor || !selectedSize || !currentVariant}
            onClick={() => {
              if (currentVariant) {
                onAddToCart(product, currentVariant, selectedColor);
              }
            }}
            className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all flex items-center justify-center space-x-2.5 cursor-pointer ${
              selectedColor && selectedSize && currentVariant
                ? "bg-[#030A91] text-white hover:bg-blue-900 active:scale-[0.98] shadow-blue-900/20"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Plus className="w-4 h-4 text-[#FACB00] stroke-[3]" />
            <span>Add to Shopping Bag • {selectedColor} ({selectedSize || 'Size ?'})</span>
          </button>
        </div>
      </div>
    </div>
  );
};

