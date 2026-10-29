import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { Product, ProductVariant } from '../../types';
import { CustomerLayout } from '../../components/CustomerLayout';
import { normalizeImageUrl } from '../ProductsView';

const money = (value: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);

export const ProductDetailView: React.FC<{ productId: string }> = ({ productId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState('');

  useEffect(() => {
    let alive = true;
    api.getPortalProducts().then((res) => {
      if (alive) setProducts(Array.isArray(res) ? res : []);
    }).catch(() => {
      if (alive) setProducts([]);
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const product = products.find((item) => item.id === productId);
  const requestedVariant = new URLSearchParams(window.location.search).get('variant') || '';
  const selectedVariant = product?.variants.find((variant) => variant.id === (selectedVariantId || requestedVariant)) || product?.variants[0];
  const totalStock = selectedVariant ? Object.values(selectedVariant.branchStock || {}).reduce((sum, qty) => sum + Number(qty || 0), 0) : 0;

  useEffect(() => {
    if (product && requestedVariant && product.variants.some((variant) => variant.id === requestedVariant)) {
      setSelectedVariantId(requestedVariant);
    }
  }, [product, requestedVariant]);

  useEffect(() => {
    if (!product) return;
    document.title = `${product.name} | Naisiae Textiles`;
    let description = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.appendChild(description);
    }
    description.content = `${product.name} from Naisiae Textiles. View available sizes and order online in Kenya.`;
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}/product/${encodeURIComponent(product.id)}`;
  }, [product]);

  const structuredData = useMemo(() => {
    if (!product || !selectedVariant) return null;
    return {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: product.name,
      description: `${product.name} available from Naisiae Textiles in Kenya.`,
      image: normalizeImageUrl(selectedVariant.imageUrl || product.imageUrl || ''),
      sku: selectedVariant.sku,
      brand: { '@type': 'Brand', name: 'Naisiae Textiles' },
      offers: {
        '@type': 'Offer',
        url: `${window.location.origin}/product/${encodeURIComponent(product.id)}?variant=${encodeURIComponent(selectedVariant.id)}`,
        priceCurrency: 'KES',
        price: selectedVariant.sellingPrice,
        availability: totalStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
      }
    };
  }, [product, selectedVariant, totalStock]);

  if (loading) return <CustomerLayout><div className="mx-auto max-w-5xl p-8 text-center">Loading product…</div></CustomerLayout>;
  if (!product || !product.active) return <CustomerLayout><div className="mx-auto max-w-5xl space-y-4 p-8"><h1 className="text-2xl font-black text-[#030A91]">Product not found</h1><p>This item may no longer be available.</p><a className="font-bold text-blue-800 underline" href="/school-uniforms">Browse uniforms</a></div></CustomerLayout>;

  return <CustomerLayout>
    {structuredData && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />}
    <main className="mx-auto grid max-w-6xl gap-8 p-4 py-8 sm:p-8 md:grid-cols-2">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <img src={normalizeImageUrl(selectedVariant?.imageUrl || product.imageUrl || '')} alt={product.name} className="max-h-[620px] min-h-72 w-full object-contain p-4" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }} />
      </div>
      <section className="space-y-5">
        <p className="text-sm font-bold uppercase tracking-wide text-blue-800">{product.school || product.category}</p>
        <h1 className="text-3xl font-black text-slate-950">{product.name}</h1>
        <p className="leading-7 text-slate-700">{product.description || `Shop ${product.name} from Naisiae Textiles.`}</p>
        {selectedVariant && <p className="text-3xl font-black text-[#030A91]">{money(selectedVariant.sellingPrice)}</p>}
        <div className="space-y-2">
          <label htmlFor="product-size" className="block text-sm font-bold text-slate-800">Select size</label>
          <select id="product-size" value={selectedVariant?.id || ''} onChange={(e) => setSelectedVariantId(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900">
            {product.variants.map((variant: ProductVariant) => <option key={variant.id} value={variant.id}>{variant.size}{variant.color && !['standard official', 'standard', 'default'].includes(variant.color.toLowerCase()) ? ` — ${variant.color}` : ''}</option>)}
          </select>
        </div>
        <p className={`text-sm font-semibold ${totalStock > 0 ? 'text-green-700' : 'text-red-700'}`}>{totalStock > 0 ? 'In stock' : 'Currently out of stock'}</p>
        <a href={`/portal?product=${encodeURIComponent(product.id)}`} className="inline-flex w-full items-center justify-center rounded-xl bg-[#030A91] px-6 py-4 font-black text-white hover:bg-blue-900">Order this uniform</a>
        <p className="text-xs leading-5 text-slate-500">Prices and availability may vary by size and branch. Confirm your selected size when placing your order.</p>
        <a href={product.school?.toLowerCase().includes('kmtc') ? '/kmtc-uniforms' : product.garmentType === 'Corporate' || product.professionalDomain === 'Corporate' ? '/customized-uniforms' : '/school-uniforms'} className="inline-block text-sm font-bold text-blue-800 underline">Back to catalogue</a>
      </section>
    </main>
  </CustomerLayout>;
};
