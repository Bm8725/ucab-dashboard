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
  
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Toate");
  const pageSize = 10;

  const [showResModal, setShowResModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingRes, setEditingRes] = useState<any>(null);

  const [resForm, setResForm] = useState({ 
    name: "", category: "Pizza", address: "", delivery_time: "20-30 min", image_url: "", open_time: "08:00", close_time: "22:00" 
  });
  
// Adaugă asta la începutul componentei tale, unde ai restul de useState
const [editingId, setEditingId] = useState<string | null>(null);

// Asigură-te că și menuForm are câmpul is_available inclus în state-ul inițial
const [menuForm, setMenuForm] = useState({
  name: '',
  price: '',
  description: '',
  weight: '',
  image_url: '',
  is_available: true // Adăugat pentru disponibilitate
});
  
const fetchMenuItems = async (restaurantId: string) => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (!error && data) {
    setMenuItems(data); // Asigură-te că ai [menuItems, setMenuItems] = useState([])
  }
};


  useEffect(() => { 
    if(view.type === 'list') fetchRestaurants(); 
  }, [page, categoryFilter, searchQuery]);

  const checkIfOpen = (open: string, close: string) => {
    if (!open || !close) return true;
    const acum = new Date();
    const oraActuala = acum.getHours() * 100 + acum.getMinutes();
    const [hOpen, mOpen] = open.split(':').map(Number);
    const [hClose, mClose] = close.split(':').map(Number);
    return oraActuala >= (hOpen * 100 + mOpen) && oraActuala < (hClose * 100 + mClose);
  };

  const handleFileUpload = async (e: any, folder: string) => {
    const file = e.target.files?.[0];
    if (!file) return null;
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('ucab-food').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('ucab-food').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error("Upload failed:", error);
      return null;
    } finally {
      setUploading(false);
    }
  };

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
    try {
      if (editingRes) {
        const { error } = await supabase.from("restaurants").update(resForm).eq("id", editingRes.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("restaurants").insert([resForm]).select();
        if (error) throw error;
      }
      setShowResModal(false);
      setEditingRes(null);
      setResForm({ name: "", category: "Pizza", address: "", delivery_time: "20-30 min", image_url: "", open_time: "08:00", close_time: "22:00" });
      fetchRestaurants();
    } catch (err: any) {
      alert("Eroare: " + err.message);
    }
  };
const deleteRestaurant = async (id: string) => {
  if(!confirm("Atenție! Ștergerea restaurantului va șterge și toate produsele din meniu. Continui?")) return;
  
  try {
    // 1. Ștergem mai întâi toate produsele din meniu care aparțin acestui restaurant
    const { error: menuError } = await supabase
      .from("menu_items")
      .delete()
      .eq("restaurant_id", id);

    if (menuError) throw menuError;

    // 2. Acum putem șterge restaurantul fără eroare
    const { error: resError } = await supabase
      .from("restaurants")
      .delete()
      .eq("id", id);

    if (resError) throw resError;

    fetchRestaurants();
    alert("Restaurantul și meniul au fost șterse!");
  } catch (err: any) {
    alert("Eroare: " + err.message);
  }
};

  const fetchMenu = async (restaurantId: string) => {
    const { data } = await supabase.from("menu_items").select("*").eq("restaurant_id", restaurantId).order("name");
    if (data) setMenuItems(data);
  };

