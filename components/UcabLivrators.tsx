"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Bike, Search, MapPin, Globe, Zap, Radio, 
  ChevronRight, Camera, Plus, X, Flag, 
  Target, Trash2, Edit3, Settings2, Filter,
  Activity, Smartphone, Loader2, DollarSign,
  TrendingUp, Clock, AlertCircle,
  Package, Battery // <--- ASIGURĂ-TE CĂ ACESTEA DOUĂ SUNT AICI
} from "lucide-react";

import Link from "next/link";

export default function UcabGlobalFleet() {
  const [livratori, setLivratori] = useState<any[]>([]);
  const [activeRides, setActiveRides] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: "", phone: "", country: "",
    county: "", city: "", vehicle_type: "bike",
    image_url: "", is_online: false, status: "idle"
  });

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('global-fleet-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchData() {
    const { data: drivers } = await supabase.from("drivers").select("*").order("created_at", { ascending: false });
    const { data: rides } = await supabase.from("rides").select("*");
    setLivratori(drivers || []);
    setActiveRides(rides || []);
  }

  // --- LOGICĂ STATISTICI PER LIVRATOR ---
  const getStats = (driverId: string) => {
    const driverRides = activeRides.filter(r => r.driver_id === driverId);
    const completed = driverRides.filter(r => r.status === 'completed').length;
    // Simulăm un câștig de 15 RON pe livrare (poți ajusta coloana în DB ulterior)
    const earnings = completed * 15; 
    return { completed, earnings };
  };

  async function handleImageUpload(e: any) {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('ucab-food').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('ucab-food').getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
    } catch (err: any) { alert("EROARE UPLOAD: " + err.message); } 
    finally { setUploading(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("ELIMINI UNITATEA DIN REȚEA?")) return;
    await supabase.from("drivers").delete().eq("id", id);
  }

  async function handleSave() {
    if (!formData.full_name || !formData.country || !formData.city) return alert("DATE INCOMPLETE!");
    if (editingId) {
      await supabase.from("drivers").update(formData).eq("id", editingId);
      setEditingId(null); setShowForm(false);
    } else {
      const appId = `UCAB-${Math.floor(1000 + Math.random() * 9000)}`;
      await supabase.from("drivers").insert([{ ...formData, app_id: appId }]);
      setShowForm(false);
      setFormData({ full_name: "", phone: "", country: "", county: "", city: "", vehicle_type: "bike", image_url: "", is_online: false, status: "idle" });
    }
    fetchData();
  }

  const filtered = livratori.filter(l => l.full_name?.toLowerCase().includes(search.toLowerCase()) || l.city?.toLowerCase().includes(search.toLowerCase()));

  const groupedFleet = filtered.reduce((acc: any, driver: any) => {
    const country = driver.country || "Nespecificat";
    const county = driver.county || "Nespecificat";
    const city = driver.city || "Nespecificat";
    if (!acc[country]) acc[country] = {};
    if (!acc[country][county]) acc[country][county] = {};
    if (!acc[country][county][city]) acc[country][county][city] = [];
    acc[country][county][city].push(driver);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#020202] text-white p-6 pb-40 font-sans italic selection:bg-red-600/30">
      
      {/* HEADER TACTIC CU STATS GLOBALE */}
      <div className="max-w-7xl mx-auto mb-10 space-y-6">
        <div className="bg-[#080808] border border-white/5 rounded-[3rem] p-8 flex flex-col lg:flex-row justify-between items-center gap-8 shadow-2xl">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/20">

            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter">Livartor ucab-food</h1>
              <div className="flex gap-4 mt-2">
                <span className="text-[8px] text-green-500 font-bold tracking-widest uppercase">● {livratori.filter(l => l.is_online).length} Online</span>
                <span className="text-[8px] text-orange-500 font-bold tracking-widest uppercase">● {activeRides.filter(r => r.status !== 'completed').length} Active_Missions</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 w-full lg:w-auto">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
              <input 
                type="text" placeholder="SCAN_NAME_OR_CITY..." 
                onChange={(e) => setSearch(e.target.value)}
                className="bg-black/50 border border-white/10 p-4 pl-12 rounded-2xl text-[10px] font-black w-full lg:w-80 outline-none focus:border-red-600/50 transition-all uppercase"
              />
            </div>
            <button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="px-8 py-4 bg-white text-black font-black rounded-2xl hover:bg-red-600 hover:text-white transition-all uppercase text-[10px]">
              {showForm ? "Închide" : "Adaugă Unitate"}
            </button>
          </div>
        </div>
      </div>

      {/* FORMULAR DEPLOYMENT */}
      {showForm && (
        <div className="max-w-7xl mx-auto mb-10 bg-[#080808] border-2 border-red-600/20 p-10 rounded-[3.5rem] animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="space-y-4">
               <div className="w-full h-48 bg-black rounded-[2rem] border-2 border-dashed border-white/5 relative overflow-hidden flex items-center justify-center group">
                  {uploading ? <Loader2 className="animate-spin text-red-600" size={40} /> : formData.image_url ? <img src={formData.image_url} className="w-full h-full object-cover" /> : <Camera className="text-zinc-800" size={40} />}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
               </div>
            </div>
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
              <input value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="bg-black border border-white/5 p-4 rounded-xl text-xs font-bold uppercase focus:border-red-600 outline-none" placeholder="NUME COMPLET" />
              <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="bg-black border border-white/5 p-4 rounded-xl text-xs font-bold focus:border-red-600 outline-none" placeholder="TELEFON" />
              <select value={formData.vehicle_type} onChange={e => setFormData({...formData, vehicle_type: e.target.value})} className="bg-black border border-white/5 p-4 rounded-xl text-xs font-bold uppercase outline-none">
                <option value="bike">Bicicletă</option>
                <option value="moto">Motocicletă</option>
                <option value="car">Autoturism</option>
              </select>
              <input value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="bg-black border border-white/5 p-4 rounded-xl text-xs font-bold uppercase focus:border-red-600 outline-none" placeholder="ȚARĂ" />
              <input value={formData.county} onChange={e => setFormData({...formData, county: e.target.value})} className="bg-black border border-white/5 p-4 rounded-xl text-xs font-bold uppercase focus:border-red-600 outline-none" placeholder="JUDEȚ" />
              <input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="bg-black border border-white/5 p-4 rounded-xl text-xs font-bold uppercase focus:border-red-600 outline-none" placeholder="ORAȘ" />
              <button onClick={handleSave} className="bg-red-600 text-white font-black rounded-xl h-14 uppercase text-[10px] tracking-widest shadow-lg shadow-red-600/20">
                {editingId ? "Actualizează Unitatea" : "Lansează în Flotă"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REȚEAUA PE REGIUNI */}
      <div className="max-w-7xl mx-auto space-y-20">
        {Object.keys(groupedFleet).map(country => (
          <div key={country} className="space-y-12">
            <div className="flex items-center gap-6">
              <Flag className="text-red-600" size={24} />
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">{country}</h2>
              <div className="h-px flex-grow bg-gradient-to-r from-red-600/30 to-transparent" />
            </div>

            {Object.keys(groupedFleet[country]).map(county => (
              <div key={county} className="space-y-8 pl-10 border-l border-white/5">
                <h3 className="text-xs font-bold text-zinc-600 tracking-[0.5em] uppercase">Sector_{county}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Object.keys(groupedFleet[country][county]).map(city => 
                    groupedFleet[country][county][city].map((l: any) => {
                      const stats = getStats(l.id);
                      return (
                        <div key={l.id} className="group bg-[#080808] border border-white/5 rounded-[2.5rem] p-6 hover:border-red-600/40 transition-all relative overflow-hidden">
                          
                          {/* CARD TOP */}
                          <div className="flex gap-4 mb-6">
                            <img src={l.image_url || '/placeholder.png'} className={`w-14 h-14 rounded-2xl object-cover border ${l.is_online ? 'border-green-500' : 'border-white/5 grayscale'}`} />
                            <div className="flex-grow">
                              <h4 className="text-sm font-black uppercase italic leading-none truncate w-32">{l.full_name}</h4>
                              <p className="text-[8px] text-zinc-500 font-bold mt-2 uppercase tracking-widest">{city}</p>
                            </div>
                          </div>

                          {/* STATS MODULE (UBER STYLE) */}
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            <div className="bg-black/50 p-3 rounded-2xl border border-white/5 text-center">
                              <p className="text-[7px] text-zinc-500 uppercase font-black mb-1">Câștiguri</p>
                              <div className="flex items-center justify-center gap-1">
                                <DollarSign size={10} className="text-green-500" />
                                <span className="text-xs font-black">{stats.earnings} RON</span>
                              </div>
                            </div>
                            <div className="bg-black/50 p-3 rounded-2xl border border-white/5 text-center">
                              <p className="text-[7px] text-zinc-500 uppercase font-black mb-1">Livrări</p>
                              <div className="flex items-center justify-center gap-1">
                                <Package size={10} className="text-blue-500" />
                                <span className="text-xs font-black">{stats.completed}</span>
                              </div>
                            </div>
                          </div>

                          {/* INDICATOR BATERIE/STATUS */}
                          <div className="flex justify-between items-center bg-black/50 p-3 rounded-xl border border-white/5 mb-4">
                             <div className="flex items-center gap-2">
                                <Battery size={10} className={l.battery_level < 20 ? 'text-red-600 animate-pulse' : 'text-zinc-500'} />
                                <span className="text-[9px] font-black">{l.battery_level || 100}%</span>
                             </div>
                             <span className={`text-[8px] font-black italic ${l.is_online ? 'text-green-500' : 'text-red-600'}`}>{l.status.toUpperCase()}</span>
                          </div>

                          {/* ACTION CONTROLS */}
                          <div className="grid grid-cols-3 gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                            <Link href={`/admin/livrators/${l.id}`} className="bg-zinc-900 h-10 rounded-xl flex items-center justify-center text-red-600 hover:bg-red-600 hover:text-white transition-colors">
                              <Settings2 size={16} />
                            </Link>
                            <button onClick={() => { setFormData(l); setEditingId(l.id); setShowForm(true); }} className="bg-zinc-900 h-10 rounded-xl flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors">
                              <Edit3 size={16} />
                            </button>
                            <button onClick={() => handleDelete(l.id)} className="bg-zinc-900 h-10 rounded-xl flex items-center justify-center text-zinc-600 hover:bg-red-900 hover:text-white transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
