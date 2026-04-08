"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  User, Loader2, Trash2, Edit3, X, Save,
  Battery, Upload, MapPin, Globe, Key, Eye, EyeOff
} from "lucide-react";

interface Driver {
  id: string;
  full_name: string;
  name?: string;
  phone: string;
  pin: string;
  cnp: string | null;
  vehicle_plate: string;
  avatar_url: string;
  image_url: string;
  car_image_url: string;
  wallet_balance: number;
  is_online: boolean;
  status: string;
  rating: number;
  battery_level: number;
  lat: number;
  lng: number;
  city?: string;
  service_type: string;
  created_at: string;
}

interface FormData {
  full_name: string;
  phone: string;
  pin: string;
  cnp: string;
  vehicle_plate: string;
  avatar_url: string;
  image_url: string;
  car_image_url: string;
  wallet_balance: number;
  is_online: boolean;
  status: string;
  rating: number;
  battery_level: number;
  lat: number;
  lng: number;
  [key: string]: string | number | boolean;
}

const INITIAL_FORM: FormData = {
  full_name: "", phone: "", pin: "", cnp: "", vehicle_plate: "",
  avatar_url: "", image_url: "", car_image_url: "",
  wallet_balance: 0, is_online: false, status: "idle",
  rating: 5.0, battery_level: 100,
  lat: 44.4268, lng: 26.1025,
};

const getAccessCode = (cnp: string | null): string | null => {
  if (!cnp || cnp.length < 6) return null;
  return cnp.slice(-6);
};

