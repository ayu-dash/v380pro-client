import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sheet } from './ui/sheet';

export default function Layout({ 
  storageInfo, 
  cameras, 
  handleLogout, 
  contextProps 
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const onSwitchTab = () => {
    setIsMobileMenuOpen(false);
  }

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Live View';
      case '/playback': return 'Playback';
      case '/snapshots': return 'Snapshots';
      case '/settings': return 'Settings';
      default: return 'Live View';
    }
  }

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-3 pb-6 mb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-sm font-bold text-zinc-50 leading-none tracking-tight">V380Pro Web Client</h1>
        </div>
      </div>

      <nav className="space-y-1">
        <ul className="space-y-1">
          {[
            { id: '/', icon: 'videocam', label: 'Live View' },
            { id: '/playback', icon: 'history', label: 'Playback' },
            { id: '/snapshots', icon: 'image', label: 'Snapshots' },
            { id: '/settings', icon: 'settings', label: 'Settings' }
          ].map((tab) => (
            <li key={tab.id}>
              <NavLink
                to={tab.id}
                onClick={onSwitchTab}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition text-sm font-medium ${
                  isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 mb-4">
        <div className="flex justify-between text-xs text-zinc-400 mb-2">
          <span>Storage</span>
          <span className="font-mono">{storageInfo.percent}</span>
        </div>
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mb-1">
          <div className="h-full bg-zinc-300 rounded-full transition-all" style={{ width: storageInfo.percent }} />
        </div>
        <div className="text-[10px] text-zinc-500 text-right">{storageInfo.used} / {storageInfo.total}</div>
      </div>

      <div className="mt-6 flex-1 overflow-y-auto">
        <p className="text-xs font-semibold text-zinc-500 mb-2">Cameras</p>
        <div className="space-y-1 pr-1">
          {cameras.length === 0 ? (
            <div className="text-xs text-zinc-600">No cameras</div>
          ) : (
            cameras.map(c => (
              <div key={c.id} className="flex items-center justify-between p-2 rounded-md text-xs text-zinc-300 group">
                <span className="flex items-center gap-2 truncate">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${c.status === 'online' ? 'bg-zinc-300' : 'bg-red-500'}`} />
                  {c.name}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-zinc-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-400 hover:text-white w-full rounded-md"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-[100dvh] w-full bg-zinc-950 text-zinc-50 font-sans overflow-hidden">
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <div className="flex flex-col h-full"><SidebarContent /></div>
      </Sheet>

      <aside className="w-[240px] border-r border-zinc-800 bg-zinc-950 flex-col p-6 shrink-0 hidden md:flex">
        <SidebarContent />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-950">
        <header className="flex items-center justify-between px-4 md:px-8 h-16 border-b border-zinc-800 shrink-0 sticky top-0 bg-zinc-950/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white">
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold capitalize">{getPageTitle()}</h2>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet context={contextProps} />
        </div>
      </main>
    </div>
  );
}
