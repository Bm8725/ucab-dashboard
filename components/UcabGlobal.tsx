'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, Trash2, Edit2, Mail, MapPin, Loader2, RefreshCw, 
  X, Save, UserPlus, ChevronLeft, ChevronRight, History, Clock, FileText, PieChart, TrendingUp
} from 'lucide-react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export default function UcabGlobal() {
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'RIDE' | 'FOOD'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const supabase = createClient(SB_URL, SB_KEY);

  const fetchData = async () => {
    setLoading(true);
    const [pRes, oRes] = await Promise.all([
      supabase.from('payments').select('*, rides(type)').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false })
    ]);

    const combined = [
      ...(pRes.data?.map(p => ({ id: p.id, date: p.created_at, amount: Number(p.amount), service: 'RIDE', label: p.rides?.type || 'Standard', status: p.status })) || []),
      ...(oRes.data?.map(o => ({ id: o.id, date: o.created_at, amount: Number(o.total_amount), service: 'FOOD', label: o.restaurant_name, status: o.status })) || [])
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setLedger(combined);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredData = filter === 'ALL' ? ledger : ledger.filter(item => item.service === filter);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-[#050505]"><Loader2 className="animate-spin text-[#10b981]" size={32} /></div>;

  return (
    <div className="w-full bg-[#050505] min-h-screen text-slate-300 font-sans p-6 md:p-12">
      
      {/* HEADER & ANALYTICS TOP */}
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-end gap-6 no-print">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[#10b981] font-black text-[10px] uppercase tracking-widest">
            <TrendingUp size={14} /> Revenue Intelligence
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tighter italic">€{ledger.reduce((a, b) => a + b.amount, 0).toLocaleString()}</h1>
        </div>
        <div className="flex gap-2 bg-[#111] p-1 border border-slate-800 rounded-xl">
          {['ALL', 'RIDE', 'FOOD'].map((f) => (
            <button key={f} onClick={() => {setFilter(f as any); setCurrentPage(1);}} className={`px-6 py-2 text-[10px] font-black rounded-lg transition-all ${filter === f ? 'bg-[#10b981] text-black' : 'text-slate-500 hover:text-white'}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* GRAFIC FAIN (CUSTOM CSS BARS) */}
        <div className="lg:col-span-2 bg-[#0a0a0a] border border-slate-900 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xs font-black uppercase tracking-widest text-white italic">Activity_Trend</h3>
            <div className="text-[#10b981] text-[10px] font-bold uppercase">Real-time Sync</div>
          </div>
          
          <div className="h-48 w-full flex items-end justify-between gap-3 px-2">
            {[60, 40, 90, 70, 50, 85, 100].map((val, i) => (
              <div key={i} className="flex-1 group relative">
                <div style={{ height: `${val}%` }} className="w-full bg-gradient-to-t from-[#10b981] to-[#34d399] rounded-t-lg opacity-80 group-hover:opacity-100 transition-all duration-700 shadow-[0_0_20px_rgba(16,185,129,0.2)]"></div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-slate-600 font-bold">DAY_{i+1}</div>
              </div>
            ))}
          </div>
        </div>

        {/* DISTRIBUTION CARD */}
        <div className="bg-[#111] border border-slate-800 p-8 rounded-3xl flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#555] mb-6 flex items-center gap-2"><PieChart size={14} /> Market Share</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase"><span>Rideshare</span><span className="text-[#10b981]">68%</span></div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-[#10b981] w-[68%] transition-all duration-1000"></div></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase"><span>Food Delivery</span><span className="text-blue-500">32%</span></div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 w-[32%] transition-all duration-1000"></div></div>
              </div>
            </div>
          </div>
          <button onClick={() => window.print()} className="mt-8 w-full py-4 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#10b981] transition-all">
            <FileText size={16} /> Export Consolidated Report
          </button>
        </div>

        {/* TABLE LEDGER WITH PAGINATION */}
        <div className="lg:col-span-3 bg-[#0a0a0a] border border-slate-900 rounded-3xl overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0d0d0d] border-b border-slate-900 text-[10px] text-slate-500 font-black uppercase tracking-widest">
              <tr>
                <th className="p-6">Sursă</th>
                <th className="p-6">Descriere</th>
                <th className="p-6">Sumă</th>
                <th className="p-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {currentItems.map((item) => (
                <tr key={item.id} className="hover:bg-[#111] transition-colors group">
                  <td className="p-6">
                    <span className={`px-2 py-1 rounded text-[9px] font-black border ${item.service === 'RIDE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                      {item.service}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="text-sm font-bold text-white tracking-tight">{item.label}</div>
                    <div className="text-[10px] text-slate-600 mt-1">{new Date(item.date).toLocaleString()}</div>
                  </td>
                  <td className="p-6 text-lg font-black italic text-white tracking-tighter">€{item.amount.toFixed(2)}</td>
                  <td className="p-6 text-right">
                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${item.status === 'paid' || item.status === 'completed' ? 'text-emerald-500' : 'text-orange-500'}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* PAGINATION CONTROLS */}
          <div className="p-6 bg-[#0d0d0d] border-t border-slate-900 flex justify-between items-center text-[10px] font-black text-slate-500 tracking-widest">
            <div>PAGINA {currentPage} / {totalPages || 1}</div>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:border-[#10b981] disabled:opacity-20"><ChevronLeft size={16}/></button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:border-[#10b981] disabled:opacity-20"><ChevronRight size={16}/></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
