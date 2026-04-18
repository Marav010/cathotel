import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Sparkles, Send, Loader2, RefreshCw, Bot, User,
  Key, Eye, EyeOff, ChevronDown, CheckCircle2, Database, BarChart2, Settings2,
  ThumbsUp, ThumbsDown,
} from 'lucide-react';

// ── Models ────────────────────────────────────────────────────────────────
const OPENROUTER_FREE_MODELS = [
  { id: 'openrouter/free',                           label: '🎲 Auto (เลือกอัตโนมัติ)' },
  { id: 'openai/gpt-oss-120b:free',                  label: 'GPT OSS 120B⭐' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free',    label: 'Llama 3.3 70B' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free',    label: 'Nemotron 120B' },
  { id: 'google/gemma-4-31b-it:free',                label: 'Gemma 4 31B' },
  { id: 'qwen/qwen3-coder:free',                     label: 'Qwen3 Coder' },
  { id: 'nousresearch/hermes-3-llama-3.1-405b:free', label: 'Hermes 405B' },
  { id: 'google/gemma-3-27b-it:free',                label: 'Gemma 3 27B' },
  { id: 'minimax/minimax-m2.5:free',                 label: 'MiniMax M2.5' },
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
const getTodayTH  = () => new Date().toLocaleDateString('th-TH', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});

