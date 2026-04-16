import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Send, Loader2, RefreshCw, Bot, User, Key, Eye, EyeOff, ChevronDown, AlertCircle } from 'lucide-react';

const OPENROUTER_FREE_MODELS = [
  { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash (แนะนำ/เร็ว)' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (ฉลาด/คนใช้เยอะ)' },
  { id: 'qwen/qwen3-coder:free', label: 'Qwen Coder' },
  { id: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B' },
];

const QUICK_QUESTIONS = [
  'ตอนนี้มีแมวบ้านไหนพักอยู่บ้าง?',
  'วันนี้มีเช็คอินกี่บ้าน?',
  'สรุปรายได้ของเดือนนี้ให้หน่อย',
  'ใครคือลูกค้าประจำของเรา?',
];

const getTodayISO = () => new Date().toISOString().split('T')[0];
const getTodayTH = () => {
  return new Date().toLocaleDateString('th-TH', { 
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' 
  });
};

export default function AIAssistant() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openrouter_api_key') || '');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(OPENROUTER_FREE_MODELS[0].id);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'สวัสดีครับ! 🐱 ผมคือ "จอมทัพ" ผู้ช่วย AI ของโรงแรมแมวจริงใจ หากถามแล้วขึ้นข้อผิดพลาด 429 ให้ลองเปลี่ยนรุ่น AI ที่มุมขวาบนดูนะครับ!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyInput, setKeyInput] = useState(apiKey);
  const [showKeyPanel, setShowKeyPanel] = useState(!apiKey);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchAndProcessData = async () => {
    const todayISO = getTodayISO();
    const [{ data: bookings }, { data: customers }, { data: ops }] = await Promise.all([
      supabase.from('bookings').select('*').order('start_date', { ascending: false }).limit(60),
      supabase.from('customers').select('*').limit(50),
      supabase.from('booking_ops').select('*').limit(100),
    ]);

    const opsMap = {};
    (ops || []).forEach(o => { opsMap[o.booking_id] = o; });

    const allBookings = (bookings || []).map(b => ({
      customer: b.customer_name,
      cats: b.cat_names,
      room: b.room_type,
      start: b.start_date,
      end: b.end_date,
      price: b.total_price,
      status: opsMap[b.id]?.checked_out ? 'เช็คเอ้าท์แล้ว' : (opsMap[b.id]?.checked_in ? 'กำลังพักอยู่' : 'รอดำเนินการ')
    }));

    const activeNow = allBookings.filter(b => b.status === 'กำลังพักอยู่');
    const currentMonth = todayISO.substring(0, 7);
    const monthlyRevenue = allBookings
      .filter(b => b.start.startsWith(currentMonth))
      .reduce((sum, b) => sum + (b.price || 0), 0);

    return {
      todayTH: getTodayTH(),
      activeNowCount: activeNow.length,
      activeNowList: activeNow.map(a => `${a.customer} (${a.cats})`).join(', '),
      monthlyRevenue,
      allBookings: allBookings.slice(0, 30), // ลดขนาดข้อมูลเพื่อประหยัด Token
      customerCount: (customers || []).length
    };
  };

  const buildSystemPrompt = (data) => {
    return `คุณคือ "จอมทัพ" AI โรงแรมแมวจริงใจ ตอบเป็นภาษาไทยสุภาพ
วันที่: ${data.todayTH}
สรุปตอนนี้: มีแมวพักอยู่ ${data.activeNowCount} บ้าน ได้แก่ [${data.activeNowList}], รายได้เดือนนี้ ${data.monthlyRevenue.toLocaleString()} บาท

ข้อมูลการจองล่าสุด (JSON):
${JSON.stringify(data.allBookings)}

กฎ: 1.ห้ามเดา 2.ห้ามโชว์ JSON 3.สรุปเป็นข้อๆ 4.ถ้าถามรายได้ให้ใช้ยอดที่คำนวณให้แล้ว 5.ใช้ emoji 🐱🐾`;
  };

  const saveApiKey = () => {
    localStorage.setItem('openrouter_api_key', keyInput);
    setApiKey(keyInput);
    setShowKeyPanel(false);
  };

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    if (!apiKey) { setShowKeyPanel(true); return; }

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const data = await fetchAndProcessData();
      const systemPrompt = buildSystemPrompt(data);

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Jingjai Cat Hotel Admin',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-4).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: msg },
          ],
          temperature: 0.3,
        }),
      });

      if (res.status === 429) {
        throw new Error('โควตา Model นี้เต็มชั่วคราว (Rate Limit) แนะนำให้รอ 30 วินาที หรือเลือก Model อื่นที่มุมขวาบนครับ');
      }

      const json = await res.json();
      if (json.error) throw new Error(json.error.message || 'API Error');
      
      const reply = json.choices?.[0]?.message?.content || 'ไม่ได้รับคำตอบจากระบบ';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `⚠️ ข้อผิดพลาด: ${err.message}` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-h-[850px] min-h-[600px] bg-white rounded-[2.5rem] overflow-hidden border border-[#E5E0DA] shadow-2xl">
      {/* Header */}
      <div className="bg-[#372C2E] p-6 shrink-0 relative">
        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center gap-4">
            <div className="bg-[#DE9E48] p-3 rounded-2xl rotate-3">
              <Bot size={24} className="text-[#372C2E]" />
            </div>
            <div>
              <h2 className="text-white font-black text-xl tracking-tight">จอมทัพ AI</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">System Online</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <select value={model} onChange={e => setModel(e.target.value)}
                className="bg-white/10 border border-white/20 text-white text-[11px] font-bold rounded-xl pl-3 pr-8 py-2 appearance-none outline-none focus:border-[#DE9E48] transition-all cursor-pointer">
                {OPENROUTER_FREE_MODELS.map(m => <option key={m.id} value={m.id} className="bg-[#372C2E] text-white">{m.label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
            </div>
            <button onClick={() => setShowKeyPanel(!showKeyPanel)} className="p-2.5 bg-white/10 rounded-xl text-white/70 hover:text-white transition-all">
              <Key size={18} />
            </button>
          </div>
        </div>

        {showKeyPanel && (
          <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 mb-2 text-[#DE9E48]">
              <AlertCircle size={14} />
              <p className="text-[10px] font-bold uppercase">OpenRouter API Settings</p>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-[#DE9E48] font-mono"
                />
                <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button onClick={saveApiKey} className="bg-[#DE9E48] text-[#372C2E] font-black px-4 py-2 rounded-xl text-xs hover:scale-105 active:scale-95 transition-all">บันทึก</button>
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div className="flex gap-2 p-4 overflow-x-auto scrollbar-hide bg-[#FDFCFB] border-b border-[#F0EAE5]">
        {QUICK_QUESTIONS.map((q, i) => (
          <button key={i} onClick={() => sendMessage(q)} className="shrink-0 px-5 py-2.5 bg-white border border-[#E5E0DA] rounded-2xl text-xs font-bold text-[#885E43] hover:border-[#885E43] hover:bg-[#FDF8F3] transition-all shadow-sm active:scale-95">
            {q}
          </button>
        ))}
      </div>

      {/* Chat Space */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FDFCFB]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${msg.role === 'user' ? 'bg-[#DE9E48] rotate-3' : 'bg-[#372C2E] -rotate-3'}`}>
                {msg.role === 'user' ? <User size={20} className="text-[#372C2E]" /> : <Bot size={20} className="text-[#DE9E48]" />}
              </div>
              <div className={`p-4 rounded-3xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-[#885E43] text-white rounded-tr-none font-medium' 
                  : msg.content.startsWith('⚠️') 
                    ? 'bg-red-50 text-red-700 border border-red-100 rounded-tl-none' 
                    : 'bg-white text-[#372C2E] border border-[#F0EAE5] rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-2xl bg-[#372C2E] flex items-center justify-center">
              <Loader2 size={20} className="text-[#DE9E48] animate-spin" />
            </div>
            <div className="bg-white border border-[#F0EAE5] p-4 rounded-3xl rounded-tl-none">
              <span className="text-xs font-black text-[#A1887F] tracking-widest uppercase italic">กำลังประมวลผลข้อมูล...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-6 bg-white border-t border-[#F0EAE5]">
        <div className="flex gap-3 p-2 bg-[#F8F5F2] border-2 border-[#F0EAE5] rounded-2xl focus-within:border-[#DE9E48] focus-within:bg-white transition-all">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="ถามจอมทัพได้เลย เช่น สรุปรายชื่อแมวที่พักอยู่ตอนนี้..."
            className="flex-1 bg-transparent px-4 outline-none text-sm font-bold text-[#372C2E] placeholder:text-[#C4A99A]"
          />
          <button 
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="bg-[#372C2E] text-[#DE9E48] p-3.5 rounded-xl hover:scale-105 active:scale-95 disabled:opacity-20 disabled:scale-100 transition-all shadow-xl"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-center text-[9px] text-[#C4A99A] mt-3 font-bold uppercase tracking-[0.2em]">Powered by OpenRouter AI • Jingjai Cat Hotel v2.0</p>
      </div>
    </div>
  );
}
