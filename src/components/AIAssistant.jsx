import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Send, Loader2, RefreshCw, Bot, User, Key, Eye, EyeOff, ChevronDown } from 'lucide-react';

const OPENROUTER_FREE_MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (แนะนำ)' },
  { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash' },
  { id: 'qwen/qwen3-coder:free', label: 'Qwen Coder' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 120B' },
];

const QUICK_QUESTIONS = [
  'ตอนนี้มีแมวบ้านไหนพักอยู่บ้าง?',
  'วันนี้มีเช็คอินกี่บ้าน?',
  'สรุปรายได้ของเดือนนี้ให้หน่อย',
  'ใครคือลูกค้าประจำของเรา?',
  'ห้องประเภทไหนขายดีที่สุด?',
];

const getTodayISO = () => new Date().toISOString().split('T')[0];
const getTodayTH = () => {
  const d = new Date();
  return d.toLocaleDateString('th-TH', { 
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' 
  });
};

export default function AIAssistant() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openrouter_api_key') || '');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(OPENROUTER_FREE_MODELS[0].id);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'สวัสดีครับ! 🐱 ผมคือ "จอมทัพ" ผู้ช่วย AI ของโรงแรมแมวจริงใจ วันนี้มีอะไรให้ผมช่วยตรวจสอบข้อมูลไหมครับ?' }
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
    
    const [ { data: bookings }, { data: customers }, { data: ops } ] = await Promise.all([
      supabase.from('bookings').select('*').order('start_date', { ascending: false }).limit(100),
      supabase.from('customers').select('*'),
      supabase.from('booking_ops').select('*'),
    ]);

    const opsMap = {};
    (ops || []).forEach(o => { opsMap[o.booking_id] = o; });

    // --- ส่วนการประมวลผลข้อมูลเพื่อให้ AI ไม่ต้องคำนวณเอง (Precision) ---
    const allBookings = (bookings || []).map(b => ({
      id: b.id,
      customer: b.customer_name,
      cats: b.cat_names,
      room: b.room_type,
      start: b.start_date,
      end: b.end_date,
      price: b.total_price,
      status: opsMap[b.id]?.checked_out ? 'เช็คเอ้าท์แล้ว' : (opsMap[b.id]?.checked_in ? 'กำลังพักอยู่' : 'รอดำเนินการ')
    }));

    const activeNow = allBookings.filter(b => b.status === 'กำลังพักอยู่');
    const todayCheckIn = allBookings.filter(b => b.start === todayISO);
    
    // คำนวณรายได้เดือนปัจจุบัน
    const currentMonth = todayISO.substring(0, 7); // YYYY-MM
    const monthlyRevenue = allBookings
      .filter(b => b.start.startsWith(currentMonth))
      .reduce((sum, b) => sum + (b.price || 0), 0);

    // สถิติห้องพัก
    const roomStats = allBookings.reduce((acc, b) => {
      acc[b.room] = (acc[b.room] || 0) + 1;
      return acc;
    }, {});

    return {
      todayTH: getTodayTH(),
      activeNow,
      todayCheckIn,
      monthlyRevenue,
      roomStats,
      allBookings: allBookings.slice(0, 50), // ส่งประวัติล่าสุด 50 รายการพอป้องกัน Token เต็ม
      customerCount: (customers || []).length
    };
  };

  const buildSystemPrompt = (data) => {
    return `คุณคือ "จอมทัพ" ผู้จัดการโรงแรมแมวอัจฉริยะ (Jingjai Cat Hotel)
    
วันที่ปัจจุบัน: ${data.todayTH}

ข้อมูลสรุปเรียลไทม์:
- แมวที่กำลังพักอยู่ตอนนี้: ${data.activeNow.length} บ้าน (${data.activeNow.map(b => b.cats).join(', ')})
- ลูกค้าทั้งหมดในระบบ: ${data.customerCount} รายการ
- รายได้รวมเฉพาะเดือนนี้: ${data.monthlyRevenue.toLocaleString()} บาท
- ความนิยมห้องพัก: ${JSON.stringify(data.roomStats)}

รายการจองล่าสุด (Data):
${JSON.stringify(data.allBookings)}

กฎเหล็กในการตอบ:
1. ตอบเป็นภาษาไทยที่สุภาพ มีบุคลิกคนรักแมว (ใช้ emoji 🐾, 🐱 ได้)
2. **ห้ามมโน** ถ้าไม่มีข้อมูลในลิสต์ที่ส่งให้ ให้ตอบว่า "ขออภัยครับ ผมไม่พบข้อมูลส่วนนี้ในระบบ"
3. เมื่อถูกถามเรื่องรายได้ หรือจำนวน ให้ใช้ข้อมูลสรุปจาก "ข้อมูลสรุปเรียลไทม์" เป็นหลัก
4. หากมีรายการเยอะ ให้สรุปเป็นข้อๆ ให้สวยงามและอ่านง่าย
5. ห้ามแสดง JSON หรือโครงสร้างโค้ดเด็ดขาด`;
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
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: msg },
          ],
          temperature: 0.3, // ต่ำเพื่อให้ตอบความจริง ไม่เน้นจินตนาการ
        }),
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      
      const reply = json.choices?.[0]?.message?.content || 'ขออภัยครับ ผมสับสนนิดหน่อย ลองถามใหม่อีกครั้งนะครับ';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ เกิดข้อผิดพลาด: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-h-[800px] min-h-[600px] bg-[#FDFCFB] rounded-[2.5rem] overflow-hidden border border-[#DBD0C5] shadow-xl">
      {/* Header */}
      <div className="bg-[#372C2E] p-6 shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-[#DE9E48] p-3 rounded-2xl">
              <Bot size={24} className="text-[#372C2E]" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">จอมทัพ AI Assistant</h2>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <p className="text-white/50 text-xs">พร้อมดูแลข้อมูลโรงแรมแมว</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <select value={model} onChange={e => setModel(e.target.value)}
              className="bg-white/10 border border-white/20 text-white text-[11px] rounded-lg px-2 py-1 outline-none">
              {OPENROUTER_FREE_MODELS.map(m => <option key={m.id} value={m.id} className="bg-[#372C2E]">{m.label}</option>)}
            </select>
            <button onClick={() => setShowKeyPanel(!showKeyPanel)} className="p-2 bg-white/10 rounded-lg text-white/70 hover:text-white">
              <Key size={16} />
            </button>
          </div>
        </div>

        {showKeyPanel && (
          <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl">
            <input
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              placeholder="ใส่ OpenRouter API Key ตรงนี้"
              className="w-full bg-black/20 border border-white/20 rounded-lg px-3 py-2 text-white text-xs mb-2 outline-none focus:border-[#DE9E48]"
            />
            <button onClick={saveApiKey} className="w-full bg-[#DE9E48] text-[#372C2E] font-bold py-2 rounded-lg text-xs">บันทึก Key</button>
          </div>
        )}
      </div>

      {/* Quick Questions */}
      <div className="flex gap-2 p-4 overflow-x-auto scrollbar-hide border-b border-[#F0EAE5]">
        {QUICK_QUESTIONS.map((q, i) => (
          <button key={i} onClick={() => sendMessage(q)} className="shrink-0 px-4 py-2 bg-white border border-[#DBD0C5] rounded-full text-xs font-semibold text-[#885E43] hover:bg-[#DE9E48] hover:text-white transition-all shadow-sm">
            {q}
          </button>
        ))}
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${msg.role === 'user' ? 'bg-[#DE9E48]' : 'bg-[#372C2E]'}`}>
                {msg.role === 'user' ? <User size={18} className="text-[#372C2E]" /> : <Bot size={18} className="text-[#DE9E48]" />}
              </div>
              <div className={`p-4 rounded-3xl shadow-sm text-sm leading-relaxed ${
                msg.role === 'user' ? 'bg-[#885E43] text-white rounded-tr-none' : 'bg-white text-[#372C2E] border border-[#F0EAE5] rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#372C2E] flex items-center justify-center animate-pulse">
              <Bot size={18} className="text-[#DE9E48]" />
            </div>
            <div className="bg-white border border-[#F0EAE5] p-4 rounded-3xl rounded-tl-none flex items-center gap-3">
              <Loader2 size={16} className="animate-spin text-[#DE9E48]" />
              <span className="text-xs font-bold text-[#A1887F]">จอมทัพกำลังเปิดสมุดบัญชี...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-[#F0EAE5]">
        <div className="flex gap-3 p-2 bg-[#F8F5F2] border-2 border-[#F0EAE5] rounded-2xl focus-within:border-[#DE9E48] transition-all">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="พิมพ์คำถามของคุณที่นี่..."
            className="flex-1 bg-transparent px-3 outline-none text-sm font-medium text-[#372C2E]"
          />
          <button 
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="bg-[#372C2E] text-[#DE9E48] p-3 rounded-xl hover:bg-[#4a3b3e] disabled:opacity-30 transition-all shadow-lg"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
