"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Car, User, Loader2, Trash2, Camera, Power, Zap, Phone, X, 
  UploadCloud, CreditCard, FileText, Fingerprint, Star, Briefcase
} from "lucide-react";

export default function UcabRide() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    vehicle_type: "Standard",
    vehicle_brand: "",
    vehicle_model: "",
    vehicle_year: new Date().getFullYear(),
    vehicle_plate: "",
    vehicle_fuel: "Benzină",
    license_id: "",
    avatar_url: "", // Poza Șofer
    car_image_url: "", // Poza Mașină
    ci_series: "",
    ci_number: "",
    cnp: "",
    address: ""
  });

  useEffect(() => { fetchFleet(); }, []);

  async function fetchFleet() {
    setLoading(true);
    const { data } = await supabase.from("drivers").select("*").order("created_at", { ascending: false });
    if (data) setDrivers(data);
    setLoading(false);
  }

  const handleFileUpload = async (e: any, type: 'avatar_url' | 'car_image_url') => {
    try {
      setUploading(type);
      const file = e.target.files[0];
      if (!file) return;
      const filePath = `${type}/${Math.random()}.${file.name.split('.').pop()}`;
      
      const { error: uploadError } = await supabase.storage.from('ucab-food').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('ucab-food').getPublicUrl(filePath);
      setForm(prev => ({ ...prev, [type]: data.publicUrl }));
    } catch (error) {
      alert("Upload failed");
    } finally {
      setUploading(null);
    }
  };

  async function registerDriver(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("drivers").insert([form]);
    if (!error) { setShowModal(false); resetForm(); fetchFleet(); }
    setLoading(false);
  }

  const resetForm = () => setForm({
    name: "", phone: "", vehicle_type: "Standard", vehicle_brand: "",
    vehicle_model: "", vehicle_year: new Date().getFullYear(),
    vehicle_plate: "", vehicle_fuel: "Benzină", license_id: "", avatar_url: "",
    car_image_url: "", ci_series: "", ci_number: "", cnp: "", address: ""
  });

  async function updateStatus(id: string, field: string, value: any) {
    await supabase.from("drivers").update({ [field]: value }).eq("id", id);
    fetchFleet();
  }

  async function deleteDriver(id: string) {
    if(confirm("Stergeti unitatea?")) {
        await supabase.from("drivers").delete().eq("id", id);
        fetchFleet();
    }
  }

  return (
    <div className="w-full bg-black font-black italic uppercase p-4 md:p-10 text-white">
      
      <div className="flex justify-between items-center mb-12 border-b-2 border-white/10 pb-8">
        <h2 className="text-6xl tracking-tighter italic">Fleet Hub</h2>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 px-8 py-4 rounded-xl text-[10px] hover:bg-white hover:text-black transition-all">
          + REGISTER UNIT
        </button>
      </div>

      {loading && !showModal ? (
        <Loader2 className="animate-spin mx-auto text-blue-600" size={40} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {drivers.map((driver) => (
            <div key={driver.id} className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-8 group hover:border-blue-600/50 transition-all">
              <div className="flex flex-col lg:flex-row gap-8">
                
                {/* INFO SOFER */}
                <div className="flex-1">
                  <div className="flex items-center gap-6 mb-8">
                    <div className="w-24 h-24 bg-zinc-900 rounded-[2rem] overflow-hidden border border-white/10">
                      {driver.avatar_url ? <img src={driver.avatar_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0" /> : <User className="w-full h-full p-6 text-zinc-800" />}
                    </div>
                    <div>
                      <h3 className="text-3xl tracking-tighter leading-none mb-2">{driver.name}</h3>
                      <div className="flex gap-4 text-[10px] text-zinc-500">
                        <span className="flex items-center gap-2"><Phone size={12}/> {driver.phone}</span>
                        <span className="flex items-center gap-2"><Fingerprint size={12}/> {driver.cnp || '---'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[8px] text-zinc-600 mb-1">BALANCE</p>
                      <p className="text-xl text-green-500">{driver.wallet_balance || 0} RON</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[8px] text-zinc-600 mb-1">DOCUMENTS</p>
                      <p className="text-[10px]">{driver.ci_series} {driver.ci_number} / {driver.license_id || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => updateStatus(driver.id, 'status', driver.status === 'active' ? 'inactive' : 'active')} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-3">
                      <Power size={16} className={driver.status === 'active' ? 'text-green-500' : 'text-red-500'} /> {driver.status}
                    </button>
                    <button onClick={() => deleteDriver(driver.id)} className="p-4 bg-white/5 border border-white/10 rounded-xl hover:text-red-500"><Trash2 size={18} /></button>
                  </div>
                </div>

                {/* INFO MASINA CU POZA */}
                <div className="w-full lg:w-80 bg-[#111] border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col">
                  <div className="h-40 bg-zinc-900 relative">
                    {driver.car_image_url ? (
                      <img src={driver.car_image_url} className="w-full h-full object-cover" />
                    ) : (
                      <Car className="w-full h-full p-12 text-white/5" />
                    )}
                    <div className="absolute top-4 right-4 bg-blue-600 px-3 py-1 rounded text-[10px] font-mono shadow-xl">
                      {driver.vehicle_plate}
                    </div>
                  </div>
                  <div className="p-6">
                    <h4 className="text-xl italic leading-none mb-1">{driver.vehicle_brand} {driver.vehicle_model}</h4>
                    <p className="text-[9px] text-zinc-600 tracking-[0.2em]">{driver.vehicle_type} / {driver.vehicle_fuel} / {driver.vehicle_year}</p>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CU DOUA POZE */}
      {showModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <form onSubmit={registerDriver} className="bg-[#0a0a0a] border border-white/10 w-full max-w-5xl rounded-[3rem] p-10 max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 p-3 bg-white/5 rounded-full hover:bg-red-500 transition-all"><X /></button>
            
            <h2 className="text-4xl mb-12 italic tracking-tighter">New Fleet Entry</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              
              {/* COLOANA 1: FOTO SOFER */}
              <div className="space-y-6 text-center">
                <p className="text-blue-500 text-[10px] tracking-widest border-b border-white/5 pb-2">01. DRIVER_PHOTO</p>
                <label className="block w-full aspect-square bg-zinc-900 border-2 border-dashed border-white/10 rounded-[3rem] cursor-pointer overflow-hidden group hover:border-blue-500 transition-all relative">
                    {form.avatar_url ? <img src={form.avatar_url} className="w-full h-full object-cover" /> : 
                    <div className="h-full flex flex-col items-center justify-center opacity-30 group-hover:opacity-100">
                        {uploading === 'avatar_url' ? <Loader2 className="animate-spin" /> : <Camera size={40} />}
                        <span className="text-[8px] mt-2">UPLOAD FACE</span>
                    </div>}
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'avatar_url')} />
                </label>
                <input required placeholder="FULL NAME" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-[11px]" onChange={e => setForm({...form, name: e.target.value})} />
              </div>

              {/* COLOANA 2: FOTO MASINA */}
              <div className="space-y-6 text-center">
                <p className="text-blue-500 text-[10px] tracking-widest border-b border-white/5 pb-2">02. VEHICLE_PHOTO</p>
                <label className="block w-full aspect-square bg-zinc-900 border-2 border-dashed border-white/10 rounded-[3rem] cursor-pointer overflow-hidden group hover:border-blue-500 transition-all relative">
                    {form.car_image_url ? <img src={form.car_image_url} className="w-full h-full object-cover" /> : 
                    <div className="h-full flex flex-col items-center justify-center opacity-30 group-hover:opacity-100">
                        {uploading === 'car_image_url' ? <Loader2 className="animate-spin" /> : <Car size={40} />}
                        <span className="text-[8px] mt-2">UPLOAD CAR</span>
                    </div>}
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'car_image_url')} />
                </label>
                <input required placeholder="PLATE NUMBER" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-[11px] text-blue-500 font-mono" onChange={e => setForm({...form, vehicle_plate: e.target.value.toUpperCase()})} />
              </div>

              {/* COLOANA 3: DOCS & TECH */}
              <div className="space-y-4">
                <p className="text-blue-500 text-[10px] tracking-widest border-b border-white/5 pb-2">03. DATA_CREDENTIALS</p>
                <div className="flex gap-2">
                    <input required placeholder="SERIE" className="w-20 bg-white/5 border border-white/10 p-5 rounded-2xl text-[11px]" maxLength={2} onChange={e => setForm({...form, ci_series: e.target.value.toUpperCase()})} />
                    <input required placeholder="CI_NUMBER" className="flex-1 bg-white/5 border border-white/10 p-5 rounded-2xl text-[11px]" onChange={e => setForm({...form, ci_number: e.target.value})} />
                </div>
                <input required placeholder="CNP" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-[11px]" maxLength={13} onChange={e => setForm({...form, cnp: e.target.value})} />
                <input required placeholder="LICENSE_ID" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-[11px]" onChange={e => setForm({...form, license_id: e.target.value})} />
                <input required placeholder="PHONE" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-[11px]" onChange={e => setForm({...form, phone: e.target.value})} />
                
                <button type="submit" disabled={loading || !!uploading} className="w-full bg-blue-600 py-8 rounded-[2rem] font-black text-[12px] hover:bg-white hover:text-black transition-all mt-6 disabled:opacity-50">
                    DEPLOY OPERATIONAL UNIT
                </button>
              </div>

            </div>
          </form>
        </div>
      )}
    </div>
  );
}
