import React from 'react';
import { CustomerLayout } from '../../components/CustomerLayout';

export const PolicyView: React.FC = () => {
  return (
    <CustomerLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-8 bg-white my-8 rounded-3xl border border-slate-100 shadow-sm">
        <h1 className="text-3xl font-black text-[#030A91]">Store Policy & Terms</h1>
        <div className="prose text-slate-700 space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Exchange & Return Policy</h2>
          <p>
            Goods once sold may be exchanged within 7 days of purchase provided they are unworn, in original condition with tags attached, and accompanied by a valid receipt.
          </p>
          <h2 className="text-xl font-bold text-slate-900">Quality Guarantee</h2>
          <p>
            All Naisia Textiles uniforms feature reinforced stitching and colorfast fabrics designed to last through extensive school and institutional usage.
          </p>
        </div>
      </div>
    </CustomerLayout>
  );
};
