import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const ROOMS = [
  {
    id: 'standard', title: 'สแตนดาร์ด', titleEn: 'Standard Room',
    price: 300, cats: 1, img: '/img/Standard-room.JPG', color: '#C39A7A',
    size: 'ลึก 80 × กว้าง 86 × สูง 100 ซม.', desc: 'เหมาะสำหรับน้องแมว 1 ตัว',
  },
  {
    id: 'deluxe', title: 'ดีลักซ์', titleEn: 'Deluxe Room',
    price: 350, cats: 2, img: '/img/Deluxe-room.JPG', color: '#ad6ea8',
    size: 'ลึก 80 × กว้าง 103 × สูง 115 ซม.', desc: 'รองรับน้องแมวได้สูงสุด 2 ตัว',
  },
  {
    id: 'superior', title: 'ซูพีเรีย', titleEn: 'Superior Room',
    price: 350, cats: 2, img: '/img/Superior-room.JPG', color: '#eea5a5',
    size: 'ลึก 80 × กว้าง 100 × สูง 100 ซม.', desc: 'รองรับน้องแมวได้สูงสุด 2 ตัว',
  },
  {
    id: 'premium', title: 'พรีเมี่ยม', titleEn: 'Premium Room',
    price: 400, cats: 3, img: '/img/Premium-room.JPG', color: '#368daf',
    size: 'ลึก 80 × กว้าง 115 × สูง 100 ซม.', desc: 'รองรับน้องแมวได้สูงสุด 3 ตัว',
  },
  {
    id: 'vip', title: 'วีไอพี', titleEn: 'VIP Room',
    price: 500, cats: 4, img: '/img/VIP-room.JPG', color: '#30532d',
    size: 'ลึก 65 × กว้าง 100 × สูง 200 ซม.', desc: 'รองรับน้องแมวได้สูงสุด 4 ตัว',
  },
  {
    id: 'vvip', title: 'วีวีไอพี', titleEn: 'VVIP Room',
    price: 600, cats: 5, img: '/img/VVIP-room.JPG', color: '#5a5858',
    size: 'ลึก 65 × กว้าง 160 × สูง 200 ซม.', desc: 'ห้องใหญ่ที่สุด รองรับน้องแมวได้สูงสุด 5 ตัว',
  },
];

const INFO_IMAGES = [
  { img: '/img/Timecheckin-out.png', label: 'เวลาเช็คอิน – เช็คเอาท์' },
  { img: '/img/Prepare.JPG', label: 'สิ่งที่ต้องเตรียมในวันเข้าพัก' },
  { img: '/img/Condition-comein.JPG', label: 'เงื่อนไขการเข้าพัก' },
  { img: '/img/Condition-book.jpg', label: 'เงื่อนไขการจองห้องพัก' },
];

