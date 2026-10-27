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

  const handleAddToCart = (product: Product) => {
    // Redirect to portal with this product selected to finalize cart addition
    window.location.href = `/portal?product=${product.id}`;
  };

  return (
    <CustomerLayout>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-10">
        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#030A91]">{type}</h1>
          <div className="prose prose-slate max-w-none text-slate-700">
            <p>Explore our extensive collection of {type.toLowerCase()}.</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading products...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 md:gap-6">
            {filteredProducts.map(p => (
              <div 
                key={p.id} 
                onClick={() => setActiveProduct(p)}
                className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="relative overflow-hidden rounded-2xl mb-3">
                  <div className="scanner-beam" />
                  <img 
                    src={normalizeImageUrl(p.imageUrl || "")} 
                    alt={p.name} 
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/logo.png";
                    }}
                  />
                </div>
                <h3 className="font-bold text-slate-900 group-hover:text-[#030A91] transition-colors">{p.name}</h3>
                <p className="text-xs text-slate-500">{p.school}</p>
              </div>
            ))}
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
