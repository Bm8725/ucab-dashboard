"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Car, User, Loader2, Trash2, Camera, Power, Phone, X, 
  Fingerprint, Shield, UploadCloud, Copy, Check, ExternalLink, Edit3, Save
} from "lucide-react";

export default function DriversFleet() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingDriver, setEditingDriver] = useState<any | null>(null);

  const initialForm = {
    full_name: "", phone: "", vehicle_type: "car", vehicle_brand: "",
    vehicle_model: "", vehicle_year: new Date().getFullYear(),
    vehicle_plate: "", vehicle_fuel: "Benzină", license_id: "",
    avatar_url: "", image_url: "", address: "", city: "București",
    cnp: "", ci_series: "", ci_number: "", status: "inactive", 
    verification_status: "pending", service_type: "ride"
  };

  const [form, setForm] = useState(initialForm);

  useEffect(() => { fetchDrivers(); }, []);

  async function fetchDrivers() {
    setLoading(true);
    const { data } = await supabase
      .from("drivers")
      .select("*")
      .eq("service_type", "ride") 
      .order("created_at", { ascending: false });
    
    if (data) setDrivers(data);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Ești sigur că vrei să ștergi definitiv acest pilot din sistem?")) return;
    const { error } = await supabase.from("drivers").delete().eq("id", id);
    if (!error) {
      setDrivers(drivers.filter(d => d.id !== id));
    } else {
      alert("Eroare la ștergere: " + error.message);
    }
  }

  function openEditModal(driver: any) {
    setEditingDriver(driver);
    setForm(driver);
    setShowModal(true);
  }

  const handleCopyUrl = (id: string) => {
    const url = `${window.location.origin}/admin/drivers/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    try {
      setUploading(field);
      const file = e.target.files?.[0];
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

    if (editingDriver) {
      const { error } = await supabase.from("drivers").update(form).eq("id", editingDriver.id);
      if (!error) {
        setShowModal(false);
        setEditingDriver(null);
        setForm(initialForm);
        fetchDrivers();
      } else {
        alert("Eroare Update: " + error.message);
      }
    } else {
      const { error } = await supabase.from("drivers").insert([form]);
      if (!error) {
        setShowModal(false);
        setForm(initialForm);
        fetchDrivers();
      } else {
        alert("Eroare DB: " + error.message);
      }
    }
    setLoading(false);
  }

  return (
    <div className="w-full min-h-screen bg-black text-white p-6 md:p-12 font-black italic uppercase leading-none">
      
      {/* HEADER */}
      <div className="flex justify-between items-end mb-10 border-b-2 border-white/10 pb-6">
        <div>
          <h1 className="text-6xl tracking-tighter uppercase">ucab Drivers</h1>
          <p className="text-blue-500 text-[10px] mt-2 tracking-widest italic font-bold">GESTIUNE ȘOFERI RIDE-SHARING</p>
        </div>
        <button 
          onClick={() => { setEditingDriver(null); setForm(initialForm); setShowModal(true); }} 
          className="bg-blue-600 px-10 py-5 rounded-2xl text-[10px] hover:bg-white hover:text-black transition-all shadow-[0_0_30px_rgba(37,99,235,0.4)]"
        >
          + REGISTER NEW PILOT UCAB
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
                      {d.avatar_url ? <img src={d.avatar_url} className="w-full h-full object-cover" alt="avatar" /> : <User className="p-5 opacity-20 w-full h-full" />}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl tracking-tighter leading-none mb-1">{d.full_name}</h2>
                      <div className="text-[10px] text-zinc-500 flex items-center gap-2 mb-3 lowercase font-bold italic">
                        <Phone size={12} className="text-blue-500" /> {d.phone}
                      </div>
                      
                      <div className="bg-blue-600/10 border border-blue-600/20 p-2 rounded-xl flex items-center justify-between">
                         <span className="text-[8px] text-blue-400 font-mono lowercase truncate pr-4">/admin/drivers/{d.id}</span>
                         <div className="flex gap-2">
                            <button onClick={() => handleCopyUrl(d.id)} className="p-2 bg-blue-600/20 rounded-lg hover:bg-blue-600 transition-all">
                              {copiedId === d.id ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                            <a href={`/admin/drivers/${d.id}`} target="_blank" className="p-2 bg-zinc-800 rounded-lg hover:bg-white hover:text-black transition-all">
                              <ExternalLink size={12} />
                            </a>
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6 font-black italic">
                     <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <p className="text-[8px] text-zinc-600 mb-1 tracking-widest uppercase">CI DATA</p>
                        <p className="text-[10px]">{d.ci_series} {d.ci_number}</p>
                     </div>
                     <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <p className="text-[8px] text-zinc-600 mb-1 tracking-widest uppercase">WALLET</p>
                        <p className="text-[10px] text-green-500">{d.wallet_balance || 0} RON</p>
                     </div>
                  </div>

                  <div className="flex gap-2">
                     <button onClick={() => openEditModal(d)} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2">
                        <Edit3 size={14} /> EDIT_PILOT
                     </button>
                     <button onClick={() => handleDelete(d.id)} className="p-4 bg-red-600/10 border border-red-600/20 rounded-xl text-red-500 hover:bg-red-600 hover:text-white transition-all">
                        <Trash2 size={14} />
                     </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL SYSTEM */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/80">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-2xl rounded-[3rem] p-8 max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-all">
              <X size={30} />
            </button>
            
            <h2 className="text-4xl mb-8 tracking-tighter">
              {editingDriver ? 'Update Pilot' : 'New Registration'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <p className="text-[8px] text-blue-500 tracking-[0.3em] font-black">Personal_Details</p>
                  <input required placeholder="Nume Complet" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:border-blue-600 outline-none transition-all" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
                  <input required placeholder="Telefon" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:border-blue-600 outline-none transition-all" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                  <input placeholder="CNP" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:border-blue-600 outline-none transition-all" value={form.cnp} onChange={e => setForm({...form, cnp: e.target.value})} />
                </div>

                <div className="space-y-4">
                  <p className="text-[8px] text-blue-500 tracking-[0.3em] font-black">Vehicle_Info</p>
                  <input placeholder="Marcă Auto" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:border-blue-600 outline-none transition-all" value={form.vehicle_brand} onChange={e => setForm({...form, vehicle_brand: e.target.value})} />
                  <input placeholder="Model Auto" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:border-blue-600 outline-none transition-all" value={form.vehicle_model} onChange={e => setForm({...form, vehicle_model: e.target.value})} />
                  <input placeholder="Număr Înmatriculare" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:border-blue-600 outline-none transition-all" value={form.vehicle_plate} onChange={e => setForm({...form, vehicle_plate: e.target.value})} />
                </div>
              </div>

              <div className="pt-6">
                <button type="submit" className="w-full bg-blue-600 py-6 rounded-3xl font-black text-xs tracking-[0.5em] hover:bg-white hover:text-black transition-all flex items-center justify-center gap-4 shadow-2xl">
                  {loading ? <Loader2 className="animate-spin" /> : <><Save size={18} /> CONFIRM_DATA_UPLOAD</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
