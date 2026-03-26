'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, MessageCircle, ShieldCheck, Check, Zap, Headset, Sparkles } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AppSupportWidget() {
  const [isOpen, setIsOpen] = useState(false)
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

  const setupChat = async (sId: string) => {
    const { data } = await supabase.from('messages').select('*').eq('sender_id', sId).order('created_at', { ascending: true })
    if (data) setMessages(data)

    supabase.channel(`app_chat_${sId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${sId}` }, 
      (p) => {
        setMessages(prev => [...prev, p.new])
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
      {/* TRIGGER - ROȘU PREMIUM */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 20 }}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 bg-[#E11D48] text-white p-5 rounded-[2rem] shadow-[0_15px_40px_rgba(225,29,72,0.3)] border border-white/20"
          >
            <MessageCircle size={28} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed z-50 flex flex-col bg-[#F9F9F7] shadow-[0_30px_100px_rgba(0,0,0,0.15)] border border-black/5 overflow-hidden
              inset-0 md:inset-auto md:bottom-6 md:right-6 md:w-[380px] md:h-[600px] md:rounded-[2.5rem]"
          >
            {/* Header Red/Creme */}
            <div className="p-6 flex items-center justify-between border-b border-black/[0.03] bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FEF2F2] rounded-2xl flex items-center justify-center border border-[#FECACA]">
                  <Headset size={20} className="text-[#E11D48]" />
                </div>
                <div>
                  <h3 className="text-black font-bold text-[11px] uppercase tracking-widest leading-none">App Support</h3>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="w-1.5 h-1.5 bg-[#E11D48] rounded-full animate-pulse" />
                    <span className="text-[#E11D48] text-[9px] font-black uppercase tracking-widest opacity-80">Priority Line</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-[#F1F1F1] rounded-xl text-black/20 hover:text-black transition-all">
                <X size={20} />
              </button>
            </div>

            {!hasAcceptedGdpr ? (
              /* FORMULAR GDPR CREME-RED */
              <div className="flex-1 p-10 flex flex-col justify-center bg-[#F9F9F7]">
                <div className="w-16 h-16 bg-white border border-black/5 rounded-3xl flex items-center justify-center text-[#E11D48] mb-6 shadow-sm">
                  <ShieldCheck size={32} />
                </div>
                <h4 className="text-black font-bold text-xl mb-2 tracking-tight">Salutare!</h4>
                <p className="text-black/40 text-sm mb-8 leading-relaxed">Avem nevoie de un nume pentru a activa conexiunea securizată.</p>
                <form onSubmit={handleGdprSubmit} className="space-y-4">
                  <input
                    required value={userName} onChange={(e) => setUserName(e.target.value)}
                    placeholder="Numele tău"
                    className="w-full bg-white border border-black/5 rounded-xl px-5 py-4 text-sm text-black outline-none focus:border-[#E11D48]/30 transition-all"
                  />
                  <button type="submit" className="w-full bg-[#E11D48] text-white font-black py-4 rounded-xl hover:bg-[#BE123C] shadow-lg shadow-[#E11D48]/20 transition-all uppercase text-[10px] tracking-[0.2em]">
                    Start Conversație
                  </button>
                </form>
              </div>
            ) : (
              <>
                {/* Zona Mesaje Premium */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#F9F9F7] custom-scrollbar">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-10">
                      <Sparkles size={32} className="text-black mb-2" />
                      <p className="text-[9px] text-black font-black uppercase tracking-[0.3em]">Criptare Activă</p>
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

                {/* Input Area */}
                <div className="p-6 bg-white border-t border-black/[0.03]">
                  <form onSubmit={handleSend} className="flex gap-3 bg-[#F9F9F7] p-1.5 rounded-2xl border border-black/5 focus-within:border-[#E11D48]/20 transition-all">
                    <input
                      value={input} onChange={(e) => setInput(e.target.value)}
                      placeholder="Cum te putem ajuta?"
                      className="flex-1 bg-transparent px-4 py-3 text-sm text-black outline-none placeholder:text-black/20"
                    />
                    <button type="submit" className="bg-[#E11D48] text-white p-3.5 rounded-xl hover:bg-[#BE123C] transition-all shadow-md active:scale-90">
                      <Send size={18} />
                    </button>
                  </form>
                  <p className="text-[9px] text-black/20 text-center mt-4 font-bold uppercase tracking-widest">UCAB App Services</p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
