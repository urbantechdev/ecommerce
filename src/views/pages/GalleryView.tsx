import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { Product } from '../../types';
import { Shirt, Search } from 'lucide-react';

export const GalleryView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGalleryData = async () => {
      try {
        const prodData = await api.getProducts({ activeOnly: true });
        setProducts(prodData);
        
        const uniqueCategories = Array.from(new Set(prodData.map(p => p.category || 'Uncategorized'))).sort();
        setCategories(['All', ...uniqueCategories]);
      } catch (err) {
        console.error('Failed to load gallery:', err);
      } finally {
        setLoading(false);
      }
    };
    loadGalleryData();
  }, []);

  const filteredProducts = selectedCategory === 'All' 
    ? products 
    : products.filter(p => (p.category || 'Uncategorized') === selectedCategory);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-black text-slate-900 mb-8">Uniform Gallery</h1>

        {/* Category Menu */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-[#030A91] text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading gallery...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="h-40 bg-slate-100 rounded-xl mb-3 flex items-center justify-center">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="h-full object-cover rounded-xl" />
                  ) : (
                    <Shirt className="w-12 h-12 text-slate-300" />
                  )}
                </div>
                <h3 className="font-bold text-slate-900 text-sm truncate">{product.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{product.school}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
