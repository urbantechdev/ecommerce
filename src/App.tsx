import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Layout } from './components/Layout';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { PosView } from './views/PosView';
import { ProductsView } from './views/ProductsView';
import { InventoryView } from './views/InventoryView';
import { StockTransfersView } from './views/StockTransfersView';
import { QuotationsView } from './views/QuotationsView';
import { InvoicesView } from './views/InvoicesView';
import { ReceiptsView } from './views/ReceiptsView';
import { CustomersView } from './views/CustomersView';
import { SuppliersView } from './views/SuppliersView';
import { PurchasesView } from './views/PurchasesView';
import { ExpensesView } from './views/ExpensesView';
import { FinancialReportsView } from './views/FinancialReportsView';
import { KraEtimsView } from './views/KraEtimsView';
import { UsersView } from './views/UsersView';
import { AuditLogsView } from './views/AuditLogsView';
import { SettingsView } from './views/SettingsView';
import { PortalView } from './views/PortalView';
import { AboutView } from './views/pages/AboutView';
import { PolicyView } from './views/pages/PolicyView';
import { ContactUsView } from './views/pages/ContactUsView';
import { UniformsView } from './views/pages/UniformsView';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<string>('pos');
  const path = window.location.pathname;

  // Enforce search engine indexing rules:
  // Customer portal is indexed; admin, cashier, accountant, and ERP are blocked from crawlers
  useEffect(() => {
    let robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.name = 'robots';
      document.head.appendChild(robotsMeta);
    }

    const publicPaths = ['/', '/portal', '/about', '/policy', '/contact', '/school-uniforms', '/kmtc-uniforms', '/customized-uniforms'];
    const isInternalArea = !publicPaths.includes(path) && path !== '/erp' && path !== '/login';
    
    if (isInternalArea) {
      robotsMeta.content = 'noindex, nofollow, noarchive, nosnippet';
      document.title = 'Naisiae ERP - Staff & Administration Portal';
    } else {
      robotsMeta.content = 'index, follow, max-image-preview:large';
      document.title = 'Naisiae Textiles - Official School Uniforms & Corporate Garments Portal';
    }
  }, [path, user, currentView]);

  // Portal is default
  if (path === '/' || path === '/portal') {
    return <PortalView />;
  }
  if (path === '/about') return <AboutView />;
  if (path === '/policy') return <PolicyView />;
  if (path === '/contact') return <ContactUsView />;
  if (path === '/school-uniforms') return <UniformsView type="School Uniforms" />;
  if (path === '/kmtc-uniforms') return <UniformsView type="KMTC Uniforms" />;
  if (path === '/customized-uniforms') return <UniformsView type="Customized Uniforms" />;


  // ERP Login and Admin
  if (path === '/erp' || path === '/login') {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-[#F4F4F4] flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#030A91] text-[#FACB00] flex items-center justify-center font-black text-xl shadow-lg animate-bounce">
            NT
          </div>
          <p className="text-xs font-bold text-slate-700 tracking-wider uppercase">
            Loading Naisiae ERP...
          </p>
        </div>
      );
    }
    if (!user) {
      return <LoginView />;
    }
    const renderView = () => {
      switch (currentView) {
        case 'pos':
          return <PosView />;
        case 'dashboard':
          return <DashboardView onNavigate={setCurrentView} />;
        case 'inventory':
          return <InventoryView />;
        case 'transfers':
          return <StockTransfersView />;
        case 'products':
          return <ProductsView />;
        case 'invoices':
          return <InvoicesView />;
        case 'quotations':
          return <QuotationsView />;
        case 'receipts':
          return <ReceiptsView />;
        case 'customers':
          return <CustomersView />;
        case 'suppliers':
          return <SuppliersView />;
        case 'purchases':
          return <PurchasesView />;
        case 'expenses':
          return <ExpensesView />;
        case 'financials':
          return <FinancialReportsView />;
        case 'kra':
          return <KraEtimsView />;
        case 'users':
          return <UsersView />;
        case 'audit':
          return <AuditLogsView />;
        case 'settings':
          return <SettingsView />;
        default:
          return <DashboardView onNavigate={setCurrentView} />;
      }
    };
    return (
      <Layout currentView={currentView} onNavigate={setCurrentView}>
        {renderView()}
      </Layout>
    );
  }
  
  // Default to portal for unknown paths
  return <PortalView />;
};
export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}
