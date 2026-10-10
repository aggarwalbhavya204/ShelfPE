import React from 'react';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200">
      <nav className="border-b border-slate-700/50 bg-[#1e293b]/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              S
            </div>
            <span className="font-bold text-lg tracking-wide">Shelf<span className="text-blue-500">PE</span></span>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-slate-400 hover:text-white transition-colors">Products</button>
            <button className="text-slate-400 hover:text-white transition-colors">Orders</button>
            <button className="text-slate-400 hover:text-white transition-colors">Waste Log</button>
            <div className="w-8 h-8 rounded-full bg-slate-700 ml-4 border-2 border-slate-600"></div>
          </div>
        </div>
      </nav>
      
      <main className="pb-12">
        <Dashboard />
      </main>
    </div>
  );
}

export default App;