export default function UserHome() {
  const [lightbox, setLightbox] = useState(null);

  const openLightbox = (images, index) => setLightbox({ images, index });
  const closeLightbox = () => setLightbox(null);
  const prevImg = () => setLightbox(l => ({ ...l, index: (l.index - 1 + l.images.length) % l.images.length }));
  const nextImg = () => setLightbox(l => ({ ...l, index: (l.index + 1) % l.images.length }));

  const roomImages = ROOMS.map(r => r.img);
  const infoImages = INFO_IMAGES.map(i => i.img);

  return (
    <div className="font-sans">

      {/* ══ HERO ══ */}
      <section className="relative rounded-[2.5rem] overflow-hidden mb-20" style={{ minHeight: '90vh', background: '#100a07' }}>
        <img src="/img/Playground.JPG" alt="hero" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.35, objectPosition: 'center 35%' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(16,10,7,0.1) 0%, rgba(16,10,7,0.05) 35%, rgba(16,10,7,0.7) 70%, rgba(16,10,7,1) 100%)' }} />
        <div className="absolute top-8 left-8 right-8 flex justify-between items-center z-10">
          <img src="/img/JingJai-Cat-Hotel-final1.jpg" alt="logo" className="w-11 h-11 rounded-xl object-cover" style={{ border: '1px solid rgba(222,158,72,0.35)' }} />
          <span className="f-body text-[11px] tracking-[0.25em] uppercase hidden md:block" style={{ color: 'rgba(201,169,110,0.7)' }}>เปิดบริการทุกวัน 10:00 – 21:00 น.</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-10 md:p-16 z-10">
          <p className="f-display italic mb-3 tracking-[0.3em] text-sm" style={{ color: '#DE9E48' }}>Jingjai Cat Hotel</p>
          <h1 className="f-display text-white mb-2 font-light" style={{ fontSize: 'clamp(3.2rem, 7vw, 6rem)', lineHeight: 1.0, letterSpacing: '-0.01em' }}>โรงแรมแมวจริงใจ</h1>
          <div className="divider-gold w-64 mb-8" />
          <p className="f-body text-sm font-light leading-loose max-w-sm mb-10" style={{ color: 'rgba(255,255,255,0.5)' }}>
            บริการรับฝากเลี้ยงน้องแมว ห้องแอร์ สะอาด ปลอดภัย
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="tel:0924747297" className="f-body px-8 py-3.5 rounded-full text-sm font-medium tracking-widest transition-opacity hover:opacity-80" style={{ background: 'linear-gradient(135deg, #DE9E48, #b87c28)', color: '#1a0d05', letterSpacing: '0.08em' }}>
              092-4747297
            </a>
            <a href="https://line.me/ti/p/@jingjaicat" target="_blank" rel="noreferrer" className="f-body px-8 py-3.5 rounded-full text-sm font-medium tracking-widest transition-opacity hover:opacity-80" style={{ border: '1px solid rgba(222,158,72,0.4)', color: '#DE9E48', backdropFilter: 'blur(10px)', background: 'rgba(255,255,255,0.04)' }}>
              LINE @Jingjaicat
            </a>
          </div>
        </div>
      </section>

      {/* ══ STATS STRIP ══ */}
      <section className="mb-20 overflow-hidden rounded-2xl" style={{ border: '1px solid rgba(195,154,122,0.15)' }}>
        <div className="grid grid-cols-2 md:grid-cols-4">
          {[
            { n: '20', label: 'ห้องพักทั้งหมด' },
            { n: '6', label: 'ประเภทห้องพัก' },
            { n: '24ชม.', label: 'กล้องวงจรปิด CCTV' },
            { n: '5 ตัว', label: 'รองรับสูงสุดต่อห้อง' },
          ].map((s, i) => (
            <div key={i} className="text-center py-8 px-6" style={{ background: i % 2 === 0 ? '#fdfbfa' : '#faf6f2', borderRight: i < 3 ? '1px solid rgba(195,154,122,0.12)' : 'none' }}>
              <div className="f-number text-[#372C2E] mb-1" style={{ fontSize: '2.4rem' }}>{s.n}</div>
              <div className="f-body text-[11px] tracking-[0.15em] uppercase" style={{ color: '#A1887F' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ ROOMS ══ */}
      <section className="mb-20">
        <div className="mb-12">
          <p className="f-display italic text-sm tracking-[0.3em] mb-3" style={{ color: '#DE9E48' }}>Our Rooms</p>
          <h2 className="f-display font-light text-[#372C2E]" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', lineHeight: 1.05 }}>ห้องพักทุกประเภท</h2>
          <div className="divider-gold w-48 mt-5" />
          <p className="f-body text-sm mt-4 max-w-sm leading-loose" style={{ color: '#A1887F' }}>ออกแบบมาเพื่อความสุขและปลอดภัยของน้องแมว — กดที่รูปเพื่อดูภาพเต็ม</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {ROOMS.slice(0, 2).map((room, i) => (
            <RoomCard key={room.id} room={room} height="480px" onView={() => openLightbox(roomImages, i)} />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {ROOMS.slice(2, 4).map((room, i) => (
            <RoomCard key={room.id} room={room} height="380px" onView={() => openLightbox(roomImages, i + 2)} />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ROOMS.slice(4).map((room, i) => (
            <RoomCard key={room.id} room={room} height="380px" onView={() => openLightbox(roomImages, i + 4)} />
          ))}
        </div>
      </section>

      {/* ══ SERVICES ══ */}
      <section className="mb-20">
        <div className="mb-12">
          <p className="f-display italic text-sm tracking-[0.3em] mb-3" style={{ color: '#DE9E48' }}>Our Services</p>
          <h2 className="f-display font-light text-[#372C2E]" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', lineHeight: 1.05 }}>บริการของเรา</h2>
          <div className="divider-gold w-48 mt-5" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="relative rounded-[2rem] overflow-hidden" style={{ minHeight: '500px' }}>
            <img src="/img/Service.png" alt="บริการ" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(55,44,46,0.6) 0%, transparent 55%)' }} />
          </div>
          <div className="rounded-[2rem] p-8 flex flex-col justify-center gap-1" style={{ background: '#372C2E' }}>
            {[
              ['กล้องวงจรปิด 24 ชั่วโมง', 'ติดตามน้องได้ตลอดเวลา'],
              ['แอร์และเครื่องฟอกอากาศ', 'เปิดตลอด 24 ชั่วโมง'],
              ['ทรายแมวฟรีตลอดการเข้าพัก', 'คัดสรรคุณภาพดี ปลอดภัย'],
              ['น้ำพุแมวฟรี', 'น้ำสะอาดหมุนเวียนตลอดเวลา'],
              ['อัพเดทรูปและวีดีโอน้อง', 'ส่งให้เจ้าของทุกวัน'],
              ['พาน้องเดินเล่นพื้นที่ส่วนกลาง', 'แยกเล่นทีละบ้าน เพื่อความปลอดภัย'],
              ['ผลิตภัณฑ์ Pet Friendly ทุกชนิด', 'ปลอดภัย ไม่มีสารอันตราย'],
            ].map(([title, sub], i, arr) => (
              <div key={i} className="py-4" style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                <p className="f-body text-white text-sm font-medium">{title}</p>
                <p className="f-body text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PLAYGROUND ══ */}
      <section className="mb-20 relative rounded-[2rem] overflow-hidden cursor-pointer group" style={{ height: '460px' }} onClick={() => openLightbox(['/img/Playground.JPG'], 0)}>
        <img src="/img/Playground.JPG" alt="พื้นที่ส่วนกลาง" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" style={{ objectPosition: 'center 40%' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(16,10,7,0.8) 0%, rgba(16,10,7,0.25) 55%, transparent 100%)' }} />
        <div className="absolute inset-0 flex items-center px-12 md:px-20">
          <div>
            <p className="f-display italic text-sm tracking-[0.3em] mb-3" style={{ color: '#DE9E48' }}>Common Area</p>
            <h3 className="f-display text-white font-light mb-4" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', lineHeight: 1.05 }}>พื้นที่เล่น<br />ส่วนกลาง</h3>
            <p className="f-body text-sm font-light leading-loose max-w-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>พาน้องออกมาสำรวจ มีอุปกรณ์ครบครัน<br />แยกรอบเพื่อความปลอดภัย</p>
            <div className="mt-6 inline-block f-body text-xs tracking-[0.2em] uppercase py-2 px-5 rounded-full" style={{ border: '1px solid rgba(222,158,72,0.4)', color: '#DE9E48' }}>กดดูรูปเต็ม</div>
          </div>
        </div>
      </section>

      {/* ══ INFO IMAGES ══ */}
      <section className="mb-20">
        <div className="mb-12">
          <p className="f-display italic text-sm tracking-[0.3em] mb-3" style={{ color: '#DE9E48' }}>Good to Know</p>
          <h2 className="f-display font-light text-[#372C2E]" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', lineHeight: 1.05 }}>ข้อมูลสำคัญ</h2>
          <div className="divider-gold w-48 mt-5" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {INFO_IMAGES.map((item, i) => (
            <div key={i} className="relative rounded-[2rem] overflow-hidden cursor-pointer group" style={{ minHeight: '340px', background: '#faf6f2' }} onClick={() => openLightbox(infoImages, i)}>
              <img src={item.img} alt={item.label} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-103 absolute inset-0" style={{ objectFit: 'contain', padding: '8px' }} />
              <div className="absolute inset-0 flex items-end p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(to top, rgba(55,44,46,0.75) 0%, transparent 50%)' }}>
                <div>
                  <p className="f-body text-white text-sm font-medium">{item.label}</p>
                  <p className="f-body text-xs mt-1" style={{ color: '#DE9E48' }}>กดดูรูปเต็ม</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ HOW TO BOOK ══ */}
      <section className="mb-20">
        <div className="relative rounded-[2rem] overflow-hidden px-10 md:px-16 py-16" style={{ background: '#1a0f05' }}>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 85% 50%, rgba(222,158,72,0.05) 0%, transparent 65%)' }} />
          <div className="relative z-10 mb-12">
            <p className="f-display italic text-sm tracking-[0.3em] mb-3" style={{ color: '#DE9E48' }}>How to Book</p>
            <h2 className="f-display text-white font-light" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', lineHeight: 1.1 }}>วิธีการจองห้องพัก</h2>
          </div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { n: '01', title: 'เช็กวันว่าง', desc: 'ตรวจสอบตารางปฏิทินในหน้าเว็บไซต์ก่อนทำการจอง' },
              { n: '02', title: 'ติดต่อ', desc: 'ทาง LINE @Jingjaicat หรือ Facebook เพื่อยืนยันการจอง' },
              { n: '03', title: 'โอนมัดจำ', desc: 'ชำระมัดจำตามประเภทห้องที่เลือก และรอยืนยัน' },
            ].map((s) => (
              <div key={s.n} className="pl-8 relative" style={{ borderLeft: '1px solid rgba(222,158,72,0.2)' }}>
                <div className="f-number absolute -left-0.5 -top-1" style={{ fontSize: '4.5rem', lineHeight: 1, color: 'rgba(222,158,72,0.15)' }}>{s.n}</div>
                <div className="pt-12">
                  <h4 className="f-display text-white font-semibold text-xl mb-3">{s.title}</h4>
                  <p className="f-body text-sm font-light leading-loose" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CONTACT ══ */}
      <section className="mb-10">
        <div className="rounded-[2rem] p-10 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8" style={{ background: 'linear-gradient(135deg, #fdfbfa, #f0e8df)', border: '1px solid rgba(195,154,122,0.2)' }}>
          <div className="flex items-center gap-5">
            <img src="/img/JingJai-Cat-Hotel-final1.jpg" alt="logo" className="w-20 h-20 rounded-2xl object-cover" style={{ border: '1px solid rgba(222,158,72,0.3)', boxShadow: '0 8px 32px rgba(55,44,46,0.12)' }} />
            <div>
              <h3 className="f-display text-[#372C2E] font-semibold" style={{ fontSize: '1.9rem', lineHeight: 1.1 }}>โรงแรมแมวจริงใจ</h3>
              <p className="f-body text-xs mt-1 tracking-wider" style={{ color: '#A1887F' }}>Jingjai Cat Hotel · Pathum Thani</p>
              {/* ── เพิ่มเวลาเปิดบริการ ── */}
              <p className="f-body text-xs mt-2 font-semibold tracking-wider" style={{ color: '#885E43' }}>
                เปิดบริการทุกวัน 10:00 – 21:00 น.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href="tel:0924747297" className="f-body px-7 py-3 rounded-full text-sm font-medium tracking-widest transition-opacity hover:opacity-75" style={{ background: '#372C2E', color: '#DE9E48' }}>
              092-4747297
            </a>
            <a href="https://line.me/ti/p/@jingjaicat" target="_blank" rel="noreferrer" className="f-body px-7 py-3 rounded-full text-sm font-medium tracking-widest transition-opacity hover:opacity-75" style={{ background: '#06C755', color: '#fff' }}>
              LINE @Jingjaicat
            </a>
            <a href="https://www.facebook.com/share/1C11KFEDWu/?mibextid=wwXIfr" target="_blank" rel="noreferrer" className="f-body px-7 py-3 rounded-full text-sm font-medium tracking-widest transition-opacity hover:opacity-75" style={{ background: '#1877F2', color: '#fff' }}>
              Facebook
            </a>
            <a href="https://maps.app.goo.gl/BgGGZiRqPNRDkzMd9" target="_blank" rel="noreferrer" className="f-body px-7 py-3 rounded-full text-sm font-medium tracking-widest transition-opacity hover:opacity-75" style={{ background: '#fff', color: '#372C2E', border: '1px solid rgba(195,154,122,0.25)' }}>
              Google Maps
            </a>
          </div>
        </div>
      </section>

      {/* ══ LIGHTBOX ══ */}
      {lightbox && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center lb-anim" style={{ background: 'rgba(10,6,4,0.96)', backdropFilter: 'blur(16px)' }} onClick={closeLightbox}>
          <button className="absolute top-6 right-6 z-10 flex items-center justify-center w-11 h-11 rounded-full transition-all hover:opacity-70" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }} onClick={closeLightbox}>
            <X size={18} />
          </button>
          {lightbox.images.length > 1 && (
            <div className="absolute top-7 left-1/2 -translate-x-1/2 f-body text-xs tracking-[0.2em]" style={{ color: 'rgba(222,158,72,0.7)' }}>
              {lightbox.index + 1} / {lightbox.images.length}
            </div>
          )}
          {lightbox.images.length > 1 && (
            <button className="absolute left-4 md:left-8 z-10 flex items-center justify-center w-12 h-12 rounded-full transition-all hover:opacity-70" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} onClick={(e) => { e.stopPropagation(); prevImg(); }}>
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="relative max-w-4xl w-full mx-16 md:mx-24" onClick={e => e.stopPropagation()}>
            <img key={lightbox.index} src={lightbox.images[lightbox.index]} alt="" className="w-full h-auto rounded-2xl object-contain lb-anim" style={{ maxHeight: '85vh' }} />
          </div>
          {lightbox.images.length > 1 && (
            <button className="absolute right-4 md:right-8 z-10 flex items-center justify-center w-12 h-12 rounded-full transition-all hover:opacity-70" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} onClick={(e) => { e.stopPropagation(); nextImg(); }}>
              <ChevronRight size={20} />
            </button>
          )}
          {lightbox.images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {lightbox.images.map((img, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setLightbox(l => ({ ...l, index: i })); }} className="rounded-lg overflow-hidden transition-all" style={{ width: 44, height: 32, opacity: i === lightbox.index ? 1 : 0.35, border: i === lightbox.index ? '1px solid #DE9E48' : '1px solid transparent' }}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RoomCard({ room, height = '400px', onView }) {
  return (
    <div className="room-img-wrap relative rounded-[2rem] overflow-hidden cursor-pointer group" style={{ height }} onClick={onView}>
      <img src={room.img} alt={room.title} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 25%, rgba(10,6,4,0.93) 100%)' }} />
      <div className="absolute top-5 right-5 px-4 py-2 rounded-full" style={{ background: 'rgba(10,6,4,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(222,158,72,0.3)' }}>
        <span className="f-number text-[#DE9E48]" style={{ fontSize: '1.6rem' }}>฿{room.price}</span>
        <span className="f-body text-xs font-light" style={{ color: 'rgba(255,255,255,0.45)' }}> /คืน</span>
      </div>
      <div className="absolute top-5 left-5 flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(10,6,4,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: room.color }} />
        <span className="f-body text-[10px] tracking-[0.18em] uppercase" style={{ color: 'rgba(255,255,255,0.75)' }}>{room.titleEn}</span>
      </div>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center" style={{ background: 'rgba(10,6,4,0.2)' }}>
        <span className="f-body text-xs tracking-[0.2em] uppercase px-5 py-2.5 rounded-full" style={{ background: 'rgba(10,6,4,0.6)', border: '1px solid rgba(222,158,72,0.5)', color: '#DE9E48', backdropFilter: 'blur(8px)' }}>ดูรูปเต็ม</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-7">
        <h3 className="f-display text-white font-light mb-1.5" style={{ fontSize: '1.75rem', lineHeight: 1.1 }}>ห้อง{room.title}</h3>
        <p className="f-body text-sm font-light mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{room.desc}</p>
        <p className="f-body text-xs tracking-wider" style={{ color: 'rgba(201,169,110,0.55)' }}>{room.size}</p>
      </div>
    </div>
  );
}
