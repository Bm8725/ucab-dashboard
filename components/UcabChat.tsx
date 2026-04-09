'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, User, Search, MessageSquare, Zap,
  ChevronLeft, ChevronRight, Circle, Check, CheckCheck,
  Phone, Clock, X, Minimize2, Maximize2, Bell, BellOff
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ITEMS_PER_PAGE = 10

interface Message {
  id: string
  content: string
  sender_id: string
  is_admin: boolean
  created_at: string
  user_name?: string
}

interface Session {
  sender_id: string
  user_name: string | null
  created_at: string
  is_admin: boolean
  last_message?: string
}

const fmtTime = (d: string) => {
  const date = new Date(d)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'acum'
  if (mins < 60) return `${mins}m`
  if (mins < 1440) return `${Math.floor(mins / 60)}h`
  return date.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })
}

const fmtTimeFull = (d: string) =>
  new Date(d).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })

export default function UcabChatAdmin() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [input, setInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sending, setSending] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // ─── INIT ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    audioRef.current = new Audio('/notify.wav')
    if ('Notification' in window) Notification.requestPermission()
    fetchSessions()
  }, [])

  useEffect(() => {
    const total = Object.values(unreadCounts).reduce((a, b) => a + b, 0)
    document.title = total > 0 ? `(${total}) Mesaje noi — UVAB Support` : 'UVAB Support'
  }, [unreadCounts])

  // ─── SESSIONS ─────────────────────────────────────────────────────────────
  const fetchSessions = async () => {
    const { data } = await supabase
      .from('messages')
      .select('sender_id, user_name, created_at, is_admin, content')
      .order('created_at', { ascending: false })

    if (!data) return

    const map = new Map<string, Session & { last_message: string }>()
    for (const row of data) {
      if (!map.has(row.sender_id)) {
        map.set(row.sender_id, {
          sender_id: row.sender_id,
          user_name: row.user_name || null,
          created_at: row.created_at,
          is_admin: row.is_admin,
          last_message: row.content,
        })
      }
    }
    setSessions(Array.from(map.values()))
  }

  // ─── GLOBAL REALTIME ──────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('admin-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        const msg = payload.new as Message
        if (!msg.is_admin && msg.sender_id !== selectedId) {
          setUnreadCounts(prev => ({ ...prev, [msg.sender_id]: (prev[msg.sender_id] || 0) + 1 }))
          if (notificationsEnabled) audioRef.current?.play().catch(() => {})
          if (Notification.permission === 'granted' && notificationsEnabled) {
            new Notification(`💬 ${msg.user_name || 'Client Nou'}`, {
              body: msg.content.slice(0, 60),
              icon: '/ucabfood.png',
            })
          }
        }
        fetchSessions()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedId, notificationsEnabled])

  // ─── CHAT ROOM ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId) return
    setUnreadCounts(prev => ({ ...prev, [selectedId]: 0 }))
    setMessages([])

    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_id', selectedId)
        .order('created_at', { ascending: true })
      if (data) setMessages(data as Message[])
    }
    loadMessages()

    const room = supabase
      .channel(`room-${selectedId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `sender_id=eq.${selectedId}`,
      }, (p: any) => {
        setMessages(prev => [...prev, p.new as Message])
      })
      .subscribe()

    setTimeout(() => inputRef.current?.focus(), 100)
    return () => { supabase.removeChannel(room) }
  }, [selectedId])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── SEND ─────────────────────────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !selectedId || sending) return
    const content = input.trim()
    setInput('')
    setSending(true)
    await supabase.from('messages').insert([{ content, sender_id: selectedId, is_admin: true }])
    setSending(false)
  }

  // ─── FILTRARE + PAGINARE ──────────────────────────────────────────────────
  const filteredSessions = sessions.filter(s =>
    (s.user_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    s.sender_id.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const totalPages = Math.ceil(filteredSessions.length / ITEMS_PER_PAGE)
  const paginatedSessions = filteredSessions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)
  const selectedSession = sessions.find(s => s.sender_id === selectedId)

  // ─── GROUP MESSAGES BY DATE ───────────────────────────────────────────────
  const groupedMessages = messages.reduce((acc: Record<string, Message[]>, msg) => {
    const day = new Date(msg.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })
    if (!acc[day]) acc[day] = []
    acc[day].push(msg)
    return acc
  }, {})

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className={`flex bg-[#0c0c0c] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-300 ${isExpanded ? 'fixed inset-4 z-50' : 'w-full h-[780px]'}`}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <div className="w-[300px] shrink-0 border-r border-white/5 flex flex-col bg-[#080808]">

        {/* SIDEBAR HEADER */}
        <div className="px-6 pt-6 pb-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <Zap size={14} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-white leading-none">Support</p>
                <p className="text-[8px] text-zinc-600 uppercase tracking-widest">UVAB Live</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {totalUnread > 0 && (
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center"
                >
                  <span className="text-[9px] font-black text-white">{totalUnread > 9 ? '9+' : totalUnread}</span>
                </motion.div>
              )}
              <button
                onClick={() => setNotificationsEnabled(n => !n)}
                className={`p-1.5 rounded-lg transition-colors ${notificationsEnabled ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-700 bg-white/5'}`}
              >
                {notificationsEnabled ? <Bell size={13} /> : <BellOff size={13} />}
              </button>
              <button
                onClick={() => setIsExpanded(e => !e)}
                className="p-1.5 rounded-lg text-zinc-700 hover:text-white bg-white/5 transition-colors"
              >
                {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700" size={13} />
            <input
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
              placeholder="Caută client..."
              className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 pl-9 pr-4 text-[11px] text-white placeholder-zinc-700 outline-none focus:border-white/10 transition-all"
            />
          </div>
        </div>

        {/* SESSIONS LIST */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence>
            {paginatedSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-700">
                <MessageSquare size={32} className="mb-3 opacity-30" />
                <p className="text-[10px] uppercase tracking-widest font-bold">Nicio conversație</p>
              </div>
            ) : paginatedSessions.map((s: Session) => {
              const unread = unreadCounts[s.sender_id] || 0
              const isSelected = selectedId === s.sender_id
              return (
                <motion.div
                  key={s.sender_id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setSelectedId(s.sender_id)}
                  className={`px-4 py-3.5 cursor-pointer border-b border-white/[0.03] transition-all flex items-center gap-3 relative group ${isSelected ? 'bg-white/5 border-l-2 border-l-emerald-500' : 'hover:bg-white/[0.03] border-l-2 border-l-transparent'}`}
                >
                  {/* AVATAR */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-black transition-all ${isSelected ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500'}`}>
                    {s.user_name ? s.user_name[0].toUpperCase() : <User size={14} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={`text-[12px] font-bold truncate ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                        {s.user_name || 'Vizitator'}
                      </p>
                      <span className="text-[9px] text-zinc-600 shrink-0 ml-1">{fmtTime(s.created_at)}</span>
                    </div>
                    <p className="text-[10px] text-zinc-600 truncate normal-case">
                      {(s as any).last_message || 'Niciun mesaj'}
                    </p>
                  </div>

                  {unread > 0 && (
                    <div className="w-4 h-4 bg-red-600 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-[8px] font-black text-white">{unread}</span>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* PAGINARE */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-white/5 flex items-center justify-between bg-black/20">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1.5 disabled:opacity-20 hover:bg-white/5 rounded-lg transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">{currentPage} / {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1.5 disabled:opacity-20 hover:bg-white/5 rounded-lg transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── CHAT AREA ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <AnimatePresence mode="wait">
          {selectedId ? (
            <motion.div
              key={selectedId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full"
            >
              {/* CHAT HEADER */}
              <div className="px-6 py-4 border-b border-white/5 bg-[#0a0a0a] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white text-black rounded-xl flex items-center justify-center text-[12px] font-black shrink-0">
                    {selectedSession?.user_name ? selectedSession.user_name[0].toUpperCase() : <User size={14} />}
                  </div>
                  <div>
                    <p className="text-[13px] font-black text-white leading-none">
                      {selectedSession?.user_name || 'Vizitator'}
                    </p>
                    <p className="text-[9px] text-zinc-600 mt-0.5 font-mono">
                      {selectedId.slice(0, 16)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg">
                    <Circle size={6} className="fill-emerald-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Live</span>
                  </div>
                  <button onClick={() => setSelectedId(null)} className="p-2 text-zinc-700 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* MESSAGES */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-[#050505]">
                {Object.entries(groupedMessages).map(([day, msgs]) => (
                  <div key={day}>
                    {/* DAY SEPARATOR */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-px flex-1 bg-white/5" />
                      <span className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest px-2">{day}</span>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>

                    <div className="space-y-2">
                      {msgs.map((m: Message, i: number) => {
                        const isAdmin = m.is_admin
                        const prevMsg = i > 0 ? msgs[i - 1] : null
                        const showTime = !prevMsg || new Date(m.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 300000

                        return (
                          <div key={m.id || i}>
                            {showTime && (
                              <p className={`text-[9px] text-zinc-700 mb-1 ${isAdmin ? 'text-right' : 'text-left'}`}>
                                {fmtTimeFull(m.created_at)}
                              </p>
                            )}
                            <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                              {!isAdmin && (
                                <div className="w-6 h-6 bg-zinc-900 rounded-lg flex items-center justify-center text-[9px] font-black text-zinc-500 shrink-0 mr-2 mt-auto mb-0.5">
                                  {selectedSession?.user_name?.[0]?.toUpperCase() || 'U'}
                                </div>
                              )}
                              <motion.div
                                initial={{ opacity: 0, y: 4, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={`px-4 py-2.5 rounded-2xl text-[13px] max-w-[72%] leading-relaxed ${
                                  isAdmin
                                    ? 'bg-white text-black font-semibold rounded-br-sm shadow-lg'
                                    : 'bg-zinc-900 text-zinc-100 border border-white/5 rounded-bl-sm font-medium'
                                }`}
                              >
                                {m.content}
                              </motion.div>
                              {isAdmin && (
                                <div className="ml-1.5 mt-auto mb-0.5 text-zinc-700">
                                  <CheckCheck size={11} />
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>

              {/* INPUT */}
              <form onSubmit={handleSend} className="px-6 py-4 bg-[#0a0a0a] border-t border-white/5 shrink-0">
                <div className="flex items-center gap-3">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                    placeholder="Scrie un răspuns..."
                    className="flex-1 bg-zinc-900/60 border border-white/5 rounded-2xl py-3 px-5 text-sm text-white placeholder-zinc-700 outline-none focus:border-white/10 transition-all normal-case"
                  />
                  <motion.button
                    type="submit"
                    disabled={!input.trim() || sending}
                    whileTap={{ scale: 0.92 }}
                    className="w-11 h-11 bg-white text-black rounded-xl flex items-center justify-center hover:bg-zinc-100 transition-all disabled:opacity-30 shrink-0 shadow-xl"
                  >
                    {sending
                      ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      : <Send size={16} />
                    }
                  </motion.button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center bg-[#050505] text-center p-8"
            >
              <div className="w-20 h-20 bg-zinc-900/60 rounded-[2rem] flex items-center justify-center mb-5 border border-white/5">
                <MessageSquare size={30} className="text-zinc-700" />
              </div>
              <p className="font-black text-zinc-600 text-xs uppercase tracking-[0.3em] mb-1">Nicio conversație selectată</p>
              <p className="text-zinc-800 text-[11px] normal-case">Alege un client din lista din stânga</p>
              {totalUnread > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 bg-red-600/10 border border-red-600/20 text-red-400 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest"
                >
                  {totalUnread} mesaje necitite
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}