import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  LogIn, LogOut, Clock, PawPrint, CheckCircle2, Circle,
  RefreshCw, Loader2, Sun, Moon, Home,
  ArrowRightCircle, AlarmClock, BellRing, CheckCheck,
} from 'lucide-react';

const todayStr = () => new Date().toLocaleDateString('sv-SE');
const addDays  = (ds, n) => { const d = new Date(ds); d.setDate(d.getDate()+n); return d.toLocaleDateString('sv-SE'); };
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'}) : '-';
const fmtShort = (d) => d ? new Date(d).toLocaleDateString('th-TH',{day:'numeric',month:'short'}) : '-';
const nowTime  = () => new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',hour12:false});
const timeAgo  = (dateStr) => {
  const now = new Date(); const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return 'วันนี้';
  if (diff === 1) return 'พรุ่งนี้';
  if (diff === -1) return 'เมื่อวาน';
  if (diff < 0) return `อีก ${Math.abs(diff)} วัน`;
  return `${diff} วันที่แล้ว`;
};

const ROOM_COLOR = {
  'สแตนดาร์ด':'#C39A7A','ดีลักซ์':'#ad6ea8','ซูพีเรีย':'#d98a8a',
  'พรีเมี่ยม':'#368daf','วีไอพี':'#4a7a46','วีวีไอพี':'#7a6a5a',
};
const ROOM_EMOJI = {
  'สแตนดาร์ด':'🏠','ดีลักซ์':'🏡','ซูพีเรีย':'🏘️',
  'พรีเมี่ยม':'🏰','วีไอพี':'⭐','วีวีไอพี':'👑',
};
const ROOM_NEIGHBORS = {
  'สแตนดาร์ด':['ดีลักซ์'],'ดีลักซ์':['สแตนดาร์ด','ซูพีเรีย'],
  'ซูพีเรีย':['ดีลักซ์','พรีเมี่ยม'],'พรีเมี่ยม':['ซูพีเรีย','วีไอพี'],
  'วีไอพี':['พรีเมี่ยม','วีวีไอพี'],'วีวีไอพี':['วีไอพี'],
};

