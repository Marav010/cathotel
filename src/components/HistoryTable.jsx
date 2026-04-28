import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Trash2, Search, Edit3, X, Check, FileText,
  ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2,
  ArrowUpDown, Wallet, BadgeCheck, Plus, ShoppingCart, History
} from 'lucide-react';

const ROOM_CONFIG = {
  'สแตนดาร์ด': { price: 300, color: '#C39A7A', accent: '#f5e6d8' },
  'ดีลักซ์':   { price: 350, color: '#ad6ea8', accent: '#f3e8f5' },
  'ซูพีเรีย':  { price: 350, color: '#d98a8a', accent: '#fdf0f0' },
  'พรีเมี่ยม': { price: 400, color: '#368daf', accent: '#e6f4fa' },
  'วีไอพี':    { price: 500, color: '#4a7a46', accent: '#eaf4e9' },
  'วีวีไอพี':  { price: 600, color: '#7a6a5a', accent: '#f0ece8' },
};
const ROOM_PRICES = Object.fromEntries(Object.entries(ROOM_CONFIG).map(([k, v]) => [k, v.price]));
const MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

export default function HistoryTable() {
  const [bookings, setBookings]       = useState([]);
  const [searchTerm, setSearchTerm]   = useState('');
  const [editingId, setEditingId]     = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear]   = useState('all');
  const [sortOrder, setSortOrder]     = useState('newest');
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'success', title: '', message: '' });

  const [editForm, setEditForm] = useState({
    customer_name: '', cat_names: '', room_type: '', note: '',
    start_date: '', end_date: '', deposit: 0, extra_items: [],
    paid_on_checkin: 0,
  });

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${parseInt(year) + 543}`;
  };

  const fetchBookings = async () => {
    const { data } = await supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(2000);
    setBookings(data || []);
  };

  useEffect(() => { fetchBookings(); }, []);

  const showAlert = (type, title, message) => setAlertConfig({ isOpen: true, type, title, message });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('bookings').delete().eq('id', deleteTarget.id);
    if (error) showAlert('error', 'ลบข้อมูลไม่สำเร็จ', error.message);
    else { setDeleteTarget(null); fetchBookings(); }
  };

  const startEdit = (booking) => {
    setEditingId(booking.id);
    setEditForm({
      customer_name: booking.customer_name || '',
      cat_names: booking.cat_names || '',
      room_type: booking.room_type || 'สแตนดาร์ด',
      note: booking.note || '',
      start_date: booking.start_date || '',
      end_date: booking.end_date || '',
      deposit: booking.deposit || 0,
      extra_items: [],
      paid_on_checkin: booking.paid_on_checkin || 0,
    });
  };

  const addExtraItem = () =>
    setEditForm(prev => ({ ...prev, extra_items: [...prev.extra_items, { item: '', price: 0 }] }));

  const updateExtraItem = (index, field, value) => {
    const newItems = [...editForm.extra_items];
    newItems[index][field] = field === 'price' ? parseFloat(value) || 0 : value;
    setEditForm(prev => ({ ...prev, extra_items: newItems }));
  };

  const removeExtraItem = (index) =>
    setEditForm(prev => ({ ...prev, extra_items: prev.extra_items.filter((_, i) => i !== index) }));

  const calculateTotalPrice = (start, end, roomType, extraItems) => {
    if (!start || !end) return 0;
    const s = new Date(start); const e = new Date(end);
    s.setHours(0,0,0,0); e.setHours(0,0,0,0);
    const nights = Math.max(0, Math.ceil((e - s) / 86400000));
    const roomTotal = nights * (ROOM_PRICES[roomType] || 300);
    const extraTotal = extraItems.reduce((sum, i) => sum + (i.price || 0), 0);
    return roomTotal + extraTotal;
  };

  const handleUpdate = async (id) => {
    const newTotalPrice = calculateTotalPrice(editForm.start_date, editForm.end_date, editForm.room_type, editForm.extra_items);
    let finalNote = editForm.note;
    const extraStr = editForm.extra_items.filter(i => i.item).map(i => i.item).join(', ');
    if (extraStr) {
      const entry = `-เพิ่มยอด: ${extraStr} (฿${newTotalPrice.toLocaleString()})`;
      finalNote = editForm.note ? `${editForm.note} | ${entry}` : entry;
    }
    const { error } = await supabase.from('bookings').update({
      customer_name: editForm.customer_name, cat_names: editForm.cat_names,
      room_type: editForm.room_type, note: finalNote,
      start_date: editForm.start_date, end_date: editForm.end_date,
      total_price: newTotalPrice, deposit: editForm.deposit,
      paid_on_checkin: editForm.paid_on_checkin || 0,
    }).eq('id', id);
    if (error) showAlert('error', 'บันทึกไม่สำเร็จ', error.message);
    else { setEditingId(null); fetchBookings(); showAlert('success', 'บันทึกเรียบร้อย', 'แก้ไขข้อมูลเรียบร้อยแล้ว ✨'); }
  };

  const filtered = bookings
    .filter(b => {
      const bDate = new Date(b.start_date);
      const matchMonth = selectedMonth === 'all' || (bDate.getMonth() + 1) === parseInt(selectedMonth);
      const matchYear  = selectedYear  === 'all' || bDate.getFullYear() === parseInt(selectedYear);
      const s = searchTerm.toLowerCase();
      const matchSearch = (b.customer_name || '').toLowerCase().includes(s) ||
        (b.cat_names || '').toLowerCase().includes(s) || (b.note || '').toLowerCase().includes(s);
      return matchMonth && matchYear && matchSearch;
    })
    .sort((a, b) => {
      const dA = new Date(a.start_date), dB = new Date(b.start_date);
      return sortOrder === 'newest' ? dB - dA : dA - dB;
    });

  const indexOfLastItem  = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages   = Math.ceil(filtered.length / itemsPerPage);
  const paginate = (p) => setCurrentPage(p);
  const changePerPage = (n) => { setItemsPerPage(n); setCurrentPage(1); };

  return (
    <>

      <div className="space-y-5 py-2 history-fade font-sans">

        {/* ── Hero Header ── */}
        <div className="relative overflow-hidden bg-[#372C2E] rounded-[2rem] px-6 py-6 shadow-2xl shadow-[#372C2E]/20">
          <div className="absolute -top-4 -right-4 text-8xl opacity-[0.05] rotate-12 select-none pointer-events-none">🐾</div>
          <div className="absolute bottom-1 right-20 text-3xl opacity-[0.05] -rotate-6 select-none pointer-events-none">🐱</div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-5">
            <div className="flex items-center gap-4">
              <div className="bg-[#DE9E48] p-3.5 rounded-2xl shadow-lg shadow-[#DE9E48]/30 shrink-0">
                <History size={24} className="text-[#372C2E]" />
              </div>
              <div>
                <p className="text-[#DE9E48] text-[10px] font-black uppercase tracking-[0.25em] mb-0.5">Admin · Booking Records</p>
                <h2 className="text-2xl font-black text-white tracking-tight">ประวัติการเข้าพัก</h2>
                <p className="text-white/40 text-xs mt-0.5">ค้นหา แก้ไข และจัดการข้อมูลการจองทั้งหมด</p>
              </div>
            </div>
            {/* Stats */}
            <div className="md:ml-auto flex items-center gap-3">
              <div className="bg-white/10 border border-white/15 rounded-2xl px-5 py-3 text-center">
                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-0.5">การจองทั้งหมด</p>
                <p className="f-number text-[#DE9E48]" style={{ fontSize: "2rem" }}>{bookings.length}</p>
              </div>
              <div className="bg-white/10 border border-white/15 rounded-2xl px-5 py-3 text-center">
                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-0.5">ผลลัพธ์</p>
                <p className="f-number text-white" style={{ fontSize: "2rem" }}>{filtered.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Gold divider */}
        <div className="divider-gold" />

        {/* ── Filters Bar ── */}
        <div className="bg-white rounded-[1.75rem] border border-[#efebe9] px-5 py-4 shadow-sm flex flex-col md:flex-row items-center gap-3 flex-wrap">
          {/* Sort */}
          <button
            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black border transition-all ${
              sortOrder === 'newest'
                ? 'bg-[#372C2E] text-[#DE9E48] border-[#372C2E]'
                : 'bg-white text-[#A1887F] border-[#efebe9] hover:border-[#885E43]'
            }`}
          >
            <ArrowUpDown size={14} />
            {sortOrder === 'newest' ? 'ใหม่สุด' : 'เก่าสุด'}
          </button>

          {/* Month filter */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={e => { setSelectedMonth(e.target.value); setCurrentPage(1); }}
              className="filter-select"
            >
              <option value="all">ทุกเดือน</option>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <ChevronRight size={12} className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-[#A1887F] pointer-events-none" />
          </div>

          {/* Year filter */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={e => { setSelectedYear(e.target.value); setCurrentPage(1); }}
              className="filter-select"
            >
              <option value="all">ทุกปี</option>
              {(() => {
                const years = [...new Set(bookings.map(b => new Date(b.start_date).getFullYear()).filter(Boolean))].sort((a,b) => b-a);
                if (years.length === 0) years.push(new Date().getFullYear());
                return years.map(y => <option key={y} value={y}>{y}</option>);
              })()}
            </select>
            <ChevronRight size={12} className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-[#A1887F] pointer-events-none" />
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C4A99A]" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, น้องแมว, หมายเหตุ..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#FDFBFA] border-[1.5px] border-[#efebe9] rounded-xl outline-none focus:border-[#885E43] text-sm font-bold text-[#372C2E] transition-all"
              style={{ boxShadow: 'none' }}
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-[2rem] border border-[#efebe9] overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-[#f0ece8]">
                  {['ลูกค้า / น้องแมว', 'ห้องพัก', 'การเงิน & ชำระเงิน', 'ช่วงเข้าพัก', 'จัดการ'].map(h => (
                    <th key={h} className="px-5 py-4 text-[10px] font-black text-[#A1887F] uppercase tracking-[0.15em] bg-[#FDFBFA] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="text-5xl mb-3 opacity-30">🐾</div>
                      <p className="text-[#A1887F] font-bold text-sm">ไม่พบประวัติการเข้าพักที่เลือก</p>
                    </td>
                  </tr>
                ) : currentItems.map((b, rowIdx) => {
                  const isEditing = editingId === b.id;
                  const roomCfg = ROOM_CONFIG[b.room_type] || {};
                  const totalPaid  = (b.deposit || 0) + (b.paid_on_checkin || 0);
                  const remaining  = Math.max(0, (b.total_price || 0) - totalPaid);

                  return (
                    <tr key={b.id} className="row-in border-b border-[#f5f0ec] transition-colors" style={{ animationDelay: `${rowIdx * 30}ms` }}>

                      {/* ── Col 1: Customer & Cat ── */}
                      <td className="px-5 py-4 min-w-[160px]">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input className="ht-input" value={editForm.customer_name}
                              onChange={e => setEditForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="ชื่อเจ้าของ" />
                            <input className="ht-input" style={{ color: '#885E43' }} value={editForm.cat_names}
                              onChange={e => setEditForm(p => ({ ...p, cat_names: e.target.value }))} placeholder="ชื่อแมว" />
                          </div>
                        ) : (
                          <div>
                            <p className="font-black text-[#372C2E] text-sm leading-tight">{b.customer_name || 'ไม่ระบุ'}</p>
                            <p className="text-xs text-[#885E43] font-bold mt-1">{b.cat_names || 'ไม่ระบุ'}</p>
                          </div>
                        )}
                      </td>

                      {/* ── Col 2: Room Type ── */}
                      <td className="px-5 py-4 min-w-[130px]">
                        {isEditing ? (
                          <div className="relative">
                            <select className="ht-select" value={editForm.room_type}
                              onChange={e => setEditForm(p => ({ ...p, room_type: e.target.value }))}>
                              {Object.keys(ROOM_PRICES).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <ChevronRight size={11} className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-[#A1887F] pointer-events-none" />
                          </div>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black border"
                            style={{ backgroundColor: roomCfg.accent || '#f5f0ec', borderColor: (roomCfg.color || '#C39A7A') + '40', color: roomCfg.color || '#885E43' }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: roomCfg.color || '#885E43' }} />
                            {b.room_type}
                          </span>
                        )}
                      </td>

                      {/* ── Col 3: Finance & Notes ── */}
                      <td className="px-5 py-4 min-w-[200px]">
                        {isEditing ? (
                          <div className="space-y-2.5 bg-[#FDFBFA] p-3 rounded-2xl border border-[#efebe9]">
                            {/* Deposit */}
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] font-black text-[#885E43] uppercase tracking-wider whitespace-nowrap">มัดจำ</label>
                              <input type="number" className="ht-input flex-1"
                                value={editForm.deposit}
                                onChange={e => setEditForm(p => ({ ...p, deposit: parseFloat(e.target.value) || 0 }))} />
                            </div>

                            {/* Paid on check-in */}
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] font-black text-[#368daf] uppercase tracking-wider whitespace-nowrap">ชำระวันเข้าพัก</label>
                              <input type="number" className="ht-input flex-1"
                                value={editForm.paid_on_checkin}
                                onChange={e => setEditForm(p => ({ ...p, paid_on_checkin: parseFloat(e.target.value) || 0 }))} />
                            </div>

                            {/* Extra items */}
                            <div className="border-t border-[#efebe9] pt-2 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-[#DE9E48] uppercase">รายการเพิ่ม</span>
                                <button type="button" onClick={addExtraItem}
                                  className="w-6 h-6 rounded-lg bg-[#DE9E48] text-white flex items-center justify-center hover:bg-[#c68a39] transition-colors">
                                  <Plus size={12} />
                                </button>
                              </div>
                              {editForm.extra_items.map((ex, idx) => (
                                <div key={idx} className="flex gap-1 items-center">
                                  <input placeholder="รายการ" className="ht-input flex-1 text-[11px]"
                                    value={ex.item} onChange={e => updateExtraItem(idx, 'item', e.target.value)} />
                                  <input type="number" placeholder="฿" className="ht-input w-14 text-[11px]"
                                    value={ex.price || ''} onChange={e => updateExtraItem(idx, 'price', e.target.value)} />
                                  <button onClick={() => removeExtraItem(idx)}
                                    className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600">
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>

                            {/* Note */}
                            <textarea
                              className="ht-input resize-none text-[11px] min-h-[48px]"
                              placeholder="หมายเหตุ..."
                              value={editForm.note}
                              onChange={e => setEditForm(p => ({ ...p, note: e.target.value }))}
                            />
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {/* Row 1: total price */}
                            <span className="f-number px-2 py-0.5 bg-[#372C2E] text-white rounded-md inline-block" style={{ fontSize: "0.85rem" }}>
                              รวม ฿{(b.total_price || 0).toLocaleString()}
                            </span>

                            {/* Row 2: deposit + paid_on_checkin badges */}
                            <div className="flex flex-wrap gap-1">
                              {b.deposit > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[10px] font-black">
                                  <BadgeCheck size={10} />มัดจำ ฿{b.deposit.toLocaleString()}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 bg-gray-50 text-gray-400 border border-gray-100 rounded-lg text-[10px] font-black">
                                  ยังไม่มัดจำ
                                </span>
                              )}
                              {b.paid_on_checkin > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-[10px] font-black">
                                  <Wallet size={10} />วันเข้าพัก ฿{b.paid_on_checkin.toLocaleString()}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg text-[10px] font-black">
                                  ยังไม่ชำระวันเข้าพัก
                                </span>
                              )}
                            </div>

                            {/* Row 3: remaining */}
                            <div>
                              {remaining > 0 ? (
                                <span className="f-number px-2 py-0.5 bg-rose-500 text-white rounded-md inline-block" style={{ fontSize: "0.85rem" }}>
                                  ค้างชำระ ฿{remaining.toLocaleString()}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[10px] font-black">
                                  <BadgeCheck size={10} /> ชำระครบแล้ว ✓
                                </span>
                              )}
                            </div>

                            {/* Note */}
                            {b.note && (
                              <p className="text-[11px] text-[#A1887F] italic line-clamp-2 max-w-[200px] leading-relaxed">
                                {b.note}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* ── Col 4: Dates ── */}
                      <td className="px-5 py-4 min-w-[130px]">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input type="date" className="ht-input"
                              value={editForm.start_date} onChange={e => setEditForm(p => ({ ...p, start_date: e.target.value }))} />
                            <input type="date" className="ht-input"
                              value={editForm.end_date} onChange={e => setEditForm(p => ({ ...p, end_date: e.target.value }))} />
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-black text-[#372C2E]">{formatDateDisplay(b.start_date)}</p>
                            <p className="text-[11px] text-[#A1887F] font-bold mt-0.5">ถึง {formatDateDisplay(b.end_date)}</p>
                          </div>
                        )}
                      </td>

                      {/* ── Col 5: Actions ── */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex justify-center gap-1.5">
                          {isEditing ? (
                            <>
                              <button onClick={() => handleUpdate(b.id)}
                                className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 flex items-center justify-center transition-all active:scale-90">
                                <Check size={16} />
                              </button>
                              <button onClick={() => setEditingId(null)}
                                className="w-9 h-9 rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 border border-gray-100 flex items-center justify-center transition-all active:scale-90">
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(b)}
                                className="w-9 h-9 rounded-xl text-[#A1887F] hover:text-[#885E43] hover:bg-[#F5EEE8] flex items-center justify-center transition-all active:scale-90"
                                title="แก้ไข">
                                <Edit3 size={16} />
                              </button>
                              <button onClick={() => setDeleteTarget(b)}
                                className="w-9 h-9 rounded-xl text-[#A1887F] hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all active:scale-90"
                                title="ลบ">
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {filtered.length > 0 && (() => {
            // smart page buttons: show max 7 buttons with ellipsis
            const getPages = () => {
              if (totalPages <= 7) return [...Array(totalPages)].map((_, i) => i + 1);
              const pages = [];
              if (currentPage <= 4) {
                pages.push(1,2,3,4,5,'…',totalPages);
              } else if (currentPage >= totalPages - 3) {
                pages.push(1,'…',totalPages-4,totalPages-3,totalPages-2,totalPages-1,totalPages);
              } else {
                pages.push(1,'…',currentPage-1,currentPage,currentPage+1,'…',totalPages);
              }
              return pages;
            };
            return (
              <div className="px-5 py-4 bg-[#FDFBFA] border-t border-[#efebe9] flex flex-col md:flex-row items-center justify-between gap-3 flex-wrap">
                {/* Left: info + per-page selector */}
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-[11px] font-bold text-[#A1887F] uppercase tracking-wider">
                    แสดง {indexOfFirstItem + 1}–{Math.min(indexOfLastItem, filtered.length)} จาก {filtered.length} รายการ
                  </p>
                  {/* Per-page selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-[#C4A99A]">หน้าละ</span>
                    {[10, 20, 50, 100].map(n => (
                      <button key={n} onClick={() => changePerPage(n)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                          itemsPerPage === n
                            ? 'bg-[#885E43] text-white'
                            : 'bg-white border border-[#efebe9] text-[#A1887F] hover:border-[#885E43] hover:text-[#885E43]'
                        }`}>
                        {n}
                      </button>
                    ))}
                    <span className="text-[10px] font-bold text-[#C4A99A]">รายการ</span>
                  </div>
                </div>
                {/* Right: page buttons */}
                <div className="flex items-center gap-1">
                  <button onClick={() => paginate(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                    className="w-9 h-9 rounded-xl hover:bg-white border border-transparent hover:border-[#efebe9] disabled:opacity-30 text-[#885E43] flex items-center justify-center transition-all">
                    <ChevronLeft size={16} />
                  </button>
                  {getPages().map((p, i) => (
                    p === '…'
                      ? <span key={`e${i}`} className="w-9 text-center text-[#C4A99A] text-sm">…</span>
                      : <button key={p} onClick={() => paginate(p)}
                          className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${
                            currentPage === p
                              ? 'bg-[#372C2E] text-[#DE9E48] shadow-md'
                              : 'text-[#A1887F] hover:bg-white hover:border hover:border-[#efebe9]'
                          }`}>
                          {p}
                        </button>
                  ))}
                  <button onClick={() => paginate(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                    className="w-9 h-9 rounded-xl hover:bg-white border border-transparent hover:border-[#efebe9] disabled:opacity-30 text-[#885E43] flex items-center justify-center transition-all">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
          <div className="modal-pop bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#efebe9]">
            <div className="h-1.5 w-full bg-red-400" />
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5">
                <AlertTriangle size={38} />
              </div>
              <h3 className="text-xl font-black text-[#372C2E] mb-2">ยืนยันการลบ?</h3>
              <p className="text-sm text-[#A1887F] mb-7 leading-relaxed">
                คุณกำลังจะลบการจองของ <span className="font-black text-red-500">"{deleteTarget.customer_name}"</span>
                <br /><span className="text-xs opacity-70">ข้อมูลนี้จะไม่สามารถกู้คืนได้</span>
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-4 bg-[#F5F2F0] text-[#372C2E] rounded-2xl font-black hover:bg-[#efebe9] transition-all">
                  ยกเลิก
                </button>
                <button onClick={confirmDelete}
                  className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-200 transition-all active:scale-[0.98]">
                  ลบทันที
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Alert Modal ── */}
      {alertConfig.isOpen && (
        <div className="fixed inset-0 z-[3000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="modal-pop bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#efebe9]">
            <div className={`h-1.5 w-full ${alertConfig.type === 'success' ? 'bg-emerald-400' : alertConfig.type === 'warning' ? 'bg-amber-400' : 'bg-red-400'}`} />
            <div className="p-8 text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${alertConfig.type === 'success' ? 'bg-emerald-50' : alertConfig.type === 'warning' ? 'bg-amber-50' : 'bg-red-50'}`}>
                {alertConfig.type === 'success'
                  ? <CheckCircle2 size={40} className="text-emerald-500" />
                  : alertConfig.type === 'warning'
                  ? <AlertTriangle size={40} className="text-amber-500" />
                  : <X size={40} className="text-red-500" />}
              </div>
              <h3 className="text-xl font-black text-[#372C2E] mb-2">{alertConfig.title}</h3>
              <p className="text-sm text-[#A1887F] mb-7 leading-relaxed">{alertConfig.message}</p>
              <button
                onClick={() => setAlertConfig(p => ({ ...p, isOpen: false }))}
                className={`w-full py-4 rounded-2xl font-black text-white transition-all active:scale-[0.98] ${
                  alertConfig.type === 'success' ? 'bg-[#885E43]' : alertConfig.type === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                }`}>
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
