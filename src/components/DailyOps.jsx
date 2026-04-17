/**
 * DailyOps — หน้าจัดการรอบปล่อยเล่นและสรุปบ้านที่พักอยู่
 * (การเช็คอิน/เช็คเอ้าท์ย้ายไปอยู่ใน Notification dropdown ที่ Navbar แล้ว)
 */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  PawPrint, CheckCircle2, Circle, RefreshCw, Loader2,
  Sun, Moon, CheckCheck, LogIn, LogOut, Clock,
  Home, ArrowRightCircle, AlarmClock,
} from 'lucide-react';

const todayStr = () => new Date().toLocaleDateString('sv-SE');
const addDays  = (ds, n) => { const d = new Date(ds); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
const nowTime  = () => new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });

const ROOM_COLOR = {
  'สแตนดาร์ด': '#C39A7A', 'ดีลักซ์': '#ad6ea8', 'ซูพีเรีย': '#d98a8a',
  'พรีเมี่ยม':  '#368daf', 'วีไอพี':  '#4a7a46', 'วีวีไอพี':  '#7a6a5a',
};
const ROOM_EMOJI = {
  'สแตนดาร์ด': '🏠', 'ดีลักซ์': '🏡', 'ซูพีเรีย': '🏘️',
  'พรีเมี่ยม':  '🏰', 'วีไอพี':  '⭐', 'วีวีไอพี':  '👑',
};

