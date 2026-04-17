import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Sparkles, Send, Loader2, RefreshCw, Bot, User,
  Key, Eye, EyeOff, ChevronDown, CheckCircle2, Database,
} from 'lucide-react';

// ── Models ────────────────────────────────────────────────────────────────
const OPENROUTER_FREE_MODELS = [
  { id: 'openai/gpt-oss-120b:free',               label: 'GPT OSS 120B แนะนำ' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 120B' },
  { id: 'google/gemma-4-31b-it:free',             label: 'Gemma 4 31B' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B' },
  { id: 'qwen/qwen3-coder:free',                  label: 'Qwen Coder' },
  { id: 'nousresearch/hermes-3-llama-3.1-405b:free', label: 'Hermes 405B' },
];

const QUICK_QUESTIONS = [
  'วันนี้มีเช็คอิน/เช็คเอ้าท์กี่บ้าน?',
  'ตอนนี้มีบ้านไหนพักอยู่บ้าง?',
  'สัปดาห์นี้มีเข้าพักกี่บ้าน?',
  'เดือนนี้รายได้รวมเท่าไหร่?',
  'ห้องไหนได้รับความนิยมมากสุด?',
  'ลูกค้าที่จองบ่อยที่สุดคือใคร?',
];

// ── Helpers ───────────────────────────────────────────────────────────────
const getTodayStr = () => new Date().toLocaleDateString('sv-SE');
const getTodayTH  = () => new Date().toLocaleDateString('th-TH', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

// ── Fetch all hotel data from Supabase ────────────────────────────────────
const fetchHotelData = async () => {
  const today = getTodayStr();
  const [{ data: bookings }, { data: ops }] = await Promise.all([
    supabase.from('bookings').select('*').order('start_date', { ascending: false }).limit(300),
    supabase.from('booking_ops').select('*').limit(300),
    supabase.from('customers').select('*').limit(300),
    supabase.from('rooms').select('*').limit(300),
    supabase.from('booking_playtime').select('*').limit(300),
  ]);
  

  const opsMap = {};
  (ops||[]).forEach(o => { opsMap[o.booking_id] = o; });

  const enriched = (bookings||[]).map(b => {
    const op = opsMap[b.id] || {};
    const isCI = !!op.checked_in;
    const isCO = !!op.checked_out;
    return {
      บ้าน: b.room_type,
      ชื่อลูกค้า: b.customer_name,
      ชื่อแมว: b.cat_names,
      เบอร์โทร: b.phone || '-',
      วันเช็คอิน: b.start_date,
      วันเช็คเอ้าท์: b.end_date,
      ราคารวม: b.total_price ? `${Number(b.total_price).toLocaleString()} บาท` : '-',
      หมายเหตุ: b.notes || '-',
      สถานะ: isCO ? 'เช็คเอ้าท์แล้ว' : isCI ? 'กำลังพักอยู่' : 'ยังไม่เช็คอิน',
      เวลาเช็คอิน: op.checkin_time || '-',
      เวลาเช็คเอ้าท์: op.checkout_time || '-',
    };
  });

  const staying      = enriched.filter(b => b.สถานะ === 'กำลังพักอยู่');
  const ciToday      = enriched.filter(b => b.วันเช็คอิน === today);
  const coToday      = enriched.filter(b => b.วันเช็คเอ้าท์ === today);
  const thisMonth    = today.slice(0, 7);
  const monthRevenue = (bookings||[]).filter(b => b.start_date?.startsWith(thisMonth)).reduce((s, b) => s + (Number(b.total_price)||0), 0);

  return {
    today,
    todayTH: getTodayTH(),
    summary: {
      รายการจองทั้งหมด: enriched.length,
      กำลังพักอยู่ตอนนี้: staying.length,
      เช็คอินวันนี้: ciToday.length,
      เช็คเอ้าท์วันนี้: coToday.length,
      รายได้เดือนนี้: `${monthRevenue.toLocaleString()} บาท`,
    },
    กำลังพักอยู่ตอนนี้: staying,
    เช็คอินวันนี้: ciToday,
    เช็คเอ้าท์วันนี้: coToday,
    การจองทั้งหมด: enriched,
  };
};

// ── System Prompt ─────────────────────────────────────────────────────────
const buildSystemPrompt = (data) => `คุณชื่อ "จริงใจ AI" เป็นผู้ช่วยของ "โรงแรมแมวจริงใจ" (Jingjai Cat Hotel)
วันนี้: ${data.todayTH}

━━━ ภาพรวมโรงแรมวันนี้ ━━━
${Object.entries(data.summary).map(([k,v]) => `• ${k}: ${v}`).join('\n')}

━━━ บ้านที่กำลังพักอยู่ตอนนี้ (${data.กำลังพักอยู่ตอนนี้.length} บ้าน) ━━━
${data.กำลังพักอยู่ตอนนี้.length > 0
  ? data.กำลังพักอยู่ตอนนี้.map(b => `• ${b.บ้าน} — ${b.ชื่อลูกค้า} (🐱${b.ชื่อแมว}) เช็คเอ้าท์: ${b.วันเช็คเอ้าท์} เบอร์: ${b.เบอร์โทร}`).join('\n')
  : '• ไม่มี'}

━━━ เช็คอินวันนี้ (${data.เช็คอินวันนี้.length} บ้าน) ━━━
${data.เช็คอินวันนี้.length > 0
  ? data.เช็คอินวันนี้.map(b => `• ${b.บ้าน} — ${b.ชื่อลูกค้า} (🐱${b.ชื่อแมว}) สถานะ: ${b.สถานะ}`).join('\n')
  : '• ไม่มี'}

━━━ เช็คเอ้าท์วันนี้ (${data.เช็คเอ้าท์วันนี้.length} บ้าน) ━━━
${data.เช็คเอ้าท์วันนี้.length > 0
  ? data.เช็คเอ้าท์วันนี้.map(b => `• ${b.บ้าน} — ${b.ชื่อลูกค้า} (🐱${b.ชื่อแมว}) สถานะ: ${b.สถานะ}`).join('\n')
  : '• ไม่มี'}

━━━ ข้อมูลการจองทั้งหมด (${data.การจองทั้งหมด.length} รายการ) ━━━
${data.การจองทั้งหมด.map(b =>
  `[${b.บ้าน}] ${b.ชื่อลูกค้า} | 🐱${b.ชื่อแมว} | 📱${b.เบอร์โทร} | ${b.วันเช็คอิน}→${b.วันเช็คเอ้าท์} | ${b.ราคารวม} | ${b.สถานะ}`
).join('\n')}

━━━ กฎการตอบ ━━━
1. ตอบภาษาไทยเท่านั้น ห้ามมีภาษาอังกฤษนอกจากชื่อเฉพาะ
2. ตอบเหมือนพนักงานโรงแรมที่รู้จักลูกค้าดี สุภาพ กระชับ อ่านง่าย
3. ห้ามแสดง JSON, โค้ด, หรือข้อมูลทางเทคนิคใดๆ ทั้งสิ้น
4. ถ้าถามเรื่องเบอร์โทรหรือชื่อ → ตอบทันทีว่าเบอร์/ชื่อนั้นคือใคร อยู่บ้านไหน
5. ถ้าถามช่วงวันที่ → นับจากข้อมูลการจองทั้งหมด ตอบจำนวนและรายชื่อ
6. ถ้าถามรายได้ → คำนวณจากราคารวมในข้อมูล แสดงตัวเลขให้ชัดเจน
7. ถ้าถามว่าห้องว่างไหม → ดูจากการจองที่ทับซ้อนกันในช่วงนั้น
8. ตอบให้ครบทุกรายการ ห้ามตัดข้อมูล
9. ห้ามบอกว่า "ไม่มีข้อมูล" ถ้าข้อมูลอยู่ในระบบ ให้ค้นหาให้ดีก่อนตอบ`;

// ── Supabase key storage ──────────────────────────────────────────────────
const SETTINGS_TABLE = 'app_settings';
const KEY_NAME       = 'openrouter_api_key';

async function loadKeyFromSupabase() {
  try {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE).select('value').eq('key', KEY_NAME).single();
    if (!error && data?.value) return data.value;
  } catch {}
  return null;
}

async function saveKeyToSupabase(key) {
  try {
    const { error } = await supabase
      .from(SETTINGS_TABLE)
      .upsert({ key: KEY_NAME, value: key }, { onConflict: 'key' });
    return !error;
  } catch { return false; }
}

// ── Component ─────────────────────────────────────────────────────────────
export default function AIAssistant() {
  const [model, setModel]       = useState(OPENROUTER_FREE_MODELS[0].id);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'สวัสดีครับ! 🐱 ผมจิงจิง AI ผู้ช่วยของโรงแรมแมวจริงใจ\n\nถามผมได้เลยครับ เช่น:\n• บ้านไหนพักอยู่ตอนนี้?\n• เบอร์ 08X-XXX-XXXX คือของใคร?\n• ช่วงเทศกาลมีเข้าพักกี่บ้าน?\n• เดือนนี้รายรับรวมเท่าไหร่?' }
  ]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [apiKey, setApiKey]     = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey]   = useState(false);
  const [showKeyPanel, setShowKeyPanel] = useState(false);
  const [keyState, setKeyState] = useState('loading'); // loading | empty | ready | saving | saved | error
  const [keySource, setKeySource] = useState(''); // 'supabase' | 'local'
  const bottomRef               = useRef(null);

  // Load key from Supabase on mount
  useEffect(() => {
    (async () => {
      setKeyState('loading');
      const saved = await loadKeyFromSupabase();
      if (saved) {
        setApiKey(saved);
        setKeyInput(saved);
        setKeyState('ready');
        setKeySource('supabase');
      } else {
        // Fallback: localStorage
        const local = localStorage.getItem('openrouter_key_fallback');
        if (local) {
          setApiKey(local);
          setKeyInput(local);
          setKeyState('ready');
          setKeySource('local');
          setShowKeyPanel(false);
        } else {
          setKeyState('empty');
          setShowKeyPanel(true);
        }
      }
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const saveKey = async () => {
    if (!keyInput.trim()) return;
    setKeyState('saving');
    const ok = await saveKeyToSupabase(keyInput.trim());
    if (ok) {
      setApiKey(keyInput.trim());
      setKeyState('saved');
      setKeySource('supabase');
      setShowKeyPanel(false);
      setTimeout(() => setKeyState('ready'), 2000);
    } else {
      // Supabase table might not exist — fallback to localStorage
      localStorage.setItem('openrouter_key_fallback', keyInput.trim());
      setApiKey(keyInput.trim());
      setKeyState('ready');
      setKeySource('local');
      setShowKeyPanel(false);
    }
  };

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    if (!apiKey) { setShowKeyPanel(true); return; }
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const data    = await fetchHotelData();
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Jingjai Cat Hotel AI',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: buildSystemPrompt(data) },
            ...history,
            { role: 'user', content: msg },
          ],
          max_tokens: 1500,
          temperature: 0.2,
        }),
      });

      const json = await res.json();
      if (json.error) {
        const em = json.error.message || '';
        if (em.includes('rate limit') || em.includes('quota') || em.includes('429')) {
          throw new Error('โมเดลนี้ใช้งานเยอะเกินไป กรุณาเปลี่ยนโมเดลแล้วลองใหม่ครับ');
        }
        if (em.includes('401') || em.includes('key') || em.includes('auth')) {
          setKeyState('error');
          throw new Error('API Key ไม่ถูกต้อง กรุณาตรวจสอบและบันทึก Key ใหม่ครับ');
        }
        throw new Error(em || 'เกิดข้อผิดพลาดจาก API');
      }
      const reply = json.choices?.[0]?.message?.content || 'ไม่ได้รับคำตอบ';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ ${err.message}\n\nลองเปลี่ยนโมเดลหรือตรวจสอบ API Key ครับ`,
      }]);
    }
    setLoading(false);
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: 'เริ่มการสนทนาใหม่แล้วครับ 🐱 ถามได้เลย!' }]);
  };

  // Key status display
  const keyBadge = (() => {
    if (keyState === 'loading') return { text: '⏳ กำลังโหลด...', cls: 'bg-white/10 border-white/20 text-white/60' };
    if (keyState === 'empty')   return { text: '⚠️ ยังไม่มี API Key', cls: 'bg-red-500/20 border-red-400/40 text-red-300' };
    if (keyState === 'saving')  return { text: '⏳ กำลังบันทึก...', cls: 'bg-white/10 border-white/20 text-white/60' };
    if (keyState === 'saved')   return { text: '✓ บันทึกแล้ว!', cls: 'bg-green-500/20 border-green-400/40 text-green-300' };
    if (keyState === 'error')   return { text: '❌ Key ผิดพลาด', cls: 'bg-red-500/20 border-red-400/40 text-red-300' };
    // ready
    return keySource === 'supabase'
      ? { text: '✓ Key จาก Supabase', cls: 'bg-green-500/20 border-green-400/40 text-green-300' }
      : { text: '✓ Key จาก Local', cls: 'bg-blue-500/20 border-blue-400/40 text-blue-300' };
  })();

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-h-[820px] min-h-[520px]">

      {/* ── Header ── */}
      <div className="relative overflow-hidden bg-[#372C2E] rounded-[2rem] px-6 py-5 shadow-2xl shadow-[#372C2E]/20 mb-4 shrink-0">
        <div className="absolute -top-4 -right-4 text-8xl opacity-[0.04] rotate-12 select-none">✨</div>
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
                {OPENROUTER_FREE_MODELS.map(m => (
                  <option key={m.id} value={m.id} className="bg-[#372C2E] text-white">{m.label}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
            </div>

            {/* Key badge button */}
            <button onClick={() => setShowKeyPanel(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-[11px] font-bold transition-all ${keyBadge.cls}`}>
              {keySource === 'supabase' && keyState === 'ready' ? <Database size={12}/> : <Key size={12}/>}
              {keyBadge.text}
            </button>

            <button onClick={clearChat}
              className="p-2 bg-white/10 border border-white/20 rounded-xl text-white/70 hover:text-white transition-all" title="เริ่มสนทนาใหม่">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* ── API Key panel ── */}
        {showKeyPanel && (
          <div className="relative z-10 mt-4 bg-white/10 border border-white/20 rounded-2xl p-4 space-y-3">
            {/* Info bar */}
            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
              <Database size={14} className="text-[#DE9E48] mt-0.5 shrink-0" />
              <div>
                <p className="text-white font-black text-xs">Key เก็บใน Supabase — ใส่ครั้งเดียว ทุกเครื่องใช้ได้เลย</p>
                <p className="text-white/50 text-[11px] mt-0.5">
                  ต้องสร้างตาราง <code className="bg-white/10 px-1 rounded">app_settings</code> ใน Supabase ก่อน<br/>
                  SQL: <code className="bg-white/10 px-1 rounded text-white/60">CREATE TABLE app_settings (key text PRIMARY KEY, value text);</code><br/>
                  ถ้าไม่มีตาราง จะบันทึกลงในเครื่องแทน (ใช้ได้เฉพาะเครื่องนั้น)
                </p>
              </div>
            </div>

            <div>
              <p className="text-white/70 text-xs font-bold mb-1.5">🔑 OpenRouter API Key (สมัครฟรีได้ที่ openrouter.ai)</p>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input type={showKey ? 'text' : 'password'} value={keyInput}
                    onChange={e => setKeyInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveKey()}
                    placeholder="sk-or-v1-..."
                    className="w-full bg-white/10 border border-white/20 text-white text-xs font-mono rounded-xl px-3 py-2.5 outline-none focus:border-[#DE9E48] pr-9 placeholder:text-white/30"
                  />
                  <button onClick={() => setShowKey(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                    {showKey ? <EyeOff size={13}/> : <Eye size={13}/>}
                  </button>
                </div>
                <button onClick={saveKey} disabled={keyState==='saving' || !keyInput.trim()}
                  className="px-4 py-2 bg-[#DE9E48] text-[#372C2E] font-black text-xs rounded-xl hover:bg-[#f0b55e] transition-all disabled:opacity-50 shrink-0">
                  {keyState==='saving' ? <Loader2 size={12} className="animate-spin"/> : 'บันทึก'}
                </button>
              </div>
            </div>

            {keyState === 'ready' && apiKey && (
              <div className="flex items-center gap-2 text-green-300 text-[11px] font-bold">
                <CheckCircle2 size={13}/>
                <span>พร้อมใช้งาน {keySource==='supabase'?'(เก็บใน Supabase — ทุกเครื่องใช้ได้)':'(เก็บในเครื่องนี้เท่านั้น)'}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Quick questions ── */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 shrink-0 scrollbar-hide">
        {QUICK_QUESTIONS.map((q, i) => (
          <button key={i} onClick={() => sendMessage(q)} disabled={loading || !apiKey}
            className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full bg-white border border-[#DBD0C5] text-[#885E43] hover:bg-[#F5EEE8] hover:border-[#885E43] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            {q}
          </button>
        ))}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role==='user'?'justify-end':'justify-start'}`}>
            {msg.role==='assistant' && (
              <div className="w-8 h-8 rounded-xl bg-[#372C2E] flex items-center justify-center shrink-0 mt-1">
                <Bot size={14} className="text-[#DE9E48]"/>
              </div>
            )}
            <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role==='user'
                ? 'bg-[#885E43] text-white rounded-tr-sm font-medium'
                : 'bg-white border border-[#efebe9] text-[#372C2E] rounded-tl-sm shadow-sm'
            }`}>
              {msg.content}
            </div>
            {msg.role==='user' && (
              <div className="w-8 h-8 rounded-xl bg-[#DE9E48] flex items-center justify-center shrink-0 mt-1">
                <User size={14} className="text-[#372C2E]"/>
              </div>
            )}
          </div>
        ))}
        {loading && (
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

      {/* ── Input ── */}
      <div className="shrink-0">
        {!apiKey && keyState !== 'loading' && (
          <div className="mb-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-amber-700 text-xs font-bold">
            <Key size={13}/> กรุณาใส่ API Key ก่อนเริ่มใช้งาน AI ครับ
          </div>
        )}
        <div className={`flex gap-3 bg-white border rounded-2xl p-2 shadow-sm transition-all ${!apiKey?'border-amber-200':'border-[#DBD0C5] focus-within:border-[#885E43]'}`}>
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key==='Enter' && !e.shiftKey && sendMessage()}
            disabled={!apiKey || loading}
            placeholder={apiKey ? 'ถามได้เลย เช่น เบอร์ 081... คือของใคร? หรือ 15-20 เม.ย. มีเข้าพักกี่บ้าน?' : 'ใส่ API Key ก่อนครับ...'}
            className="flex-1 text-sm text-[#372C2E] placeholder:text-[#C4A99A] outline-none px-2 font-medium bg-transparent disabled:cursor-not-allowed"
          />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim() || !apiKey}
            className="p-2.5 rounded-xl bg-[#885E43] text-white hover:bg-[#6e4a34] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
            {loading ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
          </button>
        </div>
        <p className="text-center text-[10px] text-[#C4A99A] mt-2 font-bold">
          ทดสอบระบบAIผู้ช่วย
        </p>
      </div>
    </div>
  );
}
