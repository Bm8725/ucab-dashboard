'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, Trash2, Edit2, Mail, MapPin, Loader2, RefreshCw, 
  X, Save, UserPlus, ChevronLeft, ChevronRight, History, Clock, Info, Check, Phone
} from 'lucide-react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

interface Rider {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  preferred_payment: string | null;
  created_at: string;
}

export default function UcabRiders() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingRider, setEditingRider] = useState<Rider | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newRider, setNewRider] = useState({ name: '', email: '', phone: '', address: '', preferred_payment: 'card' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    if (SB_URL && SB_KEY) setSupabase(createClient(SB_URL, SB_KEY));
  }, []);

  const fetchRiders = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase.from('riders').select('*').order('created_at', { ascending: false });
    if (data) setRiders(data);
    setLoading(false);
  };

  useEffect(() => { fetchRiders(); }, [supabase]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const { data, error } = await supabase.from('riders').insert([newRider]).select();
    if (!error && data) {
      setRiders([data[0], ...riders]);
      setIsAdding(false);
      setNewRider({ name: '', email: '', phone: '', address: '', preferred_payment: 'card' });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !editingRider) return;
    const { error } = await supabase.from('riders').update({
      name: editingRider.name,
      email: editingRider.email,
      phone: editingRider.phone,
      address: editingRider.address,
      preferred_payment: editingRider.preferred_payment
    }).eq('id', editingRider.id);

    if (!error) {
      setRiders(riders.map(r => r.id === editingRider.id ? editingRider : r));
      setEditingRider(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('riders').delete().eq('id', id);
    if (!error) {
      setRiders(riders.filter(r => r.id !== id));
      setDeleteConfirm(null);
      if (currentItems.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
    }
  };

  const filtered = riders.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <div className="flex items-center justify-center min-h-[400px] bg-[#0c0c0c]"><Loader2 className="animate-spin text-[#ff007a]" size={32} /></div>;

  return (
    <div className="w-full bg-[#0c0c0c] min-h-screen text-[#e0e0e0] font-sans p-4 md:p-8">
      
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <div className="w-2 h-8 bg-[#ff007a] rounded-full shadow-[0_0_15px_#ff007a]"></div>
          UCAB RIDERS <span className="text-[#ff007a] font-black text-[10px] bg-[#ff007a]/10 px-2 py-1 rounded uppercase tracking-widest">CEO_PANEL</span>
        </h1>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" size={14} />
            <input 
              className="w-full pl-9 pr-4 py-2 bg-[#161616] border border-[#252525] rounded-lg text-sm focus:border-[#ff007a] outline-none transition-all text-white"
              placeholder="Search data..."
              onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
            />
          </div>
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-[#ff007a] hover:bg-[#d00063] text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tighter transition-all">
            <UserPlus size={16} /> Adaugă
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-[#111] border border-[#222] rounded-xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-[#161616] border-b border-[#222]">
            <tr className="text-[10px] text-[#666] uppercase font-bold tracking-widest">
              <th className="p-5">Identitate</th>
              <th className="p-5">Contact & Adresă</th>
              <th className="p-5 text-center">Plată</th>
              <th className="p-5 text-right px-10 text-[#ff007a]">Control</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1a1a]">
            {currentItems.map((rider) => (
              <tr key={rider.id} className="hover:bg-[#151515] transition-colors">
                <td className="p-5">
                  <div className="font-bold text-white tracking-tight">{rider.name}</div>
                  <div className="text-[9px] text-[#444] font-mono mt-1 uppercase tracking-tighter italic">ID: {rider.id.slice(0,12)}</div>
                </td>
                <td className="p-5">
                  <div className="flex flex-col gap-1 text-[12px] text-[#999]">
                    <span className="flex items-center gap-2"><Mail size={12} className="text-[#ff007a] opacity-70"/> {rider.email}</span>
                    <span className="flex items-center gap-2 text-[#555]"><MapPin size={12}/> {rider.address || 'Nespecificată'}</span>
                  </div>
                </td>
                <td className="p-5 text-center">
                  <span className="px-2 py-0.5 bg-[#1a1a1a] border border-[#333] rounded text-[9px] text-[#ff007a] font-black uppercase italic tracking-wider">
                    {rider.preferred_payment || 'CASH'}
                  </span>
                </td>
                <td className="p-5 text-right px-10">
                  <div className="flex justify-end gap-3 items-center">
                    <button onClick={() => setEditingRider(rider)} className="text-[#444] hover:text-[#ff007a] transition-all"><Edit2 size={16} /></button>
                    
                    {deleteConfirm === rider.id ? (
                      <div className="flex items-center gap-2 bg-[#ff007a]/10 p-1 rounded border border-[#ff007a]/20 animate-in slide-in-from-right-2">
                        <span className="text-[9px] font-black text-[#ff007a] px-1">CONFIRMĂ?</span>
                        <button onClick={() => handleDelete(rider.id)} className="bg-[#ff007a] text-white p-1 rounded hover:bg-red-600 transition-colors"><Check size={12}/></button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-white p-1 hover:text-[#ff007a] transition-colors"><X size={12}/></button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(rider.id)} className="text-[#444] hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-4 bg-[#141414] border-t border-[#222] flex justify-between items-center text-[10px] font-bold text-[#555] tracking-widest uppercase">
          <div>Pagina {currentPage} / {totalPages || 1}</div>
          <div className="flex gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 bg-[#1a1a1a] border border-[#222] rounded hover:border-[#ff007a] disabled:opacity-30 transition-all"><ChevronLeft size={14}/></button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 bg-[#1a1a1a] border border-[#222] rounded hover:border-[#ff007a] disabled:opacity-30 transition-all"><ChevronRight size={14}/></button>
          </div>
        </div>
      </div>

      {(editingRider || isAdding) && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#222] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in duration-200">
            {editingRider && (
              <div className="w-full md:w-64 bg-[#0d0d0d] p-6 border-b md:border-b-0 md:border-r border-[#222]">
                <h3 className="text-[#ff007a] text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 italic"><History size={14}/> Security Log</h3>
                <div className="space-y-4 text-[11px] text-[#444] font-medium uppercase tracking-tighter">
                  <div className="p-3 bg-[#ff007a]/5 border border-[#ff007a]/20 rounded-lg text-[#ff007a] italic">
                    <Info size={12} className="inline mr-1 mb-1"/> Înregistrat la: {new Date(editingRider.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2 pl-2 border-l border-[#222]">
                    <Clock size={12} /> Status: Verified
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 p-8">
              <div className="flex justify-between items-start mb-8">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">{isAdding ? 'Înregistrare Nouă' : 'Actualizare Cloud'}</h2>
                <button onClick={() => {setEditingRider(null); setIsAdding(false);}} className="text-[#444] hover:text-[#ff007a] transition-colors"><X size={24} /></button>
              </div>
              
              <form onSubmit={isAdding ? handleAdd : handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#555] uppercase">Nume Rider</label>
                  <input className="w-full p-3 bg-[#0a0a0a] border border-[#222] rounded-lg text-sm focus:border-[#ff007a] outline-none text-white transition-all" value={isAdding ? newRider.name : editingRider?.name} onChange={(e) => isAdding ? setNewRider({...newRider, name: e.target.value}) : setEditingRider({...editingRider!, name: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#555] uppercase">Email</label>
                  <input className="w-full p-3 bg-[#0a0a0a] border border-[#222] rounded-lg text-sm focus:border-[#ff007a] outline-none text-white transition-all" type="email" value={isAdding ? newRider.email : editingRider?.email} onChange={(e) => isAdding ? setNewRider({...newRider, email: e.target.value}) : setEditingRider({...editingRider!, email: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#555] uppercase">Metodă Plată</label>
                  <select className="w-full p-3 bg-[#0a0a0a] border border-[#222] rounded-lg text-sm focus:border-[#ff007a] outline-none text-white appearance-none" value={isAdding ? newRider.preferred_payment : editingRider?.preferred_payment || 'card'} onChange={(e) => isAdding ? setNewRider({...newRider, preferred_payment: e.target.value}) : setEditingRider({...editingRider!, preferred_payment: e.target.value})}>
                    <option value="card">CARD ONLINE</option>
                    <option value="cash">CASH / OFFLINE</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#555] uppercase">Telefon Contact</label>
                  <input className="w-full p-3 bg-[#0a0a0a] border border-[#222] rounded-lg text-sm focus:border-[#ff007a] outline-none text-white transition-all" value={isAdding ? newRider.phone : editingRider?.phone || ''} onChange={(e) => isAdding ? setNewRider({...newRider, phone: e.target.value}) : setEditingRider({...editingRider!, phone: e.target.value})} />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-[#555] uppercase">Adresă de Lucru</label>
                  <textarea className="w-full p-3 bg-[#0a0a0a] border border-[#222] rounded-lg text-sm focus:border-[#ff007a] outline-none min-h-[80px] resize-none text-white" value={isAdding ? newRider.address : editingRider?.address || ''} onChange={(e) => isAdding ? setNewRider({...newRider, address: e.target.value}) : setEditingRider({...editingRider!, address: e.target.value})} />
                </div>
                <div className="md:col-span-2 pt-4">
                  <button type="submit" className="w-full py-4 bg-[#ff007a] text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-[#d00063] transition-all shadow-lg shadow-[#ff007a]/20 flex items-center justify-center gap-2">
                    <Save size={16} /> Salvează în cloud
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