// ── Netflix-style notification item ──────────────────────────────────────────
function NotifItem({ booking, badge, badgeColor, badgeBg, isNew, timeLabel, onClick, isSelected }) {
  const rc = ROOM_COLOR[booking.room_type] || '#885E43';
  const em = ROOM_EMOJI[booking.room_type] || '🏠';
  return (
    <button
      onClick={() => onClick(booking)}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-150 ${
        isSelected ? 'bg-[#F5EEE8]' : 'hover:bg-[#FDFBFA]'
      } border-b border-[#f0ebe7] last:border-0`}
    >
      {/* Left: room icon */}
      <div className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-[#efebe9]"
        style={{ background: rc + '15' }}>
        {em}
      </div>

      {/* Middle: info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: badgeBg, color: badgeColor }}>
            {badge}
          </span>
          {isNew && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
        </div>
        <p className="text-sm font-black text-[#372C2E] leading-tight truncate">{booking.customer_name || 'ไม่ระบุ'}</p>
        <p className="text-[11px] text-[#885E43] truncate">🐱 {booking.cat_names || 'ไม่ระบุ'} · {booking.room_type}</p>
      </div>

      {/* Right: time */}
      <div className="shrink-0 text-right">
        <p className="text-[11px] font-bold text-[#A1887F]">{timeLabel}</p>
        <p className="text-[10px] text-[#C4A99A] mt-0.5">{fmtShort(booking.start_date)}</p>
      </div>
    </button>
  );
}

// ── Notification Panel (Netflix dropdown style) ────────────────────────────
function NotifPanel({ open, onClose, sections, onSelect, selectedId }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open, onClose]);

  const total = sections.reduce((s, sec) => s + sec.items.length, 0);

  if (!open) return null;
  return (
    <div ref={ref}
      className="absolute right-0 top-full mt-2 w-[360px] max-w-[95vw] bg-white rounded-3xl shadow-2xl shadow-[#372C2E]/15 border border-[#efebe9] z-[200] overflow-hidden"
      style={{ maxHeight: '75vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#efebe9] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <BellRing size={16} className="text-[#885E43]" />
          <span className="font-black text-[#372C2E] text-sm">การแจ้งเตือน</span>
          {total > 0 && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500 text-white">{total}</span>
          )}
        </div>
        <button onClick={onClose} className="text-[#A1887F] hover:text-[#372C2E] text-xs font-bold">ปิด ×</button>
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto flex-1">
        {total === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-2 opacity-30">🐾</div>
            <p className="text-[#A1887F] font-bold text-sm">ไม่มีการแจ้งเตือน</p>
            <p className="text-[#C4A99A] text-xs mt-1">ทุกอย่างเรียบร้อยดี ✓</p>
          </div>
        ) : sections.map(sec => sec.items.length > 0 && (
          <div key={sec.id}>
            <div className="px-4 pt-3 pb-1 flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: sec.color }}>{sec.label}</span>
              {sec.urgent && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
            </div>
            {sec.items.map(b => (
              <NotifItem key={b.id} booking={b}
                badge={sec.badge} badgeColor={sec.color} badgeBg={sec.bg}
                isNew={sec.urgent}
                timeLabel={b._timeLabel || timeAgo(b.start_date)}
                onClick={onSelect}
                isSelected={selectedId === b.id}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main DailyOps ─────────────────────────────────────────────────────────
export default function DailyOps() {
  const [date, setDate]               = useState(todayStr());
  const [allBookings, setAllBookings] = useState([]);
  const [opsMap, setOpsMap]           = useState({});
  const [playMap, setPlayMap]         = useState({});
  const [loading, setLoading]         = useState(true);
  const [toast, setToast]             = useState(null);
  const [saving, setSaving]           = useState({});
  const [notifOpen, setNotifOpen]     = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const notifBtnRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    const tom = addDays(date, 1);
    const [{ data: bIn }, { data: bOut }] = await Promise.all([
      supabase.from('bookings').select('*').gte('start_date', date).lte('start_date', tom),
      supabase.from('bookings').select('*').gte('end_date', date).lte('end_date', tom),
    ]);
    const seen = new Set();
    const bData = [...(bIn||[]), ...(bOut||[])].filter(b => { if (seen.has(b.id)) return false; seen.add(b.id); return true; });
    bData.sort((a, b) => a.start_date.localeCompare(b.start_date));
    setAllBookings(bData);
    if (!bData.length) { setLoading(false); return; }
    const ids = bData.map(b => b.id);
    const { data: oData } = await supabase.from('booking_ops').select('*').in('booking_id', ids);
    const om = {}; (oData||[]).forEach(o => { om[o.booking_id] = o; }); setOpsMap(om);
    const { data: pData } = await supabase.from('booking_playtime').select('*').in('booking_id', ids).eq('play_date', date).order('released_at');
    const pm = {}; ids.forEach(id => { pm[id] = { morning: null, evening: null }; });
    (pData||[]).forEach(p => {
      if (!pm[p.booking_id]) pm[p.booking_id] = { morning: null, evening: null };
      if (p.session === 'morning') pm[p.booking_id].morning = p;
      else if (p.session === 'evening') pm[p.booking_id].evening = p;
      else if (!pm[p.booking_id].morning) pm[p.booking_id].morning = p;
      else if (!pm[p.booking_id].evening) pm[p.booking_id].evening = p;
    });
    setPlayMap(pm); setLoading(false);
  };

  useEffect(() => { fetchData(); }, [date]);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };
  const upsertOps = async (bookingId, patch) => {
    setSaving(s => ({ ...s, [bookingId]: true }));
    const ex = opsMap[bookingId];
    const { error } = ex
      ? await supabase.from('booking_ops').update(patch).eq('id', ex.id)
      : await supabase.from('booking_ops').insert({ booking_id: bookingId, ops_date: date, ...patch });
    if (error) showToast('error', 'บันทึกไม่สำเร็จ: ' + error.message);
    else { showToast('success', 'บันทึกแล้ว ✓'); await fetchData(); }
    setSaving(s => ({ ...s, [bookingId]: false }));
  };
  const toggleCheckin  = async (b) => { const o = opsMap[b.id]||{}; const n = !o.checked_in; await upsertOps(b.id, { checked_in: n, checkin_time: n?(o.checkin_time||nowTime()):null }); };
  const toggleCheckout = async (b) => { const o = opsMap[b.id]||{}; const n = !o.checked_out; await upsertOps(b.id, { checked_out: n, checkout_time: n?(o.checkout_time||nowTime()):null }); };
  const updateTime = (bookingId, field, val) => upsertOps(bookingId, { [field]: val });
  const togglePlay = async (bookingId, catNames, session) => {
    const key = `play_${bookingId}_${session}`; setSaving(s => ({ ...s, [key]: true }));
    const ex = playMap[bookingId]?.[session];
    if (ex) { const { error } = await supabase.from('booking_playtime').delete().eq('id', ex.id); if (error) showToast('error','ลบไม่สำเร็จ'); else { showToast('success','ยกเลิกรอบเล่นแล้ว'); await fetchData(); } }
    else { const { error } = await supabase.from('booking_playtime').insert({ booking_id: bookingId, play_date: date, cat_names: catNames, session, released_at: nowTime(), returned_at: null }); if (error) showToast('error','บันทึกไม่สำเร็จ'); else { showToast('success', session==='morning'?'บันทึกรอบเช้าแล้ว 🌅':'บันทึกรอบเย็นแล้ว 🌙'); await fetchData(); } }
    setSaving(s => ({ ...s, [key]: false }));
  };
  const returnCat = async (playId) => { const { error } = await supabase.from('booking_playtime').update({ returned_at: nowTime() }).eq('id', playId); if (error) showToast('error','บันทึกไม่สำเร็จ'); else { showToast('success','บันทึกกลับแล้ว ✓'); await fetchData(); } };
  const getNeighbors = (b) => { const ns = ROOM_NEIGHBORS[b.room_type]||[]; return allBookings.filter(o => { if(o.id===b.id||!ns.includes(o.room_type)) return false; const oo=opsMap[o.id]||{}; return !!oo.checked_in&&!oo.checked_out; }); };

  const tom = addDays(date, 1);
  const notCheckedOut = (b) => !opsMap[b.id]?.checked_out;

  // ── Notification sections ──
  const ciToday     = allBookings.filter(b => b.start_date===date && !opsMap[b.id]?.checked_in && notCheckedOut(b)).map(b => ({ ...b, _timeLabel: 'วันนี้' }));
  const coToday     = allBookings.filter(b => b.end_date===date   && notCheckedOut(b)).map(b => ({ ...b, _timeLabel: 'วันนี้' }));
  const ciTomorrow  = allBookings.filter(b => b.start_date===tom  && !opsMap[b.id]?.checked_in && notCheckedOut(b)).map(b => ({ ...b, _timeLabel: 'พรุ่งนี้' }));
  const coTomorrow  = allBookings.filter(b => b.end_date===tom    && notCheckedOut(b)).map(b => ({ ...b, _timeLabel: 'พรุ่งนี้' }));
  const checkedInNow = allBookings.filter(b => opsMap[b.id]?.checked_in && notCheckedOut(b));
  const notPlayM    = checkedInNow.filter(b => !playMap[b.id]?.morning).map(b => ({ ...b, _timeLabel: 'ยังไม่ปล่อย' }));
  const notPlayE    = checkedInNow.filter(b => !playMap[b.id]?.evening).map(b => ({ ...b, _timeLabel: 'ยังไม่ปล่อย' }));

  const notifSections = [
    { id:'ci-today',  label:'⚠️ เช็คอินวันนี้ — รอดำเนินการ',  badge:'เช็คอินวันนี้',  color:'#d97706', bg:'#fef9ee', urgent:true,  items: ciToday },
    { id:'co-today',  label:'⚠️ เช็คเอ้าท์วันนี้ — รอดำเนินการ',badge:'เช็คเอ้าท์วันนี้',color:'#dc2626', bg:'#fff1f2', urgent:true,  items: coToday },
    { id:'play-m',    label:'🌅 ยังไม่ปล่อยเล่นรอบเช้า',        badge:'รอบเช้า',        color:'#b45309', bg:'#fffbeb', urgent:true,  items: notPlayM },
    { id:'play-e',    label:'🌙 ยังไม่ปล่อยเล่นรอบเย็น',        badge:'รอบเย็น',        color:'#6366f1', bg:'#f5f3ff', urgent:true,  items: notPlayE },
    { id:'ci-tom',    label:'📅 เช็คอินพรุ่งนี้',               badge:'เช็คอินพรุ่งนี้', color:'#7c3aed', bg:'#f5f3ff', urgent:false, items: ciTomorrow },
    { id:'co-tom',    label:'📅 เช็คเอ้าท์พรุ่งนี้',            badge:'เช็คเอ้าท์พรุ่งนี้',color:'#0369a1',bg:'#f0f9ff', urgent:false, items: coTomorrow },
  ];

  const totalUrgent = ciToday.length + coToday.length + notPlayM.length + notPlayE.length;
  const totalNotif  = notifSections.reduce((s, sec) => s + sec.items.length, 0);

  const bookingsDetail = allBookings.filter(b => {
    if (!notCheckedOut(b)) return false;
    return (b.start_date>=date&&b.start_date<=tom)||(b.end_date>=date&&b.end_date<=tom);
  });

  const handleSelectNotif = (booking) => {
    setSelectedBooking(booking.id === selectedBooking ? null : booking.id);
    setNotifOpen(false);
    // Scroll to card
    setTimeout(() => {
      const el = document.getElementById(`booking-card-${booking.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  return (
    <div className="space-y-5 py-2">
      {toast && (
        <div className={`fixed top-5 right-5 z-[9999] px-5 py-3 rounded-2xl text-sm font-bold shadow-xl ${toast.type==='success'?'bg-[#372C2E] text-[#DE9E48]':'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="relative overflow-hidden bg-[#372C2E] rounded-[2rem] px-6 py-6 shadow-2xl shadow-[#372C2E]/20">
        <div className="absolute -top-6 -right-6 text-[9rem] opacity-[0.04] rotate-12 select-none pointer-events-none">🐾</div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex items-center gap-4">
            <div className="bg-[#DE9E48] p-3.5 rounded-2xl shadow-lg shrink-0">
              <BellRing size={24} className="text-[#372C2E]" />
            </div>
            <div>
              <p className="text-[#DE9E48] text-[10px] font-black uppercase tracking-[0.25em] mb-0.5">Admin · Daily Operations</p>
              <h2 className="text-2xl font-black text-white tracking-tight">การดำเนินงานประจำวัน</h2>
              <p className="text-white/40 text-xs mt-0.5">บ้านที่เช็คเอ้าท์แล้วซ่อนออกโดยอัตโนมัติ</p>
            </div>
          </div>
          <div className="md:ml-auto flex items-center gap-3">
            {/* Date picker */}
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="bg-white/10 border border-white/20 text-white font-bold text-sm rounded-2xl px-4 py-2.5 outline-none focus:border-[#DE9E48] transition-all cursor-pointer"
              style={{ colorScheme: 'dark' }} />
            {/* Netflix-style Bell button */}
            <div className="relative" ref={notifBtnRef}>
              <button onClick={() => setNotifOpen(v => !v)}
                className={`relative p-3 rounded-2xl border transition-all ${notifOpen ? 'bg-[#DE9E48] border-[#DE9E48]' : 'bg-white/10 border-white/20 hover:bg-white/20'}`}>
                <BellRing size={18} className={notifOpen ? 'text-[#372C2E]' : 'text-white'} />
                {totalUrgent > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-black px-1 animate-bounce">
                    {totalUrgent}
                  </span>
                )}
              </button>
              <NotifPanel
                open={notifOpen}
                onClose={() => setNotifOpen(false)}
                sections={notifSections}
                onSelect={handleSelectNotif}
                selectedId={selectedBooking}
              />
            </div>
            <button onClick={fetchData} className="p-2.5 bg-white/10 border border-white/20 rounded-2xl text-white/70 hover:text-white transition-all hover:bg-white/20">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary bar ── */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label:'เช็คอินวันนี้',   val: ciToday.length,    color:'#d97706', bg:'#fffbeb', icon:<LogIn size={16}/> },
            { label:'เช็คเอ้าท์วันนี้',val: coToday.length,   color:'#dc2626', bg:'#fff1f2', icon:<LogOut size={16}/> },
            { label:'พักอยู่ตอนนี้',  val: checkedInNow.length,color:'#4a7a46',bg:'#f0fdf4', icon:<CheckCheck size={16}/> },
            { label:'รอปล่อยเล่น',    val: notPlayM.length+notPlayE.length, color:'#7c3aed',bg:'#f5f3ff', icon:<PawPrint size={16}/> },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-[#efebe9] px-4 py-3.5 flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              <div>
                <p className="text-xl font-black" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[10px] font-bold text-[#A1887F] leading-tight">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Currently staying summary ── */}
      {!loading && checkedInNow.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#efebe9] overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 bg-[#FDFBFA] border-b border-[#efebe9] flex items-center gap-2">
            <CheckCheck size={13} className="text-[#4a7a46]" />
            <p className="text-[10px] font-black text-[#A1887F] uppercase tracking-widest">กำลังพักอยู่ ({checkedInNow.length} บ้าน) — สถานะปล่อยเล่นวันนี้</p>
          </div>
          <div className="divide-y divide-[#f5f0ec]">
            {checkedInNow.map(b => {
              const rc = ROOM_COLOR[b.room_type]||'#885E43';
              const em = ROOM_EMOJI[b.room_type]||'🏠';
              const mD = !!playMap[b.id]?.morning; const eD = !!playMap[b.id]?.evening;
              return (
                <div key={b.id} className="px-4 py-3 flex items-center gap-3">
                  <span className="text-lg shrink-0">{em}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-black px-2 py-0.5 rounded-full" style={{ background: rc+'18', color: rc }}>{b.room_type}</span>
                      <span className="text-xs font-bold text-[#372C2E]">{b.customer_name}</span>
                    </div>
                    <p className="text-[11px] text-[#A1887F] mt-0.5">🐱 {b.cat_names}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 ${mD?'bg-amber-50 text-amber-600 border border-amber-200':'bg-gray-100 text-gray-400'}`}><Sun size={10}/>{mD?'✓':'–'}</span>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 ${eD?'bg-indigo-50 text-indigo-600 border border-indigo-200':'bg-gray-100 text-gray-400'}`}><Moon size={10}/>{eD?'✓':'–'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Detail action cards ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-[#A1887F]" /></div>
      ) : bookingsDetail.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <LogIn size={14} className="text-[#885E43]" />
            <p className="text-sm font-black text-[#372C2E] uppercase tracking-wider">จัดการเช็คอิน / เช็คเอ้าท์ & ปล่อยเล่น</p>
          </div>
          {bookingsDetail.map(b => {
            const ops = opsMap[b.id]||{};
            const plays = playMap[b.id]||{ morning:null, evening:null };
            const rc = ROOM_COLOR[b.room_type]||'#885E43';
            const isCI = !!ops.checked_in; const isCO = !!ops.checked_out;
            const mp = plays.morning; const ep = plays.evening;
            const neighbors = getNeighbors(b);
            const ciTd = b.start_date===date; const ciTm = b.start_date===tom;
            const coTd = b.end_date===date;   const coTm = b.end_date===tom;
            const isHighlighted = selectedBooking === b.id;

            return (
              <div key={b.id} id={`booking-card-${b.id}`}
                className={`bg-white rounded-[2rem] border overflow-hidden shadow-sm transition-all duration-300 ${isHighlighted ? 'border-[#DE9E48] shadow-md shadow-[#DE9E48]/20 ring-2 ring-[#DE9E48]/30' : 'border-[#efebe9]'}`}>
                {/* Card header */}
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border" style={{ background:rc+'18', borderColor:rc+'40', color:rc }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background:rc }}/>{ROOM_EMOJI[b.room_type]||'🏠'} {b.room_type}
                    </span>
                    {isCI && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">● อยู่ระหว่างเข้าพัก</span>}
                    {(ciTd||ciTm)&&!isCI && <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100"><AlarmClock size={10}/>{ciTd?'เช็คอินวันนี้':'เช็คอินพรุ่งนี้'}</span>}
                    {(coTd||coTm) && <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100"><ArrowRightCircle size={10}/>{coTd?'เช็คเอ้าท์วันนี้':'เช็คเอ้าท์พรุ่งนี้'}</span>}
                  </div>
                  <p className="font-black text-[#372C2E] text-base leading-tight">{b.customer_name||'ไม่ระบุ'}</p>
                  <p className="text-sm font-bold text-[#885E43] mt-0.5">🐱 {b.cat_names||'ไม่ระบุ'}</p>
                  <p className="text-[11px] text-[#A1887F] mt-1">{fmtDate(b.start_date)} → {fmtDate(b.end_date)}</p>
                </div>

                {/* Check-in / Check-out */}
                <div className="mx-5 mb-4 rounded-2xl border border-[#efebe9] overflow-hidden">
                  <div className="px-4 py-2 bg-[#FDFBFA] border-b border-[#efebe9]"><p className="text-[10px] font-black text-[#A1887F] uppercase tracking-widest">เช็คอิน / เช็คเอ้าท์</p></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#efebe9]">
                    {[
                      { key:'in',  icon:<LogIn size={16}/>,  label:'เช็คอิน',    done:isCI, color:'green', toggle:()=>toggleCheckin(b),  timeField:'checkin_time',  timeVal:ops.checkin_time  },
                      { key:'out', icon:<LogOut size={16}/>, label:'เช็คเอ้าท์', done:isCO, color:'blue',  toggle:()=>toggleCheckout(b), timeField:'checkout_time', timeVal:ops.checkout_time },
                    ].map(s => (
                      <div key={s.key} className="px-4 py-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={s.done?`text-${s.color}-500`:'text-[#C4A99A]'}>{s.icon}</span>
                            <span className="text-sm font-black text-[#372C2E]">{s.label}</span>
                          </div>
                          <button onClick={s.toggle} disabled={saving[b.id]}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all active:scale-95 disabled:opacity-50 ${s.done?`bg-${s.color}-50 text-${s.color}-600 border-${s.color}-200`:'bg-[#F5F2F0] text-[#A1887F] border-[#efebe9] hover:border-[#885E43] hover:text-[#885E43]'}`}>
                            {s.done?<CheckCircle2 size={13}/>:<Circle size={13}/>}
                            {s.done?`${s.label}แล้ว`:`ยังไม่${s.label}`}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={13} className="text-[#C4A99A] shrink-0"/>
                          <span className="text-[11px] text-[#A1887F] font-bold whitespace-nowrap">เวลา</span>
                          <input type="time" value={s.timeVal||''} onChange={e=>updateTime(b.id,s.timeField,e.target.value)}
                            className="flex-1 min-w-0 bg-[#FDFBFA] border border-[#efebe9] rounded-xl px-2 py-1.5 text-sm font-bold text-[#372C2E] outline-none focus:border-[#885E43] transition-all"/>
                          <button onClick={()=>updateTime(b.id,s.timeField,nowTime())}
                            className="text-[10px] font-black px-2 py-1.5 rounded-lg bg-[#F5EEE8] text-[#885E43] hover:bg-[#e8d9cc] transition-all whitespace-nowrap">ตอนนี้</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Neighbors */}
                {isCI && neighbors.length > 0 && (
                  <div className="mx-5 mb-4 rounded-2xl border border-[#efebe9] overflow-hidden">
                    <div className="px-4 py-2 bg-[#FDFBFA] border-b border-[#efebe9] flex items-center gap-2">
                      <Home size={13} className="text-[#885E43]"/>
                      <p className="text-[10px] font-black text-[#A1887F] uppercase tracking-widest">ห้องข้างเคียงที่กำลังเข้าพัก</p>
                    </div>
                    {neighbors.map(nb => {
                      const nc = ROOM_COLOR[nb.room_type]||'#885E43';
                      return (
                        <div key={nb.id} className="px-4 py-3 flex items-center gap-3 border-b border-[#f5f0ec] last:border-0">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base" style={{ background:nc+'18' }}>{ROOM_EMOJI[nb.room_type]||'🏠'}</div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-black" style={{ color:nc }}>{nb.room_type}</span>
                            <span className="text-[11px] font-bold text-[#885E43] ml-2">{nb.customer_name}</span>
                            <p className="text-[11px] text-[#A1887F] truncate">🐱 {nb.cat_names||'ไม่ระบุ'}</p>
                          </div>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 shrink-0">● เข้าพักอยู่</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Play sessions */}
                <div className="mx-5 mb-5 rounded-2xl border border-[#efebe9] overflow-hidden">
                  <div className="px-4 py-2 bg-[#FDFBFA] border-b border-[#efebe9] flex items-center gap-2">
                    <PawPrint size={13} className="text-[#885E43]"/>
                    <p className="text-[10px] font-black text-[#A1887F] uppercase tracking-widest">รอบปล่อยเล่น</p>
                    <span className="ml-auto text-[10px] font-black text-[#A1887F]">{(mp?1:0)+(ep?1:0)}/2 รอบ</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#efebe9]">
                    {[
                      { session:'morning', label:'รอบเช้า', icon:<Sun size={15}/>,  color:'#d97706', bg:'#fef3c7', border:'#fde68a', activeBg:'#fffbeb', row:mp },
                      { session:'evening', label:'รอบเย็น', icon:<Moon size={15}/>, color:'#6366f1', bg:'#ede9fe', border:'#c4b5fd', activeBg:'#f5f3ff', row:ep },
                    ].map(({ session, label, icon, color, bg, border, activeBg, row }) => {
                      const done = !!row; const out = done&&!row.returned_at; const back = done&&!!row.returned_at;
                      const sk = `play_${b.id}_${session}`; const sp = saving[sk];
                      return (
                        <div key={session} className="px-4 py-4 flex flex-col gap-3" style={{ background: done?activeBg:'transparent' }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2" style={{ color }}>{icon}<span className="text-sm font-black text-[#372C2E]">{label}</span></div>
                            <button onClick={()=>togglePlay(b.id,b.cat_names,session)} disabled={sp}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all active:scale-95 disabled:opacity-50"
                              style={done?{ background:bg, color, borderColor:border }:{ background:'#F5F2F0', color:'#A1887F', borderColor:'#efebe9' }}>
                              {sp?<Loader2 size={12} className="animate-spin"/>:done?<CheckCircle2 size={13}/>:<Circle size={13}/>}
                              {done?'ปล่อยเล่นแล้ว':'ยังไม่ได้ปล่อย'}
                            </button>
                          </div>
                          {done && (
                            <div className="rounded-xl border px-3 py-2.5 flex items-center justify-between gap-2 flex-wrap" style={{ borderColor:border, background:bg+'55' }}>
                              <div>
                                <p className="text-[11px] font-bold text-[#372C2E]">🐱 {row.cat_names}</p>
                                <p className="text-[11px] text-[#A1887F] mt-0.5">🐾 ออก <span className="font-black" style={{ color }}>{row.released_at}</span>{back&&<> · 🏠 กลับ <span className="font-black text-green-600">{row.returned_at}</span></>}</p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {out && <button onClick={()=>returnCat(row.id)} className="text-[11px] font-black px-2.5 py-1.5 rounded-xl bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-all">กลับแล้ว</button>}
                                {back && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-100">✓ กลับแล้ว</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-[2rem] border border-[#efebe9]">
          <div className="text-5xl mb-3 opacity-30">🐾</div>
          <p className="text-[#A1887F] font-bold text-sm">ไม่มีรายการในช่วงนี้ที่ต้องดำเนินการ</p>
          <p className="text-[#C4A99A] text-xs mt-1">เปลี่ยนวันที่เพื่อดูวันอื่น</p>
        </div>
      )}
    </div>
  );
}
