import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Send, Loader2, RefreshCw, Bot, User, Key, Eye, EyeOff } from 'lucide-react';

const todayStr = () => new Date().toLocaleDateString('sv-SE');

export default function AIAssistant() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ai_key') || '');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'สวัสดีครับ 🐱 ผมช่วยดูข้อมูลโรงแรมแมวให้คุณได้!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ✅ ดึงข้อมูล
  const fetchAllData = async () => {
    const today = todayStr();

    const { data: bookings } = await supabase.from('bookings').select('*').limit(200);

    return {
      today,
      totalBookings: bookings?.length || 0,
      bookings: bookings || [],
    };
  };

  // ✅ prompt
  const buildSystemPrompt = (data) => {
    return `
คุณเป็น AI ผู้ช่วยของโรงแรมแมว

วันนี้: ${data.today}
จำนวนการจอง: ${data.totalBookings}

ข้อมูล:
${JSON.stringify(data.bookings)}

ตอบเป็นภาษาไทย กระชับ เข้าใจง่าย
`;
  };

  // ✅ เรียก AI (Gemini + fallback OpenRouter)
  const callAI = async ({ systemPrompt, msg }) => {

    // 🔥 1. Gemini (หลัก)
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: systemPrompt + '\n\nUser: ' + msg }],
              },
            ],
          }),
        }
      );

      if (res.ok) {
        const json = await res.json();
        return json.candidates?.[0]?.content?.parts?.[0]?.text;
      }
    } catch (e) {}

    // 🔁 2. fallback → OpenRouter
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3-8b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: msg },
          ],
        }),
      });

      if (res.ok) {
        const json = await res.json();
        return json.choices?.[0]?.message?.content;
      }
    } catch (e) {}

    throw new Error('AI ใช้งานไม่ได้');
  };

  // ✅ ส่งข้อความ
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const msg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const data = await fetchAllData();
      const systemPrompt = buildSystemPrompt(data);

      const reply = await callAI({ systemPrompt, msg });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply || 'ไม่มีคำตอบ'
      }]);

    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ AI ใช้งานไม่ได้ กรุณาเช็ค API Key'
      }]);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Sparkles />
        <h2 className="font-bold text-lg">AI ผู้ช่วยโรงแรมแมว</h2>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div className={`inline-block px-3 py-2 rounded-lg ${
              m.role === 'user' ? 'bg-brown-500 text-white' : 'bg-gray-100'
            }`}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && <Loader2 className="animate-spin" />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          className="flex-1 border rounded px-3 py-2"
          placeholder="ถามข้อมูล..."
        />
        <button onClick={sendMessage} className="bg-black text-white px-4 rounded">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
