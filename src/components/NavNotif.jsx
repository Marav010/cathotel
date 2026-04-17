/**
 * NavNotif — Notification dropdown ที่แสดงในทุกหน้า
 * อยู่ข้างปุ่ม Logout ใน Navbar
 * - แสดงบ้านที่จะเช็คอิน/เช็คเอ้าท์เร็วๆ นี้
 * - กดเช็คอิน / เช็คเอ้าท์ได้เลยจาก dropdown
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  BellRing, LogIn, LogOut, CheckCircle2, Circle,
  Loader2, RefreshCw, Clock, AlarmClock, ArrowRightCircle,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────
const todayStr = () => new Date().toLocaleDateString('sv-SE');
const addDays  = (ds, n) => { const d = new Date(ds); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };
const fmtShort = (d) => d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '-';
const nowTime  = () => new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });

const ROOM_COLOR = {
  'สแตนดาร์ด': '#C39A7A', 'ดีลักซ์': '#ad6ea8', 'ซูพีเรีย': '#d98a8a',
  'พรีเมี่ยม': '#368daf',  'วีไอพี':   '#4a7a46', 'วีวีไอพี':  '#7a6a5a',
};
const ROOM_EMOJI = {
  'สแตนดาร์ด': '🏠', 'ดีลักซ์': '🏡', 'ซูพีเรีย': '🏘️',
  'พรีเมี่ยม':  '🏰', 'วีไอพี':  '⭐', 'วีวีไอพี':  '👑',
};

// ── single booking row inside dropdown ───────────────────────────────────
function BookingRow({ b, ops, saving, onCheckin, onCheckout }) {
  const rc    = ROOM_COLOR[b.room_type]  || '#885E43';
  const em    = ROOM_EMOJI[b.room_type]  || '🏠';
  const isCI  = !!ops?.checked_in;
  const isCO  = !!ops?.checked_out;
  const today = todayStr();
  const tom   = addDays(today, 1);

  const ciLabel = b.start_date === today ? '📅 เช็คอินวันนี้'
    : b.start_date === tom ? '📅 เช็คอินพรุ่งนี้' : null;
  const coLabel = b.end_date === today ? '📅 เช็คเอ้าท์วันนี้'
    : b.end_date === tom ? '📅 เช็คเอ้าท์พรุ่งนี้' : null;

  return (
    <div className="px-4 py-3 border-b border-[#f0ebe7] last:border-0 hover:bg-[#FDFBFA] transition-colors">
      {/* top row: icon + name + cats */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 border border-[#efebe9]"
          style={{ background: rc + '18' }}>{em}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ background: rc + '20', color: rc }}>{b.room_type}</span>
            {isCI && !isCO && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">● พักอยู่</span>}
          </div>
          <p className="text-xs font-black text-[#372C2E] truncate">{b.customer_name}</p>
          <p className="text-[10px] text-[#885E43] truncate">🐱 {b.cat_names}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] text-[#A1887F]">{fmtShort(b.start_date)}</p>
          <p className="text-[10px] text-[#C4A99A]">→ {fmtShort(b.end_date)}</p>
        </div>
      </div>

      {/* date labels */}
      <div className="flex gap-1.5 flex-wrap mb-2">
        {ciLabel && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{ciLabel}</span>}
        {coLabel && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">{coLabel}</span>}
      </div>

      {/* action buttons */}
      <div className="grid grid-cols-2 gap-2">
        {/* Check-in button */}
        <button
          onClick={() => onCheckin(b)}
          disabled={saving[b.id] || isCO}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-black border transition-all active:scale-95 disabled:opacity-40 ${
            isCI
              ? 'bg-green-50 text-green-600 border-green-200'
              : 'bg-white text-[#A1887F] border-[#efebe9] hover:border-green-300 hover:text-green-600 hover:bg-green-50'
          }`}
        >
          {saving[b.id] === 'ci'
            ? <Loader2 size={11} className="animate-spin" />
            : isCI ? <CheckCircle2 size={11} /> : <Circle size={11} />}
          {isCI ? 'เช็คอินแล้ว' : 'เช็คอิน'}
        </button>

        {/* Check-out button */}
        <button
          onClick={() => onCheckout(b)}
          disabled={saving[b.id] || !isCI}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-black border transition-all active:scale-95 disabled:opacity-40 ${
            isCO
              ? 'bg-gray-100 text-gray-400 border-gray-200'
              : isCI
              ? 'bg-white text-[#A1887F] border-[#efebe9] hover:border-red-300 hover:text-red-500 hover:bg-red-50'
              : 'bg-white text-[#C4A99A] border-[#efebe9] cursor-not-allowed'
          }`}
        >
          {saving[b.id] === 'co'
            ? <Loader2 size={11} className="animate-spin" />
            : isCO ? <CheckCircle2 size={11} /> : <Circle size={11} />}
          {isCO ? 'เช็คเอ้าท์แล้ว' : 'เช็คเอ้าท์'}
        </button>
      </div>

      {/* time display */}
      {(ops?.checkin_time || ops?.checkout_time) && (
        <div className="flex gap-3 mt-1.5">
          {ops?.checkin_time  && <span className="text-[10px] text-[#A1887F]"><Clock size={9} className="inline mr-0.5"/>เข้า {ops.checkin_time}</span>}
          {ops?.checkout_time && <span className="text-[10px] text-[#A1887F]"><Clock size={9} className="inline mr-0.5"/>ออก {ops.checkout_time}</span>}
        </div>
      )}
    </div>
  );
}

