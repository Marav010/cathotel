import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Send, Loader2, RefreshCw, Bot, User, Key, Eye, EyeOff, ChevronDown } from 'lucide-react';

const OPENROUTER_FREE_MODELS = [
  { id: 'openai/gpt-3.5-turbo', label: 'GPT-3.5 (Free Tier)' },
  { id: 'meta-llama/llama-3-8b-instruct', label: 'Llama 3 8B (Free)' },
  { id: 'mistralai/mistral-7b-instruct', label: 'Mistral 7B (Free)' },
  { id: 'google/gemma-7b-it', label: 'Gemma 7B (Free)' },
  { id: 'nousresearch/nous-hermes-2-mixtral-8x7b-dpo', label: 'Mixtral Hermes (Free)' },
];

const QUICK_QUESTIONS = [
  'มีบ้านไหนพักอยู่ตอนนี้บ้าง?',
  'สัปดาห์นี้มีเข้าพักกี่บ้าน?',
  'เดือนนี้รายได้รวมเท่าไหร่?',
  'ลูกค้าคนไหนที่จองบ่อยที่สุด?',
  'ห้องไหนที่ได้รับความนิยมมากที่สุด?',
  'วันนี้มีเช็คอิน/เช็คเอ้าท์กี่บ้าน?',
];

const todayStr = () => new Date().toLocaleDateString('sv-SE');

export default function AIAssistant() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openrouter_api_key') || '');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(OPENROUTER_FREE_MODELS[0].id);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'สวัสดีครับ! 🐱 ผมเป็น AI ผู้ช่วยของโรงแรมแมวจริงใจ ถามผมได้เลยเกี่ยวกับข้อมูลการจอง ลูกค้า รายได้ หรืออะไรก็ตามที่เกี่ยวกับโรงแรม!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyInput, setKeyInput] = useState(apiKey);
  const [showKeyPanel, setShowKeyPanel] = useState(!apiKey);
  const [contextData, setContextData] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchAllData = async () => {
    const today = todayStr();
    const [
      { data: bookings },
      { data: customers },
      { data: ops },
    ] = await Promise.all([
      supabase.from('bookings').select('*').order('start_date', { ascending: false }).limit(200),
      supabase.from('customers').select('*').limit(200),
      supabase.from('booking_ops').select('*').limit(200),
    ]);

    const opsMap = {};
    (ops||[]).forEach(o => { opsMap[o.booking_id] = o; });

    return {
      today,
      totalBookings: (bookings||[]).length,
      bookings: (bookings||[]).map(b => ({
        id: b.id,
        customerName: b.customer_name,
        catNames: b.cat_names,
        roomType: b.room_type,
        startDate: b.start_date,
        endDate: b.end_date,
        phone: b.phone,
        totalPrice: b.total_price,
        notes: b.notes,
        checkedIn: !!opsMap[b.id]?.checked_in,
        checkedOut: !!opsMap[b.id]?.checked_out,
        checkinTime: opsMap[b.id]?.checkin_time,
        checkoutTime: opsMap[b.id]?.checkout_time,
      })),
      customers: (customers||[]).length > 0 ? customers : [],
    };
  };
const tryFetchAI = async (payload) => {
  const modelsToTry = [
    model,
    'meta-llama/llama-3-8b-instruct',
    'mistralai/mistral-7b-instruct'
  ];

  for (const m of modelsToTry) {
    try {
   const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    contents: [
      {
        parts: [{ text: systemPrompt + "\n\nUser: " + msg }]
      }
    ]
  })
});

