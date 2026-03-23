"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Utensils, Plus, Star, Clock, MapPin, Loader2, 
  Trash2, LayoutList, ChevronLeft, Save, Edit3, DollarSign, X, Check, Camera, ImageIcon, Search, ChevronRight
} from "lucide-react";

export default function UcabFood() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState<{ type: 'list' | 'menu', data?: any }>({ type: 'list' });
  const [menuItems, setMenuItems] = useState<any[]>([]);
  
  // --- MODULE PAGINARE & FILTRE ---
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Toate");
  const [deletingId, setDeletingId] = useState<string | null>(null); 
  const pageSize = 10;

  const [showResModal, setShowResModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingRes, setEditingRes] = useState<any>(null);

  // --- FORMULAR COMPLET (TOATE CAMPURILE) ---
  const [resForm, setResForm] = useState({ 
    name: "", 
    category: "Pizza", 
    address: "", 
    delivery_time: "20-30 min", 
    image_url: "",
    open_time: "08:00", 
    close_time: "22:00" 
  });
  
  const [menuForm, setMenuForm] = useState({ 
    name: "", 
    description: "", 
    price: "", 
    image_url: "" 
  });

  useEffect(() => { 
    if(view.type === 'list') fetchRestaurants(); 
  }, [page, categoryFilter, searchQuery]);

  // LOGICĂ STATUS AUTOMAT
  const checkIfOpen = (open: string, close: string) => {
    if (!open || !close) return true;
    const acum = new Date();
    const oraActuala = acum.getHours() * 100 + acum.getMinutes();
    const [hOpen, mOpen] = open.split(':').map(Number);
    const [hClose, mClose] = close.split(':').map(Number);
    const oraStart = hOpen * 100 + mOpen;
    const oraStop = hClose * 100 + mClose;
    return oraActuala >= oraStart && oraActuala < oraStop;
  };

  // --- STORAGE UPLOAD ---
  const handleFileUpload = async (e: any, folder: string) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return null;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('ucab-food').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('ucab-food').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) { return null; } finally { setUploading(false); }
  };

  // --- RESTAURANT ACTIONS ---
  const fetchRestaurants = async () => {
    setLoading(true);
    let query = supabase.from("restaurants").select("*", { count: "exact" });
    if (categoryFilter !== "Toate") query = query.eq("category", categoryFilter);
    if (searchQuery) query = query.ilike("name", `%${searchQuery}%`);

    const { data, count } = await query
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (data) setRestaurants(data);
    if (count !== null) setTotalCount(count);
    setLoading(false);
  };

  const handleSaveRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRes) {
      await supabase.from("restaurants").update(resForm).eq("id", editingRes.id);
    } else {
      await supabase.from("restaurants").insert([resForm]);
    }
    setEditingRes(null);
    setShowResModal(false);
    setResForm({ name: "", category: "Pizza", address: "", delivery_time: "20-30 min", image_url: "", open_time: "08:00", close_time: "22:00" });
    fetchRestaurants();
  };

  const deleteRestaurant = async (id: string) => {
    await supabase.from("restaurants").delete().eq("id", id);
    setDeletingId(null);
    fetchRestaurants();
  };

  // --- MENU ACTIONS ---
  const fetchMenu = async (restaurantId: string) => {
    const { data } = await supabase.from("menu_items").select("*").eq("restaurant_id", restaurantId).order("name");
    if (data) setMenuItems(data);
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from("menu_items").insert([{ ...menuForm, price: parseFloat(menuForm.price), restaurant_id: view.data.id }]);
    setShowMenuModal(false);
    setMenuForm({ name: "", description: "", price: "", image_url: "" });
    fetchMenu(view.data.id);
  };

  const deleteMenuItem = async (id: string) => {
    await supabase.from("menu_items").delete().eq("id", id);
    fetchMenu(view.data.id);
  };

  const updatePrice = async (itemId: string, newPrice: string) => {
    const price = parseFloat(newPrice);
    if (isNaN(price)) return;
    await supabase.from("menu_items").update({ price }).eq("id", itemId);
    fetchMenu(view.data.id);
  };

  // --- RENDER MENU VIEW ---
  if (view.type === 'menu') {
    return (
      <div className="animate-in slide-in-from-right duration-500">
        <button onClick={() => setView({ type: 'list' })} className="flex items-center gap-2 text-zinc-500 hover:text-white mb-8 uppercase font-black italic text-xs tracking-widest transition-all">
          <ChevronLeft size={20} /> Înapoi
        </button>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div className="flex items-center gap-6">
             {view.data.image_url && <img src={view.data.image_url} className="w-20 h-20 rounded-3xl object-cover grayscale" alt="" />}
             <div>
                <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none">{view.data.name}</h2>
                <p className="text-red-500 font-bold uppercase text-[10px] mt-2 tracking-[0.3em]">Meniu Restaurant</p>
             </div>
          </div>
          <button onClick={() => setShowMenuModal(true)} className="px-6 py-4 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all">+ Preparat</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {menuItems.map((item) => (
            <div key={item.id} className="p-6 bg-[#0a0a0a] border border-white/5 rounded-[2rem] flex items-center justify-between group">
              <div className="flex items-center gap-4 text-xs">
                {item.image_url ? <img src={item.image_url} className="w-12 h-12 rounded-xl object-cover" alt="" /> : <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-zinc-600"><Utensils size={20}/></div>}
                <div>
                  <p className="font-bold text-white uppercase italic tracking-tighter">{item.name}</p>
                  <p className="text-[10px] text-zinc-600 uppercase font-medium">{item.price} RON</p>
                </div>
              </div>
              <button onClick={() => deleteMenuItem(item.id)} className="p-3 text-zinc-800 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
            </div>
          ))}
        </div>
        {showMenuModal && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[400] flex items-center justify-center p-6">
            <div className="bg-[#080808] border border-white/10 p-10 rounded-[3rem] w-full max-w-md animate-in zoom-in-95">
              <h3 className="text-2xl font-black text-white italic uppercase mb-8">Nou Preparat</h3>
              <form onSubmit={handleAddMenuItem} className="space-y-4">
                <div className="relative w-full h-32 bg-white/5 rounded-2xl border border-dashed border-white/10 flex items-center justify-center overflow-hidden">
                   {menuForm.image_url ? <img src={menuForm.image_url} className="w-full h-full object-cover" alt="" /> : <Camera className="text-zinc-600" />}
                   <input type="file" onChange={async (e) => { const url = await handleFileUpload(e, 'menu'); if (url) setMenuForm({...menuForm, image_url: url}); }} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <input type="text" placeholder="Nume" required value={menuForm.name} onChange={e => setMenuForm({...menuForm, name: e.target.value})} className="w-full bg-white/5 border border-white/5 p-5 rounded-2xl text-white font-bold uppercase text-xs" />
                <textarea placeholder="Descriere" value={menuForm.description} onChange={e => setMenuForm({...menuForm, description: e.target.value})} className="w-full bg-white/5 border border-white/5 p-5 rounded-2xl text-white font-bold h-24 text-xs" />
                <input type="number" placeholder="Preț" required value={menuForm.price} onChange={e => setMenuForm({...menuForm, price: e.target.value})} className="w-full bg-white/5 border border-white/5 p-5 rounded-2xl text-white font-bold" />
                <button type="submit" className="w-full bg-red-600 py-5 rounded-2xl text-white font-black uppercase italic tracking-widest">Salvează</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-700">
      {/* FILTRE & CAUTARE */}
      <div className="flex flex-col xl:flex-row gap-4 mb-12">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
            <input type="text" placeholder="CAUTĂ PARTENER..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }} className="w-full bg-[#0a0a0a] border border-white/5 p-4 pl-12 rounded-2xl text-white font-black italic uppercase tracking-tighter outline-none focus:border-red-500 transition-all" />
          </div>
          <button onClick={fetchRestaurants} className="bg-white text-black px-6 rounded-2xl font-black uppercase text-[10px] italic">Filtrează</button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {["Toate", "Pizza", "Burger", "Sushi", "Tradițional"].map((cat) => (
            <button key={cat} onClick={() => { setCategoryFilter(cat); setPage(0); }} className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest ${categoryFilter === cat ? 'bg-red-600 text-white' : 'bg-[#0a0a0a] text-zinc-500 border border-white/5'}`}>{cat}</button>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-black text-red-500 uppercase italic tracking-tighter">Parteneri ({totalCount})</h2>
        <button onClick={() => { setEditingRes(null); setResForm({ name: "", category: "Pizza", address: "", delivery_time: "20-30 min", image_url: "", open_time: "08:00", close_time: "22:00" }); setShowResModal(true); }} className="px-6 py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-600/20 hover:scale-105 transition-transform">+ Înregistrare</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-red-500" size={40}/></div>
        ) : restaurants.map((res) => {
          const isOpen = checkIfOpen(res.open_time, res.close_time);
          return (
          <div key={res.id} className={`bg-[#0a0a0a] border ${isOpen ? 'border-white/5' : 'border-red-900/30'} p-8 rounded-[2.5rem] hover:border-red-500/40 transition-all group relative overflow-hidden`}>
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="flex gap-4">
                {res.image_url ? <img src={res.image_url} className={`w-14 h-14 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all ${!isOpen && 'opacity-30'}`} alt="" /> : <div className="w-14 h-14 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-500 border border-red-500/10"><Utensils size={28}/></div>}
                <div>
                  <h4 className={`text-xl font-black italic uppercase tracking-tighter ${isOpen ? 'text-white' : 'text-zinc-600'}`}>{res.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded border ${isOpen ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-red-500/10 border-red-500/50 text-red-500'}`}>
                      {isOpen ? "● DESCHIS" : "○ ÎNCHIS"}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase italic tracking-widest">
                      <LayoutList size={10}/> {res.orders_count || 0} COMENZI
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 relative z-20">
                <button onClick={() => { setEditingRes(res); setResForm(res); setShowResModal(true); }} className="p-3 bg-white/5 rounded-xl text-zinc-500 hover:text-white"><Edit3 size={18}/></button>
                <button onClick={() => { setView({ type: 'menu', data: res }); fetchMenu(res.id); }} className="p-3 bg-red-600/10 rounded-xl text-red-500 hover:bg-red-600 hover:text-white transition-all"><LayoutList size={18}/></button>
                {deletingId === res.id ? (
                  <div className="flex gap-1 animate-in zoom-in duration-200">
                    <button onClick={() => deleteRestaurant(res.id)} className="p-3 bg-red-600 rounded-xl text-white"><Check size={18}/></button>
                    <button onClick={() => setDeletingId(null)} className="p-3 bg-zinc-800 rounded-xl text-white"><X size={18}/></button>
                  </div>
                ) : (
                  <button onClick={() => setDeletingId(res.id)} className="p-3 bg-white/5 rounded-xl text-zinc-800 hover:text-red-500 transition-all"><Trash2 size={18}/></button>
                )}
              </div>
            </div>
            {/* AFISARE ADRESA SI INFO */}
            <div className="flex flex-col gap-2 pt-6 border-t border-white/5">
                <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-bold uppercase tracking-widest italic">
                  <MapPin size={12} className="text-red-500" /> {res.address || "Adresă Nespecificată"}
                </div>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2 text-zinc-600 text-[9px] font-black uppercase tracking-widest italic">
                      <Clock size={12} /> {res.open_time?.slice(0,5)} - {res.close_time?.slice(0,5)}
                   </div>
                   <span className="text-[9px] font-black text-zinc-800 uppercase italic tracking-widest px-3 py-1 bg-white/5 rounded-lg border border-white/5">{res.category} • {res.delivery_time}</span>
                </div>
            </div>
          </div>
        )})}
      </div>

      {/* PAGINARE */}
      {totalCount > pageSize && (
        <div className="mt-12 flex justify-center items-center gap-4">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-4 bg-[#0a0a0a] rounded-2xl border border-white/5 text-white disabled:opacity-20 hover:border-red-500 transition-all"><ChevronLeft /></button>
          <span className="font-black italic text-zinc-500 uppercase tracking-widest text-[10px]">Pagina <span className="text-red-500">{page + 1}</span> din {Math.ceil(totalCount / pageSize)}</span>
          <button disabled={(page + 1) * pageSize >= totalCount} onClick={() => setPage(p => p + 1)} className="p-4 bg-[#0a0a0a] rounded-2xl border border-white/5 text-white disabled:opacity-20 hover:border-red-500 transition-all"><ChevronRight /></button>
        </div>
      )}

      {/* MODAL RESTAURANT (TOATE CAMPURILE) */}
      {showResModal && (
         <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[500] flex items-center justify-center p-6 italic uppercase">
            <div className="bg-[#080808] border border-white/10 p-10 rounded-[3rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">{editingRes ? 'Edit Partener' : 'Partener Nou'}</h3>
                  <button onClick={() => setShowResModal(false)} className="text-zinc-500 hover:text-white"><X/></button>
               </div>
               <form onSubmit={handleSaveRestaurant} className="space-y-4">
                  <div className="relative group w-full h-40 bg-white/5 rounded-[2rem] border border-dashed border-white/10 overflow-hidden flex items-center justify-center">
                    {resForm.image_url ? <img src={resForm.image_url} className="w-full h-full object-cover grayscale" /> : <div className="text-center text-zinc-600"><ImageIcon className="mx-auto mb-2" size={32} /><span className="text-[10px] tracking-[0.2em] font-black">Logo</span></div>}
                    <input type="file" onChange={async (e) => { const url = await handleFileUpload(e, 'restaurants'); if (url) setResForm({...resForm, image_url: url}); }} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                  <input type="text" placeholder="Nume" required value={resForm.name} onChange={e => setResForm({...resForm, name: e.target.value})} className="w-full bg-white/5 border border-white/5 p-5 rounded-2xl text-white font-bold" />
                  <input type="text" placeholder="Adresă Completă" value={resForm.address} onChange={e => setResForm({...resForm, address: e.target.value})} className="w-full bg-white/5 border border-white/5 p-5 rounded-2xl text-white font-bold" />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <select value={resForm.category} onChange={e => setResForm({...resForm, category: e.target.value})} className="bg-white/5 border border-white/5 p-5 rounded-2xl text-white font-bold">
                        <option value="Pizza">Pizza</option><option value="Burger">Burger</option><option value="Sushi">Sushi</option>
                    </select>
                    <input type="text" placeholder="Timp Livrare" value={resForm.delivery_time} onChange={e => setResForm({...resForm, delivery_time: e.target.value})} className="bg-white/5 border border-white/5 p-5 rounded-2xl text-white font-bold" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[9px] text-zinc-500 ml-2 mb-1 block">DESCHIDERE</label><input type="time" value={resForm.open_time} onChange={e => setResForm({...resForm, open_time: e.target.value})} className="w-full bg-white/5 border border-white/5 p-4 rounded-2xl text-white font-bold" /></div>
                    <div><label className="text-[9px] text-zinc-500 ml-2 mb-1 block">ÎNCHIDERE</label><input type="time" value={resForm.close_time} onChange={e => setResForm({...resForm, close_time: e.target.value})} className="w-full bg-white/5 border border-white/5 p-4 rounded-2xl text-white font-bold" /></div>
                  </div>

                  <button disabled={uploading} type="submit" className="w-full bg-red-600 py-6 rounded-2xl text-white font-black uppercase italic tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2">{uploading ? <Loader2 className="animate-spin" /> : <Save size={20}/>} Salvează</button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}