// ── Fetch ALL hotel data from Supabase ────────────────────────────────────
// ตาราง: bookings, booking_ops, booking_playtime, customers, rooms, shop_products, app_settings
const fetchHotelData = async () => {
  const today = getTodayStr();

  // ดึงทุกตารางพร้อมกัน
  const [
    { data: bookings },
    { data: ops },
    { data: playtimes },
    { data: customers },
    { data: rooms },
    { data: shopProducts },
  ] = await Promise.all([
    supabase.from('bookings').select('*').order('start_date', { ascending: false }).limit(500),
    supabase.from('booking_ops').select('*').limit(500),
    supabase.from('booking_playtime').select('*').order('play_date', { ascending: false }).limit(500),
    supabase.from('customers').select('*').limit(300),
    supabase.from('rooms').select('*').limit(50),
    supabase.from('shop_products').select('*').limit(200),
  ]);

  // ── opsMap: booking_id → ops ──
  const opsMap = {};
  (ops || []).forEach(o => { opsMap[o.booking_id] = o; });

  // ── customersMap: id → customer ──
  const customersMap = {};
  (customers || []).forEach(c => { customersMap[c.id] = c; });

  // ── playtimeMap: booking_id → [sessions] ──
  const playtimeMap = {};
  (playtimes || []).forEach(p => {
    if (!playtimeMap[p.booking_id]) playtimeMap[p.booking_id] = [];
    playtimeMap[p.booking_id].push(p);
  });

  // ── enrich bookings ──
  const enriched = (bookings || []).map(b => {
    const op  = opsMap[b.id] || {};
    const cus = customersMap[b.customer_id] || {};
    const isCI = !!op.checked_in;
    const isCO = !!op.checked_out;
    const sessions = playtimeMap[b.id] || [];
    const todayPlay = sessions.filter(p => p.play_date === today);
    return {
      id:             b.id,
      บ้าน:          b.room_type,
      ชื่อลูกค้า:    b.customer_name,
      ชื่อแมว:       b.cat_names,
      เบอร์โทร:      b.phone || cus.phone || '-',
      วันเช็คอิน:    b.start_date,
      วันเช็คเอ้าท์: b.end_date,
      ราคารวม:       b.total_price ? `${Number(b.total_price).toLocaleString()} บาท` : '-',
      มัดจำ:         b.deposit      ? `${Number(b.deposit).toLocaleString()} บาท`       : '-',
      วางมัดจำแล้ว:  b.is_deposited ? 'แล้ว' : 'ยังไม่วาง',
      หมายเหตุ:      b.note || b.notes || '-',
      สถานะการจอง:   b.booking_status || '-',
      สีบัญชี:       b.color_hex || '-',
      สถานะ:         isCO ? 'เช็คเอ้าท์แล้ว' : isCI ? 'กำลังพักอยู่' : 'ยังไม่เช็คอิน',
      เวลาเช็คอิน:   op.checkin_time   || '-',
      เวลาเช็คเอ้าท์: op.checkout_time || '-',
      รอบเล่นวันนี้: todayPlay.length > 0
        ? todayPlay.map(p => `${p.session}(ออก:${p.released_at}${p.returned_at?'/กลับ:'+p.returned_at:''})`).join(', ')
        : 'ยังไม่ปล่อย',
      // ข้อมูลลูกค้าเพิ่มเติม
      นิสัยการกิน:   cus.eating_habit || '-',
      แหล่งที่รู้จัก: cus.source       || '-',
    };
  });

  // ── filters ──
  const staying  = enriched.filter(b => b.สถานะ === 'กำลังพักอยู่');
  const ciToday  = enriched.filter(b => b.วันเช็คอิน    === today);
  const coToday  = enriched.filter(b => b.วันเช็คเอ้าท์ === today);

  // ── monthly revenue ──
  const thisMonth    = today.slice(0, 7);
  const monthRevenue = (bookings || [])
    .filter(b => b.start_date?.startsWith(thisMonth))
    .reduce((s, b) => s + (Number(b.total_price) || 0), 0);

  // ── rooms info ──
  const roomsInfo = (rooms || []).map(r => ({
    ประเภทห้อง:    r.room_type,
    จำนวนห้อง:    r.total_count,
    ราคาต่อคืน:   r.price_per_night ? `${Number(r.price_per_night).toLocaleString()} บาท` : '-',
  }));

  // ── shop products ──
  const shopInfo = (shopProducts || [])
    .filter(p => p.visible !== false)
    .map(p => ({
      สินค้า:   p.name,
      หมวดหมู่: p.category,
      ราคา:     p.price ? `${Number(p.price).toLocaleString()} ${p.unit||''}` : '-',
      สต็อก:    p.stock ?? '-',
    }));

  // ── customer stats ──
  const customerBookingCount = {};
  (bookings || []).forEach(b => {
    const key = b.customer_name;
    customerBookingCount[key] = (customerBookingCount[key] || 0) + 1;
  });
  const topCustomers = Object.entries(customerBookingCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => `${name} (${count} ครั้ง)`);

  // ── room popularity ──
  const roomPopularity = {};
  (bookings || []).forEach(b => {
    roomPopularity[b.room_type] = (roomPopularity[b.room_type] || 0) + 1;
  });
  const topRooms = Object.entries(roomPopularity)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `${type} (${count} ครั้ง)`);

  return {
    today,
    todayTH: getTodayTH(),
    summary: {
      รายการจองทั้งหมด:  enriched.length,
      กำลังพักอยู่ตอนนี้: staying.length,
      เช็คอินวันนี้:      ciToday.length,
      เช็คเอ้าท์วันนี้:  coToday.length,
      รายได้เดือนนี้:    `${monthRevenue.toLocaleString()} บาท`,
      จำนวนลูกค้าทั้งหมด: (customers || []).length,
    },
    กำลังพักอยู่ตอนนี้: staying,
    เช็คอินวันนี้:       ciToday,
    เช็คเอ้าท์วันนี้:   coToday,
    การจองทั้งหมด:      enriched,
    ข้อมูลห้องพัก:      roomsInfo,
    สินค้าในร้าน:       shopInfo,
    ลูกค้าจองบ่อย:      topCustomers,
    ห้องที่นิยม:        topRooms,
    ลูกค้าทั้งหมด:      (customers || []).map(c => ({
      ชื่อ:     c.customer_name,
      เบอร์:    c.phone || '-',
      แหล่งที่รู้จัก: c.source || '-',
      นิสัยการกิน: c.eating_habit || '-',
      หมายเหตุ: c.note || '-',
    })),
  };
};

