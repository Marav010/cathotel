import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import {
  Calendar as CalendarIcon, Loader2, X, LayoutDashboard,
  MousePointerClick, CalendarDays, BadgeCheck, Wallet, Receipt,
  Clock, BedDouble, Sparkles, ChevronsRight
} from 'lucide-react';

export default function CalendarView({ onDateClick }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const calendarRef = useRef(null);
  const clickTimer = useRef(null);

  const getTodayStr = () => new Date().toLocaleDateString('sv-SE');
  const [selectedDateStatus, setSelectedDateStatus] = useState(getTodayStr());
  const [animateCards, setAnimateCards] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);

  const ROOM_CONFIG = {
    'สแตนดาร์ด': { total: 7, color: '#C39A7A', accent: '#f5e6d8', price: 300, tier: 'Standard' },
    'ดีลักซ์':   { total: 2, color: '#ad6ea8', accent: '#f3e8f5', price: 350, tier: 'Deluxe' },
    'ซูพีเรีย':  { total: 4, color: '#d98a8a', accent: '#fdf0f0', price: 350, tier: 'Superior' },
    'พรีเมี่ยม': { total: 4, color: '#368daf', accent: '#e6f4fa', price: 400, tier: 'Premium' },
    'วีไอพี':    { total: 2, color: '#4a7a46', accent: '#eaf4e9', price: 500, tier: 'VIP' },
    'วีวีไอพี':  { total: 1, color: '#7a6a5a', accent: '#f0ece8', price: 600, tier: 'VVIP' },
  };

  const getRoomColor = (type) => ROOM_CONFIG[type]?.color || '#e05f5f';

  const formatThaiDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

  const formatThaiDateFull = (dateStr) =>
    new Date(dateStr).toLocaleDateString('th-TH', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

  const fetchBookings = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('bookings').select('*');
      if (error) throw error;
      const formattedEvents = data?.map(b => {
        const end = new Date(b.end_date);
        end.setDate(end.getDate() + 1);
        return {
          id: b.id,
          title: ` ${b.cat_names}`,
          start: b.start_date,
          end: end.toISOString().split('T')[0],
          backgroundColor: getRoomColor(b.room_type),
          borderColor: 'transparent',
          allDay: true,
          extendedProps: { ...b },
        };
      }) || [];
      setEvents(formattedEvents);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchBookings();
    setSelectedDateStatus(getTodayStr());
  }, [fetchBookings]);

  const roomStatusSummary = Object.keys(ROOM_CONFIG).map(type => {
    const used = events.filter(event => (
      event.extendedProps.room_type === type &&
      selectedDateStatus >= event.start &&
      selectedDateStatus < event.end
    )).length;
    return {
      type, used,
      total: ROOM_CONFIG[type].total,
      available: ROOM_CONFIG[type].total - used,
      color: ROOM_CONFIG[type].color,
      accent: ROOM_CONFIG[type].accent,
      price: ROOM_CONFIG[type].price,
    };
  });

  const totalAvailable = roomStatusSummary.reduce((a, b) => a + b.available, 0);
  const totalRooms = roomStatusSummary.reduce((a, b) => a + b.total, 0);

  const closeAllFcPopovers = () => {
    document.querySelectorAll('.fc-popover').forEach(el => el.remove());
  };

  const handleDateSelect = (dateStr) => {
    setAnimateCards(true);
    setSelectedDateStatus(dateStr);
    setTimeout(() => setAnimateCards(false), 600);
    document.getElementById('admin-status-dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const calculatePricing = (booking) => {
    const start = new Date(booking.start_date);
    const end = new Date(booking.end_date);
    const nights = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const roomPricePerNight = ROOM_CONFIG[booking.room_type]?.price || 0;
    const totalRoomPrice = roomPricePerNight * nights;
    const extraCharges = Math.max(0, (booking.total_price || 0) - totalRoomPrice);
    return { nights, totalRoomPrice, extraCharges };
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
      <div style={{ animation: 'catBounce 1.4s ease-in-out infinite', fontSize: '3rem' }}>🐱</div>
      <p className="text-[#A1887F] font-bold text-sm tracking-widest uppercase">กำลังโหลดข้อมูล...</p>
    </div>
  );

  return (
    <>

      <div className="py-2 md:py-4 space-y-6 overflow-visible font-sans">

        {/* ── Hero Header ── */}
        <div className="relative overflow-hidden bg-[#372C2E] rounded-[2rem] p-6 md:p-8 shadow-2xl shadow-[#372C2E]/20">
          <div className="paw-float  absolute top-3  right-16 text-5xl text-white select-none pointer-events-none">🐾</div>
          <div className="paw-float2 absolute bottom-2 right-6  text-3xl text-white select-none pointer-events-none">🐾</div>
          <div className="paw-float  absolute top-1/2 right-36 text-2xl text-white select-none pointer-events-none" style={{ animationDelay: '1s' }}>🐾</div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-5">
            <div className="flex items-center gap-4">
              <div className="bg-[#DE9E48] p-4 rounded-2xl shadow-lg shadow-[#DE9E48]/30">
                <CalendarIcon size={28} className="text-[#372C2E]" />
              </div>
              <div>
                <p className="text-[#DE9E48] text-[10px] font-black uppercase tracking-[0.25em] mb-0.5">Admin Panel</p>
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">ตารางเข้าพัก</h2>
                <p className="text-white/50 text-xs mt-1">คลิกวันเพื่อดูสถานะ • ดับเบิ้ลคลิกเพื่อสร้างการจอง</p>
              </div>
            </div>

            {/* Occupancy summary pill */}
            <div className="md:ml-auto flex items-center gap-3">
              <div className="bg-white/10 border border-white/15 rounded-2xl px-5 py-3 text-center">
                <p className="text-white/50 text-[9px] font-black uppercase tracking-widest mb-0.5">วันนี้ว่าง</p>
                <p className="f-number text-[#DE9E48]" style={{ fontSize: "2rem" }}>{totalAvailable}</p>
                <p className="text-white/40 text-[9px] font-bold">จาก {totalRooms} ห้อง</p>
              </div>
              <div className="bg-white/10 border border-white/15 rounded-2xl px-5 py-3 text-center">
                <p className="text-white/50 text-[9px] font-black uppercase tracking-widest mb-0.5">การจองทั้งหมด</p>
                <p className="f-number text-white" style={{ fontSize: "2rem" }}>{events.length}</p>
                <p className="text-white/40 text-[9px] font-bold">รายการ</p>
              </div>
            </div>
          </div>
        </div>

        {/* Gold divider */}
        <div className="divider-gold" />

        {/* ── Status Dashboard ── */}
        <div
          id="admin-status-dashboard"
          className="bg-white rounded-[2rem] border border-[#efebe9] shadow-sm overflow-hidden"
        >
          {/* Dashboard Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#f5f0ec]">
            <div className="flex items-center gap-3">
              <Sparkles size={16} className="text-[#DE9E48]" />
              <div>
                <h3 className="text-sm font-black text-[#372C2E]">สถานะห้องพัก</h3>
                <p className="text-[11px] text-[#885E43] font-bold">{formatThaiDateFull(selectedDateStatus)}</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-[10px] text-[#A1887F] font-bold bg-[#FDFBFA] px-3 py-1.5 rounded-full border border-[#efebe9]">
              <MousePointerClick size={11} />
              คลิก 1 ครั้ง: ดูสถานะ &nbsp;|&nbsp; ดับเบิ้ลคลิก: จองที่พัก
            </div>
          </div>

          {/* Room Cards Grid */}
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {roomStatusSummary.map((item, idx) => {
              const pct = item.total > 0 ? (item.used / item.total) * 100 : 0;
              const isFull = item.available <= 0;
              return (
                <div
                  key={item.type}
                  className={`relative rounded-2xl p-3.5 border transition-all duration-300 overflow-hidden
                    ${animateCards ? 'animate-card' : ''}
                    ${isFull
                      ? 'bg-red-50 border-red-200'
                      : 'bg-[#FDFBFA] border-[#efebe9] hover:border-[#DBD0C5] hover:shadow-md'
                    }`}
                  style={{ animationDelay: animateCards ? `${idx * 60}ms` : '0ms' }}
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: item.color }} />
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] font-black text-[#885E43] uppercase truncate">{item.type}</span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className={`f-number ${isFull ? 'text-red-500' : 'text-[#372C2E]'}`} style={{ fontSize: "1.9rem" }}>
                      {isFull ? '0' : item.available}
                    </span>
                    <span className="text-[10px] text-[#A1887F] font-bold">/{item.total}</span>
                  </div>
                  <p className={`text-[9px] font-black uppercase tracking-wide mb-2 ${isFull ? 'text-red-400' : 'text-emerald-600'}`}>
                    {isFull ? '● เต็มแล้ว' : '● ว่างอยู่'}
                  </p>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: isFull ? '#ef4444' : item.color }}
                    />
                  </div>
                  <p className="text-[9px] text-[#A1887F] font-bold mt-2">฿{item.price}<span className="opacity-60">/คืน</span></p>
                </div>
              );
            })}
          </div>

          {/* Overall bar */}
          <div className="px-5 pb-4">
            <div className="flex items-center gap-2 bg-[#FDFBFA] rounded-xl p-3 border border-[#efebe9]">
              <BedDouble size={14} className="text-[#885E43] shrink-0" />
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${totalRooms > 0 ? ((totalRooms - totalAvailable) / totalRooms) * 100 : 0}%`,
                    background: 'linear-gradient(90deg, #885E43, #DE9E48)',
                  }}
                />
              </div>
              <span className="text-[10px] font-black text-[#372C2E] whitespace-nowrap">
                จองแล้ว {totalRooms - totalAvailable}/{totalRooms} ห้อง
              </span>
            </div>
          </div>
        </div>

        {/* ── Legend ── */}
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#A1887F] mr-1">ประเภทห้อง:</span>
          {Object.entries(ROOM_CONFIG).map(([name, cfg]) => (
            <span
              key={name}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border"
              style={{ backgroundColor: cfg.accent, borderColor: cfg.color + '40', color: cfg.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
              {name}
            </span>
          ))}
        </div>

        {/* ── Calendar ── */}
        <div className="admin-calendar bg-white p-4 md:p-6 rounded-[2.5rem] border border-[#DBD0C5] shadow-lg overflow-hidden">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale="th"
            events={events}
            eventDisplay="block"
            displayEventTime={false}
            dayMaxEvents={50}
            height="auto"
            selectable={true}
            headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
            moreLinkClick={() => { setIsModalOpen(false); return 'popover'; }}
            dateClick={(info) => {
              closeAllFcPopovers();
              if (clickTimer.current) {
                clearTimeout(clickTimer.current);
                clickTimer.current = null;
                if (onDateClick) onDateClick(info.dateStr);
              } else {
                clickTimer.current = setTimeout(() => {
                  handleDateSelect(info.dateStr);
                  clickTimer.current = null;
                }, 250);
              }
            }}
            eventClick={(info) => {
              setSelectedBooking(info.event.extendedProps);
              setIsModalOpen(true);
            }}
          />
        </div>
      </div>

      {/* ── Booking Detail Modal ── */}
      {isModalOpen && selectedBooking && (() => {
        const pricing = calculatePricing(selectedBooking);
        const roomColor = getRoomColor(selectedBooking.room_type);
        const roomAccent = ROOM_CONFIG[selectedBooking.room_type]?.accent || '#fdf8f5';
        return (
          <div
            className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-md"
            onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
          >
            <div className="modal-in bg-white w-full max-w-lg md:rounded-[2.5rem] rounded-t-[2.5rem] overflow-hidden shadow-2xl border border-[#efebe9] max-h-[95vh] overflow-y-auto">

              {/* Modal Header */}
              <div className="bg-[#372C2E] p-6 text-white flex items-start justify-between relative overflow-hidden">
                <div className="absolute -bottom-6 -right-6 opacity-[0.07]"><CalendarDays size={120} /></div>
                <div className="z-10">
                  <p className="text-[#DE9E48] text-[10px] font-black uppercase tracking-widest mb-1">รายละเอียดการจอง</p>
                  <h3 className="text-xl font-black text-white">{selectedBooking.cat_names}</h3>
                  <p className="text-white/50 text-xs mt-0.5">{selectedBooking.customer_name}</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="z-10 bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all shrink-0 ml-4"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Room type badge */}
              <div className="px-6 pt-5">
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
                  style={{ backgroundColor: roomAccent, borderColor: roomColor + '30' }}
                >
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: roomColor }} />
                  <span className="text-sm font-black" style={{ color: roomColor }}>{selectedBooking.room_type}</span>
                  <span className="ml-auto text-xs font-bold text-[#A1887F]">
                    ฿{ROOM_CONFIG[selectedBooking.room_type]?.price}/คืน
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Owner & Cat */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#FDFBFA] rounded-2xl p-4 border border-[#efebe9]">
                    <p className="text-[10px] font-black text-[#A1887F] uppercase tracking-wider mb-1.5">เจ้าของ</p>
                    <p className="text-sm font-black text-[#372C2E]">{selectedBooking.customer_name}</p>
                  </div>
                  <div className="bg-orange-50/60 rounded-2xl p-4 border border-orange-100/60">
                    <p className="text-[10px] font-black text-[#A1887F] uppercase tracking-wider mb-1.5">น้องแมว 🐱</p>
                    <p className="text-sm font-black text-[#885E43]">{selectedBooking.cat_names}</p>
                  </div>
                </div>

                {/* Check-in / Check-out */}
                <div className="bg-[#FDFBFA] rounded-2xl border border-[#efebe9] overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-[#f0ece8]">
                    <Clock size={13} className="text-[#DE9E48]" />
                    <span className="text-[10px] font-black text-[#885E43] uppercase tracking-wider">ระยะเวลาเข้าพัก · {pricing.nights} คืน</span>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-[#f0ece8]">
                    <div className="p-4">
                      <p className="text-[9px] font-bold text-[#A1887F] uppercase tracking-wider mb-1">เช็คอิน</p>
                      <p className="text-sm font-black text-[#372C2E]">{formatThaiDate(selectedBooking.start_date)}</p>
                    </div>
                    <div className="p-4">
                      <p className="text-[9px] font-bold text-[#A1887F] uppercase tracking-wider mb-1">เช็คเอาท์</p>
                      <p className="text-sm font-black text-[#372C2E]">{formatThaiDate(selectedBooking.end_date)}</p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Receipt size={12} className="text-[#DE9E48]" />
                    <p className="text-[10px] font-black text-[#A1887F] uppercase tracking-wider">รายการเพิ่มเติม / หมายเหตุ</p>
                  </div>
                  <div className="bg-[#FDFBFA] p-4 rounded-2xl border border-[#efebe9] min-h-[52px]">
                    {selectedBooking.note && selectedBooking.note !== '-'
                      ? <p className="text-xs font-bold text-[#5D4037] leading-relaxed whitespace-pre-line">{selectedBooking.note}</p>
                      : <p className="text-xs text-[#A1887F] italic">ไม่มีรายการเพิ่มเติม</p>
                    }
                  </div>
                </div>

                {/* Price Summary */}
                <div className="bg-[#372C2E] rounded-[1.75rem] overflow-hidden">
                  <div className="p-5 space-y-3">
                    {/* Line items */}
                    <div className="space-y-2 pb-3 border-b border-white/10">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
                          ค่าห้อง ({pricing.nights} คืน)
                        </span>
                        <span className="f-number text-white" style={{ fontSize: "1.1rem" }}>฿{pricing.totalRoomPrice.toLocaleString()}</span>
                      </div>
                      {pricing.extraCharges > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold text-[#DE9E48]/80 uppercase tracking-wider">ค่าใช้จ่ายเพิ่มเติม</span>
                          <span className="f-number text-[#DE9E48]" style={{ fontSize: "1.1rem" }}>+ ฿{pricing.extraCharges.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Total & Deposit */}
                    <div className="flex items-end justify-between pt-1">
                      <div>
                        <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1">มัดจำแล้ว</p>
                        <p className="f-number text-emerald-400" style={{ fontSize: "1.4rem" }}>
                          {selectedBooking.deposit > 0 ? `฿${selectedBooking.deposit.toLocaleString()}` : '—'}
                        </p>
                      </div>
                      <ChevronsRight size={18} className="text-white/20 mb-1" />
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1">ยอดชำระหน้างาน</p>
                        <p className="f-number text-[#DE9E48]" style={{ fontSize: "2.2rem" }}>
                          ฿{((selectedBooking.total_price || 0) - (selectedBooking.deposit || 0)).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">ยอดรวมทั้งสิ้น</p>
                      <p className="f-number text-white" style={{ fontSize: "1.15rem" }}>฿{(selectedBooking.total_price || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-4 rounded-2xl bg-[#F5F2F0] text-[#372C2E] font-black text-sm hover:bg-[#efebe9] transition-all active:scale-[0.98]"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
