import React, { useState } from 'react';
import { Menu, X, ShieldCheck, Shirt, Info, FileText, Phone, Building, Search, LayoutGrid } from 'lucide-react';

interface CustomerLayoutProps {
  children: React.ReactNode;
}

export const CustomerLayout: React.FC<CustomerLayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'School Uniforms', href: '/school-uniforms', icon: Shirt },
    { label: 'KMTC Uniforms', href: '/kmtc-uniforms', icon: Building },
    { label: 'Customized Uniforms', href: '/customized-uniforms', icon: ShieldCheck },
    { label: 'About', href: '/about', icon: Info },
    { label: 'Policy', href: '/policy', icon: FileText },
    { label: 'Contact Us', href: '/contact', icon: Phone },
  ];

  return (
    <div className="min-h-screen bg-[#F4F4F4] text-slate-900 flex flex-col font-sans select-none">
      {/* Shared Portal Header */}
      <header className="w-full sticky top-0 z-40 bg-gradient-to-r from-[#02066F] via-[#030A91] to-[#0412B3] text-white shadow-md overflow-hidden">
        <div className="scanner-beam" />
        <div className="max-w-7xl mx-auto px-4 py-3.5 sm:py-6 md:py-8 flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center space-x-3 sm:space-x-5 min-w-0">
            <a href="/portal">
                <img
                  src="https://plain-eeur-prod-public.komododecks.com/202605/07/1sm3ITZIdJmYjyTcxmiP/image.png"
                  alt="Naisia Textiles Logo"
                  className="w-11 h-11 sm:w-16 sm:h-16 md:w-20 md:h-20 object-contain shrink-0 drop-shadow-md"
                  fetchPriority="high"
                  loading="eager"
                />
            </a>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl md:text-3xl font-black tracking-tight text-white leading-none drop-shadow-sm truncate">
                  <span className="sm:hidden">Naisiae</span>
                  <span className="hidden sm:inline">Naisiae Textile</span>
                </h1>
                <span className="bg-[#FACB00] text-[#030A91] text-[10px] sm:text-xs font-black uppercase px-2 py-0.5 rounded-full tracking-wider shadow-sm shrink-0">
                  Ke
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2.5 rounded-2xl bg-white hover:bg-slate-100 active:scale-95 text-[#030A91] transition-all border border-slate-200 shadow-sm"
            aria-label="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop Menu */}
        <div className="hidden lg:flex justify-center py-2 bg-white/10 backdrop-blur-xs border-t border-white/5 text-[11px] font-bold tracking-wider text-white gap-8 relative z-10">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-[#FACB00] transition-colors">{link.label}</a>
          ))}
        </div>

        {/* SINGLE WAVE CURVED BOTTOM EDGE */}
        <div className="w-full leading-none overflow-hidden select-none -mb-[1px]">
          <svg
            viewBox="0 0 1440 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-8 sm:h-16 md:h-20 block"
            preserveAspectRatio="none"
          >
            {/* Subtle Golden Accent Wave shadow behind */}
            <path
              d="M0,20 C360,95 1080,-10 1440,65 L1440,120 L0,120 Z"
              fill="#FACB00"
              fillOpacity="0.25"
            />
            {/* Primary Background wave cut */}
            <path
              d="M0,0 C380,85 1060,-20 1440,50 L1440,120 L0,120 Z"
              fill="#F4F4F4"
            />
          </svg>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-full sm:max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250">
            <div className="p-4 bg-gradient-to-r from-[#02066F] via-[#030A91] to-[#0412B3] text-white flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center space-x-2.5">
                <img
                  src="https://plain-eeur-prod-public.komododecks.com/202605/07/1sm3ITZIdJmYjyTcxmiP/image.png"
                  alt="Naisiae Textile"
                  className="w-9 h-9 object-contain drop-shadow-sm"
                />
                <h3 className="font-black text-sm sm:text-base text-white tracking-tight">Naisiae Menu</h3>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="grid grid-cols-1 gap-2">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="flex items-center space-x-3 p-4 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-2xl transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#030A91] group-hover:scale-110 transition-transform">
                      <link.icon className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-slate-800 text-sm">{link.label}</span>
                  </a>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 text-center">
              <a href="https://urbantechdev.com" target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-slate-400 hover:text-[#030A91] transition-colors">
                Powered by UrbanTechDev
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR (CENTER ICON ON TOP) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-[#02066F] via-[#030A91] to-[#0412B3] border-t border-white/10 md:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.3)] px-2 pt-3 pb-2 select-none text-white overflow-visible">
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-t-3xl">
            <div className="scanner-beam" />
        </div>
        <div className="flex items-center justify-around max-w-md mx-auto relative z-10">
          <a href="/portal" className="flex flex-col items-center justify-center py-1 px-2 text-blue-200 hover:text-white transition-all">
            <Shirt className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">Shop</span>
          </a>
          <a href="/school-uniforms" className="flex flex-col items-center justify-center py-1 px-2 text-blue-200 hover:text-white transition-all">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">Schools</span>
          </a>
          
          {/* CENTER ELEVATED BUTTON */}
          <a
            href="/portal"
            className="flex flex-col items-center justify-center -mt-8 relative z-20 group active:scale-95 transition-transform"
          >
            <div className="w-14 h-14 rounded-full bg-[#FACB00] text-[#030A91] flex items-center justify-center shadow-2xl ring-4 ring-[#030A91] animate-[pulse_3s_ease-in-out_infinite]">
              <Search className="w-7 h-7" />
            </div>
            <span className="text-[10px] mt-1 font-black text-[#FACB00] tracking-tight">Search</span>
          </a>

          <a href="/kmtc-uniforms" className="flex flex-col items-center justify-center py-1 px-2 text-blue-200 hover:text-white transition-all">
            <Building className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">KMTC</span>
          </a>
          <button onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center justify-center py-1 px-2 text-blue-200 hover:text-white transition-all">
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">Menu</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 pt-6 pb-24 md:py-8">
        {children}
      </main>

      <footer className="hidden md:block bg-[#030A91] text-white p-4 text-center text-[10px]">
        <p>© 2026 Naisiae Textiles Ltd. All rights reserved.</p>
      </footer>
    </div>
  );
};