// ── System Prompt ─────────────────────────────────────────────────────────
const buildSystemPrompt = (data) => `คุณชื่อ "จิงจิง AI" เป็นผู้ช่วยของ "โรงแรมแมวจริงใจ" (Jingjai Cat Hotel)
วันนี้: ${data.todayTH}

━━━ ภาพรวมโรงแรมวันนี้ ━━━
${Object.entries(data.summary).map(([k, v]) => `• ${k}: ${v}`).join('\n')}

━━━ ประเภทห้องพักและราคา ━━━
${data.ข้อมูลห้องพัก.map(r => `• ${r.ประเภทห้อง} | ${r.จำนวนห้อง} ห้อง | ${r.ราคาต่อคืน}/คืน`).join('\n') || '• ไม่มีข้อมูล'}

━━━ บ้านที่กำลังพักอยู่ตอนนี้ (${data.กำลังพักอยู่ตอนนี้.length} บ้าน) ━━━
${data.กำลังพักอยู่ตอนนี้.length > 0
  ? data.กำลังพักอยู่ตอนนี้.map(b =>
      `• [${b.บ้าน}] ${b.ชื่อลูกค้า} | 🐱${b.ชื่อแมว} | 📱${b.เบอร์โทร} | เช็คเอ้าท์: ${b.วันเช็คเอ้าท์} | รอบเล่นวันนี้: ${b.รอบเล่นวันนี้}`
    ).join('\n')
  : '• ไม่มี'}

━━━ เช็คอินวันนี้ (${data.เช็คอินวันนี้.length} บ้าน) ━━━
${data.เช็คอินวันนี้.length > 0
  ? data.เช็คอินวันนี้.map(b =>
      `• [${b.บ้าน}] ${b.ชื่อลูกค้า} | 🐱${b.ชื่อแมว} | 📱${b.เบอร์โทร} | สถานะ: ${b.สถานะ} | มัดจำ: ${b.วางมัดจำแล้ว}`
    ).join('\n')
  : '• ไม่มี'}

━━━ เช็คเอ้าท์วันนี้ (${data.เช็คเอ้าท์วันนี้.length} บ้าน) ━━━
${data.เช็คเอ้าท์วันนี้.length > 0
  ? data.เช็คเอ้าท์วันนี้.map(b =>
      `• [${b.บ้าน}] ${b.ชื่อลูกค้า} | 🐱${b.ชื่อแมว} | สถานะ: ${b.สถานะ}`
    ).join('\n')
  : '• ไม่มี'}

━━━ ห้องที่ได้รับความนิยม ━━━
${data.ห้องที่นิยม.map((r, i) => `${i+1}. ${r}`).join('\n') || '• ไม่มีข้อมูล'}

━━━ ลูกค้าที่จองบ่อยที่สุด ━━━
${data.ลูกค้าจองบ่อย.map((c, i) => `${i+1}. ${c}`).join('\n') || '• ไม่มีข้อมูล'}

━━━ สินค้าในร้าน (${data.สินค้าในร้าน.length} รายการ) ━━━
${data.สินค้าในร้าน.slice(0, 20).map(p => `• [${p.หมวดหมู่}] ${p.สินค้า} | ${p.ราคา} | สต็อก: ${p.สต็อก}`).join('\n') || '• ไม่มีข้อมูล'}

━━━ ข้อมูลลูกค้าทั้งหมด (${data.ลูกค้าทั้งหมด.length} คน) ━━━
${data.ลูกค้าทั้งหมด.map(c => `• ${c.ชื่อ} | 📱${c.เบอร์} | รู้จักจาก: ${c.แหล่งที่รู้จัก} | กิน: ${c.นิสัยการกิน}`).join('\n') || '• ไม่มีข้อมูล'}

━━━ ข้อมูลการจองทั้งหมด (${data.การจองทั้งหมด.length} รายการ) ━━━
${data.การจองทั้งหมด.map(b =>
  `[${b.บ้าน}] ${b.ชื่อลูกค้า} | 🐱${b.ชื่อแมว} | 📱${b.เบอร์โทร} | ${b.วันเช็คอิน}→${b.วันเช็คเอ้าท์} | ${b.ราคารวม} | มัดจำ:${b.วางมัดจำแล้ว} | ${b.สถานะ}`
).join('\n')}

━━━ กฎการตอบ (สำคัญมาก ต้องทำตามทุกข้อ) ━━━
FORMAT:
- ห้ามใช้ * ** _ __ ~~  หรือ Markdown syntax ใดๆ ทั้งสิ้น เด็ดขาด
- ห้ามใช้ # ## ### หรือ heading ใดๆ
- ถ้าอยากเน้น ใช้ตัวอักษรปกติหรือ emoji แทน
- แต่ละรายการขึ้นบรรทัดใหม่ ใช้ emoji นำหน้าแทน bullet
- ถ้ามีหลายรายการ จัดเป็นบรรทัดสวยๆ อ่านง่าย เว้นบรรทัดระหว่างหัวข้อ

CONTENT:
- ตอบภาษาไทยเท่านั้น ห้ามมีภาษาอังกฤษนอกจากชื่อเฉพาะ
- ตอบเหมือนพนักงานโรงแรมมืออาชีพ สุภาพ อบอุ่น กระชับ
- ห้ามแสดง JSON, โค้ด, หรือข้อมูลทางเทคนิค
- ถ้าถามเบอร์/ชื่อ → ตอบทันทีว่าเป็นของใคร อยู่บ้านไหน
- ถ้าถามช่วงวันที่ → นับจากข้อมูลทั้งหมด ตอบจำนวนและรายชื่อ
- ถ้าถามรายได้ → คำนวณและแสดงตัวเลขชัดเจน
- ถ้าถามว่าห้องว่างไหม → ดูจากการจองที่ทับซ้อนในช่วงนั้น
- ถ้าถามมัดจำ → ดูจาก "วางมัดจำแล้ว" ของแต่ละบ้าน
- ตอบให้ครบทุกรายการ ห้ามตัดข้อมูล
- ห้ามบอกว่า "ไม่มีข้อมูล" ถ้าข้อมูลอยู่ในระบบ

ตัวอย่างการตอบที่ถูกต้อง:
🏠 บ้านวีไอพี — คุณสมชาย ใจดี
🐱 แมว: มีมี่, โดโด้
📱 เบอร์: 081-234-5678
📅 เช็คอิน: 18 เม.ย. และ เช็คเอ้าท์: 22 เม.ย.
💰 ราคา: 4,800 บาท | มัดจำ: วางแล้ว`;

