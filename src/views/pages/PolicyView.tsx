import React from 'react';
import { CustomerLayout } from '../../components/CustomerLayout';

export const PolicyView: React.FC = () => (
  <CustomerLayout>
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#030A91]">Our Policy</h1>
      <div className="prose prose-slate max-w-none text-slate-700">
        <h2 className="text-xl font-bold">Returns & Exchange Policy</h2>
        <p>We accept returns of unworn, unwashed garments within 14 days of purchase with original tags and receipt. Exchanges are subject to stock availability.</p>
        <h2 className="text-xl font-bold mt-6">Privacy Policy</h2>
        <p>Your personal data is handled with the utmost confidentiality. We do not share customer information with third parties without explicit consent.</p>
      </div>
    </div>
  </CustomerLayout>
);
