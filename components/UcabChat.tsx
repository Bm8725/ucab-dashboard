'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, User, ChevronRight, Search, MessageSquare, Clock, Zap, ChevronLeft } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ITEMS_PER_PAGE = 8;

export default function UcabChatAdmin() {
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [input, setInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const savedCounts = localStorage.getItem('ucab_unread_cache')
    if (savedCounts) setUnreadCounts(JSON.parse(savedCounts))
    if ("Notification" in window) Notification.requestPermission()
    fetchSessions()
  }, [])

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

  useEffect(() => {
    const channel = supabase.channel('admin-global-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new
        if (!msg.is_admin && msg.sender_id !== selectedId) {
          setUnreadCounts(prev => ({
            ...prev,
            [msg.sender_id]: (prev[msg.sender_id] || 0) + 1
          }))
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
        (p) => setMessages(prev => [...prev, p.new])
      )
      .subscribe()
    return () => { supabase.removeChannel(chatChannel) }
  }, [selectedId])

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !selectedId) return
    const content = input; setInput('')
    // MODIFICARE: Nu mai trimitem user_name: 'Admin UCAB' pentru a nu altera datele celuilalt capăt
    await supabase.from('messages').insert([{
      content, 
      sender_id: selectedId, 
      is_admin: true 
    }])
  }

  // LOGICA SEARCH & PAGINARE
  const filteredSessions = sessions.filter(s => 
    (s.user_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    s.sender_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.ceil(filteredSessions.length / ITEMS_PER_PAGE)
  const paginatedSessions = filteredSessions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <div className="flex h-[750px] w-full bg-[#050505] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl font-sans text-white">
      
      {/* SIDEBAR */}
      <div className="w-80 border-r border-white/5 bg-[#0A0A0A] flex flex-col">
        <div className="p-6 border-b border-white/5">
          <h2 className="font-bold text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-6 flex items-center gap-2">
            <Zap size={12} className="text-emerald-500" /> Live Support ucab
          </h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" size={14} />
            <input 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Caută după nume sau ID..." 
              className="w-full bg-zinc-900/40 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs text-white outline-none focus:border-white/10 transition-all" 
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {paginatedSessions.map((s) => {
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
                {unread > 0 && (
                  <div className="mr-2 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-black">{unread}</span>
                  </div>
                )}
                <ChevronRight size={14} className={selectedId === s.sender_id ? 'text-white' : 'text-zinc-800'} />
              </motion.div>
            )
          })}
        </div>

        {/* PAGINARE CONTROLS */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between bg-black/20">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-2 disabled:opacity-20 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              Pagina {currentPage} / {totalPages}
            </span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-2 disabled:opacity-20 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col bg-black">
        {selectedId ? (
          <>
            <div className="p-6 border-b border-white/5 bg-zinc-950/30 flex items-center justify-between text-zinc-400">
               <span className="text-xs font-bold uppercase tracking-widest">Chat activ: {selectedId.slice(0,12)}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[radial-gradient(circle_at_top,_#0f0f0f_0%,_#000_100%)]">
              {messages.map((m, i) => (
                <div key={m.id || i} className={`flex ${m.is_admin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`px-5 py-3 rounded-2xl text-[13.5px] max-w-[80%] shadow-2xl ${
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

            <form onSubmit={handleSend} className="p-6 bg-zinc-950/50 border-t border-white/5">
              <div className="relative flex items-center gap-4">
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Scrie un răspuns..."
                  className="flex-1 bg-zinc-900/50 border border-white/10 rounded-2xl py-4 px-6 text-sm outline-none focus:border-emerald-500/50 transition-all"
                />
                <button type="submit" className="bg-white text-black p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl">
                  <Send size={18} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-700">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p className="text-xs uppercase tracking-[0.2em] font-bold">Selectează o conversație</p>
          </div>
        )}
      </div>
    </div>
  )
}
