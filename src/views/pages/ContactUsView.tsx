import React from 'react';
import { CustomerLayout } from '../../components/CustomerLayout';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';

export const ContactUsView: React.FC = () => {
  return (
    <CustomerLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-8 bg-white my-8 rounded-3xl border border-slate-100 shadow-sm">
        <h1 className="text-3xl font-black text-[#030A91]">Contact Naisia Textiles</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-700">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <MapPin className="w-6 h-6 text-[#030A91] shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-slate-900">Location</h3>
                <p>Naisia Textiles Complex, Stall / Unit 2, Uhuru Market, Jogoo Road, Nairobi, Kenya</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="w-6 h-6 text-[#030A91] shrink-0" />
              <div>
                <h3 className="font-bold text-slate-900">Phone Numbers</h3>
                <p>+254 722 001 100 / 0792 021 496</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Mail className="w-6 h-6 text-[#030A91] shrink-0" />
              <div>
                <h3 className="font-bold text-slate-900">Email Address</h3>
                <p>support@naisiaetextiles.com</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Clock className="w-6 h-6 text-[#030A91] shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-slate-900">Business Hours</h3>
                <p>Monday - Saturday: 8:00 AM - 6:30 PM<br />Sunday: Closed</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
            <h3 className="font-bold text-slate-900 text-lg">Send an Inquiry</h3>
            <p className="text-sm text-slate-600">For school uniform bulk orders or institutional tailoring, reach out directly via phone or email.</p>
            <a 
              href="tel:+254722001100" 
              className="block w-full text-center bg-[#030A91] text-white py-3 rounded-xl font-bold hover:bg-[#02076e] transition-colors"
            >
              Call Us Now
            </a>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};