// ── Supabase key storage ──────────────────────────────────────────────────
async function loadKeyFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('app_settings').select('value').eq('key', 'openrouter_api_key').single();
    if (!error && data?.value) return data.value;
  } catch {}
  return null;
}

async function saveKeyToSupabase(key) {
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'openrouter_api_key', value: key }, { onConflict: 'key' });
    return !error;
  } catch { return false; }
}


// ── Quota (usage counter) stored in Supabase ─────────────────────────────
const QUOTA_KEY    = 'ai_usage_count';
const LIMIT_KEY    = 'ai_usage_limit';
const DEFAULT_LIMIT = 100; // default monthly limit

async function loadQuota() {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('key,value')
      .in('key', [QUOTA_KEY, LIMIT_KEY]);
    const map = {};
    (data||[]).forEach(r => { map[r.key] = r.value; });
    return {
      used:  parseInt(map[QUOTA_KEY]  || '0', 10),
      limit: parseInt(map[LIMIT_KEY]  || String(DEFAULT_LIMIT), 10),
    };
  } catch { return { used: 0, limit: DEFAULT_LIMIT }; }
}

async function incrementQuota(current) {
  try {
    await supabase.from('app_settings')
      .upsert({ key: QUOTA_KEY, value: String(current + 1) }, { onConflict: 'key' });
    return current + 1;
  } catch { return current + 1; }
}

async function setQuotaLimit(newLimit) {
  try {
    await supabase.from('app_settings')
      .upsert({ key: LIMIT_KEY, value: String(newLimit) }, { onConflict: 'key' });
    return true;
  } catch { return false; }
}

async function resetQuota() {
  try {
    await supabase.from('app_settings')
      .upsert({ key: QUOTA_KEY, value: '0' }, { onConflict: 'key' });
    return true;
  } catch { return false; }
}

// ── Feedback / reward system ──────────────────────────────────────────────
// เก็บ feedback ไว้ใน app_settings key = 'ai_good_examples' และ 'ai_bad_examples'
// เป็น JSON array ของ { q, a } สูงสุด 10 คู่ล่าสุด

async function loadFeedback() {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('key,value')
      .in('key', ['ai_good_examples', 'ai_bad_examples']);
    const map = {};
    (data||[]).forEach(r => { map[r.key] = r.value; });
    return {
      good: JSON.parse(map['ai_good_examples'] || '[]'),
      bad:  JSON.parse(map['ai_bad_examples']  || '[]'),
    };
  } catch { return { good: [], bad: [] }; }
}

async function saveFeedback(type, question, answer) {
  // type = 'good' | 'bad'
  const key = type === 'good' ? 'ai_good_examples' : 'ai_bad_examples';
  try {
    const { data } = await supabase
      .from('app_settings').select('value').eq('key', key).single();
    let list = [];
    try { list = JSON.parse(data?.value || '[]'); } catch {}
    // keep max 8 examples
    list = [{ q: question.slice(0, 200), a: answer.slice(0, 400) }, ...list].slice(0, 8);
    await supabase.from('app_settings')
      .upsert({ key, value: JSON.stringify(list) }, { onConflict: 'key' });
    return true;
  } catch { return false; }
}


