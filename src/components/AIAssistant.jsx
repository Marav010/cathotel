import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Send, Loader2, RefreshCw, Bot, User, Key, Eye, EyeOff, ChevronDown, CheckCircle2 } from 'lucide-react';

// ========== CONFIG ==========
const HARDCODED_API_KEY = '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';

const OPENROUTER_MODELS = [
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 120B' },
  { id: 'openai/gpt-oss-120b:free', label: 'GPT OSS 120B' },
  { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B' },
  { id: 'qwen/qwen3-coder:free', label: 'Qwen Coder' },
  { id: 'nousresearch/hermes-3-llama-3.1-405b:free', label: 'Hermes 405B' },
];


const QUICK_QUESTIONS = [
  'มีบ้านไหนพักอยู่ตอนนี้บ้าง?',
  'สัปดาห์นี้มีเข้าพักกี่บ้าน?',
  ' วันนี้มีเช็คอิน/เช็คเอ้าท์กี่บ้าน?',
  ' ตอนนี้มีบ้านไหนพักอยู่บ้าง?',
  ' สัปดาห์นี้มีเข้าพักกี่บ้าน?',
  ' เดือนนี้รายได้รวมเท่าไหร่?',
  ' ห้องไหนได้รับความนิยมมากสุด?',
  ' ลูกค้าที่จองบ่อยที่สุดคือใคร?',
];

const getTodayStr = () => new Date().toLocaleDateString('sv-SE');
const getTodayTH  = () => new Date().toLocaleDateString('th-TH', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

// ========== DATA FETCHER ==========
const fetchHotelData = async () => {
  const today = getTodayStr();
  const [
    { data: bookings },
    { data: ops },
    { data: playtimes },
  ] = await Promise.all([
    supabase.from('bookings').select('*').order('start_date', { ascending: false }).limit(300),
    supabase.from('booking_ops').select('*').limit(300),
    supabase.from('booking_playtime').select('*').gte('play_date', today).limit(200),
  ]);

  const opsMap = {};
  (ops||[]).forEach(o => { opsMap[o.booking_id] = o; });

  const enriched = (bookings||[]).map(b => {
    const op = opsMap[b.id] || {};
    const isCheckedIn  = !!op.checked_in;
    const isCheckedOut = !!op.checked_out;
    const isStayingNow = isCheckedIn && !isCheckedOut;
    return {
      บ้าน: b.room_type,
      ชื่อลูกค้า: b.customer_name,
      ชื่อแมว: b.cat_names,
      เบอร์โทร: b.phone || '-',
      วันเช็คอิน: b.start_date,
      วันเช็คเอ้าท์: b.end_date,
      ราคารวม: b.total_price ? `${Number(b.total_price).toLocaleString()} บาท` : '-',
      หมายเหตุ: b.notes || '-',
      สถานะ: isCheckedOut ? 'เช็คเอ้าท์แล้ว' : isCheckedIn ? 'กำลังพักอยู่' : 'ยังไม่เช็คอิน',
      เวลาเช็คอิน: op.checkin_time || '-',
      เวลาเช็คเอ้าท์: op.checkout_time || '-',
    };
  });

  const stayingNow  = enriched.filter(b => b.สถานะ === 'กำลังพักอยู่');
  const checkInToday  = enriched.filter(b => b.วันเช็คอิน === today);
  const checkOutToday = enriched.filter(b => b.วันเช็คเอ้าท์ === today);

  // Monthly revenue
  const thisMonth = today.substring(0, 7);
  const monthlyRevenue = (bookings||[])
    .filter(b => b.start_date?.startsWith(thisMonth))
    .reduce((sum, b) => sum + (Number(b.total_price)||0), 0);

  return {
    today,
    todayTH: getTodayTH(),
    summary: {
      รายการจองทั้งหมด: enriched.length,
      กำลังพักอยู่ตอนนี้: stayingNow.length,
      เช็คอินวันนี้: checkInToday.length,
      เช็คเอ้าท์วันนี้: checkOutToday.length,
      รายได้เดือนนี้: `${monthlyRevenue.toLocaleString()} บาท`,
    },
    กำลังพักอยู่ตอนนี้: stayingNow,
    เช็คอินวันนี้: checkInToday,
    เช็คเอ้าท์วันนี้: checkOutToday,
    การจองทั้งหมด: enriched,
  };
};

// ========== SYSTEM PROMPT ==========
const buildSystemPrompt = (data) => `คุณชื่อ "จิงใจ AI" เป็นผู้ช่วยของ "โรงแรมแมวจริงใจ" (Jingjai Cat Hotel)
วันนี้: ${data.todayTH}

━━━ ภาพรวมโรงแรมวันนี้ ━━━
${Object.entries(data.summary).map(([k,v]) => `• ${k}: ${v}`).join('\n')}

━━━ บ้านที่กำลังพักอยู่ตอนนี้ (${data.กำลังพักอยู่ตอนนี้.length} บ้าน) ━━━
${data.กำลังพักอยู่ตอนนี้.length > 0
  ? data.กำลังพักอยู่ตอนนี้.map(b =>
      `• ${b.บ้าน} — ${b.ชื่อลูกค้า} (🐱 ${b.ชื่อแมว}) เช็คเอ้าท์: ${b.วันเช็คเอ้าท์} เบอร์: ${b.เบอร์โทร}`
    ).join('\n')
  : '• ไม่มี'}

━━━ เช็คอินวันนี้ (${data.เช็คอินวันนี้.length} บ้าน) ━━━
${data.เช็คอินวันนี้.length > 0
  ? data.เช็คอินวันนี้.map(b =>
      `• ${b.บ้าน} — ${b.ชื่อลูกค้า} (🐱 ${b.ชื่อแมว}) สถานะ: ${b.สถานะ}`
    ).join('\n')
  : '• ไม่มี'}

━━━ เช็คเอ้าท์วันนี้ (${data.เช็คเอ้าท์วันนี้.length} บ้าน) ━━━
${data.เช็คเอ้าท์วันนี้.length > 0
  ? data.เช็คเอ้าท์วันนี้.map(b =>
      `• ${b.บ้าน} — ${b.ชื่อลูกค้า} (🐱 ${b.ชื่อแมว}) สถานะ: ${b.สถานะ}`
    ).join('\n')
  : '• ไม่มี'}

━━━ ข้อมูลการจองทั้งหมด (${data.การจองทั้งหมด.length} รายการ) ━━━
${data.การจองทั้งหมด.map(b =>
  `[${b.บ้าน}] ${b.ชื่อลูกค้า} | 🐱${b.ชื่อแมว} | 📱${b.เบอร์โทร} | ${b.วันเช็คอิน}→${b.วันเช็คเอ้าท์} | ${b.ราคารวม} | สถานะ:${b.สถานะ}`
).join('\n')}

━━━ กฎการตอบ ━━━
1. ตอบภาษาไทยเท่านั้น ห้ามมีภาษาอังกฤษนอกจากชื่อเฉพาะ
2. ตอบเหมือนพนักงานโรงแรมที่รู้จักลูกค้าดี สุภาพ กระชับ
3. ห้ามแสดง JSON, โค้ด, หรือข้อมูลทางเทคนิคใดๆ ทั้งสิ้น
4. ถ้าถามเรื่องเบอร์โทรหรือชื่อ → ให้ตอบตรงๆ ว่าเบอร์/ชื่อนั้นคือใคร อยู่บ้านไหน
5. ถ้าถามช่วงวันที่ → นับจากข้อมูลการจองทั้งหมด ตอบจำนวนและรายชื่อ
6. ถ้าถามรายได้ → คำนวณจากราคารวมในข้อมูล แล้วแสดงตัวเลขชัดเจน
7. ถ้าถามว่าห้องว่างไหม → ดูจากการจองที่ทับซ้อนกัน
8. ตอบให้ครบทุกรายการที่ถามโดยไม่ตัดทอน
9. ห้ามบอกว่า "ไม่มีข้อมูล" ถ้าข้อมูลอยู่ในระบบแล้ว ให้ค้นหาให้ดีก่อน`;

// ========== MAIN COMPONENT ==========
export default function AIAssistant() {
  const [model, setModel]       = useState(OPENROUTER_MODELS[0].id);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'สวัสดีครับ! 🐱 ผมเป็น AI ผู้ช่วยของโรงแรมแมวจริงใจ ถามผมได้เลยเกี่ยวกับข้อมูลการจอง ลูกค้า รายได้ หรืออะไรก็ตามที่เกี่ยวกับโรงแรม!' }
  ]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [keyStatus, setKeyStatus] = useState('ready'); // 'ready' | 'saving' | 'saved' | 'custom'
  const [showKeyPanel, setShowKeyPanel] = useState(false);
  const [customKey, setCustomKey] = useState('');
  const [showKey, setShowKey]   = useState(false);
  const [activeKey, setActiveKey] = useState(HARDCODED_API_KEY);
  const bottomRef               = useRef(null);

  // On mount: check if there's a custom key saved in Supabase (shared across devices)
  useEffect(() => {
    loadSharedKey();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load API key from Supabase app_settings (shared across all devices)
  const loadSharedKey = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'openrouter_api_key')
        .single();
      if (data?.value && data.value !== HARDCODED_API_KEY) {
        setActiveKey(data.value);
        setCustomKey(data.value);
        setKeyStatus('custom');
      } else {
        setActiveKey(HARDCODED_API_KEY);
        setKeyStatus('ready');
      }
    } catch {
      // Table might not exist yet — use hardcoded key
      setActiveKey(HARDCODED_API_KEY);
      setKeyStatus('ready');
    }
  };

  // Save API key to Supabase (shared across all devices)
  const saveSharedKey = async () => {
    if (!customKey.trim()) return;
    setKeyStatus('saving');
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'openrouter_api_key', value: customKey.trim() }, { onConflict: 'key' });
      if (!error) {
        setActiveKey(customKey.trim());
        setKeyStatus('saved');
        setShowKeyPanel(false);
        setTimeout(() => setKeyStatus('custom'), 2000);
      } else {
        // Fallback: just use in session
        setActiveKey(customKey.trim());
        setKeyStatus('custom');
        setShowKeyPanel(false);
      }
    } catch {
      setActiveKey(customKey.trim());
      setKeyStatus('custom');
      setShowKeyPanel(false);
    }
  };

  const resetToDefault = async () => {
    try {
      await supabase.from('app_settings').upsert(
        { key: 'openrouter_api_key', value: HARDCODED_API_KEY },
        { onConflict: 'key' }
      );
    } catch {}
    setActiveKey(HARDCODED_API_KEY);
    setCustomKey('');
    setKeyStatus('ready');
    setShowKeyPanel(false);
  };

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const data = await fetchHotelData();
      const systemPrompt = buildSystemPrompt(data);
      // Keep last 6 messages for context (not too long)
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Jingjai Cat Hotel AI',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: msg },
          ],
          max_tokens: 2500,
          temperature: 0.2, // ต่ำ = ตอบแม่นยำกว่า
        }),
      });

      const json = await res.json();
      if (json.error) {
        const errMsg = json.error.message || '';
        if (errMsg.includes('rate limit') || errMsg.includes('quota')) {
          throw new Error('โมเดลนี้ถูกใช้งานเยอะเกินไป กรุณาเปลี่ยนโมเดลแล้วลองใหม่ครับ');
        }
        throw new Error(errMsg || 'API Error');
      }
      const reply = json.choices?.[0]?.message?.content || 'ไม่ได้รับคำตอบ';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ ${err.message}\n\nลองเปลี่ยนโมเดลแล้วถามใหม่ครับ`,
      }]);
    }
    setLoading(false);
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: 'เริ่มการสนทนาใหม่แล้วครับ 🐱 ถามได้เลย!' }]);
  };

  const keyLabel = keyStatus === 'saving' ? '⏳ กำลังบันทึก...'
    : keyStatus === 'saved' ? '✓ บันทึกแล้ว!'
    : keyStatus === 'custom' ? '🔑 Key ที่กำหนดเอง'
    : '✓ พร้อมใช้งาน';

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-h-[820px] min-h-[520px]">

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
              <h2 className="text-xl font-black text-white tracking-tight">จิงใจ AI ผู้ช่วยโรงแรมแมว</h2>
              <p className="text-white/40 text-xs mt-0.5">ดึงข้อมูลสดจากระบบทุกครั้งที่ถาม</p>
            </div>
          </div>
          <div className="md:ml-auto flex items-center gap-2 shrink-0 flex-wrap">
            {/* Model selector */}
            <div className="relative">
              <select value={model} onChange={e => setModel(e.target.value)}
                className="bg-white/10 border border-white/20 text-white font-bold text-[11px] rounded-xl px-3 py-2 outline-none focus:border-[#DE9E48] appearance-none cursor-pointer pr-7">
                {OPENROUTER_MODELS.map(m => (
                  <option key={m.id} value={m.id} className="bg-[#372C2E] text-white">{m.label}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
            </div>
            {/* Key status badge */}
            <button onClick={() => setShowKeyPanel(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-[11px] font-bold transition-all ${
                keyStatus === 'ready' ? 'bg-green-500/20 border-green-400/40 text-green-300'
                : keyStatus === 'custom' ? 'bg-blue-500/20 border-blue-400/40 text-blue-300'
                : 'bg-white/10 border-white/20 text-white/70'
              }`}>
              {keyStatus === 'ready' || keyStatus === 'saved' ? <CheckCircle2 size={12}/> : <Key size={12}/>}
              {keyLabel}
            </button>
            <button onClick={clearChat}
              className="p-2 bg-white/10 border border-white/20 rounded-xl text-white/70 hover:text-white transition-all" title="เริ่มสนทนาใหม่">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* API Key panel */}
        {showKeyPanel && (
          <div className="relative z-10 mt-4 bg-white/10 border border-white/20 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-white font-black text-sm">🔑 กำหนด API Key เอง</p>
                <p className="text-white/50 text-[11px] mt-0.5">Key จะถูกบันทึกใน Supabase — ทุกเครื่องที่เข้าเว็บนี้จะใช้ Key เดียวกัน</p>
              </div>
              <button onClick={resetToDefault}
                className="text-[10px] font-black px-2 py-1 rounded-lg bg-white/10 text-white/60 hover:text-white transition-all shrink-0">
                รีเซ็ตเป็น Default
              </button>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input type={showKey ? 'text' : 'password'} value={customKey}
                  onChange={e => setCustomKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full bg-white/10 border border-white/20 text-white text-xs font-mono rounded-xl px-3 py-2.5 outline-none focus:border-[#DE9E48] pr-9"
                />
                <button onClick={() => setShowKey(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                  {showKey ? <EyeOff size={13}/> : <Eye size={13}/>}
                </button>
              </div>
              <button onClick={saveSharedKey} disabled={keyStatus==='saving'}
                className="px-4 py-2 bg-[#DE9E48] text-[#372C2E] font-black text-xs rounded-xl hover:bg-[#f0b55e] transition-all disabled:opacity-50">
                {keyStatus==='saving'?'กำลังบันทึก...':'บันทึก'}
              </button>
            </div>
            <p className="text-white/40 text-[10px]">
              Key ถูกเก็บใน Supabase (ตาราง app_settings) • ต้องสร้างตารางก่อนถ้ายังไม่มี<br/>
              SQL: <code className="bg-white/10 px-1 rounded text-white/60">CREATE TABLE app_settings (key text PRIMARY KEY, value text);</code>
            </p>
          </div>
        )}
      </div>

      {/* Quick questions */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 shrink-0 scrollbar-hide">
        {QUICK_QUESTIONS.map((q, i) => (
          <button key={i} onClick={() => sendMessage(q)} disabled={loading}
            className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full bg-white border border-[#DBD0C5] text-[#885E43] hover:bg-[#F5EEE8] hover:border-[#885E43] transition-all disabled:opacity-50">
            {q}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role==='user'?'justify-end':'justify-start'}`}>
            {msg.role==='assistant'&&(
              <div className="w-8 h-8 rounded-xl bg-[#372C2E] flex items-center justify-center shrink-0 mt-1">
                <Bot size={14} className="text-[#DE9E48]"/>
              </div>
            )}
            <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role==='user'
                ?'bg-[#885E43] text-white rounded-tr-sm font-medium'
                :'bg-white border border-[#efebe9] text-[#372C2E] rounded-tl-sm shadow-sm'
            }`}>
              {msg.content}
            </div>
            {msg.role==='user'&&(
              <div className="w-8 h-8 rounded-xl bg-[#DE9E48] flex items-center justify-center shrink-0 mt-1">
                <User size={14} className="text-[#372C2E]"/>
              </div>
            )}
          </div>
        ))}
        {loading&&(
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl bg-[#372C2E] flex items-center justify-center shrink-0 mt-1">
              <Bot size={14} className="text-[#DE9E48]"/>
            </div>
            <div className="bg-white border border-[#efebe9] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-[#A1887F]">
                <Loader2 size={14} className="animate-spin"/>
                <span className="text-xs font-bold">กำลังดึงข้อมูลและวิเคราะห์...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div className="shrink-0">
        <div className="flex gap-3 bg-white border border-[#DBD0C5] rounded-2xl p-2 shadow-sm focus-within:border-[#885E43] transition-all">
          <input type="text" value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendMessage()}
            placeholder="ถามได้เลย เช่น เบอร์ 081... คือของใคร? หรือ 15-20 เม.ย. มีเข้าพักกี่บ้าน?"
            className="flex-1 text-sm text-[#372C2E] placeholder:text-[#C4A99A] outline-none px-2 font-medium bg-transparent"
          />
          <button onClick={()=>sendMessage()} disabled={loading||!input.trim()}
            className="p-2.5 rounded-xl bg-[#885E43] text-white hover:bg-[#6e4a34] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
            {loading?<Loader2 size={16} className="animate-spin"/>:<Send size={16}/>}
          </button>
        </div>
        <p className="text-center text-[10px] text-[#C4A99A] mt-2 font-bold">
          OpenRouter Free Models • ข้อมูลดึงสดจาก Supabase ทุกครั้งที่ถาม
        </p>
      </div>
    </div>
  );
}
