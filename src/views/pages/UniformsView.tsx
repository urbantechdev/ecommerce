import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { Product } from '../../types';
import { CustomerLayout } from '../../components/CustomerLayout';
import { SmartImage } from '../../components/SmartImage';
import { ProductPreviewModal } from '../../components/ProductPreviewModal';
import { normalizeImageUrl } from '../ProductsView';

interface UniformsViewProps {
  type: string;
}

export const UniformsView: React.FC<UniformsViewProps> = ({ type }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);

  useEffect(() => {
    api.getPortalProducts().then((res) => {
      setProducts(res);
      setLoading(false);
    });
  }, []);

  // Filter based on 'type'
  const filteredProducts = products.filter(p => {
    if (type === 'School Uniforms') return p.school && !p.school.toLowerCase().includes('kmtc');
    if (type === 'KMTC Uniforms') return p.school && p.school.toLowerCase().includes('kmtc');
    if (type === 'Customized Uniforms') return p.garmentType === 'Corporate' || p.professionalDomain === 'Corporate';
    return false;
  });

  const handleAddToCart = (product: Product, _variant?: any, _chosenColor?: string) => {
    // Redirect to portal with this product selected to finalize cart addition
    window.location.href = `/portal?product=${product.id}`;
  };

  return (
    <CustomerLayout>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8">
        <div className="bg-white hover:bg-slate-50/50 p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-lg transition-all duration-300 space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#FACB00]" />
            <span className="text-[11px] font-black uppercase tracking-wider text-[#030A91]">Uhuru Market Uniforms</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#030A91] tracking-tight">{type}</h1>
          <div className="prose prose-slate max-w-none text-slate-600 text-sm sm:text-base leading-relaxed">
            <p>Explore our genuine high-grade collection of durable {type.toLowerCase()} manufactured in Uhuru Market with strict institutional specifications.</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500 font-bold text-sm">Loading uniform catalogue...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 md:gap-6">
            {filteredProducts.map(p => {
              const variants = p.variants || [];
              const minPrice = variants.length ? Math.min(...variants.map((v: any) => v.sellingPrice)) : 0;
              return (
                <div 
                  key={p.id} 
                  onClick={() => setActiveProduct(p)}
                  className="bg-white hover:bg-slate-50/80 p-4 rounded-3xl border border-slate-200/90 hover:border-[#030A91] shadow-xs hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between text-left"
                >
                  <div>
                    <div className="relative overflow-hidden rounded-2xl mb-3 bg-slate-100 group-hover:bg-slate-200/60 transition-colors">
                      <div className="scanner-beam" />
                      <img 
                        src={normalizeImageUrl(p.imageUrl || "")} 
                        alt={p.name} 
                        className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/logo.png";
                        }}
                      />
                      {p.school && (
                        <span className="absolute top-2 left-2 bg-[#030A91]/85 group-hover:bg-[#030A91] backdrop-blur-xs text-[#FACB00] text-[9px] font-black uppercase px-2 py-0.5 rounded-md shadow-xs truncate max-w-[90%] transition-colors">
                          {p.school}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[#030A91] line-clamp-2 transition-colors leading-snug">{p.name}</h3>
                    <p className="text-[11px] text-slate-500 mt-1">{p.school || p.category || 'Official Garment'}</p>
                  </div>
                  {minPrice > 0 && (
                    <div className="pt-3 mt-3 border-t border-slate-100 group-hover:border-slate-200 flex items-center justify-between transition-colors">
                      <div>
                        <span className="text-[9px] text-slate-400 block font-bold uppercase">Price</span>
                        <span className="text-xs font-black text-[#030A91]">KES {minPrice.toLocaleString()}</span>
                      </div>
                      <span className="bg-blue-50 text-[#030A91] group-hover:bg-[#030A91] group-hover:text-white group-hover:shadow-xs px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all">
                        View &rarr;
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ProductPreviewModal 
        product={activeProduct}
        onClose={() => setActiveProduct(null)}
        onAddToCart={handleAddToCart}
      />
    </CustomerLayout>
  );
};
