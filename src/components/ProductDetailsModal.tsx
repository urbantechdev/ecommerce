import React from 'react';
import { X, Tag, Layers } from 'lucide-react';
import { Product } from '../types';
import { StatusBadge } from './StatusBadge';
import { normalizeImageUrl } from '../views/ProductsView';

interface ProductDetailsModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col md:rounded-3xl md:max-w-2xl md:max-h-[92vh] md:m-auto md:animate-in md:fade-in md:zoom-in-95 md:duration-200">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-[#02066F] to-[#030A91] text-white flex items-center justify-between shrink-0">
        <h3 className="font-black text-sm truncate">Product Details</h3>
        <button onClick={onClose} className="text-white p-1 rounded-full bg-white/10">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Image */}
        <div className="h-64 w-full bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center">
          {product.imageUrl ? (
            <img
              src={normalizeImageUrl(product.imageUrl)}
              alt={product.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <Tag className="w-16 h-16 text-slate-300" />
          )}
        </div>

        {/* Details */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-slate-900">{product.name}</h2>
            <StatusBadge status={product.active ? 'ACTIVE' : 'INACTIVE'} />
          </div>
          <p className="text-sm text-slate-600">{product.description || 'No description available.'}</p>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">School</span>
            <p className="text-sm font-bold text-slate-900">{product.school}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Category</span>
            <p className="text-sm font-bold text-slate-900">{product.category}</p>
          </div>
        </div>

        {/* Variants */}
        <div className="space-y-2">
          <h4 className="font-bold text-slate-900 flex items-center">
            <Layers className="w-4 h-4 mr-1.5" />
            Size Variants
          </h4>
          {product.variants.map((v) => (
            <div key={v.id} className="flex justify-between p-3 bg-white border border-slate-200 rounded-xl">
              <span className="font-bold">Size {v.size}</span>
              <span className="font-mono font-bold text-[#030A91]">KES {v.sellingPrice.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