const json = await res.json();
const reply = json.candidates?.[0]?.content?.parts?.[0]?.text || 'ไม่ได้รับคำตอบ';
  const buildSystemPrompt = (data) => {
    const activeNow = data.bookings.filter(b => b.checkedIn && !b.checkedOut);
    const todayCI = data.bookings.filter(b => b.startDate === data.today);
    const todayCO = data.bookings.filter(b => b.endDate === data.today);

    return `คุณเป็น AI ผู้ช่วยของ "โรงแรมแมวจริงใจ" (Jingjai Cat Hotel) โรงแรมสำหรับแมว

วันนี้คือ: ${data.today}
จำนวนการจองทั้งหมด: ${data.totalBookings} รายการ
บ้านที่กำลังเข้าพักอยู่ตอนนี้: ${activeNow.length} บ้าน
เช็คอินวันนี้: ${todayCI.length} บ้าน
เช็คเอ้าท์วันนี้: ${todayCO.length} บ้าน

ประเภทบ้านพัก: สแตนดาร์ด, ดีลักซ์, ซูพีเรีย, พรีเมี่ยม, วีไอพี, วีวีไอพี

ข้อมูลการจอง (${data.bookings.length} รายการล่าสุด):
${JSON.stringify(data.bookings, null, 0)}

${data.customers.length > 0 ? `ข้อมูลลูกค้า: ${JSON.stringify(data.customers, null, 0)}` : ''}

กรุณา:
- ตอบเป็นภาษาไทยเสมอ
- ใช้ข้อมูลจริงจากระบบในการตอบ
- สรุปข้อมูลให้ชัดเจน กระชับ เข้าใจง่าย
- ถ้าไม่พบข้อมูล ให้บอกตามตรง
- ใช้ emoji เล็กน้อยเพื่อให้น่าอ่าน
- ถ้ามีตัวเลขให้แสดงให้ชัดเจน`;
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
    const data = await fetchAllData();
    const systemPrompt = buildSystemPrompt(data);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: systemPrompt + "\n\nUser: " + msg
                }
              ]
            }
          ]
        })
      }
    );

    const json = await res.json();

    const reply =
      json.candidates?.[0]?.content?.parts?.[0]?.text ||
      'ไม่ได้รับคำตอบ';

    setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

  } catch (err) {
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `❌ เกิดข้อผิดพลาด: ${err.message}`,
    }]);
  }

  setLoading(false);
};

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: 'สวัสดีครับ! 🐱 ถามได้เลยครับ เกี่ยวกับข้อมูลในโรงแรมแมวจริงใจ' }]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-h-[800px] min-h-[500px]">
      {/* Header */}
      <div className="relative overflow-hidden bg-[#372C2E] rounded-[2rem] px-6 py-5 shadow-2xl shadow-[#372C2E]/20 mb-4 shrink-0">
        <div className="absolute -top-4 -right-4 text-8xl opacity-[0.05] rotate-12 select-none">✨</div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-[#DE9E48] p-3.5 rounded-2xl shadow-lg shrink-0">
              <Sparkles size={22} className="text-[#372C2E]" />
            </div>
            <div>
              <p className="text-[#DE9E48] text-[10px] font-black uppercase tracking-[0.25em] mb-0.5">Admin · AI Assistant</p>
              <h2 className="text-xl font-black text-white tracking-tight">ผู้ช่วย AI โรงแรมแมว</h2>
              <p className="text-white/40 text-xs mt-0.5">ถามข้อมูลการจอง ลูกค้า รายรับ และอื่นๆ ได้เลย</p>
            </div>
          </div>
          <div className="md:ml-auto flex items-center gap-2 shrink-0 flex-wrap">
            {/* Model selector */}
            <div className="relative">
              <select value={model} onChange={e => setModel(e.target.value)}
                className="bg-white/10 border border-white/20 text-white font-bold text-[11px] rounded-xl px-3 py-2 outline-none focus:border-[#DE9E48] appearance-none cursor-pointer pr-7">
                {OPENROUTER_FREE_MODELS.map(m => (
                  <option key={m.id} value={m.id} className="bg-[#372C2E] text-white">{m.label}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
            </div>
            <button onClick={() => setShowKeyPanel(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white/70 hover:text-white text-[11px] font-bold transition-all">
              <Key size={13} /> API Key
            </button>
            <button onClick={clearChat}
              className="p-2 bg-white/10 border border-white/20 rounded-xl text-white/70 hover:text-white transition-all">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* API Key panel */}
        {showKeyPanel && (
          <div className="relative z-10 mt-4 bg-white/10 border border-white/20 rounded-2xl p-4">
            <p className="text-white/80 text-xs font-bold mb-2">🔑 OpenRouter API Key (ฟรี 100% — สมัครได้ที่ openrouter.ai)</p>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full bg-white/10 border border-white/20 text-white text-xs font-mono rounded-xl px-3 py-2 outline-none focus:border-[#DE9E48] pr-8"
                />
                <button onClick={() => setShowKey(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                  {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              <button onClick={saveApiKey}
                className="px-4 py-2 bg-[#DE9E48] text-[#372C2E] font-black text-xs rounded-xl hover:bg-[#f0b55e] transition-all">
                บันทึก
              </button>
            </div>
            <p className="text-white/40 text-[10px] mt-2">Key ถูกเก็บใน localStorage ของเบราว์เซอร์เท่านั้น ไม่ถูกส่งไปที่อื่น</p>
          </div>
        )}
      </div>

      {/* Quick questions */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-3 shrink-0 scrollbar-hide">
        {QUICK_QUESTIONS.map((q, i) => (
          <button key={i} onClick={() => sendMessage(q)}
            className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full bg-white border border-[#DBD0C5] text-[#885E43] hover:bg-[#F5EEE8] hover:border-[#885E43] transition-all">
            {q}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-[#372C2E] flex items-center justify-center shrink-0 mt-1">
                <Bot size={14} className="text-[#DE9E48]" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-[#885E43] text-white rounded-tr-sm font-medium'
                : 'bg-white border border-[#efebe9] text-[#372C2E] rounded-tl-sm shadow-sm'
            }`}>
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-[#DE9E48] flex items-center justify-center shrink-0 mt-1">
                <User size={14} className="text-[#372C2E]" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl bg-[#372C2E] flex items-center justify-center shrink-0 mt-1">
              <Bot size={14} className="text-[#DE9E48]" />
            </div>
            <div className="bg-white border border-[#efebe9] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-[#A1887F]">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-xs font-bold">กำลังดึงข้อมูลและวิเคราะห์...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0">
        <div className="flex gap-3 bg-white border border-[#DBD0C5] rounded-2xl p-2 shadow-sm focus-within:border-[#885E43] transition-all">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="ถามเกี่ยวกับข้อมูลโรงแรม เช่น บ้านไหนจะเช็คออกวันนี้? เบอร์นี้คือบ้านไหน?"
            className="flex-1 text-sm text-[#372C2E] placeholder:text-[#C4A99A] outline-none px-2 font-medium bg-transparent"
          />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            className="p-2.5 rounded-xl bg-[#885E43] text-white hover:bg-[#6e4a34] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p className="text-center text-[10px] text-[#C4A99A] mt-2 font-bold">
          ใช้ OpenRouter Free Models • ข้อมูลดึงจาก Supabase โดยตรง
        </p>
      </div>
    </div>    
  );
}
