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
  const [uploading, setUploading] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [editingDriver, setEditingDriver] = useState(null);

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

  // --- LOGICĂ ȘTERGERE ---
async function handleDelete(id: string) {

    if (!confirm("Ești sigur că vrei să ștergi definitiv acest pilot din sistem?")) return;
    
    const { error } = await supabase.from("drivers").delete().eq("id", id);
    if (!error) {
      setDrivers(drivers.filter(d => d.id !== id));
    } else {
      alert("Eroare la ștergere: " + error.message);
    }
  }

  // --- LOGICĂ EDITARE ---
  function openEditModal(driver) {
    setEditingDriver(driver);
    setForm(driver);
    setShowModal(true);
  }

  const handleCopyUrl = (id) => {
    const url = `${window.location.origin}/admin/drivers/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpload = async (e, field) => {
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
    } catch (error) {
      alert("Upload failed: " + error.message);
    } finally {
      setUploading(null);
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    if (editingDriver) {
      // UPDATE
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
      // INSERT (NEW)
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
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-end mb-10 border-b-2 border-white/10 pb-6">
        <div>
          <h1 className="text-6xl tracking-tighter uppercase">Fleet Drivers</h1>
          <p className="text-blue-500 text-[10px] mt-2 tracking-widest italic font-bold">GESTIUNE ȘOFERI RIDE-SHARING</p>
        </div>
        <button 
          onClick={() => { setEditingDriver(null); setForm(initialForm); setShowModal(true); }} 
          className="bg-blue-600 px-10 py-5 rounded-2xl text-[10px] hover:bg-white hover:text-black transition-all"
        >
          + REGISTER NEW PILOT
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
                      <div className="text-[10px] text-zinc-500 flex items-center gap-2 mb-3 lowercase font-bold">
                        <Phone size={12} className="text-blue-500" /> {d.phone}
                      </div>
                      
                      {/* URL BOX */}
                      <div className="bg-blue-600/10 border border-blue-600/20 p-2 rounded-xl flex items-center justify-between">
                         <span className="text-[8px] text-blue-400 font-mono lowercase truncate pr-4">/fleet/{d.id}</span>
                         <div className="flex gap-2">
                            <button onClick={() => handleCopyUrl(d.id)} className="p-2 bg-blue-600/20 rounded-lg hover:bg-blue-600 transition-all">
                              {copiedId === d.id ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                            <a href={`/fleet/${d.id}`} target="_blank" className="p-2 bg-zinc-800 rounded-lg hover:bg-white hover:text-black transition-all">
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

                  {/* ACTION BAR */}
                  <div className="flex gap-2">
                     <button 
                        onClick={() => openEditModal(d)}
                        className="flex-1 py-4 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2"
                     >
                        <Edit3 size={14} /> EDIT_PILOT
                     </button>
                     <button 
                        onClick={() => handleDelete(d.id)}
                        className="p-4 bg-red-600/10 border border-red-600/20 rounded-xl text-red-500 hover:bg-red-600 hover:text-white transition-all"
                     >
                        <Trash2 size={18}/>
                     </button>
                  </div>
                </div>

                {/* VEHICLE INFO CARD */}
                <div className="w-full md:w-64 bg-zinc-900 rounded-[2rem] overflow-hidden border border-white/5 flex flex-col group/car">
                   <div className="h-36 relative">
                      {d.image_url ? <img src={d.image_url} className="w-full h-full object-cover" alt="vehicle" /> : <div className="h-full flex items-center justify-center opacity-10 bg-black"><Car size={40}/></div>}
                      <div className="absolute top-4 right-4 bg-blue-600 px-3 py-1 rounded text-[10px] font-mono shadow-2xl">
                        {d.vehicle_plate}
                      </div>
                   </div>
                   <div className="p-5 bg-white/5">
                      <p className="text-sm italic font-black uppercase tracking-tighter">{d.vehicle_brand} {d.vehicle_model}</p>
                      <p className="text-[9px] text-zinc-600 mt-1 tracking-widest uppercase">{d.vehicle_year} • {d.vehicle_fuel}</p>
                   </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL (ADD & EDIT) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/98 z-50 flex items-center justify-center p-4 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="bg-[#0a0a0a] border border-white/10 w-full max-w-5xl rounded-[3rem] p-10 max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
             <div className="flex justify-between items-center mb-10">
                <h2 className="text-4xl tracking-tighter uppercase italic font-black">
                   {editingDriver ? "Edit_System_Pilot" : "New_Pilot_Onboarding"}
                </h2>
                <button type="button" onClick={() => setShowModal(false)} className="p-4 hover:rotate-90 transition-all"><X size={32}/></button>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* PILOT DATA */}
                <div className="space-y-6">
                   <p className="text-blue-500 text-[10px] tracking-widest border-b border-white/5 pb-2">PERSONAL_DATA</p>
                   <input required placeholder="FULL NAME" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value.toUpperCase()})} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-blue-600 text-xs font-black italic" />
                   <input required placeholder="PHONE" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none font-mono" />
                   <div className="grid grid-cols-2 gap-4 h-24">
                      <label className="border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-blue-600/5">
                        {uploading === 'avatar_url' ? <Loader2 className="animate-spin text-blue-600" /> : <Camera size={20} className="opacity-20" />}
                        <input type="file" className="hidden" onChange={e => handleUpload(e, 'avatar_url')} />
                      </label>
                      <div className="bg-zinc-900 rounded-2xl overflow-hidden">
                        {form.avatar_url && <img src={form.avatar_url} className="w-full h-full object-cover" />}
                      </div>
                   </div>
                </div>

                {/* VEHICLE DATA */}
                <div className="space-y-6">
                   <p className="text-blue-500 text-[10px] tracking-widest border-b border-white/5 pb-2">VEHICLE_SPECS</p>
                   <input required placeholder="PLATE NUMBER" value={form.vehicle_plate} onChange={e => setForm({...form, vehicle_plate: e.target.value.toUpperCase()})} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none font-mono text-blue-500" />
                   <div className="grid grid-cols-2 gap-4">
                      <input placeholder="BRAND" value={form.vehicle_brand} onChange={e => setForm({...form, vehicle_brand: e.target.value.toUpperCase()})} className="bg-white/5 border border-white/10 p-5 rounded-2xl outline-none text-xs" />
                      <input placeholder="MODEL" value={form.vehicle_model} onChange={e => setForm({...form, vehicle_model: e.target.value.toUpperCase()})} className="bg-white/5 border border-white/10 p-5 rounded-2xl outline-none text-xs" />
                   </div>
                   <label className="flex items-center gap-4 bg-white/5 border border-white/10 p-5 rounded-2xl cursor-pointer hover:bg-blue-600 transition-all group">
                      <UploadCloud size={20} className="text-blue-500 group-hover:text-white" />
                      <span className="text-[10px] font-black uppercase">Upload_Car_Photo</span>
                      <input type="file" className="hidden" onChange={e => handleUpload(e, 'image_url')} />
                   </label>
                </div>

                {/* FINISH */}
                <div className="space-y-6">
                   <p className="text-blue-500 text-[10px] tracking-widest border-b border-white/5 pb-2">SYSTEM_ACTION</p>
                   <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10">
                      <p className="text-[8px] opacity-40 mb-4 tracking-[0.2em]">Pilotul va fi salvat cu service_type: RIDE</p>
                      <button 
                        disabled={loading || uploading}
                        type="submit" 
                        className="w-full bg-blue-600 py-8 rounded-[2rem] text-xs font-black tracking-[0.3em] shadow-2xl shadow-blue-600/30 hover:bg-white hover:text-black transition-all flex items-center justify-center gap-4"
                      >
                        {loading ? <Loader2 className="animate-spin" /> : editingDriver ? <Save size={18} /> : "DEPLOY_PILOT"}
                        {editingDriver ? "UPDATE_DATA" : "REGISTER_PILOT"}
                      </button>
                   </div>
                </div>
             </div>
          </form>
        </div>
      )}
    </div>
  );
}