// ── Component ─────────────────────────────────────────────────────────────
export default function AIAssistant() {
  const [model, setModel]       = useState(OPENROUTER_FREE_MODELS[0].id);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'สวัสดีครับ! 🐱 ผมจิงจิง AI ผู้ช่วยของโรงแรมแมวจริงใจ\n\nตอนนี้ผมเชื่อมต่อกับฐานข้อมูลครบทุกตารางแล้วครับ ถามได้เลย เช่น:\n• บ้านไหนพักอยู่ตอนนี้?\n• เบอร์ 08X-XXX คือของใคร?\n• มัดจำบ้านนี้จ่ายครบยัง?\n• รอบปล่อยเล่นวันนี้บ้านไหนยังไม่ปล่อย?\n• เดือนนี้รายรับรวมเท่าไหร่?' }
  ]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [apiKey, setApiKey]     = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey]   = useState(false);
  const [showKeyPanel, setShowKeyPanel] = useState(false);
  const [keyState, setKeyState] = useState('loading');
  const [keySource, setKeySource] = useState('');
  const [quotaUsed, setQuotaUsed]   = useState(0);
  const [quotaLimit, setQuotaLimit] = useState(DEFAULT_LIMIT);
  const [showQuotaEdit, setShowQuotaEdit] = useState(false);
  const [limitInput, setLimitInput] = useState('');
  const [quotaLoading, setQuotaLoading]   = useState(false);
  const [feedbacks, setFeedbacks]         = useState({}); // msgIndex → 'good'|'bad'
  const [goodExamples, setGoodExamples]   = useState([]);
  const [badExamples, setBadExamples]     = useState([]);
  const bottomRef               = useRef(null);

  useEffect(() => {
    (async () => {
      // load quota
      const q = await loadQuota();
      setQuotaUsed(q.used); setQuotaLimit(q.limit); setLimitInput(String(q.limit));
      // load feedback examples
      const fb = await loadFeedback();
      setGoodExamples(fb.good); setBadExamples(fb.bad);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setKeyState('loading');
      const saved = await loadKeyFromSupabase();
      if (saved) {
        setApiKey(saved); setKeyInput(saved);
        setKeyState('ready'); setKeySource('supabase');
      } else {
        const local = localStorage.getItem('openrouter_key_fallback');
        if (local) {
          setApiKey(local); setKeyInput(local);
          setKeyState('ready'); setKeySource('local');
        } else {
          setKeyState('empty'); setShowKeyPanel(true);
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
      setApiKey(keyInput.trim()); setKeyState('saved'); setKeySource('supabase');
      setShowKeyPanel(false);
      setTimeout(() => setKeyState('ready'), 2000);
    } else {
      localStorage.setItem('openrouter_key_fallback', keyInput.trim());
      setApiKey(keyInput.trim()); setKeyState('ready'); setKeySource('local');
      setShowKeyPanel(false);
    }
  };

  const handleFeedback = async (msgIndex, type, question, answer) => {
    // prevent double-click
    if (feedbacks[msgIndex]) return;
    setFeedbacks(prev => ({ ...prev, [msgIndex]: type }));
    await saveFeedback(type, question, answer);
    // reload examples
    const fb = await loadFeedback();
    setGoodExamples(fb.good); setBadExamples(fb.bad);
  };

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    if (!apiKey) { setShowKeyPanel(true); return; }
    setInput('');
    const userMsgIndex = messages.length + 1; // index of upcoming assistant reply
    setMessages(prev => [...prev, { role: 'user', content: msg, _q: msg }]);
    setLoading(true);

    try {
      const data    = await fetchHotelData();
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      // build feedback context from saved examples
      const fbGood = goodExamples.slice(0, 5);
      const fbBad  = badExamples.slice(0, 3);
      const feedbackSection = (fbGood.length || fbBad.length) ? `

━━━ ตัวอย่างคำตอบที่ดี (ผู้ใช้กด 👍) ━━━
${fbGood.map((e,i) => `ถาม: ${e.q}\nตอบ: ${e.a}`).join('\n---\n') || 'ยังไม่มี'}

━━━ รูปแบบที่ควรหลีกเลี่ยง (ผู้ใช้กด 👎) ━━━
${fbBad.map((e,i) => `ถาม: ${e.q}\nตอบแบบนี้ไม่ดี: ${e.a.slice(0,150)}...`).join('\n---\n') || 'ยังไม่มี'}

ให้เรียนรู้จากตัวอย่างข้างบน และตอบในสไตล์เดียวกับที่ผู้ใช้ชอบ` : '';

      // helper: call one model
      const callModel = async (modelId) => {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer':  window.location.origin,
            'X-Title':       'Jingjai Cat Hotel AI',
          },
          body: JSON.stringify({
            model: modelId,
            messages: [
              { role: 'system', content: buildSystemPrompt(data) + feedbackSection },
              ...history,
              { role: 'user', content: msg },
            ],
            max_tokens:  2000,
            temperature: 0.15,
          }),
        });
        return res.json();
      };

      // try selected model first, then fallback to openrouter/free
      let json = await callModel(model);

      // if provider error → auto-retry with openrouter/free (auto-router)
      if (json.error && model !== 'openrouter/free') {
        const em = json.error.message || '';
        const isProviderErr = em.toLowerCase().includes('provider') ||
          em.includes('503') || em.includes('502') || em.includes('500') ||
          em.toLowerCase().includes('unavailable') || em.toLowerCase().includes('overload');
        if (isProviderErr) {
          // silent retry
          json = await callModel('openrouter/free');
        }
      }

      if (json.error) {
        const em = json.error.message || '';
        if (em.includes('rate limit') || em.includes('quota') || em.includes('429'))
          throw new Error('เกินโควต้าต่อวัน (200 ครั้ง) กรุณาลองพรุ่งนี้ หรือเปลี่ยนโมเดลครับ');
        if (em.includes('401') || em.toLowerCase().includes('key') || em.toLowerCase().includes('auth')) {
          setKeyState('error');
          throw new Error('API Key ไม่ถูกต้อง กรุณาตรวจสอบและบันทึก Key ใหม่ครับ');
        }
        throw new Error('โมเดลไม่พร้อมใช้งาน ลองเปลี่ยนเป็น "Auto" แล้วถามใหม่ครับ');
      }
      const rawReply = json.choices?.[0]?.message?.content || 'ไม่ได้รับคำตอบ';
      // strip markdown formatting that some models add despite instructions
      const reply = rawReply
        .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold** → plain
        .replace(/\*(.+?)\*/g, '$1')          // *italic* → plain
        .replace(/^#{1,6}\s+/gm, '')           // ### headings → plain
        .replace(/^\s*[-•]\s+/gm, '→ ')      // - bullet → →
        .replace(/__(.+?)__/g, '$1')            // __underline__ → plain
        .replace(/~~(.+?)~~/g, '$1')            // ~~strike~~ → plain
        .trim();
      setMessages(prev => [...prev, { role: 'assistant', content: reply, _q: msg, _idx: Date.now() }]);
      // increment quota
      const newUsed = await incrementQuota(quotaUsed);
      setQuotaUsed(newUsed);
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

  const keyBadge = (() => {
    if (keyState === 'loading') return { text: '⏳ กำลังโหลด...',       cls: 'bg-white/10 border-white/20 text-white/60' };
    if (keyState === 'empty')   return { text: '⚠️ ยังไม่มี API Key',  cls: 'bg-red-500/20 border-red-400/40 text-red-300' };
    if (keyState === 'saving')  return { text: '⏳ กำลังบันทึก...',     cls: 'bg-white/10 border-white/20 text-white/60' };
    if (keyState === 'saved')   return { text: '✓ บันทึกแล้ว!',          cls: 'bg-green-500/20 border-green-400/40 text-green-300' };
    if (keyState === 'error')   return { text: '❌ Key ผิดพลาด',          cls: 'bg-red-500/20 border-red-400/40 text-red-300' };
    return keySource === 'supabase'
      ? { text: '✓ Key จาก Supabase', cls: 'bg-green-500/20 border-green-400/40 text-green-300' }
      : { text: '✓ Key จาก Local',    cls: 'bg-blue-500/20 border-blue-400/40 text-blue-300' };
  })();

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-h-[820px] min-h-[520px]">

      {/* Header */}
      <div className="relative overflow-hidden bg-[#372C2E] rounded-[2rem] px-6 py-5 shadow-2xl shadow-[#372C2E]/20 mb-4 shrink-0">
        <div className="absolute -top-4 -right-4 text-8xl opacity-[0.04] rotate-12 select-none">✨</div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-[#DE9E48] p-3.5 rounded-2xl shadow-lg shrink-0">
              <Sparkles size={22} className="text-[#372C2E]" />
            </div>
            <div>
              <p className="text-[#DE9E48] text-[10px] font-black uppercase tracking-[0.25em] mb-0.5">Admin · AI Assistant</p>
              <h2 className="text-xl font-black text-white tracking-tight">จิงจิง AI ผู้ช่วยโรงแรมแมว</h2>
              <p className="text-white/40 text-xs mt-0.5">สอบถามรายละเอียดเกี่ยวกับโรงแรมแมว</p>
            </div>
          </div>
          <div className="md:ml-auto flex items-center gap-2 shrink-0 flex-wrap">
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
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-[11px] font-bold transition-all ${keyBadge.cls}`}>
              {keySource === 'supabase' && keyState === 'ready' ? <Database size={12}/> : <Key size={12}/>}
              {keyBadge.text}
            </button>
            <button onClick={clearChat}
              className="p-2 bg-white/10 border border-white/20 rounded-xl text-white/70 hover:text-white transition-all">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* API Key panel */}
        {showKeyPanel && (
          <div className="relative z-10 mt-4 bg-white/10 border border-white/20 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
              <Database size={14} className="text-[#DE9E48] mt-0.5 shrink-0" />
              <div>
                <p className="text-white font-black text-xs">Key เก็บใน Supabase (ตาราง app_settings) — ใส่ครั้งเดียว ทุกเครื่องใช้ได้เลย</p>
                <p className="text-white/50 text-[11px] mt-1">
                  ตาราง app_settings มีอยู่แล้วใน database ของคุณครับ ✓
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
                <button onClick={saveKey} disabled={keyState === 'saving' || !keyInput.trim()}
                  className="px-4 py-2 bg-[#DE9E48] text-[#372C2E] font-black text-xs rounded-xl hover:bg-[#f0b55e] transition-all disabled:opacity-50 shrink-0">
                  {keyState === 'saving' ? <Loader2 size={12} className="animate-spin"/> : 'บันทึก'}
                </button>
              </div>
            </div>
            {keyState === 'ready' && apiKey && (
              <div className="flex items-center gap-2 text-green-300 text-[11px] font-bold">
                <CheckCircle2 size={13}/>
                <span>พร้อมใช้งาน {keySource === 'supabase' ? '(เก็บใน Supabase — ทุกเครื่องใช้ได้)' : '(เก็บในเครื่องนี้เท่านั้น)'}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick questions */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 shrink-0 scrollbar-hide">
        {QUICK_QUESTIONS.map((q, i) => (
          <button key={i} onClick={() => sendMessage(q)} disabled={loading || !apiKey}
            className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full bg-white border border-[#DBD0C5] text-[#885E43] hover:bg-[#F5EEE8] hover:border-[#885E43] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
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
                <Bot size={14} className="text-[#DE9E48]"/>
              </div>
            )}
            <div className="flex flex-col gap-1 max-w-[82%]">
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-[#885E43] text-white rounded-tr-sm font-medium'
                  : 'bg-white border border-[#efebe9] text-[#372C2E] rounded-tl-sm shadow-sm'
              }`}>
                {msg.content}
              </div>
              {/* Feedback buttons — only for non-first assistant messages */}
              {msg.role === 'assistant' && i > 0 && msg._q && (
                <div className="flex items-center gap-1.5 px-1">
                  {feedbacks[i] ? (
                    <span className="text-[10px] font-bold text-[#A1887F] flex items-center gap-1">
                      {feedbacks[i] === 'good'
                        ? <><ThumbsUp size={11} className="text-green-500"/> ขอบคุณ! AI จะจำไว้ 🐱</>
                        : <><ThumbsDown size={11} className="text-red-400"/> รับทราบ จะปรับปรุงครับ</>}
                    </span>
                  ) : (
                    <>
                      <span className="text-[10px] text-[#C4A99A] font-bold">คำตอบนี้ดีไหม?</span>
                      <button
                        onClick={() => handleFeedback(i, 'good', msg._q, msg.content)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black bg-white border border-[#efebe9] text-[#A1887F] hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all"
                        title="ดี! ให้ AI เรียนรู้แบบนี้">
                        <ThumbsUp size={11}/> ดี
                      </button>
                      <button
                        onClick={() => handleFeedback(i, 'bad', msg._q, msg.content)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black bg-white border border-[#efebe9] text-[#A1887F] hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
                        title="ไม่ดี ให้ AI หลีกเลี่ยง">
                        <ThumbsDown size={11}/> ปรับปรุง
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            {msg.role === 'user' && (
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

      {/* Input */}
      <div className="shrink-0">
        {!apiKey && keyState !== 'loading' && (
          <div className="mb-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-amber-700 text-xs font-bold">
            <Key size={13}/> กรุณาใส่ API Key ก่อนเริ่มใช้งาน AI ครับ
          </div>
        )}
        <div className={`flex gap-3 bg-white border rounded-2xl p-2 shadow-sm transition-all ${!apiKey ? 'border-amber-200' : 'border-[#DBD0C5] focus-within:border-[#885E43]'}`}>
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            disabled={!apiKey || loading}
            placeholder={apiKey ? 'ถามได้เลย เช่น เบอร์ 081... คือของใคร? หรือ มัดจำบ้านไหนยังไม่จ่าย?' : 'ใส่ API Key ก่อนครับ...'}
            className="flex-1 text-sm text-[#372C2E] placeholder:text-[#C4A99A] outline-none px-2 font-medium bg-transparent disabled:cursor-not-allowed"
          />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim() || !apiKey}
            className="p-2.5 rounded-xl bg-[#885E43] text-white hover:bg-[#6e4a34] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
            {loading ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
          </button>
        </div>
        {/* ── Quota bar ── */}
        <div className="mt-2 space-y-1.5">
          {/* progress bar row */}
          <div className="flex items-center gap-2">
            <BarChart2 size={12} className="text-[#A1887F] shrink-0" />
            <div className="flex-1 h-1.5 bg-[#F5F2F0] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  quotaUsed >= quotaLimit ? 'bg-red-400'
                  : quotaUsed >= quotaLimit * 0.8 ? 'bg-amber-400'
                  : 'bg-[#885E43]'
                }`}
                style={{ width: `${Math.min(100, quotaLimit > 0 ? (quotaUsed / quotaLimit) * 100 : 0)}%` }}
              />
            </div>
            <span className={`text-[10px] font-black shrink-0 ${
              quotaUsed >= quotaLimit ? 'text-red-500'
              : quotaUsed >= quotaLimit * 0.8 ? 'text-amber-600'
              : 'text-[#A1887F]'
            }`}>
              {quotaUsed}/{quotaLimit}
            </span>
            <button onClick={() => setShowQuotaEdit(v => !v)}
              className="p-0.5 text-[#C4A99A] hover:text-[#885E43] transition-colors shrink-0" title="ตั้งค่าโควต้า">
              <Settings2 size={11} />
            </button>
          </div>

          {/* text row */}
          <div className="flex items-center justify-between px-0.5">
            <p className="text-[10px] text-[#C4A99A] font-bold">
              ใช้ AI ไปแล้ว {quotaUsed} ครั้ง · เหลืออีก{' '}
              <span className={quotaUsed >= quotaLimit ? 'text-red-500 font-black' : 'text-[#885E43] font-black'}>
                {Math.max(0, quotaLimit - quotaUsed)} ครั้ง
              </span>
            </p>
            {quotaUsed >= quotaLimit && (
              <span className="text-[10px] font-black text-red-500 animate-pulse">⚠️ หมดโควต้า</span>
            )}
          </div>

          {/* quota edit panel */}
          {showQuotaEdit && (
            <div className="bg-[#F5F2F0] border border-[#DBD0C5] rounded-2xl px-3 py-2.5 flex flex-col gap-2">
              <p className="text-[10px] font-black text-[#372C2E]">⚙️ ตั้งค่าโควต้า (เก็บใน Supabase — ทุกเครื่องเห็นเหมือนกัน)</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#A1887F] font-bold whitespace-nowrap">จำกัด</span>
                <input type="number" min="1" max="9999" value={limitInput}
                  onChange={e => setLimitInput(e.target.value)}
                  className="w-20 text-center text-xs font-black border border-[#DBD0C5] rounded-xl px-2 py-1.5 outline-none focus:border-[#885E43] bg-white text-[#372C2E]"
                />
                <span className="text-[10px] text-[#A1887F] font-bold">ครั้ง</span>
                <button
                  disabled={quotaLoading}
                  onClick={async () => {
                    setQuotaLoading(true);
                    const n = parseInt(limitInput, 10);
                    if (n > 0) { await setQuotaLimit(n); setQuotaLimit(n); }
                    setQuotaLoading(false); setShowQuotaEdit(false);
                  }}
                  className="px-3 py-1.5 bg-[#885E43] text-white font-black text-[10px] rounded-xl hover:bg-[#6e4a34] transition-all disabled:opacity-50">
                  {quotaLoading ? <Loader2 size={10} className="animate-spin"/> : 'บันทึก'}
                </button>
                <button
                  disabled={quotaLoading}
                  onClick={async () => {
                    if (!window.confirm('รีเซ็ตตัวนับกลับเป็น 0?')) return;
                    setQuotaLoading(true);
                    await resetQuota(); setQuotaUsed(0);
                    setQuotaLoading(false); setShowQuotaEdit(false);
                  }}
                  className="px-3 py-1.5 bg-white border border-[#DBD0C5] text-[#A1887F] font-black text-[10px] rounded-xl hover:bg-red-50 hover:text-red-500 hover:border-red-300 transition-all disabled:opacity-50">
                  รีเซ็ต
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
