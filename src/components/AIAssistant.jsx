import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Send, Loader2, RefreshCw, Bot, User, Key, Eye, EyeOff, ChevronDown } from 'lucide-react';

const OPENROUTER_FREE_MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (เร็ว)' },
  { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 (เร็ว)' },
];

const QUICK_QUESTIONS = [
  'มีบ้านไหนพักอยู่ตอนนี้บ้าง?',
  'วันนี้มีเช็คอิน/เช็คเอ้าท์กี่บ้าน?',
];

const getTodayISO = () => new Date().toISOString().split('T')[0];

export default function AIAssistant() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openrouter_api_key') || '');
  const [model, setModel] = useState(OPENROUTER_FREE_MODELS[0].id);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'สวัสดีครับ 🐱 ถามข้อมูลโรงแรมได้เลยครับ' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ✅ แยกคำถาม
  const isDataQuestion = (msg) => {
    const keywords = ['บ้าน', 'จอง', 'ลูกค้า', 'รายได้', 'เช็คอิน', 'เช็คเอ้าท์'];
    return keywords.some(k => msg.includes(k));
  };

  // ✅ ดึงข้อมูลแบบเบา
  const fetchData = async () => {
    const today = getTodayISO();

    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .limit(50);

    return bookings.map(b => ({
      customerName: b.customer_name,
      roomType: b.room_type,
      startDate: b.start_date,
      endDate: b.end_date,
    }));
  };

  // ✅ ส่งข้อความ
  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    if (!apiKey) return alert('กรุณาใส่ API Key');

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      let systemPrompt = '';

      // 🧠 ถ้าเป็นคำถามข้อมูล
      if (isDataQuestion(msg)) {
        const data = await fetchData();

        const summary = data.map(b =>
          `- ${b.customerName} (${b.roomType}) ${b.startDate} → ${b.endDate}`
        ).join('\n');

        systemPrompt = `
คุณเป็นพนักงานโรงแรมแมว

ข้อมูล:
${summary}

กฎ:
- ตอบเป็นภาษาไทย
- สรุปให้อ่านง่าย
- ห้ามแสดง JSON หรือโค้ด
`;
      } else {
        // 💬 คำถามทั่วไป
        systemPrompt = `
คุณเป็นผู้ช่วยโรงแรมแมว
สามารถตอบคำถามทั่วไปได้ เป็นกันเอง
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
        content: '❌ เกิดข้อผิดพลาด'
      }]);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[600px]">
      
      {/* Quick */}
      <div className="flex gap-2 mb-2">
        {QUICK_QUESTIONS.map((q, i) => (
          <button key={i} onClick={() => sendMessage(q)} className="text-xs bg-gray-200 px-2 py-1 rounded">
            {q}
          </button>
        ))}
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-2">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div className="inline-block bg-white border p-2 rounded">
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div>⏳ กำลังคิด...</div>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          className="flex-1 border px-2"
        />
        <button onClick={() => sendMessage()} className="bg-black text-white px-3">
          ส่ง
        </button>
      </div>
    </div>
  );
}
