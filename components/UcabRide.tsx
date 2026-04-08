"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  User, Loader2, Trash2, Edit3, X, Save, Star, Battery, Upload, MapPin, Globe, Phone
} from "lucide-react";

export default function DriversFleet() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [editingDriver, setEditingDriver] = useState<any | null>(null);

  const initialForm = {
    full_name: "", phone: "", pin: "", vehicle_plate: "", 
    avatar_url: "", image_url: "", car_image_url: "",
    wallet_balance: 0, is_online: false, rating: 5.0, battery_level: 100,
    lat: 44.4268, lng: 26.1025 // București default
  };

  const [form, setForm] = useState<Record<string, any>>(initialForm);

  useEffect(() => { fetchDrivers(); }, []);

  async function fetchDrivers() {
    setLoading(true);
    const { data } = await supabase.from("drivers").select("*").order("created_at", { ascending: false });
    if (data) setDrivers(data);
    setLoading(false);
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(field);
    const path = `${field}/${Date.now()}_${file.name}`;
    const { error: err } = await supabase.storage.from('ucab-food').upload(path, file);
    if (!err) {
      const { data } = supabase.storage.from('ucab-food').getPublicUrl(path);
      setForm(prev => ({ ...prev, [field]: data.publicUrl }));
    }
    setUploading(null);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload = { ...form, name: form.full_name };
    const { error } = editingDriver 
      ? await supabase.from("drivers").update(payload).eq("id", editingDriver.id)
      : await supabase.from("drivers").insert([payload]);

    if (!error) { setShowModal(false); fetchDrivers(); }
    setLoading(false);
  }

  return (
    <div className="w-full min-h-screen bg-[#020202] text-white p-4 md:p-10 font-black italic uppercase overflow-x-hidden">
      
      {/* HEADER RESPONSIVE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 border-b border-white/10 pb-6 gap-4">
        <div>
          <h1 className="text-5xl md:text-7xl tracking-tighter leading-none">UCAB FLEET</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
            <p className="text-blue-500 text-[10px] tracking-[0.2em]">LIVE TRACKING SYSTEM</p>
          </div>
        </div>
        <button 
          onClick={() => { setEditingDriver(null); setForm(initialForm); setShowModal(true); }} 
          className="w-full md:w-auto bg-blue-600 px-8 py-4 rounded-xl text-[10px] hover:bg-white hover:text-black transition-all"
        >
          + REGISTER NEW UNIT
        </button>
      </div>

      {/* GRID DRIVERS RESPONSIVE */}
      {loading && !showModal ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={50} /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
          {drivers.map((d) => (
            <div key={d.id} className={`group bg-[#080808] border ${d.is_online ? 'border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.05)]' : 'border-white/5'} rounded-[2.5rem] p-5 transition-all hover:bg-zinc-950`}>
              
              <div className="flex flex-col gap-5">
                {/* TOP SECTION: INFO & MAP */}
                <div className="flex gap-4">
                  {/* AVATAR & STATUS */}
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden">
                      {d.avatar_url ? <img src={d.avatar_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" /> : <User className="p-5 opacity-20 w-full h-full" />}
                    </div>
                    {d.is_online && <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-4 border-[#080808] animate-pulse" />}
                  </div>

                  {/* MINI MAP EMBED (DOAR DACĂ E ONLINE) */}
                  <div className="flex-1 h-20 bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 relative">
                    {d.is_online ? (
                      <iframe 
                        className="w-full h-full opacity-50 grayscale hover:opacity-100 transition-all cursor-crosshair"
                        src={`https://google.com{d.lat},${d.lng}&z=14&output=embed&t=k`}
                        frameBorder="0"
                      ></iframe>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700">
                        <Globe size={16} />
                        <span className="text-[7px] mt-1">OFFLINE TRACKING DISABLED</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* DETAILS SECTION */}
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl tracking-tighter text-white/90 group-hover:text-blue-500 transition-colors leading-none">{d.full_name || d.name}</h2>
                      <div className="flex gap-2 mt-2">
                        <span className="flex items-center gap-1 text-[8px] bg-white/5 px-2 py-0.5 rounded text-zinc-400 font-bold"><Battery size={8} className={d.battery_level < 20 ? 'text-red-500' : 'text-green-500'}/> {d.battery_level}%</span>
                        <span className="flex items-center gap-1 text-[8px] bg-white/5 px-2 py-0.5 rounded text-zinc-400 font-bold uppercase"><MapPin size={8} className="text-blue-500"/> {d.city || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[12px] text-blue-500 leading-none">{d.wallet_balance} RON</p>
                       <p className="text-[7px] text-zinc-600 mt-1 uppercase">Balance</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-5">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                       <p className="text-[7px] text-zinc-600">ID / PIN</p>
                       <p className="text-[10px]">{d.pin || '----'}</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                       <p className="text-[7px] text-zinc-600">PLATE</p>
                       <p className="text-[10px]">{d.vehicle_plate || 'N/A'}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingDriver(d); setForm(d); setShowModal(true); }} className="flex-1 bg-white/5 rounded-xl flex items-center justify-center hover:bg-blue-600 transition-all"><Edit3 size={14}/></button>
                      <button onClick={async () => { if(confirm("ERASE RECORD?")) { await supabase.from("drivers").delete().eq("id", d.id); fetchDrivers(); } }} className="flex-1 bg-red-600/10 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all"><Trash2 size={14}/></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CONFIGURATION */}
      {showModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex justify-center items-center p-4 md:p-8">
           <div className="bg-[#050505] border border-white/10 p-6 md:p-12 rounded-[3rem] w-full max-w-6xl max-h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl shadow-blue-900/20">
              
              <div className="flex justify-between items-center mb-10 sticky top-0 bg-[#050505] z-10 py-2 border-b border-white/5">
                 <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${form.is_online ? 'bg-green-500 shadow-[0_0_10px_green]' : 'bg-red-500'}`} />
                    <h2 className="text-3xl md:text-5xl tracking-tighter uppercase italic">Control Panel</h2>
                 </div>
                 <button onClick={() => setShowModal(false)} className="bg-white/5 p-3 rounded-full hover:rotate-90 transition-all"><X size={32} /></button>
              </div>
              
              <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                 {/* LEFT COL: IMAGES & LOCATION */}
                 <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: 'Avatar', field: 'avatar_url' },
                          { label: 'Vehicle', field: 'car_image_url' }
                        ].map(img => (
                          <div key={img.field} className="aspect-square bg-white/5 rounded-3xl border-2 border-dashed border-white/10 relative overflow-hidden flex flex-col items-center justify-center group cursor-pointer">
                            {form[img.field] ? (
                              <img src={form[img.field]} className="w-full h-full object-cover" />
                            ) : (
                              <>
                                {uploading === img.field ? <Loader2 className="animate-spin text-blue-500" /> : <Upload className="text-zinc-600" />}
                                <span className="text-[8px] mt-2 text-zinc-500">{img.label}</span>
                              </>
                            )}
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleUpload(e, img.field)} />
                          </div>
                        ))}
                    </div>

                    {/* LIVE LOCATION PREVIEW IN MODAL */}
                    <div className="bg-zinc-900 rounded-[2rem] h-64 border border-white/5 overflow-hidden relative">
                        <div className="absolute top-4 left-4 z-10 bg-black/80 px-4 py-2 rounded-xl border border-white/10 flex gap-4 text-[10px]">
                            <div className="flex flex-col">
                                <span className="text-zinc-500">LATITUDE</span>
                                <span>{form.lat.toFixed(4)}</span>
                            </div>
                            <div className="flex flex-col border-l border-white/10 pl-4">
                                <span className="text-zinc-500">LONGITUDE</span>
                                <span>{form.lng.toFixed(4)}</span>
                            </div>
                        </div>
                        <iframe className="w-full h-full grayscale opacity-70" src={`https://google.com{form.lat},${form.lng}&z=15&output=embed&t=k`}></iframe>
                    </div>
                 </div>

                 {/* RIGHT COL: FIELDS */}
                 <div className="space-y-6">
                    <div className="flex gap-4 items-center bg-white/5 p-6 rounded-3xl border border-white/5">
                        <div className="flex-1">
                            <p className="text-[10px] text-blue-500">Toggle connectivity</p>
                            <p className="text-xl italic font-black uppercase">{form.is_online ? 'Status: Online' : 'Status: Offline'}</p>
                        </div>
                        <button type="button" onClick={() => setForm({...form, is_online: !form.is_online})} className={`px-8 py-3 rounded-xl text-[10px] transition-all border ${form.is_online ? 'bg-green-600 border-green-400' : 'bg-zinc-800 border-white/10'}`}>
                           {form.is_online ? 'DISCONNECT' : 'AUTHORIZE'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 uppercase">
                        <div>
                            <label className="text-[8px] text-zinc-500 mb-1 block">Full Name</label>
                            <input className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-sm outline-none focus:border-blue-600" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required />
                        </div>
                        <div>
                            <label className="text-[8px] text-zinc-500 mb-1 block">Phone</label>
                            <input className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-sm outline-none focus:border-blue-600" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required />
                        </div>
                        <div>
                            <label className="text-[8px] text-zinc-500 mb-1 block">Plate Number</label>
                            <input className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-sm uppercase" value={form.vehicle_plate} onChange={e => setForm({...form, vehicle_plate: e.target.value.toUpperCase()})} />
                        </div>
                        <div>
                            <label className="text-[8px] text-zinc-500 mb-1 block">Pin Access</label>
                            <input className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-sm" value={form.pin} onChange={e => setForm({...form, pin: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                            <label className="text-[7px] text-zinc-600 block mb-1">BATTERY %</label>
                            <input type="number" className="bg-transparent w-full outline-none text-xl" value={form.battery_level} onChange={e => setForm({...form, battery_level: parseInt(e.target.value)})} />
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                            <label className="text-[7px] text-zinc-600 block mb-1">RATING</label>
                            <input type="number" step="0.1" className="bg-transparent w-full outline-none text-xl" value={form.rating} onChange={e => setForm({...form, rating: parseFloat(e.target.value)})} />
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                            <label className="text-[7px] text-zinc-600 block mb-1">WALLET</label>
                            <input type="number" className="bg-transparent w-full outline-none text-xl text-blue-500" value={form.wallet_balance} onChange={e => setForm({...form, wallet_balance: parseFloat(e.target.value)})} />
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full bg-blue-600 py-6 rounded-[2rem] text-xl hover:bg-white hover:text-black transition-all flex justify-center items-center gap-4 mt-4">
                       {loading ? <Loader2 className="animate-spin" /> : <><Save size={24} /> UPDATE CORE DATA</>}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
