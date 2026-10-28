import React from 'react';
import { CustomerLayout } from '../../components/CustomerLayout';

export const PolicyView: React.FC = () => (
  <CustomerLayout>
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#030A91]">Our Policy</h1>
      <div className="prose prose-slate max-w-none text-slate-700">
        <h2 className="text-xl font-bold">Returns & Exchange Policy</h2>
        <p>At Naisiae Textiles, we prioritize customer satisfaction. If you are not completely satisfied with your purchase, please review our policy below:</p>
        <ul>
          <li><strong>Returns:</strong> Items must be returned within 14 days of purchase in their original, unworn, and unwashed condition with all tags attached.</li>
          <li><strong>Exchanges:</strong> We facilitate exchanges based on stock availability. If the desired size is unavailable, we will work with you to find a suitable solution.</li>
          <li><strong>Exceptions:</strong> Personalized or embroidered items cannot be returned unless there is a manufacturing defect.</li>
        </ul>
        
        <h2 className="text-xl font-bold mt-6">Privacy Policy</h2>
        <p>We are committed to protecting your privacy. Your personal information is used solely to facilitate your orders and improve your shopping experience.</p>
        <ul>
          <li><strong>Data Usage:</strong> Your contact and purchase history are kept secure and are only accessible by authorized staff.</li>
          <li><strong>Confidentiality:</strong> We do not share your information with third parties for marketing purposes.</li>
          <li><strong>Security:</strong> Our platform uses secure encryption for all transactions to ensure your financial data remains protected.</li>
        </ul>
      </div>
    </div>
  </CustomerLayout>
);
