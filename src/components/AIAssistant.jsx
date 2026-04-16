import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Send, Loader2, RefreshCw, Bot, User, Key, Eye, EyeOff, ChevronDown } from 'lucide-react';

const OPENROUTER_FREE_MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (เร็ว)' },
  { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B' },
];

const QUICK_QUESTIONS = [
  'มีบ้านไหนพักอยู่ตอนนี้บ้าง?',
  'สัปดาห์นี้มีเข้าพักกี่บ้าน?',
  'เดือนนี้รายได้รวมเท่าไหร่?',
  'ลูกค้าคนไหนที่จองบ่อยที่สุด?',
  'ห้องไหนที่ได้รับความนิยมมากที่สุด?',
  'วันนี้มีเช็คอิน/เช็คเอ้าท์กี่บ้าน?',
];

const getTodayISO = () => new Date().toISOString().split('T')[0];

export default function AIAssistant() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openrouter_api_key') || '');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(OPENROUTER_FREE_MODELS[0].id);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'สวัสดีครับ! 🐱 ผมเป็น AI ผู้ช่วยของโรงแรมแมวจริงใจ' }
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

  // ✅ แยกคำถาม
  const isDataQuestion = (msg) => {
    const keywords = ['บ้าน', 'จอง', 'ลูกค้า', 'รายได้', 'เช็คอิน', 'เช็คเอ้าท์'];
    return keywords.some(k => msg.includes(k));
  };

  // ✅ cache ลดการยิง DB
  const fetchAllData = async () => {
    if (contextData) return contextData;

    const todayISO = getTodayISO();

    const [{ data: bookings }, { data: ops }] = await Promise.all([
      supabase.from('bookings').select('*').limit(100),
      supabase.from('booking_ops').select('*').limit(100),
    ]);

    const opsMap = {};
    (ops || []).forEach(o => { opsMap[o.booking_id] = o; });

    const result = {
      todayISO,
      bookings: (bookings || []).map(b => ({
        customerName: b.customer_name,
        roomType: b.room_type,
        startDate: b.start_date,
        endDate: b.end_date,
        checkedIn: !!opsMap[b.id]?.checked_in,
        checkedOut: !!opsMap[b.id]?.checked_out,
      })),
    };

    setContextData(result);
    return result;
  };

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    if (!apiKey) { setShowKeyPanel(true); return; }

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      let systemPrompt = '';
      let extraData = '';

      // ✅ แยก logic ตรงนี้ (สำคัญมาก)
      if (isDataQuestion(msg)) {
        const data = await fetchAllData();

        const active = data.bookings.filter(b => b.checkedIn && !b.checkedOut);

        const summary = active.map(b =>
          `- ${b.customerName} (${b.roomType})`
        ).join('\n');

        extraData = `บ้านที่กำลังพัก:\n${summary}`;

        systemPrompt = `
คุณเป็นพนักงานโรงแรมแมว
ตอบจากข้อมูลนี้เท่านั้น:

${extraData}

- ห้ามแสดงโค้ด
- ตอบสั้น อ่านง่าย
`;
      } else {
        systemPrompt = `
คุณเป็นผู้ช่วยโรงแรมแมว
ตอบคำถามทั่วไปได้ เป็นกันเอง
`;
      }

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
            { role: 'user', content: msg },
          ],
          max_tokens: 300,
        }),
      });

      const json = await res.json();
      const reply = json.choices?.[0]?.message?.content || 'ไม่มีคำตอบ';

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ ${err.message}`,
      }]);
    }

    setLoading(false);
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: 'เริ่มใหม่ได้เลยครับ 🐱' }]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-h-[800px] min-h-[500px]">
      
      {/* UI เดิมคุณ — ไม่แตะ */}
      
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[80%] bg-white border rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap">
              {msg.content}
            </div>
          </div>
        ))}

        {loading && <div>กำลังคิด...</div>}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          className="flex-1 border p-2"
        />
        <button onClick={() => sendMessage()}>ส่ง</button>
      </div>
    </div>
  );
}
