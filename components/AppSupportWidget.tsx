'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, MessageCircle, ShieldCheck, Headset } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AppSupportWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [hasAcceptedGdpr, setHasAcceptedGdpr] = useState(false)
  const [userName, setUserName] = useState('')
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string>('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const autoReplyTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sId = localStorage.getItem('ucab_app_session') || uuidv4()
    const gdpr = localStorage.getItem('ucab_app_gdpr') === 'true'
    const name = localStorage.getItem('ucab_app_user_name') || ''
    
    setSessionId(sId)
    setHasAcceptedGdpr(gdpr)
    setUserName(name)
    if (!localStorage.getItem('ucab_app_session')) localStorage.setItem('ucab_app_session', sId)
    if (gdpr) setupChat(sId)
  }, [])

  // Resetăm notificările când deschidem widgetul
  useEffect(() => {
    if (isOpen) setUnreadCount(0)
  }, [isOpen])

  const setupChat = async (sId: string) => {
    const { data } = await supabase.from('messages').select('*').eq('sender_id', sId).order('created_at', { ascending: true })
    if (data) setMessages(data)

    supabase.channel(`app_chat_${sId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${sId}` }, 
      (p) => {
        setMessages(prev => [...prev, p.new])
        
        // Dacă widget-ul e închis și mesajul e de la admin/sistem, creștem badge-ul
        if (!isOpen && p.new.is_admin) {
          setUnreadCount(prev => prev + 1)
        }

        if (p.new.is_admin && p.new.user_name !== 'Sistem UCAB') {
          if (autoReplyTimer.current) { clearTimeout(autoReplyTimer.current); autoReplyTimer.current = null; }
        }
      }).subscribe()
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault(); if (!input.trim()) return
    const content = input; setInput('')
    await supabase.from('messages').insert([{ content, sender_id: sessionId, user_name: userName, is_admin: false }])

    if (autoReplyTimer.current) clearTimeout(autoReplyTimer.current)
    autoReplyTimer.current = setTimeout(() => {
      supabase.from('messages').insert([{ 
        content: "Un operator UCAB App vă va prelua imediat. Vă mulțumim!", 
        sender_id: sessionId, user_name: 'Sistem UCAB', is_admin: true 
      }])
    }, 30000)
  }

  const handleGdprSubmit = (e: React.FormEvent) => {
    e.preventDefault(); if (!userName.trim()) return
    localStorage.setItem('ucab_app_gdpr', 'true'); localStorage.setItem('ucab_app_user_name', userName)
    setHasAcceptedGdpr(true); setupChat(sessionId)
  }

  useEffect(() => { if (isOpen) scrollRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isOpen])

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 20 }}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 bg-[#E11D48] text-white p-5 rounded-[2rem] shadow-[0_15px_40px_rgba(225,29,72,0.3)] border border-white/20"
          >
            <MessageCircle size={28} />
            
            {/* BULINA VERDE (Badge) */}
            {unreadCount > 0 && (
              <motion.div 
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 bg-[#10B981] text-white text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-lg"
              >
                {unreadCount}
              </motion.div>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed z-50 flex flex-col bg-[#F9F9F7] shadow-[0_30px_100px_rgba(0,0,0,0.15)] border border-black/5 overflow-hidden inset-0 md:inset-auto md:bottom-6 md:right-6 md:w-[380px] md:h-[600px] md:rounded-[2.5rem]"
          >
            {/* Header */}
            <div className="p-6 flex items-center justify-between border-b border-black/[0.03] bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FEF2F2] rounded-2xl flex items-center justify-center border border-[#FECACA]">
                  <Headset size={20} className="text-[#E11D48]" />
                </div>
                <div>
                  <h3 className="text-black font-bold text-[11px] uppercase tracking-widest leading-none">Support ucab-food</h3>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="w-1.5 h-1.5 bg-[#E11D48] rounded-full animate-pulse" />
                    <span className="text-[#E11D48] text-[9px] font-black uppercase tracking-widest opacity-80">online</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-[#F1F1F1] rounded-xl text-black/20 hover:text-black transition-all">
                <X size={20} />
              </button>
            </div>

            {!hasAcceptedGdpr ? (
              <div className="flex-1 p-10 flex flex-col justify-center bg-[#F9F9F7]">
                <div className="w-16 h-16 bg-white border border-black/5 rounded-3xl flex items-center justify-center text-[#E11D48] mb-6 shadow-sm">
                  <ShieldCheck size={32} />
                </div>
                <h4 className="text-black font-bold text-xl mb-2 tracking-tight">Salutare!</h4>
                <p className="text-black/40 text-sm mb-8 leading-relaxed">Te rugăm să introduci numele restaurantului pentru a începe.</p>
                <form onSubmit={handleGdprSubmit} className="space-y-4">
                  <input
                    required value={userName} onChange={(e) => setUserName(e.target.value)}
                    placeholder="Nume Restaurant"
                    className="w-full bg-white border border-black/5 rounded-xl px-5 py-4 text-sm text-black outline-none focus:border-[#E11D48]/30 transition-all"
                  />
                  <button type="submit" className="w-full bg-[#E11D48] text-white font-black py-4 rounded-xl hover:bg-[#BE123C] shadow-lg shadow-[#E11D48]/20 transition-all uppercase text-[10px] tracking-[0.2em]">
                    Start Conversație
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#F9F9F7]">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-20 text-center">
                      <p className="text-[10px] text-black font-black uppercase tracking-[0.2em]">Scrie-ne un mesaj și îți răspundem imediat</p>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <motion.div
                      key={m.id || i}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`flex ${m.is_admin ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                        m.is_admin 
                        ? 'bg-white text-black border border-black/[0.03] rounded-tl-none font-medium' 
                        : 'bg-[#E11D48] text-white rounded-tr-none shadow-[#E11D48]/10'
                      }`}>
                        {m.content}
                      </div>
                    </motion.div>
                  ))}
                  <div ref={scrollRef} />
                </div>

                <div className="p-4 bg-white border-t border-black/[0.03]">
                  <form onSubmit={handleSend} className="relative flex items-center">
                    <input
                      value={input} onChange={(e) => setInput(e.target.value)}
                      placeholder="Scrie un mesaj..."
                      className="w-full bg-[#F9F9F7] border border-black/5 rounded-2xl px-5 py-4 pr-14 text-sm text-black outline-none focus:border-[#E11D48]/20 transition-all"
                    />
                    <button type="submit" className="absolute right-2 p-3 bg-[#E11D48] text-white rounded-xl hover:bg-[#BE123C] transition-all">
                      <Send size={18} />
                    </button>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
