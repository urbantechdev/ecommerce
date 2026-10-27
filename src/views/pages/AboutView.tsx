import React from 'react';
import { CustomerLayout } from '../../components/CustomerLayout';

export const AboutView: React.FC = () => {
  return (
    <CustomerLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-8 bg-white my-8 rounded-3xl border border-slate-100 shadow-sm">
        <h1 className="text-3xl font-black text-[#030A91]">About Naisia Textiles & Uniforms</h1>
        <div className="prose text-slate-700 space-y-4">
          <p>
            Naisia Textiles is Kenya's premier manufacturer and supplier of high-quality school uniforms, KMTC medical wear, institutional garments, and corporate workwear. Located at Uhuru Market, Nairobi, we pride ourselves on exceptional durability, perfect sizing, and precision tailoring.
          </p>
          <p>
            Our commitment is to provide schools, parents, and institutions with genuine quality uniforms crafted to withstand rigorous daily wear while maintaining professional elegance.
          </p>
        </div>
      </div>
    </CustomerLayout>
  );
};