const handleAddMenuItem = async (e: React.FormEvent) => {
  e.preventDefault();
  
  const payload = {
    restaurant_id: view.data.id,
    name: menuForm.name,
    price: parseFloat(menuForm.price),
    description: menuForm.description,
    weight: parseFloat(menuForm.weight),
    image_url: menuForm.image_url,
    is_available: menuForm.is_available // Noul câmp
  };

  let error;
  if (editingId) {
    // UPDATE
    const { error: err } = await supabase
      .from('menu_items')
      .update(payload)
      .eq('id', editingId);
    error = err;
  } else {
    // INSERT
    const { error: err } = await supabase
      .from('menu_items')
      .insert([payload]);
    error = err;
  }

  if (!error) {
    setShowMenuModal(false);
    setEditingId(null);
    fetchMenuItems(view.data.id);
  }
};


  const deleteMenuItem = async (id: string) => {
    await supabase.from("menu_items").delete().eq("id", id);
    fetchMenu(view.data.id);
  };

    if (view.type === 'menu') {
    // Funcție pentru deschiderea modalului în mod Editare
    const openEditModal = (item: any) => {
      setMenuForm({
        name: item.name,
        price: item.price,
        description: item.description || '',
        weight: item.weight || '',
        image_url: item.image_url || '',
        is_available: item.is_available ?? true
      });
      setEditingId(item.id); 
      setShowMenuModal(true);
    };

    return (
      <div className="p-10 animate-in slide-in-from-right duration-500 italic uppercase font-black bg-black min-h-screen text-white">
        {/* BUTON ÎNAPOI */}
        <button onClick={() => setView({ type: 'list' })} className="flex items-center gap-2 text-zinc-500 hover:text-white mb-8 font-black text-xs tracking-widest transition-all">
          <ChevronLeft size={20} /> Înapoi la restaurante
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div className="flex items-center gap-6">
             {view.data.image_url && <img src={view.data.image_url} className="w-20 h-20 rounded-3xl object-cover grayscale" alt="" />}
             <div>
                <h2 className="text-5xl font-black text-white italic tracking-tighter leading-none">{view.data.name}</h2>
                <p className="text-red-500 font-bold text-[10px] mt-2 tracking-[0.3em]">Meniu Restaurant • Gestiune</p>
             </div>
          </div>
          <button onClick={() => { 
            setEditingId(null); 
            setMenuForm({name:'', price:'', description:'', weight:'', image_url:'', is_available: true}); 
            setShowMenuModal(true); 
          }} className="px-6 py-4 bg-white text-black rounded-2xl font-black text-[10px] tracking-widest hover:bg-red-600 transition-all">+ Preparat</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {menuItems.map((item) => (
            <div key={item.id} className={`p-6 bg-[#0a0a0a] border ${item.is_available ? 'border-white/5' : 'border-red-900/40 opacity-50'} rounded-[2rem] flex flex-col gap-4 group transition-all`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs">
                  {item.image_url ? <img src={item.image_url} className="w-12 h-12 rounded-xl object-cover" alt="" /> : <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-zinc-600"><Utensils size={20}/></div>}
                  <div>
                    <p className="font-bold text-white tracking-tighter text-sm flex items-center gap-2">
                      {item.name}
                      {!item.is_available && <span className="bg-red-600 text-[8px] px-2 py-0.5 rounded-full tracking-widest">STOC EPUIZAT</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-zinc-600 font-medium">{item.price} RON</p>
                      <span className="text-zinc-800 text-[10px]">|</span>
                      <p className="text-[10px] text-red-500 font-bold">{item.weight || 0} G</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditModal(item)} className="p-3 text-zinc-700 hover:text-white transition-colors"><Edit3 size={18}/></button>
                  <button onClick={() => deleteMenuItem(item.id)} className="p-3 text-zinc-800 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                </div>
              </div>

              {/* DESCRIERE / INGREDIENTE SUB TITLU */}
              {item.description && (
                <div className="px-2 border-t border-white/5 pt-3">
                  <p className="text-[9px] text-zinc-500 normal-case font-medium leading-relaxed italic line-clamp-2">
                    {item.description}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {showMenuModal && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6 italic uppercase font-black text-white">
            <div className="bg-[#080808] border border-white/10 p-10 rounded-[3rem] w-full max-w-md animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <h3 className="text-2xl font-black italic uppercase mb-8">{editingId ? 'Editează' : 'Nou'} Preparat</h3>
              <form onSubmit={handleAddMenuItem} className="space-y-4">
                
                {/* STATUS DISPONIBILITATE */}
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 mb-2">
                  <span className="text-[10px] tracking-[0.2em] text-zinc-400">Disponibil pentru comandă</span>
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 accent-red-600 cursor-pointer"
                    checked={menuForm.is_available}
                    onChange={e => setMenuForm({...menuForm, is_available: e.target.checked})}
                  />
                </div>

                <div className="relative w-full h-32 bg-white/5 rounded-2xl border border-dashed border-white/10 flex items-center justify-center overflow-hidden group">
                   {menuForm.image_url ? <img src={menuForm.image_url} className="w-full h-full object-cover" alt="" /> : <Camera className="text-zinc-600" />}
                   <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={async (e) => { 
                      const url = await handleFileUpload(e, 'menu');
                      if (url) setMenuForm(prev => ({ ...prev, image_url: url }));
                   }} />
                </div>
                
                <input required placeholder="Nume" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none font-bold focus:border-red-600/50 transition-all" value={menuForm.name} onChange={e => setMenuForm({...menuForm, name: e.target.value})} />
                
                <div className="grid grid-cols-2 gap-4">
                  <input required placeholder="Preț" type="number" step="0.01" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none font-bold focus:border-red-600/50" value={menuForm.price} onChange={e => setMenuForm({...menuForm, price: e.target.value})} />
                  <input required placeholder="Gramaj (G)" type="number" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none font-bold focus:border-red-600/50" value={menuForm.weight} onChange={e => setMenuForm({...menuForm, weight: e.target.value})} />
                </div>

                <textarea 
                  placeholder="Ingrediente, alergeni (Legislație ANPC)..." 
                  className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none font-bold min-h-[100px] normal-case text-sm focus:border-red-600/50" 
                  value={menuForm.description} 
                  onChange={e => setMenuForm({...menuForm, description: e.target.value})} 
                />

                <button type="submit" className="w-full bg-white text-black p-5 rounded-2xl font-black italic uppercase hover:bg-red-600 hover:text-white transition-all">
                  {editingId ? 'Actualizează' : 'Adaugă în Meniu'}
                </button>
                <button type="button" onClick={() => setShowMenuModal(false)} className="w-full text-zinc-600 text-[10px] tracking-widest mt-2">Închide</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-10 bg-black min-h-screen italic uppercase font-black text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-6xl tracking-tighter italic">UCAB <span className="text-red-600">FOOD</span></h1>
          <button onClick={() => { setEditingRes(null); setResForm({ name: "", category: "Pizza", address: "", delivery_time: "20-30 min", image_url: "", open_time: "08:00", close_time: "22:00" }); setShowResModal(true); }} className="px-8 py-4 bg-white text-black rounded-2xl font-black text-xs tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all">
            + Adaugă Restaurant
          </button>
        </div>

        {/* FILTRE ȘI CĂUTARE */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="flex-1 relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
            <input placeholder="Caută restaurant..." className="w-full bg-[#0a0a0a] border border-white/5 p-5 pl-14 rounded-2xl outline-none focus:border-white/20 transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <select className="bg-[#0a0a0a] border border-white/5 p-5 rounded-2xl outline-none font-bold" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option>Toate</option>
            <option>Pizza</option>
            <option>Burger</option>
            <option>Sushi</option>
            <option>Tradițional</option>
          </select>
        </div>

        {/* LISTĂ RESTAURANTE */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {restaurants.map((res) => (
            <div key={res.id} className="p-8 bg-[#0a0a0a] border border-white/5 rounded-[3rem] group hover:border-red-600/20 transition-all">
              <div className="flex items-center gap-6 mb-8">
                <img src={res.image_url} className="w-20 h-20 rounded-3xl object-cover grayscale group-hover:grayscale-0 transition-all" alt="" />
                <div>
                  <h3 className="text-2xl tracking-tighter leading-none mb-2">{res.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] px-3 py-1 bg-white/5 rounded-full text-zinc-500 tracking-widest">{res.category}</span>
                    {!checkIfOpen(res.open_time, res.close_time) && <span className="text-[9px] text-red-500 font-bold tracking-widest">ÎNCHIS</span>}
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-8 text-zinc-500 text-[10px]">
                <p className="flex items-center gap-3"><MapPin size={14} className="text-red-600"/> {res.address}</p>
                <p className="flex items-center gap-3"><Clock size={14} className="text-red-600"/> {res.delivery_time}</p>
              </div>

              {/* --- ADMIN ACCESS SECTION --- */}
              <div className="mb-8 pt-6 border-t border-white/5 flex flex-col gap-3">
                <p className="text-[8px] text-zinc-600 tracking-[0.3em] font-black italic">Admin Access ID</p>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const adminUrl = `${window.location.origin}/admin/restaurant/${res.id}`;
                      navigator.clipboard.writeText(adminUrl);
                      alert("Link Admin Copiat!");
                    }}
                    className="flex-1 bg-white/5 hover:bg-white/10 py-4 rounded-2xl text-[9px] font-black transition-all flex items-center justify-center gap-2 text-white border border-white/5"
                  >
                    <Save size={14} className="text-red-600" /> COPIAZĂ LINK GESTIUNE
                  </button>
                  <a 
                    href={`/admin/restaurant/${res.id}`}
                    className="p-4 bg-red-600 text-white rounded-2xl hover:scale-110 transition-all"
                  >
                    <ChevronRight size={18} />
                  </a>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button onClick={() => { setView({ type: 'menu', data: res }); fetchMenu(res.id); }} className="text-[10px] tracking-[0.2em] hover:text-red-600 transition-colors">Vezi Meniu</button>
                <div className="flex gap-4">
                  <button onClick={() => { setEditingRes(res); setResForm(res); setShowResModal(true); }} className="text-zinc-700 hover:text-white transition-colors"><Edit3 size={18}/></button>
                  <button onClick={() => deleteRestaurant(res.id)} className="text-zinc-700 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL RESTAURANT */}
      {showResModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-[#080808] border border-white/10 p-10 rounded-[3.5rem] w-full max-w-xl animate-in zoom-in-95">
            <h3 className="text-3xl font-black italic mb-8 uppercase tracking-tighter">{editingRes ? 'Editează' : 'Nou'} Restaurant</h3>
            <form onSubmit={handleSaveRestaurant} className="space-y-4">
              <div className="relative w-full h-40 bg-white/5 rounded-[2rem] border border-dashed border-white/10 flex items-center justify-center overflow-hidden group">
                 {resForm.image_url ? <img src={resForm.image_url} className="w-full h-full object-cover" alt="" /> : <Camera className="text-zinc-600" />}
                 <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={async (e) => { 
                    const url = await handleFileUpload(e, 'restaurants');
                    if (url) setResForm(prev => ({ ...prev, image_url: url }));
                 }} />
              </div>
              <input required placeholder="Nume Restaurant" className="w-full bg-white/5 border border-white/10 p-6 rounded-2xl outline-none font-bold" value={resForm.name} onChange={e => setResForm({...resForm, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Categorie" className="w-full bg-white/5 border border-white/10 p-6 rounded-2xl outline-none font-bold" value={resForm.category} onChange={e => setResForm({...resForm, category: e.target.value})} />
                <input placeholder="Timp Livrare" className="w-full bg-white/5 border border-white/10 p-6 rounded-2xl outline-none font-bold" value={resForm.delivery_time} onChange={e => setResForm({...resForm, delivery_time: e.target.value})} />
              </div>
              <input placeholder="Adresă" className="w-full bg-white/5 border border-white/10 p-6 rounded-2xl outline-none font-bold" value={resForm.address} onChange={e => setResForm({...resForm, address: e.target.value})} />
              <button type="submit" className="w-full bg-white text-black p-6 rounded-[2rem] font-black italic text-lg hover:bg-red-600 hover:text-white transition-all uppercase">Salvează Restaurant</button>
              <button type="button" onClick={() => setShowResModal(false)} className="w-full text-zinc-600 text-xs tracking-widest mt-2 uppercase">Anulează</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
