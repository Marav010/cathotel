import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { BedDouble } from 'lucide-react';

// ─── Room config ────────────────────────────────────────────────
const ROOM_CONFIG = {
  'สแตนดาร์ด': { total: 7, color: '#C39A7A', price: 300,  tier: 'Standard'  },
  'ดีลักซ์':   { total: 2, color: '#ad6ea8', price: 350,  tier: 'Deluxe'    },
  'ซูพีเรีย':  { total: 4, color: '#d98a8a', price: 350,  tier: 'Superior'  },
  'พรีเมี่ยม': { total: 4, color: '#368daf', price: 400,  tier: 'Premium'   },
  'วีไอพี':    { total: 2, color: '#4a7a46', price: 500,  tier: 'VIP'       },
  'วีวีไอพี':  { total: 1, color: '#7a6a5a', price: 600,  tier: 'VVIP'      },
};

export default function UserCalendar() {
  const [events, setEvents]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const calendarRef                     = useRef(null);
  const clickTimer                      = useRef(null);
  const getTodayStr                     = () => new Date().toLocaleDateString('sv-SE');
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [animating, setAnimating]       = useState(false);

  const fetchPublicBookings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, room_type, start_date, end_date');
      if (error) throw error;
      setEvents((data || []).map(b => {
        const end = new Date(b.end_date);
        end.setDate(end.getDate() + 1);
        return {
          id: b.id,
          title: b.room_type,
          start: b.start_date,
          end: end.toISOString().split('T')[0],
          backgroundColor: ROOM_CONFIG[b.room_type]?.color || '#888',
          borderColor: 'transparent',
          textColor: '#fff',
          allDay: true,
          extendedProps: { room_type: b.room_type },
        };
      }));
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPublicBookings(); }, [fetchPublicBookings]);

  const handleDateSelect = (dateStr) => {
    setAnimating(true);
    setSelectedDate(dateStr);
    setTimeout(() => setAnimating(false), 700);
    document.getElementById('uc-availability')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const closePopovers = () =>
    document.querySelectorAll('.fc-popover').forEach(el => el.remove());

  const roomStatus = Object.entries(ROOM_CONFIG).map(([type, cfg]) => {
    const used = events.filter(e =>
      e.extendedProps.room_type === type &&
      selectedDate >= e.start &&
      selectedDate < e.end
    ).length;
    return { type, used, total: cfg.total, available: cfg.total - used, ...cfg };
  });

  const totalAvail = roomStatus.reduce((a, b) => a + b.available, 0);
  const totalAll   = roomStatus.reduce((a, b) => a + b.total, 0);

  const formatThaiDate = (ds) =>
    new Date(ds).toLocaleDateString('th-TH', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5"
      style={{ background: '#fdfbfa' }}>
      <style>{`@keyframes catBounce{0%,100%{transform:translateY(0) rotate(-5deg)}50%{transform:translateY(-14px) rotate(5deg)}}`}</style>
      <div style={{ animation: 'catBounce 1.6s ease-in-out infinite', fontSize: '3.5rem' }}>🐱</div>
      <p style={{ fontFamily: 'Sarabun,sans-serif', color: '#A1887F', fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
        กำลังโหลดข้อมูล…
      </p>
    </div>
  );

  return (
    <>
      <style id="uc-styles-v2">{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=Bebas+Neue&display=swap');
        .f-body    { font-family: 'Sarabun', sans-serif; }
        .f-number  { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.05em; }
        .divider-gold { background: linear-gradient(90deg, transparent, #C39A7A 30%, #DE9E48 50%, #C39A7A 70%, transparent); height: 1px; }

        .uc-cal .fc {
          font-family: 'Sarabun', sans-serif;
          background: transparent; border-radius: 0; box-shadow: none; padding: 0;
        }
        .uc-cal .fc-toolbar.fc-header-toolbar { margin-bottom: 1.5rem; padding: 0; }
        .uc-cal .fc-toolbar-title {
          font-family: 'Sarabun', sans-serif;
          font-size: 1.3rem; font-weight: 800;
          color: #372C2E; letter-spacing: 0.02em;
        }
        .uc-cal .fc-button {
          background: transparent !important;
          border: 1px solid rgba(195,154,122,0.4) !important;
          color: #885E43 !important; border-radius: 0.6rem !important;
          font-family: 'Sarabun', sans-serif !important; font-weight: 600 !important;
          font-size: 0.75rem !important; padding: 0.4rem 0.8rem !important;
          transition: all 0.2s !important; box-shadow: none !important;
        }
        .uc-cal .fc-button:hover { background: #372C2E !important; color: #DE9E48 !important; border-color: #372C2E !important; }
        .uc-cal .fc-today-button { background: rgba(222,158,72,0.1) !important; color: #b87c28 !important; border-color: rgba(222,158,72,0.4) !important; }
        .uc-cal .fc-daygrid-day { border-color: rgba(195,154,122,0.12) !important; transition: background .15s; cursor: pointer; }
        .uc-cal .fc-daygrid-day:hover { background: #fdf6ef !important; }
        .uc-cal .fc-day-today { background: rgba(222,158,72,0.05) !important; }
        .uc-cal .fc-day-today .fc-daygrid-day-number {
          background: #372C2E; color: #DE9E48 !important;
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; font-weight: 700;
        }
        .uc-cal .fc-daygrid-day-number { font-size: .8rem; font-weight: 500; color: #5D4037; padding: 6px 8px; }
        .uc-cal .fc-col-header-cell-cushion {
          font-family: 'Sarabun', sans-serif;
          font-size: .65rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: .18em; color: #A1887F; padding: 10px 4px;
        }
        .uc-cal .fc-event {
          border-radius: 4px !important; font-size: .65rem !important;
          font-weight: 600 !important; padding: 1px 5px !important;
          border: none !important; cursor: pointer;
          opacity: .85; transition: opacity .15s, transform .15s;
        }
        .uc-cal .fc-event:hover { opacity: 1; transform: translateY(-1px); }
        .uc-cal .fc-more-link { font-size: .62rem; font-weight: 700; color: #885E43; }
        .uc-cal .fc-daygrid-more-link {
          background-color: rgba(195,154,122,0.12) !important;
          color: #885E43 !important; font-weight: 700 !important; font-size: 11px !important;
          padding: 1px 7px !important; border-radius: 4px !important;
          border: 1px solid rgba(195,154,122,0.2) !important;
        }
        .uc-cal .fc-scrollgrid { border-color: rgba(195,154,122,.15) !important; }
        .uc-cal .fc-scrollgrid-section > * { border-color: rgba(195,154,122,.15) !important; }
        .uc-cal .fc td, .uc-cal .fc th { border-color: rgba(195,154,122,.12) !important; }
        .uc-cal .fc-popover { border-radius: 16px !important; border: 1px solid rgba(195,154,122,.25) !important; box-shadow: 0 20px 40px rgba(55,44,46,.12) !important; overflow: hidden !important; }
        .uc-cal .fc-popover-header { background: #372C2E !important; color: white !important; padding: 10px 14px !important; font-family: 'Sarabun',sans-serif !important; font-weight: 600 !important; }
        .uc-cal .fc-popover-body { background: white !important; padding: 8px !important; }

        @keyframes uc-card-in {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .uc-card-anim { animation: uc-card-in 0.35s cubic-bezier(0.22,1,0.36,1) forwards; }
      `}</style>

      <div className="font-sans">

        {/* ══ HERO ══ */}
        <section className="relative rounded-[2.5rem] overflow-hidden mb-16 px-10 md:px-16 py-14"
          style={{ background: '#372C2E' }}>
          <div className="absolute top-6 right-10 text-7xl select-none pointer-events-none"
            style={{ opacity: 0.06, transform: 'rotate(12deg)' }}>🐾</div>
          <div className="absolute bottom-4 right-32 text-5xl select-none pointer-events-none"
            style={{ opacity: 0.05, transform: 'rotate(-8deg)' }}>🐾</div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(222,158,72,0.15)', border: '1px solid rgba(222,158,72,0.25)' }}>
                <BedDouble size={18} style={{ color: '#DE9E48' }} />
              </div>
              <span className="f-body text-xs tracking-[0.25em] uppercase font-bold"
                style={{ color: 'rgba(222,158,72,0.7)' }}>JingJai Cat Hotel</span>
            </div>
            <h1 className="f-body font-black text-white mb-3"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
              ตารางคิวห้องพัก
            </h1>
            <div className="divider-gold w-48 mb-5" />
            <p className="f-body text-sm leading-relaxed max-w-sm mb-7"
              style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 300 }}>
              ตรวจสอบวันว่างและประเภทห้องพักก่อนทำการจอง<br />
              กดที่วันในปฏิทินเพื่อดูสถานะห้องพัก
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="f-body inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{
                  background: totalAvail > 0 ? 'rgba(74,196,120,0.1)' : 'rgba(239,68,68,0.1)',
                  border: totalAvail > 0 ? '1px solid rgba(74,196,120,0.3)' : '1px solid rgba(239,68,68,0.3)',
                  color: totalAvail > 0 ? '#6ee7a0' : '#fca5a5',
                }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: totalAvail > 0 ? '#4ade80' : '#f87171' }} />
                {totalAvail > 0 ? `ว่างอยู่ ${totalAvail} ห้อง` : 'ห้องเต็มทุกประเภท'}
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(222,158,72,0.2)',
                  color: 'rgba(222,158,72,0.75)',
                }}>
                <BedDouble size={14} />
                <span className="f-body text-xs tracking-wider">{totalAll} ห้องทั้งหมด</span>
              </div>
            </div>
          </div>
        </section>

        {/* ══ ROOM STATUS ══ */}
        <section className="mb-16" id="uc-availability">
          <div className="mb-8">
            <p className="f-body text-[11px] font-black tracking-[0.25em] uppercase mb-2" style={{ color: '#DE9E48' }}>Room Status</p>
            <h2 className="f-body font-black text-[#372C2E]"
              style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.05 }}>
              {formatThaiDate(selectedDate)}
            </h2>
            <div className="divider-gold w-48 mt-4" />
            <p className="f-body text-xs mt-3 tracking-wider" style={{ color: '#A1887F' }}>
              กดที่วันในปฏิทินด้านล่างเพื่อเปลี่ยนวันที่
            </p>
          </div>

          {/* Occupancy summary bar */}
          <div className="mb-7 rounded-[1.75rem] overflow-hidden"
            style={{ border: '1px solid rgba(195,154,122,0.18)', background: '#fdfbfa' }}>
            <div className="px-7 py-5 flex items-center gap-5">
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(222,158,72,0.1)', border: '1px solid rgba(222,158,72,0.2)' }}>
                  <BedDouble size={18} style={{ color: '#DE9E48' }} />
                </div>
                <div>
                  <p className="f-body text-[9px] tracking-[0.15em] uppercase mb-0.5" style={{ color: '#A1887F' }}>ภาพรวมการจอง</p>
                  <p className="f-number" style={{ fontSize: '1.1rem', color: '#372C2E', lineHeight: 1.2 }}>
                    {totalAll - totalAvail}
                    <span className="f-body text-sm" style={{ color: '#C4A99A', fontWeight: 300 }}>/{totalAll}</span>
                  </p>
                </div>
              </div>
              <div className="flex-1">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(195,154,122,0.15)' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${totalAll > 0 ? ((totalAll - totalAvail) / totalAll) * 100 : 0}%`,
                      background: 'linear-gradient(90deg, #C39A7A, #DE9E48)',
                    }} />
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="f-number text-[#DE9E48]" style={{ fontSize: '2.4rem', lineHeight: 1 }}>{totalAvail}</p>
                <p className="f-body text-[10px] tracking-[0.15em] uppercase" style={{ color: '#A1887F' }}>ห้องว่าง</p>
              </div>
            </div>
          </div>

          {/* Room cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {roomStatus.map((room, idx) => {
              const pct    = room.total > 0 ? (room.used / room.total) * 100 : 0;
              const isFull = room.available <= 0;
              return (
                <div key={room.type}
                  className={`relative overflow-hidden transition-all duration-300 ${animating ? 'uc-card-anim' : ''}`}
                  style={{
                    borderRadius: '1.25rem',
                    animationDelay: animating ? `${idx * 55}ms` : '0ms',
                    background: isFull ? '#faf5f5' : '#fdfbfa',
                    border: `1px solid ${isFull ? 'rgba(239,68,68,0.12)' : 'rgba(195,154,122,0.18)'}`,
                  }}>
                  <div style={{ height: 3, background: room.color, opacity: isFull ? 0.3 : 1 }} />
                  <div className="p-3.5">
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: room.color }} />
                      <span className="f-body text-[9px] font-semibold tracking-[0.12em] uppercase truncate" style={{ color: '#A1887F' }}>
                        {room.tier}
                      </span>
                    </div>
                    <div className="flex items-end gap-1 mb-0.5">
                      <BedDouble size={12} style={{ color: isFull ? '#d1a8a8' : room.color, marginBottom: '0.2rem', flexShrink: 0 }} />
                      <span className="f-number" style={{ fontSize: '2rem', lineHeight: 1, color: isFull ? '#d1a8a8' : '#372C2E' }}>
                        {room.available}
                      </span>
                      <span className="f-body text-[10px] mb-0.5" style={{ color: '#C4A99A' }}>/{room.total}</span>
                    </div>
                    <p className="f-body text-[10px] mb-2.5" style={{ color: isFull ? '#d1a8a8' : '#885E43' }}>{room.type}</p>
                    <div className="h-1 rounded-full overflow-hidden mb-2.5" style={{ background: 'rgba(195,154,122,0.15)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: isFull ? '#d1a8a8' : room.color }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="f-body text-[9px] tracking-wide" style={{ color: isFull ? '#d1a8a8' : '#4a7a46' }}>
                        {isFull ? '● เต็ม' : '● ว่าง'}
                      </span>
                      <span className="f-number" style={{ fontSize: '0.9rem', color: '#C39A7A' }}>฿{room.price}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="f-body text-[10px] tracking-[0.15em] uppercase mr-1" style={{ color: '#C4A99A' }}>ประเภทห้อง:</span>
            {Object.entries(ROOM_CONFIG).map(([name, cfg]) => (
              <span key={name} className="f-body inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px]"
                style={{ background: `${cfg.color}12`, border: `1px solid ${cfg.color}30`, color: cfg.color }}>
                <BedDouble size={9} />
                {name}
              </span>
            ))}
          </div>
        </section>

        {/* ══ CALENDAR ══ */}
        <section className="mb-16">
          <div className="mb-8">
            <p className="f-body text-[11px] font-black tracking-[0.25em] uppercase mb-2" style={{ color: '#DE9E48' }}>Calendar</p>
            <h2 className="f-body font-black text-[#372C2E]"
              style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.05 }}>
              ปฏิทินการจอง
            </h2>
            <div className="divider-gold w-40 mt-4" />
          </div>
          <div className="uc-cal rounded-[2rem] overflow-hidden p-6 md:p-8"
            style={{ border: '1px solid rgba(195,154,122,0.18)', background: '#fdfbfa' }}>
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale="th"
              events={events}
              eventDisplay="block"
              displayEventTime={false}
              dayMaxEvents={3}
              height="auto"
              selectable={true}
              headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
              moreLinkClick={() => 'popover'}
              dateClick={(info) => {
                closePopovers();
                if (clickTimer.current) clearTimeout(clickTimer.current);
                clickTimer.current = setTimeout(() => {
                  handleDateSelect(info.dateStr);
                  clickTimer.current = null;
                }, 200);
              }}
              eventClick={(info) => {
                info.jsEvent.preventDefault();
                handleDateSelect(info.event.startStr);
              }}
            />
          </div>
        </section>

        {/* ══ CTA ══ */}
        <section className="mb-6">
          <div className="rounded-[2rem] p-10 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8"
            style={{ background: 'linear-gradient(135deg, #fdfbfa, #f0e8df)', border: '1px solid rgba(195,154,122,0.2)' }}>
            <div>
              <p className="f-body text-[11px] font-black tracking-[0.25em] uppercase mb-2" style={{ color: '#DE9E48' }}>Ready to Book?</p>
              <h3 className="f-body font-black text-[#372C2E] mb-2"
                style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', lineHeight: 1.1 }}>
                จองห้องพักสำหรับน้องแมว
              </h3>
              <p className="f-body text-sm font-light leading-relaxed mb-4" style={{ color: '#A1887F' }}>
                ติดต่อได้ทาง LINE หรือ Facebook เพื่อยืนยันการจอง
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ROOM_CONFIG).map(([name, cfg]) => (
                  <span key={name} className="f-body inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px]"
                    style={{ background: `${cfg.color}12`, border: `1px solid ${cfg.color}25`, color: cfg.color }}>
                    <BedDouble size={9} />
                    {name} · ฿{cfg.price}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 justify-center shrink-0">
              <a href="https://line.me/ti/p/@jingjaicat" target="_blank" rel="noreferrer"
                className="f-body px-7 py-3 rounded-full text-sm font-medium tracking-widest transition-opacity hover:opacity-75"
                style={{ background: '#06C755', color: '#fff' }}>
                LINE @Jingjaicat
              </a>
              <a href="https://www.facebook.com/share/1C11KFEDWu/?mibextid=wwXIfr" target="_blank" rel="noreferrer"
                className="f-body px-7 py-3 rounded-full text-sm font-medium tracking-widest transition-opacity hover:opacity-75"
                style={{ background: '#1877F2', color: '#fff' }}>
                Facebook
              </a>
              <a href="tel:0924747297"
                className="f-body px-7 py-3 rounded-full text-sm font-medium tracking-widest transition-opacity hover:opacity-75"
                style={{ background: '#372C2E', color: '#DE9E48' }}>
                092-4747297
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
