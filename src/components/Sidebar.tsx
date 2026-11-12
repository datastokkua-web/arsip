import React from 'react';
import { 
  LayoutDashboard, 
  Inbox, 
  FilePlus, 
  Send, 
  FileOutput, 
  Archive, 
  Settings, 
  MailOpen,
  FileSpreadsheet,
  X
} from 'lucide-react';
import { ActivePage } from '../types';

interface SidebarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  isOpen: boolean;
  onClose: () => void;
  counts: { masuk: number; keluar: number };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  isOpen,
  onClose,
  counts
}) => {
  const navItems = [
    { section: 'Menu Utama' },
    { id: 'dashboard' as ActivePage, label: 'Dashboard', icon: LayoutDashboard },
    
    { section: 'Manajemen Surat' },
    { 
      id: 'surat-masuk' as ActivePage, 
      label: 'Surat Masuk', 
      icon: Inbox, 
      badge: counts.masuk,
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    { id: 'input-masuk' as ActivePage, label: 'Input Surat Masuk', icon: FilePlus },
    { 
      id: 'surat-keluar' as ActivePage, 
      label: 'Surat Keluar', 
      icon: Send, 
      badge: counts.keluar,
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    { id: 'input-keluar' as ActivePage, label: 'Input Surat Keluar', icon: FileOutput },

    { section: 'Lainnya' },
    { id: 'arsip' as ActivePage, label: 'Arsip Digital', icon: Archive },
    { id: 'pengaturan' as ActivePage, label: 'Pengaturan', icon: Settings },
  ];

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Aside container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 w-72 glass-nav z-40 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 via-green-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
              <MailOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm tracking-wide text-slate-900 uppercase">
                Tata Persuratan
              </h2>
              <p className="text-[11px] font-medium text-slate-500">
                Digital Office System
              </p>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {navItems.map((item, index) => {
            if (item.section) {
              return (
                <div 
                  key={`sec-${index}`} 
                  className="px-3 pt-4 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400"
                >
                  {item.section}
                </div>
              );
            }

            const Icon = item.icon!;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id!);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md shadow-emerald-600/25'
                    : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/25 text-white' : item.badgeColor
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200/80 bg-white/40">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50/80 border border-emerald-200/60 text-emerald-800 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="truncate">Google Spreadsheet Sync</span>
          </div>
          <div className="text-[11px] text-center text-slate-400 mt-2 font-medium">
            v1.3.1 &middot; Sistem Persuratan Digital
          </div>
        </div>
      </aside>
    </>
  );
};
