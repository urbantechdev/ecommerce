import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { normalizeImageUrl } from '../views/ProductsView';

interface ProductPreviewModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, variant: ProductVariant) => void;
}

export const ProductPreviewModal: React.FC<ProductPreviewModalProps> = ({ product, onClose, onAddToCart }) => {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      const colors = Array.from(new Set(product.variants.map(v => v.color || 'Standard')));
      setSelectedColor(colors[0]);
      setSelectedSize(null);
    }
  }, [product]);

  if (!product) return null;

  const currentVariant = product.variants.find(
    v => (v.color || 'Standard') === selectedColor && v.size === selectedSize
  );

  return (
    <div className="fixed inset-0 z-50 bg-white sm:bg-slate-900/60 sm:backdrop-blur-xs flex sm:items-center sm:justify-center sm:p-4">
      <div className="bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-2xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-md flex flex-col overflow-hidden border-0 sm:border border-slate-200 animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 bg-[#030A91] text-white flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-black text-[#FACB00] tracking-widest block mb-0.5">
              {product.school}
            </span>
            <h3 className="font-black text-sm sm:text-base leading-tight truncate">
              {product.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer ml-3"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Product Preview Image */}
          <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 relative group">
            <div className="scanner-beam" />
            <img 
              src={normalizeImageUrl(product.imageUrl || "")} 
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* 1. Color Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500">Pick Color:</h4>
              {selectedColor && (
                <span className="text-[11px] font-bold text-[#030A91]">{selectedColor}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(product.variants.map(v => v.color || 'Standard'))).map(color => (
                <button
                  key={color}
                  onClick={() => {
                    setSelectedColor(color);
                    setSelectedSize(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 cursor-pointer ${
                    selectedColor === color 
                      ? "bg-[#030A91] text-white border-[#030A91] shadow-md scale-105" 
                      : "bg-white text-slate-600 border-slate-100 hover:border-slate-300"
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Size Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500">Select Size:</h4>
              {selectedSize && (
                <span className="text-[11px] font-bold text-[#030A91]">Size {selectedSize}</span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {product.variants
                .filter(v => (v.color || 'Standard') === selectedColor)
                .map(v => {
                  const stock = Number(Object.values(v.branchStock || {}).reduce((a: number, b: any) => a + Number(b), 0));
                  const isOutOfStock = stock <= 0;
                  return (
                    <button
                      key={v.id}
                      disabled={isOutOfStock}
                      onClick={() => setSelectedSize(v.size)}
                      className={`flex flex-col items-center justify-center py-2.5 rounded-xl text-xs font-black transition-all border-2 cursor-pointer relative ${
                        selectedSize === v.size
                          ? "bg-blue-50 text-[#030A91] border-[#030A91] shadow-sm"
                          : isOutOfStock 
                            ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50"
                            : "bg-white text-slate-700 border-slate-100 hover:border-slate-300"
                      }`}
                    >
                      {v.size}
                      {isOutOfStock && <span className="text-[8px] font-bold uppercase absolute bottom-0.5">Out</span>}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* 3. Selected Detail Display */}
          {selectedSize && currentVariant && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retail Price</div>
                <div className="text-lg font-black text-[#030A91]">
                  KES {currentVariant.sellingPrice.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Availability</div>
                <div className="text-[11px] font-bold text-emerald-700">
                  {
                    Number(Object.values(currentVariant.branchStock || {}).reduce((a: number, b: any) => a + Number(b), 0))
                  } units in stock
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 border-t border-slate-100 bg-white shrink-0">
          <button
            disabled={!selectedColor || !selectedSize}
            onClick={() => {
              if (currentVariant) {
                onAddToCart(product, currentVariant);
              }
            }}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg transition-all flex items-center justify-center space-x-3 cursor-pointer ${
              selectedColor && selectedSize
                ? "bg-[#030A91] text-white hover:bg-blue-900 active:scale-[0.98]"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Plus className="w-5 h-5 text-[#FACB00]" />
            <span>Add to Shopping Bag</span>
          </button>
        </div>
      </div>
    </div>
  );
};
