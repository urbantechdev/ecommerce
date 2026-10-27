import React from 'react';
import { CustomerLayout } from '../../components/CustomerLayout';

export const ContactUsView: React.FC = () => (
  <CustomerLayout>
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#030A91]">Contact Us</h1>
      <div className="prose prose-slate max-w-none text-slate-700">
        <p>We are here to help! Please reach out to us for inquiries regarding orders, uniform customization, or institutional partnerships.</p>
        <div className="mt-6 space-y-3">
          <p><strong>Email:</strong> info@naisiaetextiles.com</p>
          <p><strong>Phone:</strong> +254 700 000 000</p>
          <p><strong>Location:</strong> Uhuru Market, Jogoo Road, Nairobi, Kenya</p>
        </div>
      </div>
    </div>
  </CustomerLayout>
);
