import React, { useState } from 'react';
import Dashboard from './components/Dashboard';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

function Section({ title, children }) {
  return <section className="p-6 max-w-7xl mx-auto"><h1 className="text-3xl font-bold mb-6">{title}</h1>{children}</section>;
}

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ name: '', category: '', supplier: '', unit_cost: '', min_limit: '10', safety_stock: '20', pack_size: '1', batch_quantity: '0' });
  const load = async () => {
    setLoading(true); setError('');
    try { const r = await fetch(`${API_BASE}/api/products`); if (!r.ok) throw new Error(`API returned ${r.status}`); setProducts(await r.json()); }
    catch (e) { setError(`Could not load products. Is the backend running? (${e.message})`); }
    finally { setLoading(false); }
  };
  React.useEffect(() => { load(); }, []);
  const addProduct = async (e) => {
    e.preventDefault(); setError(''); setNotice('');
    try {
      const payload = { ...form, unit_cost: Number(form.unit_cost), min_limit: Number(form.min_limit), safety_stock: Number(form.safety_stock), pack_size: Number(form.pack_size), batch_quantity: Number(form.batch_quantity) };
      const r = await fetch(`${API_BASE}/api/products`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await r.json(); if (!r.ok) throw new Error(data.detail || `API returned ${r.status}`);
      setNotice('Product added successfully.'); setShowForm(false); setForm({ name: '', category: '', supplier: '', unit_cost: '', min_limit: '10', safety_stock: '20', pack_size: '1', batch_quantity: '0' }); await load();
    } catch (e) { setError(`Could not add product: ${e.message}`); }
  };
  const visibleProducts = products.filter(p => `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase()));
  return <Section title="Products"><div className="bg-slate-800 rounded-xl p-5">
    <div className="flex flex-wrap gap-3 justify-between mb-4"><input aria-label="Search products" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products or category…" className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"/><div className="flex gap-3"><button onClick={load} className="rounded-lg border border-slate-600 px-3 py-2 text-blue-400 hover:bg-slate-700">Refresh</button><button onClick={() => { setShowForm(v => !v); setNotice(''); }} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500">{showForm ? 'Cancel' : '+ Add Product'}</button></div></div>
    {showForm && <form onSubmit={addProduct} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 rounded-xl border border-slate-700 p-4"><h2 className="md:col-span-3 font-semibold">Add inventory product</h2>{[['name','Product name','text'],['category','Category','text'],['supplier','Supplier','text'],['unit_cost','Unit cost (₹)','number'],['min_limit','Low-stock limit','number'],['safety_stock','Safety stock','number'],['pack_size','Pack size','number'],['batch_quantity','Initial stock quantity','number']].map(([key,label,type]) => <label key={key} className="text-sm text-slate-300">{label}<input required={['name','category','supplier','unit_cost'].includes(key)} type={type} min={type==='number'?'0':undefined} step={key==='unit_cost'?'0.01':type==='number'?'1':undefined} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"/></label>)}<button className="md:col-span-3 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500">Save Product</button></form>}
    {notice && <p role="status" className="mb-3 text-emerald-400">{notice}</p>}{loading && <p>Loading products…</p>}{error && <p role="alert" className="mb-3 text-red-400">{error}</p>}
    <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-slate-400 border-b border-slate-700"><th className="py-3">Product</th><th>Category</th><th>Stock</th><th>Status</th><th>Unit Cost</th></tr></thead><tbody>{visibleProducts.map(p => <tr key={p.id} className="border-b border-slate-700/50"><td className="py-3">{p.name}</td><td>{p.category}</td><td>{p.quantity}</td><td>{p.status}</td><td>₹{Number(p.unit_cost || 0).toFixed(2)}</td></tr>)}</tbody></table></div>{!loading && !error && visibleProducts.length === 0 && <p className="py-4 text-slate-400">No matching products found.</p>}
  </div></Section>;
}

function WastePage() {
  const [records, setRecords] = useState([]); const [error, setError] = useState('');
  React.useEffect(() => { fetch(`${API_BASE}/api/waste`).then(r => { if (!r.ok) throw new Error(`API returned ${r.status}`); return r.json(); }).then(setRecords).catch(e => setError(`Could not load waste records. Check that the backend is running. (${e.message})`)); }, []);
  return <Section title="Waste Log"><div className="bg-slate-800 rounded-xl p-5">{error && <p className="text-red-400">{error}</p>}{!error && records.length === 0 && <p className="text-slate-400">No waste records found.</p>}<div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-slate-400 border-b border-slate-700"><th className="py-3">Product</th><th>Quantity</th><th>Reason</th><th>Cost</th></tr></thead><tbody>{records.map((r, i) => <tr key={r.id ?? i} className="border-b border-slate-700/50"><td className="py-3">{r.product_name ?? r.name ?? r.product_id ?? '—'}</td><td>{r.quantity ?? '—'}</td><td>{r.reason ?? '—'}</td><td>₹{Number(r.cost ?? r.waste_cost ?? 0).toFixed(2)}</td></tr>)}</tbody></table></div></div></Section>;
}

function App() {
  const [page, setPage] = useState('Dashboard');
  const navItems = ['Dashboard', 'Products', 'Orders', 'Waste Log'];
  return <div className="min-h-screen bg-[#0f172a] text-slate-200"><nav className="border-b border-slate-700/50 bg-[#1e293b]/50 backdrop-blur-md sticky top-0 z-50"><div className="max-w-7xl mx-auto px-6 min-h-16 flex flex-wrap items-center justify-between gap-3 py-3"><button onClick={() => setPage('Dashboard')} className="flex items-center gap-3"><span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center font-bold text-white">S</span><span className="font-bold text-lg tracking-wide">Shelf<span className="text-blue-500">PE</span></span></button><div className="flex items-center gap-4">{navItems.map(item => <button key={item} onClick={() => setPage(item)} className={`${page === item ? 'text-blue-400' : 'text-slate-400'} hover:text-white transition-colors`} aria-current={page === item ? 'page' : undefined}>{item}</button>)}</div></div></nav><main className="pb-12">{page === 'Dashboard' && <Dashboard onNavigate={setPage} />}{page === 'Products' && <ProductsPage />}{page === 'Waste Log' && <WastePage />}{page === 'Orders' && <Section title="Orders"><div className="bg-slate-800 rounded-xl p-6"><p className="text-slate-300">Order management is not implemented in the current backend yet.</p><p className="text-slate-400 mt-2">This section is shown so the navigation works; an orders API and order data model are needed to manage real orders.</p></div></Section>}</main></div>;
}
export default App;