export default function DriversFleet() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showCnp, setShowCnp] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);

  useEffect(() => {
    fetchDrivers();

    // Realtime — statusul online/offline se actualizeaza instant
    const channel = supabase
      .channel("drivers-fleet-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "drivers" }, (payload: any) => {
        setDrivers(prev => prev.map((d: Driver) => d.id === payload.new.id ? { ...d, ...payload.new } : d));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "drivers" }, (payload: any) => {
        if (payload.new.service_type === "ride") setDrivers(prev => [payload.new, ...prev]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "drivers" }, (payload: any) => {
        setDrivers(prev => prev.filter((d: Driver) => d.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchDrivers() {
    setLoading(true);
    const { data } = await supabase
      .from("drivers").select("*")
      .eq("service_type", "ride")
      .order("created_at", { ascending: false });
    if (data) setDrivers(data);
    setLoading(false);
  }

  const toggleOnline = async (driver: Driver) => {
    const newOnline = !driver.is_online;
    await supabase.from("drivers").update({
      is_online: newOnline,
      status: newOnline ? "idle" : "offline",
    }).eq("id", driver.id);
    // Realtime actualizeaza UI automat
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(field);
    const path = `${field}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("ucab-food").upload(path, file);
    if (!error) {
      const { data } = supabase.storage.from("ucab-food").getPublicUrl(path);
      setForm(prev => ({ ...prev, [field]: data.publicUrl }));
    }
    setUploading(null);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload = { ...form, name: form.full_name, service_type: "ride" };
    const { error } = editingDriver
      ? await supabase.from("drivers").update(payload).eq("id", editingDriver.id)
      : await supabase.from("drivers").insert([payload]);

    if (!error) { setShowModal(false); setEditingDriver(null); setForm(INITIAL_FORM); fetchDrivers(); }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    await supabase.from("drivers").delete().eq("id", id);
    setDeleteConfirm(null);
  }

  return (
    <div className="w-full min-h-screen bg-[#020202] text-white p-4 md:p-10 font-black italic uppercase overflow-x-hidden">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 border-b border-white/10 pb-6 gap-4">
        <div>
          <h1 className="text-5xl md:text-7xl tracking-tighter leading-none">UCAB FLEET</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
            <p className="text-blue-500 text-[10px] tracking-[0.2em]">LIVE TRACKING SYSTEM</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] normal-case">
            <span className="text-green-500 font-bold">{drivers.filter((d: Driver) => d.is_online).length} online</span>
            <span className="text-zinc-600"> / {drivers.length} total</span>
          </span>
          <button
            onClick={() => { setEditingDriver(null); setForm(INITIAL_FORM); setShowModal(true); }}
            className="bg-blue-600 px-8 py-4 rounded-xl text-[10px] hover:bg-white hover:text-black transition-all"
          >
            + REGISTER NEW UNIT
          </button>
        </div>
      </div>

      {/* GRID */}
      {loading && !showModal ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={50} /></div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-20 text-zinc-700 text-sm tracking-widest">Niciun șofer înregistrat</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
          {drivers.map((d: Driver) => {
            const accessCode = getAccessCode(d.cnp);
            return (
              <div key={d.id} className={`group bg-[#080808] border ${d.is_online ? "border-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.08)]" : "border-white/5"} rounded-[2.5rem] p-5 transition-all hover:bg-zinc-950`}>
                <div className="flex flex-col gap-5">

                  {/* TOP: AVATAR + MAP */}
                  <div className="flex gap-4">
                    <div className="relative shrink-0">
                      <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden">
                        {d.avatar_url
                          ? <img src={d.avatar_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt={d.full_name} />
                          : <User className="p-5 opacity-20 w-full h-full" />
                        }
                      </div>
                      <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-4 border-[#080808] transition-all ${d.is_online ? "bg-green-500 animate-pulse" : "bg-zinc-700"}`} />
                    </div>

                    <div className="flex-1 h-20 bg-zinc-900 rounded-2xl overflow-hidden border border-white/5">
                      {d.is_online && d.lat && d.lng ? (
                        <iframe
                          className="w-full h-full opacity-50 grayscale hover:opacity-100 transition-all"
                          src={`https://maps.google.com/maps?q=${d.lat},${d.lng}&z=14&output=embed`}
                          frameBorder="0"
                          title={`Map ${d.full_name}`}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700">
                          <Globe size={16} />
                          <span className="text-[7px] mt-1">OFFLINE</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DETAILS */}
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h2 className="text-xl tracking-tighter text-white/90 group-hover:text-blue-500 transition-colors leading-none">
                          {d.full_name || d.name}
                        </h2>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <span className={`text-[8px] px-2 py-0.5 rounded font-bold transition-all ${d.is_online ? "bg-green-500/20 text-green-400" : "bg-white/5 text-zinc-600"}`}>
                            {d.is_online ? `● ${(d.status || "idle").toUpperCase()}` : "● OFFLINE"}
                          </span>
                          <span className="flex items-center gap-1 text-[8px] bg-white/5 px-2 py-0.5 rounded text-zinc-400 font-bold">
                            <Battery size={8} className={d.battery_level < 20 ? "text-red-500" : "text-green-500"} />
                            {d.battery_level || 100}%
                          </span>
                          {d.city && (
                            <span className="flex items-center gap-1 text-[8px] bg-white/5 px-2 py-0.5 rounded text-zinc-400 font-bold uppercase">
                              <MapPin size={8} className="text-blue-500" /> {d.city}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[12px] text-blue-500 leading-none">{d.wallet_balance} RON</p>
                        <p className="text-[7px] text-zinc-600 mt-1 uppercase">Balance</p>
                      </div>
                    </div>

                    {/* COD ACCES */}
                    {accessCode && (
                      <div className="bg-blue-600/10 border border-blue-600/20 rounded-2xl p-3 mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Key size={12} className="text-blue-500" />
                          <span className="text-[8px] text-blue-400 font-black uppercase tracking-widest">Cod Acces App</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-black font-mono tracking-[0.3em] ${showCnp === d.id ? "text-blue-500" : "text-zinc-700"}`}>
                            {showCnp === d.id ? accessCode : "••••••"}
                          </span>
                          <button onClick={() => setShowCnp(showCnp === d.id ? null : d.id)} className="text-zinc-600 hover:text-blue-500 transition-colors">
                            {showCnp === d.id ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ACTIONS */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <p className="text-[7px] text-zinc-600">PLATE</p>
                        <p className="text-[10px]">{d.vehicle_plate || "N/A"}</p>
                      </div>
                      {/* TOGGLE ONLINE */}
                      <button
                        onClick={() => toggleOnline(d)}
                        className={`rounded-xl flex items-center justify-center text-[9px] font-black transition-all border ${d.is_online ? "bg-green-600/20 border-green-600/30 text-green-400 hover:bg-red-600/20 hover:border-red-600/30 hover:text-red-400" : "bg-white/5 border-white/5 text-zinc-600 hover:bg-green-600/20 hover:border-green-600/30 hover:text-green-400"}`}
                        title={d.is_online ? "Deconectează" : "Conectează"}
                      >
                        {d.is_online ? "ON" : "OFF"}
                      </button>
                      <button
                        onClick={() => { setEditingDriver(d); setForm({ ...INITIAL_FORM, ...d, cnp: d.cnp || "" }); setShowModal(true); }}
                        className="bg-white/5 rounded-xl flex items-center justify-center hover:bg-blue-600 transition-all"
                      >
                        <Edit3 size={14} />
                      </button>
                      {deleteConfirm === d.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleDelete(d.id)} className="flex-1 bg-red-600 rounded-xl flex items-center justify-center text-white text-[10px]">✓</button>
                          <button onClick={() => setDeleteConfirm(null)} className="flex-1 bg-zinc-800 rounded-xl flex items-center justify-center"><X size={10} /></button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(d.id)} className="bg-red-600/10 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex justify-center items-center p-4 md:p-8">
          <div className="bg-[#050505] border border-white/10 p-6 md:p-12 rounded-[3rem] w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-blue-900/20">

            <div className="flex justify-between items-center mb-10 sticky top-0 bg-[#050505] z-10 py-2 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${form.is_online ? "bg-green-500 shadow-[0_0_10px_green]" : "bg-red-500"}`} />
                <h2 className="text-3xl md:text-5xl tracking-tighter uppercase italic">Control Panel</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="bg-white/5 p-3 rounded-full hover:rotate-90 transition-all"><X size={32} /></button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* LEFT */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {[{ label: "Avatar", field: "avatar_url" }, { label: "Vehicle", field: "car_image_url" }].map((img) => (
                    <div key={img.field} className="aspect-square bg-white/5 rounded-3xl border-2 border-dashed border-white/10 relative overflow-hidden flex flex-col items-center justify-center cursor-pointer">
                      {form[img.field] ? <img src={form[img.field] as string} className="w-full h-full object-cover" alt={img.label} /> : <>{uploading === img.field ? <Loader2 className="animate-spin text-blue-500" /> : <Upload className="text-zinc-600" />}<span className="text-[8px] mt-2 text-zinc-500">{img.label}</span></>}
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpload(e, img.field)} />
                    </div>
                  ))}
                </div>

                {/* MAP */}
                <div className="bg-zinc-900 rounded-[2rem] h-48 border border-white/5 overflow-hidden relative">
                  <div className="absolute top-3 left-3 z-10 bg-black/80 px-3 py-1.5 rounded-xl border border-white/10 flex gap-3 text-[9px]">
                    <span className="text-zinc-500">LAT <span className="text-white">{Number(form.lat).toFixed(4)}</span></span>
                    <span className="text-zinc-500">LNG <span className="text-white">{Number(form.lng).toFixed(4)}</span></span>
                  </div>
                  <iframe className="w-full h-full grayscale opacity-70" src={`https://maps.google.com/maps?q=${form.lat},${form.lng}&z=15&output=embed`} frameBorder="0" title="Location" />
                </div>

                {/* CNP */}
                <div className="space-y-2">
                  <label className="text-[8px] text-zinc-500 block uppercase tracking-widest">CNP</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-sm font-mono outline-none focus:border-blue-600"
                    value={form.cnp as string}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, cnp: e.target.value })}
                    placeholder="1234567890123"
                    maxLength={13}
                  />
                  {(form.cnp as string).length >= 6 && (
                    <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-3 flex items-center gap-3">
                      <Key size={14} className="text-blue-500" />
                      <span className="text-[9px] text-blue-400 uppercase tracking-widest">Cod acces:</span>
                      <span className="text-sm font-black font-mono text-blue-500 tracking-[0.3em]">
                        {getAccessCode(form.cnp as string)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT */}
              <div className="space-y-6">
                <div className="flex gap-4 items-center bg-white/5 p-6 rounded-3xl border border-white/5">
                  <div className="flex-1">
                    <p className="text-[10px] text-blue-500">Toggle connectivity</p>
                    <p className="text-xl italic font-black uppercase">{form.is_online ? "Status: Online" : "Status: Offline"}</p>
                  </div>
                  <button type="button" onClick={() => setForm({ ...form, is_online: !form.is_online, status: !form.is_online ? "idle" : "offline" })} className={`px-8 py-3 rounded-xl text-[10px] transition-all border ${form.is_online ? "bg-green-600 border-green-400" : "bg-zinc-800 border-white/10"}`}>
                    {form.is_online ? "DISCONNECT" : "AUTHORIZE"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 uppercase">
                  {[
                    { label: "Full Name *", field: "full_name", required: true },
                    { label: "Phone *", field: "phone", required: true },
                    { label: "Plate Number", field: "vehicle_plate", upper: true },
                    { label: "Pin Access", field: "pin", mono: true },
                  ].map(({ label, field, required, upper, mono }) => (
                    <div key={field}>
                      <label className="text-[8px] text-zinc-500 mb-1 block">{label}</label>
                      <input
                        className={`w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-sm outline-none focus:border-blue-600 ${mono ? "font-mono" : ""}`}
                        value={form[field] as string}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: upper ? e.target.value.toUpperCase() : e.target.value })}
                        required={required}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-[8px] text-zinc-500 mb-1 block">Latitude</label>
                    <input type="number" step="0.0001" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-sm outline-none focus:border-blue-600" value={form.lat as number} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, lat: parseFloat(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-[8px] text-zinc-500 mb-1 block">Longitude</label>
                    <input type="number" step="0.0001" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-sm outline-none focus:border-blue-600" value={form.lng as number} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, lng: parseFloat(e.target.value) })} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <label className="text-[7px] text-zinc-600 block mb-1">BATTERY %</label>
                    <input type="number" min="0" max="100" className="bg-transparent w-full outline-none text-xl" value={form.battery_level as number} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, battery_level: parseInt(e.target.value) })} />
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <label className="text-[7px] text-zinc-600 block mb-1">RATING</label>
                    <input type="number" step="0.1" min="1" max="5" className="bg-transparent w-full outline-none text-xl" value={form.rating as number} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, rating: parseFloat(e.target.value) })} />
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <label className="text-[7px] text-zinc-600 block mb-1">WALLET</label>
                    <input type="number" step="0.01" className="bg-transparent w-full outline-none text-xl text-blue-500" value={form.wallet_balance as number} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, wallet_balance: parseFloat(e.target.value) })} />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full bg-blue-600 py-6 rounded-[2rem] text-xl hover:bg-white hover:text-black transition-all flex justify-center items-center gap-4 disabled:opacity-50">
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