"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Car, User, Loader2, Trash2, Camera, Power, Phone, X, 
  Fingerprint, Shield, UploadCloud
} from "lucide-react";

export default function DriversFleet() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    vehicle_type: "car", 
    vehicle_brand: "",
    vehicle_model: "",
    vehicle_year: new Date().getFullYear(),
    vehicle_plate: "",
    vehicle_fuel: "Benzină",
    license_id: "",
    avatar_url: "", 
    image_url: "",  
    address: "",
    city: "București",
    cnp: "",        
    ci_series: "",  
    ci_number: "",
    status: "inactive",
    verification_status: "pending",
    service_type: "ride" // <--- ACESTA ESTE MARCAJUL CARE ÎI SEPARĂ
  });

  useEffect(() => { fetchDrivers(); }, []);

  async function fetchDrivers() {
    setLoading(true);
    // FILTRU CRUCIAL: Aducem DOAR pe cei care au service_type = 'ride'
    const { data } = await supabase
      .from("drivers")
      .select("*")
      .eq("service_type", "ride") 
      .order("created_at", { ascending: false });
    
    if (data) setDrivers(data);
    setLoading(false);
  }

  const handleUpload = async (e: any, field: 'avatar_url' | 'image_url') => {
    try {
      setUploading(field);
      const file = e.target.files[0];
      if (!file) return;
      const fileExt = file.name.split('.').pop();
      const path = `${field}/${Date.now()}.${fileExt}`;
      
      const { error: err } = await supabase.storage.from('ucab-food').upload(path, file);
      if (err) throw err;

      const { data } = supabase.storage.from('ucab-food').getPublicUrl(path);
      setForm(prev => ({ ...prev, [field]: data.publicUrl }));
    } catch (error: any) {
      alert("Upload failed: " + error.message);
    } finally {
      setUploading(null);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Salvăm cu service_type: 'ride' ca să nu apară la livratori
    const { error } = await supabase.from("drivers").insert([form]);
    if (!error) {
      setShowModal(false);
      resetForm();
      fetchDrivers();
    } else {
      alert("Eroare DB: " + error.message);
    }
    setLoading(false);
  }

  const resetForm = () => setForm({
    full_name: "", phone: "", vehicle_type: "car", vehicle_brand: "",
    vehicle_model: "", vehicle_year: new Date().getFullYear(),
    vehicle_plate: "", vehicle_fuel: "Benzină", license_id: "",
    avatar_url: "", image_url: "", address: "", city: "București",
    cnp: "", ci_series: "", ci_number: "", status: "inactive", 
    verification_status: "pending", service_type: "ride"
  });

  return (
    <div className="w-full min-h-screen bg-black text-white p-6 md:p-12 font-black italic uppercase">
      
      <div className="flex justify-between items-end mb-10 border-b-2 border-white/10 pb-6">
        <div>
          <h1 className="text-6xl tracking-tighter leading-none">Fleet Drivers</h1>
          <p className="text-blue-500 text-[10px] mt-2 tracking-widest italic font-bold">GESTIUNE ȘOFERI RIDE-SHARING (FĂRĂ LIVRATORI)</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 px-10 py-5 rounded-2xl text-[10px] hover:bg-white hover:text-black transition-all">
          + REGISTER RIDE DRIVER
        </button>
      </div>

      {loading && !showModal ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={50} /></div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {drivers.map((d) => (
            <div key={d.id} className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 hover:border-blue-600/40 transition-all group">
              <div className="flex flex-col md:flex-row gap-8">
                
                <div className="flex-1">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="w-20 h-20 rounded-[1.5rem] bg-zinc-900 overflow-hidden border border-white/10 shrink-0">
                      {d.avatar_url ? <img src={d.avatar_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0" /> : <User className="p-5 opacity-20 w-full h-full" />}
                    </div>
                    <div>
                      <h2 className="text-2xl tracking-tighter leading-none mb-1">{d.full_name}</h2>
                      <div className="flex flex-col gap-1">
                        <p className="text-[10px] text-zinc-500 flex items-center gap-2"><Phone size={12} className="text-blue-500"/> {d.phone}</p>
                        <p className="text-[10px] text-zinc-500 flex items-center gap-2"><Fingerprint size={12}/> CNP: {d.cnp || 'NESPECIFICAT'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                     <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <p className="text-[8px] text-zinc-600 mb-1">IDENTITATE CI</p>
                        <p className="text-[10px]">{d.ci_series} {d.ci_number}</p>
                     </div>
                     <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <p className="text-[8px] text-zinc-600 mb-1">BALANȚĂ</p>
                        <p className="text-[10px] text-green-500 font-bold">{d.wallet_balance || 0} RON</p>
                     </div>
                  </div>

                  <div className="flex gap-2">
                     <button 
                      onClick={async () => {
                        const nextStatus = d.status === 'active' ? 'inactive' : 'active';
                        await supabase.from('drivers').update({ status: nextStatus }).eq('id', d.id);
                        fetchDrivers();
                      }}
                      className={`flex-1 py-4 text-center rounded-xl text-[9px] border transition-all ${d.status === 'active' ? 'border-green-500/30 text-green-500 bg-green-500/5' : 'border-red-500/30 text-red-500 bg-red-500/5'}`}
                     >
                        {d.status}
                     </button>
                     <button onClick={async () => { if(confirm('Ștergi șoferul?')) { await supabase.from('drivers').delete().eq('id', d.id); fetchDrivers(); } }} className="p-4 bg-white/5 rounded-xl hover:text-red-500 border border-white/5 transition-colors"><Trash2 size={16}/></button>
                  </div>
                </div>

                <div className="w-full md:w-64 bg-zinc-900 rounded-[2rem] overflow-hidden border border-white/5 flex flex-col">
                   <div className="h-36 relative">
                      {d.image_url ? <img src={d.image_url} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center opacity-10"><Car size={40}/></div>}
                      <div className="absolute top-4 right-4 bg-blue-600 px-3 py-1 rounded text-[10px] font-mono shadow-2xl">
                        {d.vehicle_plate}
                      </div>
                   </div>
                   <div className="p-5">
                      <p className="text-sm italic leading-tight">{d.vehicle_brand} {d.vehicle_model}</p>
                      <p className="text-[9px] text-zinc-600 mt-1 tracking-widest">{d.vehicle_type} / {d.vehicle_year} / {d.vehicle_fuel}</p>
                   </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/98 z-50 flex items-center justify-center p-4 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="bg-[#0a0a0a] border border-white/10 w-full max-w-5xl rounded-[3rem] p-10 max-h-[90vh] overflow-y-auto no-scrollbar relative">
            <button type="button" onClick={() => setShowModal(false)} className="absolute top-8 right-8 text-zinc-500 hover:text-white"><X size={32}/></button>
            <h2 className="text-4xl mb-12 tracking-tighter italic">Înregistrare Șofer Ride</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="space-y-6">
                <p className="text-blue-500 text-[10px] tracking-[0.3em] border-b border-white/5 pb-2">PERSONAL DATA</p>
                <div className="relative w-32 h-32 bg-zinc-900 rounded-[2rem] border-2 border-dashed border-white/10 mx-auto overflow-hidden group">
                  {form.avatar_url ? <img src={form.avatar_url} className="w-full h-full object-cover" /> : <Camera className="absolute inset-0 m-auto opacity-20" />}
                  <input type="file" onChange={e => handleUpload(e, 'avatar_url')} className="absolute inset-0 opacity-0 cursor-pointer" />
                  {uploading === 'avatar_url' && <div className="absolute inset-0 bg-black/70 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>}
                </div>
                <input required placeholder="NUME COMPLET" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-xs outline-none focus:border-blue-600" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
                <input required placeholder="TELEFON" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-xs outline-none focus:border-blue-600" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                <div className="grid grid-cols-2 gap-2">
                   <input placeholder="SERIE CI" className="bg-white/5 border border-white/10 p-4 rounded-xl text-xs outline-none" value={form.ci_series} onChange={e => setForm({...form, ci_series: e.target.value})} />
                   <input placeholder="NR CI" className="bg-white/5 border border-white/10 p-4 rounded-xl text-xs outline-none" value={form.ci_number} onChange={e => setForm({...form, ci_number: e.target.value})} />
                </div>
                <input placeholder="CNP" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-xs outline-none" value={form.cnp} onChange={e => setForm({...form, cnp: e.target.value})} />
              </div>

              <div className="space-y-6">
                <p className="text-blue-500 text-[10px] tracking-[0.3em] border-b border-white/5 pb-2">VEHICLE DATA</p>
                <div className="relative w-full h-32 bg-zinc-900 rounded-[2rem] border-2 border-dashed border-white/10 overflow-hidden">
                  {form.image_url ? <img src={form.image_url} className="w-full h-full object-cover" /> : <div className="flex flex-col items-center justify-center h-full opacity-20"><Car size={32}/><p className="text-[8px] mt-2">FOTO MAȘINĂ</p></div>}
                  <input type="file" onChange={e => handleUpload(e, 'image_url')} className="absolute inset-0 opacity-0 cursor-pointer" />
                  {uploading === 'image_url' && <div className="absolute inset-0 bg-black/70 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="MARCĂ" className="bg-white/5 border border-white/10 p-4 rounded-xl text-xs" value={form.vehicle_brand} onChange={e => setForm({...form, vehicle_brand: e.target.value})} />
                  <input placeholder="MODEL" className="bg-white/5 border border-white/10 p-4 rounded-xl text-xs" value={form.vehicle_model} onChange={e => setForm({...form, vehicle_model: e.target.value})} />
                </div>
                <input required placeholder="NR. ÎNMATRICULARE" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-xs text-blue-500 font-bold" value={form.vehicle_plate} onChange={e => setForm({...form, vehicle_plate: e.target.value})} />
              </div>

              <div className="space-y-6">
                <p className="text-blue-500 text-[10px] tracking-[0.3em] border-b border-white/5 pb-2">CONFIRMATION</p>
                <input placeholder="ID PERMIS" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-xs" value={form.license_id} onChange={e => setForm({...form, license_id: e.target.value})} />
                <textarea placeholder="ADRESĂ" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-xs h-32 resize-none" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-5 rounded-2xl text-[10px] font-black hover:bg-white hover:text-black transition-all">
                  {loading ? "PROCESARE..." : "CONFIRMĂ ÎNREGISTRAREA"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
