'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, User, ChevronRight, Search, MessageSquare, Clock, Zap } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function UcabChatAdmin() {
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // 1. ÎNCĂRCARE PERSISTENȚĂ & NOTIFICĂRI DESKTOP
  useEffect(() => {
    const savedCounts = localStorage.getItem('ucab_unread_cache')
    if (savedCounts) {
      setUnreadCounts(JSON.parse(savedCounts))
    }
    if ("Notification" in window) {
      Notification.requestPermission()
    }
    fetchSessions()
  }, [])

  // Salvare automată în cache și update Tab Title
  useEffect(() => {
    localStorage.setItem('ucab_unread_cache', JSON.stringify(unreadCounts))
    const total = Object.values(unreadCounts).reduce((a, b) => a + b, 0)
    document.title = total > 0 ? `(${total}) Mesaje noi` : 'Admin Dashboard'
  }, [unreadCounts])

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('messages')
      .select('sender_id, user_name, created_at, is_admin')
      .order('created_at', { ascending: false })

    if (data) {
      const uniqueSessions = data.reduce((acc: any[], current) => {
        if (!acc.find(item => item.sender_id === current.sender_id)) {
          acc.push(current)
        }
        return acc;
      }, [])
      setSessions(uniqueSessions)
    }
  }

  // 2. MONITORIZARE GLOBALĂ + NOTIFICĂRI
  useEffect(() => {
    const channel = supabase.channel('admin-global-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new
        
        // Dacă primim mesaj de la client (nu admin/sistem) și nu suntem în fereastra lui
        if (!msg.is_admin && msg.sender_id !== selectedId) {
          setUnreadCounts(prev => ({
            ...prev,
            [msg.sender_id]: (prev[msg.sender_id] || 0) + 1
          }))
          
          // SUNET NOTIFICARE (Pop discret)
          new Audio('https://assets.mixkit.co').play().catch(() => {})

          // BROWSER NOTIFICATION
          if (Notification.permission === "granted") {
            new Notification(`UCAB: ${msg.user_name || 'Client Nou'}`, {
              body: msg.content.substring(0, 40) + "..."
            })
          }
        }
        fetchSessions()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedId])

  // 3. FETCH MESAJE & RESET CONTOR LA SELECȚIE
  useEffect(() => {
    if (!selectedId) return

    setUnreadCounts(prev => ({ ...prev, [selectedId]: 0 }))

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_id', selectedId)
        .order('created_at', { ascending: true })
      if (data) setMessages(data)
    }
    fetchMessages()

    const chatChannel = supabase.channel(`room-${selectedId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${selectedId}` }, 
        (p) => setMessages(prev => {
          const exists = prev.find(m => m.id === p.new.id)
          return exists ? prev : [...prev, p.new]
        })
      )
      .subscribe()

    return () => { supabase.removeChannel(chatChannel) }
  }, [selectedId])

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !selectedId) return
    const content = input; setInput('')
    await supabase.from('messages').insert([{
      content, sender_id: selectedId, is_admin: true, user_name: 'Admin UCAB'
    }])
  }

  return (
    <div className="flex h-[750px] w-full bg-[#050505] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl font-sans text-white">
      
      {/* SIDEBAR */}
      <div className="w-80 border-r border-white/5 bg-[#0A0A0A] flex flex-col">
        <div className="p-6 border-b border-white/5">
          <h2 className="font-bold text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-6 flex items-center gap-2">
            <Zap size={12} className="text-emerald-500" /> Live Support
          </h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" size={14} />
            <input placeholder="Caută..." className="w-full bg-zinc-900/40 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs text-white outline-none focus:border-white/10 transition-all" />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {sessions.map((s) => {
            const unread = unreadCounts[s.sender_id] || 0;
            return (
              <motion.div 
                key={s.sender_id}
                onClick={() => setSelectedId(s.sender_id)}
                className={`p-5 cursor-pointer border-b border-white/5 transition-all flex items-center gap-4 relative ${selectedId === s.sender_id ? 'bg-zinc-900/50' : 'hover:bg-zinc-900/20'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${selectedId === s.sender_id ? 'bg-white text-black border-white' : 'bg-zinc-900 border-white/5 text-zinc-500'}`}>
                  <User size={18} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-zinc-100 truncate">{s.user_name || 'Vizitator'}</p>
                  <p className="text-[9px] text-zinc-600 uppercase mt-0.5 font-medium tracking-tighter">ID: {s.sender_id.slice(0,8)}</p>
                </div>

                <AnimatePresence>
                  {unread > 0 && (
                    <motion.div 
                      initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      className="absolute right-12 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                    >
                      <span className="text-[10px] font-black text-white">{unread}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <ChevronRight size={14} className={selectedId === s.sender_id ? 'text-white' : 'text-zinc-800'} />
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col bg-black">
        {selectedId ? (
          <>
            <div className="p-6 border-b border-white/5 bg-zinc-950/30 flex items-center justify-between text-zinc-400">
               <span className="text-xs font-bold uppercase tracking-widest">Canal: {selectedId.slice(0,12)}...</span>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[radial-gradient(circle_at_top,_#0f0f0f_0%,_#000_100%)]">
              {messages.map((m, i) => (
                <div key={m.id || i} className={`flex ${m.is_admin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`px-5 py-3 rounded-2xl text-[13.5px] shadow-2xl ${
                    m.is_admin 
                    ? 'bg-white text-black font-semibold rounded-tr-none' 
                    : 'bg-[#FDFDF5] text-zinc-900 border border-white/5 rounded-tl-none font-medium'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            <div className="p-6 bg-zinc-950 border-t border-white/5">
              <form onSubmit={handleSend} className="flex gap-4 bg-zinc-900/50 border border-white/5 rounded-2xl p-1.5 focus-within:border-white/10 transition-all">
                <input
                  value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder="Scrie un răspuns..."
                  className="flex-1 bg-transparent px-4 text-sm text-white outline-none"
                />
                <button type="submit" className="bg-white text-black p-3.5 rounded-xl hover:bg-zinc-200 transition-all shadow-xl active:scale-95">
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-20 uppercase tracking-[0.4em] text-[10px] font-black text-zinc-500">
             <MessageSquare size={48} className="mb-4" />
             Selectează o sesiune activă
          </div>
        )}
      </div>
    </div>
  )
}
