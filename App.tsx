


import React from 'react';
import { AppProvider, useAppStore } from './store';
import { Dashboard } from './views/Dashboard';
import { ProductMaster } from './views/ProductMaster';
import { SPKList, SPKForm, SPKDetailView } from './views/SPKManager';
import { FinanceManager } from './views/FinanceManager';
import { Reports } from './views/Reports';
import { ActivityLogView } from './views/ActivityLog';
import { LayoutGrid, FileText, ShoppingBag, PieChart, Wallet, Hexagon } from 'lucide-react';

const Navigation: React.FC = () => {
  const { currentView, navigate } = useAppStore();

  // Hide navigation on Form view to prevent overlapping with fixed actions
  if (currentView === 'SPK_FORM' || currentView === 'ACTIVITY_LOG') return null;

  // Reordered Items: SPK, Products, DASHBOARD (Center), Finance, Reports
  const navItems = [
    { id: 'SPK_LIST', icon: FileText, label: 'SPK' },
    { id: 'PRODUCTS', icon: ShoppingBag, label: 'Produk' },
    { id: 'DASHBOARD', icon: Hexagon, label: 'Home', isMain: true }, // Center Item
    { id: 'FINANCE', icon: Wallet, label: 'Kas' },
    { id: 'REPORTS', icon: PieChart, label: 'Laporan' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      {/* Background Layer with Blur */}
      <div className="absolute inset-x-0 bottom-0 h-[calc(60px+env(safe-area-inset-bottom))] bg-dark-card/90 backdrop-blur-xl border-t border-white/5 shadow-[0_-5px_20px_rgba(0,0,0,0.3)]"></div>

      {/* Grid Content */}
      <div className="relative max-w-lg mx-auto h-[60px] mb-safe grid grid-cols-5 items-end px-2">
        {navItems.map((item) => {
          const isActive = currentView === item.id || 
                           (item.id === 'SPK_LIST' && currentView === 'SPK_DETAIL');
          const Icon = item.icon;

          // --- CENTER BUTTON (DASHBOARD) ---
          if (item.isMain) {
            return (
              <div key={item.id} className="relative flex justify-center -top-6">
                 <button
                  onClick={() => navigate(item.id as any)}
                  className={`
                    group relative h-16 w-16 rounded-full flex items-center justify-center 
                    transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.4)]
                    bg-gradient-to-tr from-primary to-accent
                    ring-[6px] ring-dark-bg
                    ${isActive ? 'scale-110 shadow-[0_0_30px_rgba(6,182,212,0.6)]' : 'hover:scale-105'}
                  `}
                >
                  <div className={`absolute inset-0 rounded-full bg-white opacity-0 group-active:opacity-20 transition-opacity`}></div>
                  {/* REPLACED HEXAGON ICON WITH CUSTOM ICON */}
                  <img 
                    src="https://lh3.googleusercontent.com/d/1UM8L5GkEV9UxGHUAroJ9uAiTqipLPOQc" 
                    alt="Home"
                    className={`h-11 w-11 object-contain transition-all duration-300 ${isActive ? 'scale-110 brightness-110' : ''}`}
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
                  />
                </button>
              </div>
            );
          }

          // --- NORMAL BUTTONS ---
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id as any)}
              className={`flex flex-col items-center justify-center h-full pb-2 gap-1 transition-all duration-300 active:scale-90`}
            >
              <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'text-primary' : 'text-slate-500'}`}>
                <Icon 
                  size={22} 
                  strokeWidth={isActive ? 2.5 : 2} 
                  className={`transition-all ${isActive ? 'drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : ''}`}
                />
              </div>
              <span className={`text-[10px] font-medium transition-all ${isActive ? 'text-primary font-bold translate-y-0' : 'text-slate-500 opacity-70'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

const MainContent: React.FC = () => {
  const { currentView } = useAppStore();

  const renderView = () => {
    switch (currentView) {
      case 'DASHBOARD': return <Dashboard />;
      case 'PRODUCTS': return <ProductMaster />;
      case 'SPK_LIST': return <SPKList />;
      case 'SPK_FORM': return <SPKForm />;
      case 'SPK_DETAIL': return <SPKDetailView />;
      case 'FINANCE': return <FinanceManager />;
      case 'REPORTS': return <Reports />;
      case 'ACTIVITY_LOG': return <ActivityLogView />;
      default: return <Dashboard />;
    }
  };

  return (
    <main className="max-w-lg mx-auto min-h-screen px-4 bg-dark-bg">
      {renderView()}
    </main>
  );
};

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-dark-bg text-slate-100 font-sans selection:bg-primary/30">
        <MainContent />
        <Navigation />
      </div>
    </AppProvider>
  );
}