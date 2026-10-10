import React, { useState, useEffect } from 'react';
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  ShoppingCart,
  Activity,
  Calendar,
  Box,
  RefreshCcw
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

const API_URL = 'http://localhost:8000/api';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    total_products: 0,
    total_stock: 0,
    low_stock_alerts: 0,
    expiry_alerts: 0,
    estimated_waste_cost: 0
  });
  const [alerts, setAlerts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [metricsRes, alertsRes, productsRes] = await Promise.all([
        fetch(`${API_URL}/dashboard`),
        fetch(`${API_URL}/alerts`),
        fetch(`${API_URL}/products`)
      ]);
      
      const metricsData = await metricsRes.json();
      const alertsData = await alertsRes.json();
      const productsData = await productsRes.json();
      
      setMetrics(metricsData);
      setAlerts(alertsData);
      setProducts(productsData.slice(0, 5)); // Just top 5 for dashboard
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Mock data for charts
  const salesData = [
    { name: 'Mon', value: 400 },
    { name: 'Tue', value: 300 },
    { name: 'Wed', value: 550 },
    { name: 'Thu', value: 450 },
    { name: 'Fri', value: 700 },
    { name: 'Sat', value: 800 },
    { name: 'Sun', value: 650 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Inventory Intelligence
          </h1>
          <p className="text-slate-400 mt-1">Real-time ML-powered supply chain insights</p>
        </div>
        <button onClick={fetchData} className="p-2 rounded-full bg-[#1e293b] hover:bg-slate-700 transition-colors">
          <RefreshCcw className={`w-5 h-5 text-blue-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Stock" 
          value={metrics.total_stock} 
          icon={<Package className="text-blue-500 w-6 h-6" />}
          trend="+12% from last week"
          trendUp={true}
        />
        <MetricCard 
          title="Low Stock Alerts" 
          value={metrics.low_stock_alerts} 
          icon={<Activity className="text-amber-500 w-6 h-6" />}
          trend="Requires attention"
          trendUp={false}
          highlight="warning"
        />
        <MetricCard 
          title="Expiring Soon" 
          value={metrics.expiry_alerts} 
          icon={<Calendar className="text-red-500 w-6 h-6" />}
          trend="Action needed (FEFO)"
          trendUp={false}
          highlight="danger"
        />
        <MetricCard 
          title="Est. Waste Cost" 
          value={`$${metrics.estimated_waste_cost.toFixed(2)}`} 
          icon={<TrendingDown className="text-rose-500 w-6 h-6" />}
          trend="-5% from last month"
          trendUp={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="bg-[#1e293b]/80 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden col-span-1 lg:col-span-2 p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            Demand Forecast (7 Days)
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ color: '#3b82f6' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action Center / Alerts */}
        <div className="bg-[#1e293b]/80 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden p-6 flex flex-col">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Action Center
          </h2>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {alerts.length > 0 ? alerts.map((alert, idx) => (
              <div key={idx} className={`p-4 rounded-xl border ${alert.urgency === 'critical' ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                <div className="flex justify-between items-start mb-1">
                  <h3 className={`font-semibold ${alert.urgency === 'critical' ? 'text-red-500' : 'text-amber-500'}`}>
                    {alert.title}
                  </h3>
                  <span className="text-xs uppercase tracking-wider font-bold opacity-70">
                    {alert.type}
                  </span>
                </div>
                <p className="text-sm text-slate-300">{alert.message}</p>
                <button className={`mt-3 text-sm font-medium hover:underline ${alert.urgency === 'critical' ? 'text-red-500' : 'text-amber-500'}`}>
                  Review Action &rarr;
                </button>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 pb-10">
                <Box className="w-12 h-12 mb-3 opacity-20" />
                <p>No immediate actions required.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product List */}
      <div className="bg-[#1e293b]/80 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-500" />
            Inventory Status
          </h2>
          <button className="text-blue-500 text-sm hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-sm">
                <th className="pb-3 font-medium">Product Name</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Stock</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Unit Cost</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 font-medium">{p.name}</td>
                  <td className="py-4 text-slate-400">{p.category}</td>
                  <td className="py-4 font-mono">{p.quantity}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      p.status === 'In Stock' ? 'bg-emerald-500/20 text-emerald-500' :
                      p.status === 'Low Stock' ? 'bg-amber-500/20 text-amber-500' :
                      'bg-red-500/20 text-red-500'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-4">${p.unit_cost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, trend, trendUp, highlight }) {
  let highlightClass = "";
  if (highlight === "warning") highlightClass = "border-t-2 border-t-amber-500";
  if (highlight === "danger") highlightClass = "border-t-2 border-t-red-500";

  return (
    <div className={`bg-[#1e293b]/80 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden hover:bg-[#1e293b] hover:shadow-2xl hover:border-slate-600 transition-all duration-300 p-6 ${highlightClass}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-slate-800/50 rounded-xl">
          {icon}
        </div>
        <div className={`text-xs font-medium px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-700 text-slate-300'}`}>
          {trend}
        </div>
      </div>
      <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
    </div>
  );
}