// ── main dropdown component ───────────────────────────────────────────────
export default function NavNotif() {
  const [open, setOpen]         = useState(false);
  const [bookings, setBookings] = useState([]);
  const [opsMap, setOpsMap]     = useState({});
  const [saving, setSaving]     = useState({});
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState(null);
  const [tab, setTab]           = useState('today'); // 'today' | 'tomorrow'
  const ref                     = useRef(null);

  // close when clicking outside
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const today = todayStr();
    const tom   = addDays(today, 1);
    const day2  = addDays(today, 2);

    // fetch bookings for today + tomorrow check-in/out
    const [{ data: bIn }, { data: bOut }] = await Promise.all([
      supabase.from('bookings').select('*').gte('start_date', today).lte('start_date', tom),
      supabase.from('bookings').select('*').gte('end_date',   today).lte('end_date',   tom),
    ]);

    const seen = new Set();
    const all  = [...(bIn||[]), ...(bOut||[])].filter(b => {
      if (seen.has(b.id)) return false; seen.add(b.id); return true;
    });
    all.sort((a, b) => a.start_date.localeCompare(b.start_date));
    setBookings(all);

    if (all.length) {
      const ids = all.map(b => b.id);
      const { data: ops } = await supabase.from('booking_ops').select('*').in('booking_id', ids);
      const om = {}; (ops||[]).forEach(o => { om[o.booking_id] = o; });
      setOpsMap(om);
    }
    setLoading(false);
  }, []);

  // fetch when opened
  useEffect(() => { if (open) fetchData(); }, [open, fetchData]);

  const showToast = (type, msg) => {
    setToast({ type, msg }); setTimeout(() => setToast(null), 2500);
  };

  const upsertOps = async (bookingId, patch) => {
    const ex = opsMap[bookingId];
    const { error } = ex
      ? await supabase.from('booking_ops').update(patch).eq('id', ex.id)
      : await supabase.from('booking_ops').insert({ booking_id: bookingId, ops_date: todayStr(), ...patch });
    return !error;
  };

  const handleCheckin = async (b) => {
    setSaving(s => ({ ...s, [b.id]: 'ci' }));
    const ops = opsMap[b.id] || {};
    const nowCI = !ops.checked_in;
    const ok = await upsertOps(b.id, {
      checked_in:   nowCI,
      checkin_time: nowCI ? (ops.checkin_time || nowTime()) : null,
    });
    if (ok) { showToast('success', nowCI ? `✓ ${b.customer_name} เช็คอินแล้ว` : `ยกเลิกเช็คอิน`); await fetchData(); }
    else      showToast('error', 'บันทึกไม่สำเร็จ');
    setSaving(s => ({ ...s, [b.id]: null }));
  };

  const handleCheckout = async (b) => {
    setSaving(s => ({ ...s, [b.id]: 'co' }));
    const ops = opsMap[b.id] || {};
    const nowCO = !ops.checked_out;
    const ok = await upsertOps(b.id, {
      checked_out:   nowCO,
      checkout_time: nowCO ? (ops.checkout_time || nowTime()) : null,
    });
    if (ok) { showToast('success', nowCO ? `✓ ${b.customer_name} เช็คเอ้าท์แล้ว` : `ยกเลิกเช็คเอ้าท์`); await fetchData(); }
    else      showToast('error', 'บันทึกไม่สำเร็จ');
    setSaving(s => ({ ...s, [b.id]: null }));
  };

  // ── filtered lists ──
  const today = todayStr();
  const tom   = addDays(today, 1);

  const todayList = bookings.filter(b => {
    if (opsMap[b.id]?.checked_out) return false;
    return b.start_date === today || b.end_date === today;
  });
  const tomList = bookings.filter(b => {
    if (opsMap[b.id]?.checked_out) return false;
    return b.start_date === tom || b.end_date === tom;
  });

  const urgentCount = todayList.filter(b => !opsMap[b.id]?.checked_in).length
    + todayList.filter(b => opsMap[b.id]?.checked_in && !opsMap[b.id]?.checked_out && b.end_date === today).length;

  const displayList = tab === 'today' ? todayList : tomList;

  return (
    <div className="relative" ref={ref}>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-2.5 rounded-2xl text-xs font-bold shadow-xl ${
          toast.type === 'success' ? 'bg-[#372C2E] text-[#DE9E48]' : 'bg-red-600 text-white'
        }`}>{toast.msg}</div>
      )}

      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`relative p-2.5 rounded-2xl border transition-all ${
          open ? 'bg-[#372C2E] border-[#372C2E] text-[#DE9E48]' : 'text-[#A1887F] border-transparent hover:bg-[#F5F2F0] hover:text-[#372C2E]'
        }`}
        title="การแจ้งเตือนเช็คอิน/เช็คเอ้าท์"
      >
        <BellRing size={19} />
        {urgentCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-black px-0.5 animate-bounce">
            {urgentCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-w-[95vw] bg-white rounded-3xl shadow-2xl shadow-[#372C2E]/15 border border-[#efebe9] z-[200] flex flex-col"
          style={{ maxHeight: '80vh' }}>

          {/* Header */}
          <div className="px-4 py-3.5 border-b border-[#efebe9] flex items-center gap-2 shrink-0">
            <BellRing size={15} className="text-[#885E43]" />
            <span className="font-black text-[#372C2E] text-sm flex-1">การแจ้งเตือนเช็คอิน/เช็คเอ้าท์</span>
            <button onClick={fetchData} disabled={loading}
              className="p-1.5 rounded-xl text-[#A1887F] hover:bg-[#F5F2F0] transition-all">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setOpen(false)}
              className="p-1.5 rounded-xl text-[#A1887F] hover:bg-[#F5F2F0] transition-all text-xs font-bold">✕</button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#efebe9] shrink-0">
            {[
              { key: 'today',    label: 'วันนี้',    count: todayList.length },
              { key: 'tomorrow', label: 'พรุ่งนี้',  count: tomList.length  },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 py-2.5 text-xs font-black flex items-center justify-center gap-1.5 transition-all border-b-2 ${
                  tab === t.key
                    ? 'text-[#885E43] border-[#885E43]'
                    : 'text-[#A1887F] border-transparent hover:text-[#372C2E]'
                }`}>
                {t.label}
                {t.count > 0 && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                    tab === t.key ? 'bg-[#885E43] text-white' : 'bg-[#F5F2F0] text-[#A1887F]'
                  }`}>{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={22} className="animate-spin text-[#A1887F]" />
              </div>
            ) : displayList.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-2 opacity-30">🐾</div>
                <p className="text-[#A1887F] font-bold text-sm">ไม่มีรายการ{tab === 'today' ? 'วันนี้' : 'พรุ่งนี้'}</p>
                <p className="text-[#C4A99A] text-xs mt-1">บ้านที่เช็คเอ้าท์แล้วจะถูกซ่อนออก</p>
              </div>
            ) : (
              displayList.map(b => (
                <BookingRow
                  key={b.id}
                  b={b}
                  ops={opsMap[b.id]}
                  saving={saving}
                  onCheckin={handleCheckin}
                  onCheckout={handleCheckout}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-[#efebe9] shrink-0">
            <p className="text-[10px] text-[#C4A99A] text-center font-bold">
              กดปุ่มเพื่อบันทึกเช็คอิน/เช็คเอ้าท์ได้เลย • บ้านที่เช็คเอ้าท์แล้วจะซ่อนออก
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
