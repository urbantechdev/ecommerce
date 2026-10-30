import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import { ErrorBoundary } from './components/ErrorBoundary';
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
import { ProductDetailView } from './views/pages/ProductDetailView';
import { GalleryView } from './views/pages/GalleryView';
import { getSessionSnapshot, saveSessionSnapshot } from './utils/sessionManager';

const AppContent: React.FC = () => {
  const { user, isLoading, restoredSessionSnapshot, consumeRestoredNotice } = useAuth();
  const { notify } = useNotification();
  const [currentView, setCurrentView] = useState<string>(() => {
    const snapshot = getSessionSnapshot();
    if (snapshot?.view) return snapshot.view;
    return localStorage.getItem('nais_active_view') || 'pos';
  });
  const path = window.location.pathname;

  // Auto-request full screen on the first user interaction (click, touch, or key)
  useEffect(() => {
    const handleFirstGesture = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };

    window.addEventListener('click', handleFirstGesture, { once: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true });
    window.addEventListener('touchstart', handleFirstGesture, { once: true });

    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };
  }, []);

  // Sync active view to localStorage & session snapshot
  useEffect(() => {
    if (currentView) {
      localStorage.setItem('nais_active_view', currentView);
      saveSessionSnapshot({ view: currentView });
    }
  }, [currentView]);

  // Handle session restoration upon re-login after 2-minute inactivity timeout
  useEffect(() => {
    if (restoredSessionSnapshot && user) {
      if (restoredSessionSnapshot.view && restoredSessionSnapshot.view !== currentView) {
        setCurrentView(restoredSessionSnapshot.view);
      }
      notify({
        type: 'SUCCESS',
        title: 'Workspace Restored',
        message: `Welcome back, ${user.name}! Resumed directly to ${restoredSessionSnapshot.view.toUpperCase()} where you left off.`,
      });
      consumeRestoredNotice();
    }
  }, [restoredSessionSnapshot, user, notify, consumeRestoredNotice, currentView]);

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
    const isProductPage = /^\/product\/[^/]+\/?$/.test(path);
    const isInternalArea = !publicPaths.includes(path) && !isProductPage && path !== '/erp' && path !== '/login';
    
    if (isInternalArea) {
      robotsMeta.content = 'noindex, nofollow, noarchive, nosnippet';
      document.title = 'Naisiae ERP - Staff & Administration Portal';
    } else {
      robotsMeta.content = 'index, follow, max-image-preview:large';
      document.title = 'Naisiae Textiles - Official School Uniforms & Corporate Garments Portal';
    }
  }, [path, user, currentView]);

  // Portal is default
  const normalizedPath = path.toLowerCase().replace(/\/$/, '') || '/';

  const productPathMatch = normalizedPath.match(/^\/product\/([^/]+)$/);
  if (productPathMatch) return <ProductDetailView productId={decodeURIComponent(productPathMatch[1])} />;

  if (normalizedPath === '/' || normalizedPath === '/portal') {
    return <PortalView />;
  }
  if (normalizedPath === '/about') return <AboutView />;
  if (normalizedPath === '/policy') return <PolicyView />;
  if (normalizedPath === '/contact') return <ContactUsView />;
  if (normalizedPath === '/school-uniforms') return <UniformsView type="School Uniforms" />;
  if (normalizedPath === '/kmtc-uniforms') return <UniformsView type="KMTC Uniforms" />;
  if (normalizedPath === '/customized-uniforms') return <UniformsView type="Customized Uniforms" />;

  // ERP Login and Admin
  if (normalizedPath === '/erp' || normalizedPath === '/login' || normalizedPath === '/admin') {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-[#F4F4F4] flex flex-col items-center justify-center space-y-3">
          <img
            src="https://plain-eeur-prod-public.komododecks.com/202605/07/1sm3ITZIdJmYjyTcxmiP/image.png"
            alt="Naisiae Textiles Logo"
            className="w-16 h-16 object-contain animate-bounce drop-shadow-md"
          />
          <p className="text-xs font-bold text-slate-800 tracking-wider uppercase">
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
        case 'gallery':
          return <GalleryView />;
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
    <ErrorBoundary>
      <NotificationProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}
