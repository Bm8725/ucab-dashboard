"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Bike, Search, Flag, Camera, Plus, X,
  Trash2, Edit3, Settings2, Loader2, DollarSign,
  Package, Battery, Phone, Key, ChevronDown,
  ChevronUp, Check, AlertCircle, Eye, EyeOff
} from "lucide-react";
import Link from "next/link";

// ─── TIPURI ──────────────────────────────────────────────────────────────────
interface Driver {
  id: string;
  full_name: string;
  phone: string;
  country: string;
  county: string;
  city: string;
  vehicle_type: string;
  image_url: string;
  is_online: boolean;
  status: string;
  cnp: string | null;
  app_id: string | null;
  battery_level: number | null;
  wallet_balance: number | null;
  created_at: string;
  service_type: string;
}

interface Order {
  id: string;
  driver_id: string;
  status: string;
  total_amount: number;
  restaurant_name: string;
  delivery_address: string;
  customer_name: string;
  created_at: string;
}

const EMPTY_FORM = {
  full_name: "", phone: "", country: "România",
  county: "", city: "", vehicle_type: "bike",
  image_url: "", is_online: false, status: "idle",
  cnp: "", service_type: "delivery",
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export default function UcabGlobalFleet() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [showCnp, setShowCnp] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ─── FETCH ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchData();
    const channel = supabase.channel("global-fleet-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchData() {
    const { data: d } = await supabase
      .from("drivers").select("*")
      .eq("service_type", "delivery")
      .order("created_at", { ascending: false });
    const { data: o } = await supabase
      .from("orders").select("*")
      .not("driver_id", "is", null)
      .in("status", ["picked_up", "ready", "confirmed", "preparing", "delivered"])
      .order("created_at", { ascending: false });
    setDrivers(d || []);
    setOrders(o || []);
  }

  // ─── STATS ──────────────────────────────────────────────────────────────
  const getStats = (driverId: string) => {
    const mine = orders.filter((o: Order) => o.driver_id === driverId);
    const completed = mine.filter((o: Order) => o.status === "delivered").length;
    const active = mine.filter((o: Order) => ["picked_up", "ready"].includes(o.status)).length;
    const earnings = completed * 15;
    return { completed, active, earnings };
  };

  const getActiveOrders = (driverId: string) =>
    orders.filter((o: Order) => o.driver_id === driverId && o.status !== "delivered");

  // ─── CNP ACCESS CODE ────────────────────────────────────────────────────
  // Codul de acces = ultimele 6 cifre din CNP
  const getAccessCode = (cnp: string | null) => {
    if (!cnp || cnp.length < 6) return "N/A";
    return cnp.slice(-6);
  };

  // ─── UPLOAD ─────────────────────────────────────────────────────────────
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;
      const ext = file.name.split(".").pop();
      const path = `avatars/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("ucab-food").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("ucab-food").getPublicUrl(path);
      setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
    } catch (err: any) {
      alert("EROARE UPLOAD: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  // ─── SAVE ────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!formData.full_name || !formData.city) return alert("Completează cel puțin Nume și Oraș!");
    setSaving(true);
    if (editingId) {
      await supabase.from("drivers").update(formData).eq("id", editingId);
      setEditingId(null);
    } else {
      const appId = `UCAB-${Math.floor(1000 + Math.random() * 9000)}`;
      await supabase.from("drivers").insert([{ ...formData, app_id: appId }]);
    }
    setShowForm(false);
    setFormData(EMPTY_FORM);
    setSaving(false);
    fetchData();
  }

  // ─── DELETE ──────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    await supabase.from("drivers").delete().eq("id", id);
    setDeleteConfirm(null);
  }

  // ─── FILTRARE + GRUPARE ──────────────────────────────────────────────────
  const filtered = drivers.filter((d: Driver) =>
    d.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.city?.toLowerCase().includes(search.toLowerCase()) ||
    d.phone?.includes(search)
  );

  const grouped = filtered.reduce((acc: Record<string, Record<string, Record<string, Driver[]>>>, driver: Driver) => {
    const country = driver.country || "Nespecificat";
    const county = driver.county || "Nespecificat";
    const city = driver.city || "Nespecificat";
    if (!acc[country]) acc[country] = {};
    if (!acc[country][county]) acc[country][county] = {};
    if (!acc[country][county][city]) acc[country][county][city] = [];
    acc[country][county][city].push(driver);
    return acc;
  }, {});

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#020202] text-white p-6 pb-40 font-sans italic">

      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="bg-[#080808] border border-white/5 rounded-[3rem] p-8 flex flex-col lg:flex-row justify-between items-center gap-8 shadow-2xl">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">
              Livratori <span className="text-red-600">UVAB FOOD</span>
            </h1>
            <div className="flex gap-4 mt-2">
              <span className="text-[8px] text-green-500 font-bold tracking-widest uppercase">
                ● {drivers.filter((d: Driver) => d.is_online).length} Online
              </span>
              <span className="text-[8px] text-zinc-500 font-bold tracking-widest uppercase">
                ● {drivers.length} Total
              </span>
            </div>
          </div>
          <div className="flex gap-4 w-full lg:w-auto">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
              <input
                type="text" placeholder="Caută după nume, oraș, telefon..."
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="bg-black/50 border border-white/10 p-4 pl-12 rounded-2xl text-[10px] font-black w-full lg:w-80 outline-none focus:border-red-600/50 transition-all uppercase"
              />
            </div>
            <button
              onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData(EMPTY_FORM); }}
              className="px-8 py-4 bg-white text-black font-black rounded-2xl hover:bg-red-600 hover:text-white transition-all uppercase text-[10px] whitespace-nowrap"
            >
              {showForm ? <X size={16} /> : "+ Adaugă"}
            </button>
          </div>
        </div>
      </div>

      {/* FORMULAR ADD/EDIT */}
      {showForm && (
        <div className="max-w-7xl mx-auto mb-10 bg-[#080808] border-2 border-red-600/20 p-10 rounded-[3.5rem]">
          <h2 className="text-xl font-black uppercase tracking-tighter mb-8 text-red-600">
            {editingId ? "✏️ Editează Livrator" : "➕ Înregistrare Livrator Nou"}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* AVATAR */}
            <div className="space-y-4">
              <div className="w-full h-48 bg-black rounded-[2rem] border-2 border-dashed border-white/10 relative overflow-hidden flex items-center justify-center">
                {uploading
                  ? <Loader2 className="animate-spin text-red-600" size={40} />
                  : formData.image_url
                  ? <img src={formData.image_url} className="w-full h-full object-cover" alt="avatar" />
                  : <Camera className="text-zinc-800" size={40} />
                }
                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              <p className="text-[8px] text-zinc-600 text-center tracking-widest uppercase">Click pentru foto</p>
            </div>

            {/* CÂMPURI */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Nume Complet *</label>
                <input
                  value={formData.full_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full bg-black border border-white/5 p-4 rounded-xl text-xs font-bold uppercase focus:border-red-600 outline-none"
                  placeholder="ION POPESCU"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Telefon</label>
                <input
                  value={formData.phone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-black border border-white/5 p-4 rounded-xl text-xs font-bold focus:border-red-600 outline-none"
                  placeholder="07XX XXX XXX"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">CNP</label>
                <input
                  value={formData.cnp}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, cnp: e.target.value })}
                  className="w-full bg-black border border-white/5 p-4 rounded-xl text-xs font-bold font-mono focus:border-red-600 outline-none"
                  placeholder="1234567890123"
                  maxLength={13}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Țară</label>
                <input
                  value={formData.country}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full bg-black border border-white/5 p-4 rounded-xl text-xs font-bold uppercase focus:border-red-600 outline-none"
                  placeholder="ROMÂNIA"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Județ</label>
                <input
                  value={formData.county}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, county: e.target.value })}
                  className="w-full bg-black border border-white/5 p-4 rounded-xl text-xs font-bold uppercase focus:border-red-600 outline-none"
                  placeholder="ILFOV"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Oraș *</label>
                <input
                  value={formData.city}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full bg-black border border-white/5 p-4 rounded-xl text-xs font-bold uppercase focus:border-red-600 outline-none"
                  placeholder="BUCUREȘTI"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Vehicul</label>
                <select
                  value={formData.vehicle_type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  className="w-full bg-black border border-white/5 p-4 rounded-xl text-xs font-bold uppercase outline-none focus:border-red-600"
                >
                  <option value="bike">Bicicletă</option>
                  <option value="moto">Motocicletă</option>
                  <option value="car">Autoturism</option>
                </select>
              </div>

              {/* COD ACCES PREVIEW */}
              {formData.cnp && formData.cnp.length >= 6 && (
                <div className="space-y-1">
                  <label className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Cod Acces App</label>
                  <div className="w-full bg-red-600/10 border border-red-600/30 p-4 rounded-xl flex items-center gap-3">
                    <Key size={14} className="text-red-600" />
                    <span className="text-sm font-black font-mono text-red-600 tracking-[0.3em]">
                      {getAccessCode(formData.cnp)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-red-600 text-white font-black rounded-xl h-14 uppercase text-[10px] tracking-widest shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {editingId ? "Actualizează" : "Lansează în Flotă"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REȚEAUA PE REGIUNI */}
      <div className="max-w-7xl mx-auto space-y-20">
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-20 text-zinc-700 text-sm tracking-widest uppercase font-black">
            Niciun livrator înregistrat
          </div>
        )}

        {Object.keys(grouped).map((country: string) => (
          <div key={country} className="space-y-12">
            <div className="flex items-center gap-6">
              <Flag className="text-red-600" size={24} />
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">{country}</h2>
              <div className="h-px flex-grow bg-gradient-to-r from-red-600/30 to-transparent" />
            </div>

            {Object.keys(grouped[country]).map((county: string) => (
              <div key={county} className="space-y-8 pl-10 border-l border-white/5">
                <h3 className="text-xs font-bold text-zinc-600 tracking-[0.5em] uppercase">Județ: {county}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Object.keys(grouped[country][county]).map((city: string) =>
                    grouped[country][county][city].map((driver: Driver) => {
                      const stats = getStats(driver.id);
                      const activeOrders = getActiveOrders(driver.id);
                      const accessCode = getAccessCode(driver.cnp);
                      const isExpanded = expandedDriver === driver.id;

                      return (
                        <div key={driver.id} className="group bg-[#080808] border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-red-600/30 transition-all">

                          {/* CARD BODY */}
                          <div className="p-6">
                            {/* Top */}
                            <div className="flex gap-4 mb-5">
                              <div className="relative">
                                <img
                                  src={driver.image_url || "/placeholder.png"}
                                  className={`w-14 h-14 rounded-2xl object-cover border-2 ${driver.is_online ? "border-green-500" : "border-white/5 grayscale"}`}
                                  alt={driver.full_name}
                                />
                                <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#080808] ${driver.is_online ? "bg-green-500" : "bg-zinc-700"}`} />
                              </div>
                              <div className="flex-grow min-w-0">
                                <h4 className="text-sm font-black uppercase italic leading-none truncate">{driver.full_name}</h4>
                                <p className="text-[8px] text-zinc-500 font-bold mt-1 uppercase tracking-widest">{city}</p>
                                <p className="text-[8px] text-zinc-600 font-bold mt-0.5 flex items-center gap-1">
                                  <Phone size={8} /> {driver.phone || "—"}
                                </p>
                              </div>
                            </div>

                            {/* COD ACCES */}
                            <div className="bg-red-600/10 border border-red-600/20 rounded-2xl p-3 mb-4 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Key size={12} className="text-red-600" />
                                <span className="text-[8px] text-red-400 font-black uppercase tracking-widest">Cod Acces</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-black font-mono tracking-[0.3em] ${showCnp === driver.id ? "text-red-600" : "text-zinc-700"}`}>
                                  {showCnp === driver.id ? accessCode : "••••••"}
                                </span>
                                <button
                                  onClick={() => setShowCnp(showCnp === driver.id ? null : driver.id)}
                                  className="text-zinc-600 hover:text-red-600 transition-colors"
                                >
                                  {showCnp === driver.id ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>
                              </div>
                            </div>

                            {/* STATS */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                              <div className="bg-black/50 p-2 rounded-xl border border-white/5 text-center">
                                <p className="text-[6px] text-zinc-600 uppercase font-black mb-1">Câștiguri</p>
                                <p className="text-[10px] font-black text-green-500">{stats.earnings} RON</p>
                              </div>
                              <div className="bg-black/50 p-2 rounded-xl border border-white/5 text-center">
                                <p className="text-[6px] text-zinc-600 uppercase font-black mb-1">Livrate</p>
                                <p className="text-[10px] font-black">{stats.completed}</p>
                              </div>
                              <div className="bg-black/50 p-2 rounded-xl border border-white/5 text-center">
                                <p className="text-[6px] text-zinc-600 uppercase font-black mb-1">Active</p>
                                <p className={`text-[10px] font-black ${stats.active > 0 ? "text-orange-500" : "text-zinc-600"}`}>{stats.active}</p>
                              </div>
                            </div>

                            {/* STATUS */}
                            <div className="flex justify-between items-center bg-black/50 p-3 rounded-xl border border-white/5 mb-4">
                              <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">
                                {driver.vehicle_type?.toUpperCase()}
                              </span>
                              <span className={`text-[8px] font-black italic ${driver.is_online ? "text-green-500" : "text-zinc-600"}`}>
                                {driver.status?.toUpperCase() || "OFFLINE"}
                              </span>
                            </div>

                            {/* COMENZI ACTIVE — expand */}
                            {activeOrders.length > 0 && (
                              <button
                                onClick={() => setExpandedDriver(isExpanded ? null : driver.id)}
                                className="w-full flex items-center justify-between bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 mb-4 hover:bg-orange-500/20 transition-all"
                              >
                                <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">
                                  🛵 {activeOrders.length} Comenzi Active
                                </span>
                                {isExpanded ? <ChevronUp size={14} className="text-orange-500" /> : <ChevronDown size={14} className="text-orange-500" />}
                              </button>
                            )}

                            {isExpanded && activeOrders.length > 0 && (
                              <div className="space-y-2 mb-4">
                                {activeOrders.map((order: Order) => (
                                  <div key={order.id} className="bg-black/70 rounded-xl p-3 border border-white/5">
                                    <div className="flex justify-between items-start mb-1">
                                      <span className="text-[8px] font-black text-red-600 uppercase">#{order.id.slice(0, 8)}</span>
                                      <span className={`text-[7px] font-black px-2 py-0.5 rounded-full ${
                                        order.status === "picked_up" ? "bg-blue-600 text-white" :
                                        order.status === "ready" ? "bg-green-600 text-white" :
                                        "bg-zinc-700 text-zinc-300"
                                      }`}>{order.status.toUpperCase()}</span>
                                    </div>
                                    <p className="text-[9px] font-black text-white truncate">{order.restaurant_name}</p>
                                    <p className="text-[8px] text-zinc-500 italic truncate normal-case">{order.delivery_address}</p>
                                    <p className="text-[8px] text-green-500 font-black mt-1">{order.total_amount} RON</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* ACTIONS */}
                            <div className="grid grid-cols-3 gap-2">
                              <Link
                                href={`/admin/drivers/${driver.id}`}
                                className="bg-zinc-900 h-10 rounded-xl flex items-center justify-center text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                              >
                                <Settings2 size={16} />
                              </Link>
                              <button
                                onClick={() => {
                                  setFormData({
                                    full_name: driver.full_name,
                                    phone: driver.phone,
                                    country: driver.country,
                                    county: driver.county,
                                    city: driver.city,
                                    vehicle_type: driver.vehicle_type,
                                    image_url: driver.image_url,
                                    is_online: driver.is_online,
                                    status: driver.status,
                                    cnp: driver.cnp || "",
                                    service_type: driver.service_type || "delivery",
                                  });
                                  setEditingId(driver.id);
                                  setShowForm(true);
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                className="bg-zinc-900 h-10 rounded-xl flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors"
                              >
                                <Edit3 size={16} />
                              </button>
                              {deleteConfirm === driver.id ? (
                                <div className="flex gap-1">
                                  <button onClick={() => handleDelete(driver.id)} className="flex-1 bg-red-600 h-10 rounded-xl flex items-center justify-center hover:bg-red-700 transition-colors">
                                    <Check size={14} />
                                  </button>
                                  <button onClick={() => setDeleteConfirm(null)} className="flex-1 bg-zinc-900 h-10 rounded-xl flex items-center justify-center hover:bg-zinc-700 transition-colors">
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(driver.id)}
                                  className="bg-zinc-900 h-10 rounded-xl flex items-center justify-center text-zinc-600 hover:bg-red-900 hover:text-white transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
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