export default function DailyOps() {
  const [date, setDate]         = useState(todayStr());
  const [bookings, setBookings] = useState([]);  // บ้านที่เช็คอินแล้ว ยังไม่เช็คเอ้าท์
  const [playMap, setPlayMap]   = useState({});
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState(null);
  const [saving, setSaving]     = useState({});

  const fetchData = async () => {
    setLoading(true);
    // ดึงบ้านที่ start_date ≤ date ≤ end_date
    const { data: bAll } = await supabase
      .from('bookings').select('*')
      .lte('start_date', date).gte('end_date', date)
      .order('room_type');

    if (!bAll?.length) { setBookings([]); setPlayMap({}); setLoading(false); return; }

    const ids = bAll.map(b => b.id);
    const { data: ops } = await supabase
      .from('booking_ops').select('booking_id,checked_in,checked_out,checkin_time,checkout_time')
      .in('booking_id', ids);
    const opsMap = {};
    (ops||[]).forEach(o => { opsMap[o.booking_id] = o; });

    // เฉพาะบ้านที่เช็คอินแล้ว และยังไม่เช็คเอ้าท์
    const active = bAll.filter(b => opsMap[b.id]?.checked_in && !opsMap[b.id]?.checked_out);
    setBookings(active);

    if (active.length) {
      const activeIds = active.map(b => b.id);
      const { data: pData } = await supabase
        .from('booking_playtime').select('*')
        .in('booking_id', activeIds).eq('play_date', date).order('released_at');
      const pm = {};
      activeIds.forEach(id => { pm[id] = { morning: null, evening: null }; });
      (pData||[]).forEach(p => {
        if (!pm[p.booking_id]) pm[p.booking_id] = { morning: null, evening: null };
        if (p.session === 'morning')      pm[p.booking_id].morning = p;
        else if (p.session === 'evening') pm[p.booking_id].evening = p;
        else if (!pm[p.booking_id].morning) pm[p.booking_id].morning = p;
        else if (!pm[p.booking_id].evening) pm[p.booking_id].evening = p;
      });
      setPlayMap(pm);
    } else {
      setPlayMap({});
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [date]);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

  const togglePlay = async (bookingId, catNames, session) => {
    const key = `${bookingId}_${session}`;
    setSaving(s => ({ ...s, [key]: true }));
    const ex = playMap[bookingId]?.[session];
    if (ex) {
      const { error } = await supabase.from('booking_playtime').delete().eq('id', ex.id);
      if (error) showToast('error', 'ลบไม่สำเร็จ');
      else { showToast('success', 'ยกเลิกรอบเล่น'); await fetchData(); }
    } else {
      const { error } = await supabase.from('booking_playtime').insert({
        booking_id: bookingId, play_date: date,
        cat_names: catNames, session, released_at: nowTime(), returned_at: null,
      });
      if (error) showToast('error', 'บันทึกไม่สำเร็จ');
      else { showToast('success', session === 'morning' ? 'รอบเช้าแล้ว 🌅' : 'รอบเย็นแล้ว 🌙'); await fetchData(); }
    }
    setSaving(s => ({ ...s, [key]: false }));
  };

  const returnCat = async (playId) => {
    const { error } = await supabase.from('booking_playtime').update({ returned_at: nowTime() }).eq('id', playId);
    if (error) showToast('error', 'บันทึกไม่สำเร็จ');
    else { showToast('success', 'บันทึกกลับแล้ว ✓'); await fetchData(); }
  };

  const morningDone = bookings.filter(b => playMap[b.id]?.morning).length;
  const eveningDone = bookings.filter(b => playMap[b.id]?.evening).length;
  const allMorning  = bookings.length > 0 && morningDone === bookings.length;
  const allEvening  = bookings.length > 0 && eveningDone === bookings.length;

  return (
    <div className="space-y-5 py-2">
      {toast && (
        <div className={`fixed top-5 right-5 z-[9999] px-5 py-3 rounded-2xl text-sm font-bold shadow-xl ${
          toast.type === 'success' ? 'bg-[#372C2E] text-[#DE9E48]' : 'bg-red-600 text-white'
        }`}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#372C2E] to-[#4a3530] rounded-[2rem] px-6 py-6 shadow-2xl">
        <div className="absolute -top-4 -right-4 text-[8rem] opacity-[0.04] rotate-12 select-none pointer-events-none">🐾</div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex items-center gap-4">
            <div className="bg-[#DE9E48] p-3.5 rounded-2xl shadow-lg shrink-0">
              <PawPrint size={24} className="text-[#372C2E]" />
            </div>
            <div>
              <p className="text-[#DE9E48] text-[10px] font-black uppercase tracking-[0.25em] mb-0.5">Admin · Daily Operations</p>
              <h2 className="text-2xl font-black text-white tracking-tight">รอบปล่อยเล่นประจำวัน</h2>
              <p className="text-white/40 text-xs mt-0.5">แสดงเฉพาะบ้านที่เช็คอินแล้ว ยังไม่เช็คเอ้าท์ • เช็คอิน/เอ้าท์กดที่กระดิ่งด้านบน</p>
            </div>
          </div>
          <div className="md:ml-auto flex items-center gap-3">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="bg-white/10 border border-white/20 text-white font-bold text-sm rounded-2xl px-4 py-2.5 outline-none focus:border-[#DE9E48] transition-all cursor-pointer"
              style={{ colorScheme: 'dark' }} />
            <button onClick={fetchData} className="p-2.5 bg-white/10 border border-white/20 rounded-2xl text-white/70 hover:text-white transition-all hover:bg-white/20">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Progress summary */}
      {!loading && bookings.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'รอบเช้า', done: morningDone, all: allMorning, color: 'amber', icon: <Sun size={20}/> },
            { label: 'รอบเย็น', done: eveningDone, all: allEvening, color: 'indigo', icon: <Moon size={20}/> },
          ].map(s => (
            <div key={s.label} className={`rounded-[1.5rem] border-2 p-5 shadow-sm transition-all ${
              s.all ? `bg-${s.color}-50 border-${s.color}-300` : 'bg-white border-[#efebe9]'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  s.all ? `bg-${s.color}-400` : `bg-${s.color}-100`
                }`}>
                  <span className={s.all ? 'text-white' : `text-${s.color}-500`}>{s.icon}</span>
                </div>
                <div>
                  <p className="text-xs font-black text-[#372C2E] uppercase tracking-wider">{s.label}</p>
                  <p className="text-[11px] text-[#A1887F]">{s.done} / {bookings.length} บ้าน</p>
                </div>
                {s.all && <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-${s.color}-400 text-white`}>✓ ครบ</span>}
              </div>
              <div className={`h-2 bg-${s.color}-100 rounded-full overflow-hidden`}>
                <div className={`h-full bg-${s.color}-400 rounded-full transition-all duration-500`}
                  style={{ width: `${bookings.length ? s.done / bookings.length * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Room list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-[#A1887F]" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[2rem] border border-[#efebe9]">
          <div className="text-5xl mb-3 opacity-30">🐾</div>
          <p className="text-[#A1887F] font-bold text-sm">ไม่มีบ้านที่เช็คอินแล้วและยังพักอยู่</p>
          <p className="text-[#C4A99A] text-xs mt-1">เปลี่ยนวันที่เพื่อดูวันอื่น หรือกดกระดิ่งเพื่อเช็คอิน</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-[#efebe9] overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_100px_100px] bg-[#F5F2F0] border-b border-[#efebe9] px-5 py-3 gap-2">
            <span className="text-[10px] font-black text-[#A1887F] uppercase tracking-widest">บ้าน / แมว</span>
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest text-center flex items-center justify-center gap-1">
              <Sun size={11}/> เช้า
            </span>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center flex items-center justify-center gap-1">
              <Moon size={11}/> เย็น
            </span>
          </div>

          <div className="divide-y divide-[#f5f0ec]">
            {bookings.map(b => {
              const rc  = ROOM_COLOR[b.room_type] || '#885E43';
              const em  = ROOM_EMOJI[b.room_type] || '🏠';
              const mp  = playMap[b.id]?.morning;
              const ep  = playMap[b.id]?.evening;
              return (
                <div key={b.id} className="grid grid-cols-[1fr_100px_100px] items-center px-5 py-4 hover:bg-[#FDFBFA] transition-colors gap-2">

                  {/* Room info */}
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{em}</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                        style={{ background: rc + '18', color: rc }}>{b.room_type}</span>
                    </div>
                    <p className="text-sm font-black text-[#372C2E] truncate">{b.customer_name}</p>
                    <p className="text-[11px] text-[#885E43] truncate">🐱 {b.cat_names}</p>
                    <p className="text-[10px] text-[#C4A99A] mt-0.5">{fmtDate(b.end_date)} ออก</p>
                  </div>

                  {/* Morning */}
                  {[
                    { session: 'morning', row: mp, color: 'amber', bg: 'bg-amber-400', hoverBorder: 'hover:border-amber-300' },
                    { session: 'evening', row: ep, color: 'indigo', bg: 'bg-indigo-500', hoverBorder: 'hover:border-indigo-300' },
                  ].map(({ session, row, color, bg, hoverBorder }) => {
                    const done = !!row;
                    const out  = done && !row.returned_at;
                    const back = done && !!row.returned_at;
                    const sk   = `${b.id}_${session}`;
                    const sp   = saving[sk];
                    return (
                      <div key={session} className="flex flex-col items-center gap-1.5">
                        <button onClick={() => togglePlay(b.id, b.cat_names, session)} disabled={sp}
                          className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-90 disabled:opacity-50 ${
                            done ? `${bg} border-transparent` : `bg-white border-[#efebe9] ${hoverBorder}`
                          }`}>
                          {sp
                            ? <Loader2 size={14} className={`animate-spin text-${color}-500`}/>
                            : done ? <CheckCircle2 size={16} className="text-white"/>
                            : <Circle size={16} className="text-[#C4A99A]"/>}
                        </button>
                        {done && (
                          <div className="text-center">
                            <p className={`text-[9px] font-black text-${color}-600`}>{row.released_at}</p>
                            {back
                              ? <p className="text-[9px] font-black text-green-600">↩ {row.returned_at}</p>
                              : <button onClick={() => returnCat(row.id)}
                                  className="text-[9px] font-black text-green-600 hover:underline">
                                  กลับแล้ว?
                                </button>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
