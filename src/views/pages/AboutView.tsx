import React from 'react';
import { CustomerLayout } from '../../components/CustomerLayout';

export const AboutView: React.FC = () => (
  <CustomerLayout>
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#030A91]">About Naisiae Textiles</h1>
      <div className="prose prose-slate max-w-none text-slate-700">
        <p>Naisiae Textiles is a premier manufacturer and supplier of school uniforms and corporate garments based in the heart of Nairobi's textile industry at Uhuru Market, Jogoo Road.</p>
        <p>With years of experience in the garment industry, we have established ourselves as a reliable partner for schools, organizations, and corporate bodies seeking quality apparel.</p>
        
        <h2 className="text-2xl font-bold mt-6 mb-3 text-[#030A91]">Our Mission</h2>
        <p>To provide reliable, accessible, and durable apparel solutions, focusing on outfitting students through dependable school uniform manufacturing and customized corporate branding. We strive to be the market leader in quality assurance and customer satisfaction.</p>
        
        <h2 className="text-2xl font-bold mt-6 mb-3 text-[#030A91]">Quality Standards</h2>
        <p>Operating from Uhuru Market, we emphasize resilient garment construction, fabrics that withstand daily academic wear and tear, and value-driven pricing for institutions and parents.</p>
        <p>Our commitment to excellence includes:</p>
        <ul>
          <li>Using high-grade durable materials</li>
          <li>Precision cutting and expert tailoring</li>
          <li>Rigorous quality inspection before delivery</li>
          <li>Timely service to support academic calendars</li>
        </ul>
      </div>
    </div>
  </CustomerLayout>
);
