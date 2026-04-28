import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  TrendingUp, Banknote, CalendarDays, Download, Loader2,
  Award, BarChart3, ChevronRight, FileBarChart2
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ROOM_CONFIG = {
  'สแตนดาร์ด': { color: '#C39A7A' },
  'ดีลักซ์':   { color: '#ad6ea8' },
  'ซูพีเรีย':  { color: '#d98a8a' },
  'พรีเมี่ยม': { color: '#368daf' },
  'วีไอพี':    { color: '#4a7a46' },
  'วีวีไอพี':  { color: '#7a6a5a' },
};

const MONTHS = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
];
const YEARS = [2024, 2025, 2026];

export default function ReportSummary() {
  const reportRef = useRef();
  const now = new Date();

  const [reportData, setReportData] = useState({
    totalRevenue: 0, totalBookings: 0,
    yearlyRevenue: 0, yearlyBookings: 0, roomStats: []
  });
  const [loading, setLoading]       = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());

  useEffect(() => { fetchReport(); }, [selectedMonth, selectedYear]);

  const fetchReport = async () => {
    setLoading(true);
    const { data: bookings, error } = await supabase.from('bookings').select('*');
    if (error) { console.error(error); setLoading(false); return; }

    const filtered = (bookings || []).filter(b => {
      const d = new Date(b.start_date);
      const mMatch = selectedMonth === 'all' || (d.getMonth() + 1) === parseInt(selectedMonth);
      const yMatch = selectedYear  === 'all' || d.getFullYear() === parseInt(selectedYear);
      return mMatch && yMatch;
    });

    const totalRev   = filtered.reduce((s, b) => s + (b.total_price || 0), 0);
    const statsMap   = filtered.reduce((acc, b) => {
      if (!acc[b.room_type]) acc[b.room_type] = { count: 0, revenue: 0 };
      acc[b.room_type].count   += 1;
      acc[b.room_type].revenue += (b.total_price || 0);
      return acc;
    }, {});
    const roomStats = Object.entries(statsMap)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.revenue - a.revenue);

    const yearly    = (bookings || []).filter(b => new Date(b.start_date).getFullYear() === now.getFullYear());
    const yearlyRev = yearly.reduce((s, b) => s + (b.total_price || 0), 0);

    setReportData({
      totalRevenue: totalRev, totalBookings: filtered.length,
      yearlyRevenue: yearlyRev, yearlyBookings: yearly.length, roomStats
    });
    setLoading(false);
  };

  const exportPDF = async () => {
    setIsExporting(true);
    const canvas = await html2canvas(reportRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
    const pdf = new jsPDF('p', 'mm', 'a4');
    const w = pdf.internal.pageSize.getWidth();
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, (canvas.height * w) / canvas.width);
    const mn = selectedMonth === 'all' ? 'ทุกเดือน' : MONTHS[selectedMonth - 1];
    const yr = selectedYear  === 'all' ? 'ทุกปี'    : selectedYear;
    pdf.save(`Report-${mn}-${yr}.pdf`);
    setIsExporting(false);
  };

  const getPeriodText = () => {
    if (selectedMonth === 'all' && selectedYear === 'all') return 'ทั้งหมดทุกปี';
    if (selectedMonth === 'all') return `ทุกเดือนในปี ${selectedYear}`;
    if (selectedYear  === 'all') return `เดือน ${MONTHS[selectedMonth - 1]} (ทุกปี)`;
    return `${MONTHS[selectedMonth - 1]} ${selectedYear}`;
  };

  const avgPerBooking = reportData.totalBookings > 0
    ? Math.round(reportData.totalRevenue / reportData.totalBookings)
    : 0;

  return (
    <>

      <div className="py-2 space-y-5 rpt-fade font-sans">

        {/* ── Hero Header ── */}
        <div className="relative overflow-hidden bg-[#372C2E] rounded-[2rem] px-6 py-7 shadow-2xl shadow-[#372C2E]/20">
          <div className="absolute -top-6 -right-6 text-9xl opacity-[0.04] rotate-12 select-none pointer-events-none">📊</div>
          <div className="absolute bottom-2 right-24 text-4xl opacity-[0.04] -rotate-6 select-none pointer-events-none">🐾</div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-5">
            {/* Title */}
            <div className="flex items-center gap-4">
              <div className="bg-[#DE9E48] p-4 rounded-2xl shadow-lg shadow-[#DE9E48]/30 shrink-0">
                <FileBarChart2 size={26} className="text-[#372C2E]" />
              </div>
              <div>
                <p className="text-[#DE9E48] text-[10px] font-black uppercase tracking-[0.25em] mb-0.5">Admin · Analytics</p>
                <h2 className="text-2xl font-black text-white tracking-tight">รายงานสรุป</h2>
                <p className="text-white/40 text-xs mt-0.5">{getPeriodText()}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="lg:ml-auto flex flex-wrap items-center gap-3">
              {/* Month picker */}
              <div className="relative">
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="rpt-select">
                  <option value="all">ทุกเดือน</option>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <ChevronRight size={12} className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-[#A1887F] pointer-events-none" />
              </div>

              {/* Year picker */}
              <div className="relative">
                <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="rpt-select">
                  <option value="all">ทุกปี</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronRight size={12} className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-[#A1887F] pointer-events-none" />
              </div>

              {/* Export PDF */}
              <button
                onClick={exportPDF}
                disabled={isExporting || reportData.totalBookings === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all active:scale-95 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#885E43,#5D4037)', color: 'white', boxShadow: '0 6px 20px rgba(136,94,67,.35)' }}
              >
                {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                ส่งออก PDF
              </button>
            </div>
          </div>
        </div>

        {/* Gold divider */}
        <div className="divider-gold" />

        {/* ── Printable Report Area ── */}
        <div ref={reportRef} className="bg-white rounded-[2.5rem] border border-[#efebe9] shadow-md overflow-hidden">

          {/* Report letterhead */}
          <div className="px-8 pt-8 pb-6 border-b-2 border-[#372C2E] flex justify-between items-end">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-[#372C2E] tracking-tight">JINGJAI CAT HOTEL</h1>
              <p className="text-[#885E43] font-bold text-sm mt-0.5 underline underline-offset-4 decoration-2">
                สรุปรายงาน: {getPeriodText()}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[9px] text-[#A1887F] font-black uppercase tracking-widest mb-0.5">วันที่ออกเอกสาร</p>
              <p className="text-sm font-black text-[#372C2E]">{now.toLocaleDateString('th-TH')}</p>
            </div>
          </div>

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-4 text-[#A1887F]">
              <div style={{ animation: 'catBounce 1.4s ease-in-out infinite', fontSize: '2.5rem' }}>🐱</div>
              <p className="font-bold text-sm tracking-widest uppercase">กำลังโหลดข้อมูล...</p>
            </div>
          ) : (
            <div className="p-6 md:p-8 space-y-8">

              {/* ── KPI Cards ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Revenue card */}
                <div className="bg-[#372C2E] rounded-[2rem] p-6 text-white shadow-xl shadow-[#372C2E]/15 relative overflow-hidden">
                  <div className="absolute -bottom-6 -right-6 opacity-[0.06]"><Banknote size={110} /></div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-4">ยอดรวมรายได้</p>
                    <p className="f-number text-[#DE9E48]" style={{ fontSize: "clamp(2rem,5vw,2.8rem)" }}>
                      ฿{reportData.totalRevenue.toLocaleString()}
                    </p>
                    <div className="mt-5 pt-4 border-t border-white/10 flex justify-between items-center">
                      <span className="text-[9px] text-white/40 font-black uppercase tracking-wider">เฉลี่ย / การจอง</span>
                      <span className="f-number text-white/70" style={{ fontSize: "0.9rem" }}>฿{avgPerBooking.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Booking count card */}
                <div className="bg-[#FDFBFA] rounded-[2rem] p-6 border border-[#efebe9] relative overflow-hidden">
                  <div className="absolute -bottom-6 -right-6 opacity-[0.05]"><CalendarDays size={110} /></div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-[#A1887F] uppercase tracking-widest mb-4">จำนวนการจอง</p>
                    <div className="flex items-baseline gap-2">
                      <p className="f-number text-[#372C2E]" style={{ fontSize: "clamp(2rem,5vw,2.8rem)" }}>
                        {reportData.totalBookings}
                      </p>
                      <span className="text-sm font-bold text-[#A1887F]">ครั้ง</span>
                    </div>
                    <div className="mt-5 pt-4 border-t border-[#efebe9]">
                      <span className="text-[9px] text-[#A1887F] font-black uppercase tracking-wider">ข้อมูลจาก Database</span>
                    </div>
                  </div>
                </div>

                {/* Top room card */}
                <div className="rounded-[2rem] p-6 border relative overflow-hidden"
                  style={{
                    background: reportData.roomStats[0] ? (ROOM_CONFIG[reportData.roomStats[0].name]?.color + '12') : '#f5f0ec',
                    borderColor: reportData.roomStats[0] ? (ROOM_CONFIG[reportData.roomStats[0].name]?.color + '30') : '#efebe9',
                  }}>
                  <div className="absolute -bottom-6 -right-6 opacity-[0.06]"><Award size={110} /></div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-[#A1887F] uppercase tracking-widest mb-4">ห้องยอดนิยมอันดับ 1</p>
                    <div className="flex items-center gap-2 mb-1">
                      {reportData.roomStats[0] && (
                        <span className="w-3 h-3 rounded-full shrink-0"
                          style={{ background: ROOM_CONFIG[reportData.roomStats[0].name]?.color || '#885E43' }} />
                      )}
                      <p className="text-xl font-black truncate"
                        style={{ color: ROOM_CONFIG[reportData.roomStats[0]?.name]?.color || '#885E43' }}>
                        {reportData.roomStats[0]?.name || '—'}
                      </p>
                    </div>
                    <p className="text-xs font-bold text-[#A1887F] mt-1">
                      {reportData.roomStats[0]
                        ? `฿${reportData.roomStats[0].revenue.toLocaleString()} · ${reportData.roomStats[0].count} ครั้ง`
                        : 'ไม่มีข้อมูล'}
                    </p>
                    <div className="mt-5 pt-4 border-t border-black/5">
                      <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: ROOM_CONFIG[reportData.roomStats[0]?.name]?.color || '#A1887F', opacity: 0.6 }}>
                        TOP PERFORMER
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Charts + Analysis ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Bar chart */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={18} className="text-[#885E43]" />
                    <h3 className="text-sm font-black text-[#372C2E] uppercase tracking-wider">รายได้ตามประเภทห้อง</h3>
                  </div>

                  {reportData.roomStats.length === 0 ? (
                    <div className="py-12 text-center bg-[#FDFBFA] rounded-2xl border border-[#efebe9]">
                      <div className="text-4xl mb-2 opacity-30">🐾</div>
                      <p className="text-sm text-[#A1887F] font-bold">ไม่มีข้อมูลในช่วงที่เลือก</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reportData.roomStats.map((room, i) => {
                        const pct = reportData.totalRevenue > 0
                          ? (room.revenue / reportData.totalRevenue) * 100 : 0;
                        const roomColor = ROOM_CONFIG[room.name]?.color || '#885E43';
                        return (
                          <div key={room.name}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: roomColor }} />
                                <span className="text-sm font-black text-[#372C2E]">{room.name}</span>
                                <span className="text-[10px] font-bold text-[#A1887F]">({room.count} ครั้ง)</span>
                              </div>
                              <span className="text-sm font-black" style={{ color: roomColor }}>
                                ฿{room.revenue.toLocaleString()}
                              </span>
                            </div>
                            <div className="h-3 bg-[#F5F2F0] rounded-full overflow-hidden">
                              <div
                                className="bar-grow h-full rounded-full"
                                style={{
                                  '--bar-w': `${pct}%`,
                                  width: `${pct}%`,
                                  background: roomColor,
                                  animationDelay: `${i * 100}ms`
                                }}
                              />
                            </div>
                            <div className="flex justify-end mt-1">
                              <span className="text-[10px] font-bold text-[#A1887F]">{pct.toFixed(1)}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Analysis panel */}
                <div className="bg-[#372C2E] rounded-[2rem] p-7 text-white relative overflow-hidden flex flex-col justify-center">
                  <div className="absolute -bottom-12 -right-12 opacity-[0.05]">
                    <TrendingUp size={200} />
                  </div>

                  <div className="relative z-10 space-y-5">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp size={18} className="text-[#DE9E48]" />
                      <h4 className="text-lg font-black text-[#DE9E48]">บทวิเคราะห์</h4>
                    </div>

                    <ul className="space-y-4">
                      {[
                        {
                          label: 'จำนวนการเข้าพัก',
                          value: `${reportData.totalBookings} ครั้ง`,
                        },
                        {
                          label: 'รายได้เฉลี่ยต่อการจอง',
                          value: `฿${avgPerBooking.toLocaleString()}`,
                        },
                        ...(reportData.roomStats[0] ? [{
                          label: 'ห้องทำรายได้สูงสุด',
                          value: reportData.roomStats[0].name,
                        }] : []),
                        ...(reportData.roomStats.length > 0 ? [{
                          label: 'สัดส่วนห้องยอดนิยม',
                          value: reportData.totalRevenue > 0
                            ? `${((reportData.roomStats[0]?.revenue / reportData.totalRevenue) * 100).toFixed(1)}% ของรายได้`
                            : '—',
                        }] : []),
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-5 h-5 bg-[#DE9E48] rounded-full flex items-center justify-center shrink-0 mt-0.5">
                            <ChevronRight size={11} className="text-[#372C2E]" />
                          </div>
                          <div>
                            <p className="text-[10px] text-white/40 font-black uppercase tracking-wider">{item.label}</p>
                            <p className="f-number text-white mt-0.5" style={{ fontSize: "1rem" }}>{item.value}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* ── Room stats mini table ── */}
              {reportData.roomStats.length > 0 && (
                <div className="bg-[#FDFBFA] rounded-2xl border border-[#efebe9] overflow-hidden">
                  <div className="px-5 py-3 border-b border-[#efebe9] flex items-center gap-2">
                    <BarChart3 size={14} className="text-[#885E43]" />
                    <span className="text-[10px] font-black text-[#885E43] uppercase tracking-widest">ตารางสรุปประเภทห้อง</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[#f0ece8]">
                          {['ประเภทห้อง', 'จำนวนครั้ง', 'รายได้', 'สัดส่วน'].map(h => (
                            <th key={h} className="px-5 py-3 text-[9px] font-black text-[#A1887F] uppercase tracking-widest">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.roomStats.map((room, i) => {
                          const pct = reportData.totalRevenue > 0 ? (room.revenue / reportData.totalRevenue) * 100 : 0;
                          const col = ROOM_CONFIG[room.name]?.color || '#885E43';
                          return (
                            <tr key={room.name} className="border-b border-[#f5f0ec] last:border-0 hover:bg-white transition-colors">
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col }} />
                                  <span className="text-sm font-black text-[#372C2E]">{room.name}</span>
                                  {i === 0 && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: col }}>TOP</span>}
                                </div>
                              </td>
                              <td className="px-5 py-3"><span className="f-number text-[#372C2E]" style={{ fontSize: "1rem" }}>{room.count}</span></td>
                              <td className="px-5 py-3" style={{ color: col }}><span className="f-number" style={{ fontSize: "1rem" }}>฿{room.revenue.toLocaleString()}</span></td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 max-w-[80px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: col }} />
                                  </div>
                                  <span className="text-[10px] font-black text-[#A1887F]">{pct.toFixed(1)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="pt-2 flex items-center justify-between text-[9px] text-[#A1887F] border-t border-[#efebe9] font-black uppercase tracking-widest">
                <span>สร้างโดยระบบอัตโนมัติ · Jingjai Cat Hotel Management System</span>
                <span>หน้า 1 จาก 1</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
