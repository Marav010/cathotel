import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  ChevronDown, Banknote, Cat, Plus, Trash2,
  CheckCircle2, XCircle, Wallet, Check, User,
  CalendarDays, Sparkles, AlertTriangle, ChevronsRight
} from 'lucide-react';

export default function BookingForm({ onSaved, initialDate }) {
  const [loading, setLoading] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef(null);

  // Cat name autocomplete state (per cat index)
  const [catSuggestions, setCatSuggestions] = useState({});   // { index: [{cat_name, room_type, customer_name}] }
  const [showCatSuggestions, setShowCatSuggestions] = useState({});
  const catSuggestionRefs = useRef({});

  const [alertConfig, setAlertConfig] = useState({
    isOpen: false, type: 'success', title: '', message: ''
  });

  const ROOM_CONFIG = {
    'สแตนดาร์ด': { price: 300, color: '#C39A7A', accent: '#f5e6d8', tier: 'STD' },
    'ดีลักซ์':   { price: 350, color: '#ad6ea8', accent: '#f3e8f5', tier: 'DLX' },
    'ซูพีเรีย':  { price: 350, color: '#d98a8a', accent: '#fdf0f0', tier: 'SUP' },
    'พรีเมี่ยม': { price: 400, color: '#368daf', accent: '#e6f4fa', tier: 'PRM' },
    'วีไอพี':    { price: 500, color: '#4a7a46', accent: '#eaf4e9', tier: 'VIP' },
    'วีวีไอพี':  { price: 600, color: '#7a6a5a', accent: '#f0ece8', tier: 'VVIP' },
  };

  const ROOM_PRICES = Object.fromEntries(
    Object.entries(ROOM_CONFIG).map(([k, v]) => [k, v.price])
  );

  const [formData, setFormData] = useState({
    customer_name: '',
    start_date: initialDate || '',
    end_date: '',
    is_deposited: false,
    cats: [{ cat_name: '', room_type: 'สแตนดาร์ด' }]
  });

  // Customer autocomplete
  useEffect(() => {
    const search = async () => {
      if (formData.customer_name.length < 1) { setCustomerSuggestions([]); return; }
      const { data, error } = await supabase
        .from('customers')
        .select('customer_name')
        .ilike('customer_name', `%${formData.customer_name}%`)
        .limit(5);
      if (!error && data) setCustomerSuggestions(data);
    };
    const t = setTimeout(search, 300);
    return () => clearTimeout(t);
  }, [formData.customer_name]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target))
        setShowSuggestions(false);
      // ปิด cat suggestions ถ้าคลิกนอก
      setShowCatSuggestions(prev => {
        const next = { ...prev };
        Object.keys(catSuggestionRefs.current).forEach(idx => {
          if (catSuggestionRefs.current[idx] && !catSuggestionRefs.current[idx].contains(e.target))
            next[idx] = false;
        });
        return next;
      });
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectCustomer = async (name) => {
    setFormData(prev => ({ ...prev, customer_name: name }));
    setShowSuggestions(false);

    // ดึง booking ล่าสุด โดยหา start_date ของ booking ล่าสุดก่อน
    const { data: latestRow } = await supabase
      .from('bookings')
      .select('start_date')
      .eq('customer_name', name)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!latestRow || latestRow.length === 0) return;

    const lastStartDate = latestRow[0].start_date;

    // ดึงทุก booking ที่มี start_date เดียวกัน (= การจองครั้งเดียวกัน)
    const { data: bookings } = await supabase
      .from('bookings')
      .select('cat_names, room_type')
      .eq('customer_name', name)
      .eq('start_date', lastStartDate)
      .order('created_at', { ascending: true });

    if (!bookings || bookings.length === 0) return;

    // แต่ละ row = แมวที่อยู่ห้องเดียวกัน (cat_names อาจมีหลายตัวถ้าอยู่รวมกัน)
    // แยก row ออกเป็น cat card แต่ละใบ
    const catsArray = bookings.map(row => ({
      cat_name: row.cat_names,   // เก็บชื่อรวมไว้ตามเดิม (อาจเป็น "น้องA,น้องB" ถ้าอยู่ห้องเดียวกัน)
      room_type: row.room_type || 'สแตนดาร์ด'
    }));

    setFormData(prev => ({ ...prev, cats: catsArray }));
  };

  const bookingSummary = useMemo(() => {
    let nights = 0;
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      start.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0);
      nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }
    const validNights = nights > 0 ? nights : 0;
    let total = 0, depositValue = 0;
    formData.cats.forEach(cat => {
      const p = ROOM_PRICES[cat.room_type] || 0;
      total += p * validNights;
      if (validNights === 1) depositValue += p / 2;
      else depositValue += p;
    });
    return { nights: validNights, total, depositValue };
  }, [formData]);

  const showAlert = (type, title, message) =>
    setAlertConfig({ isOpen: true, type, title, message });

  const closeAlert = () => {
    setAlertConfig(prev => ({ ...prev, isOpen: false }));
    if (alertConfig.type === 'success') onSaved();
  };

  const addCatField = () =>
    setFormData(prev => ({ ...prev, cats: [...prev.cats, { cat_name: '', room_type: 'สแตนดาร์ด' }] }));

  const removeCatField = (i) => {
    if (formData.cats.length <= 1) return;
    setFormData(prev => ({ ...prev, cats: prev.cats.filter((_, idx) => idx !== i) }));
  };

  const updateCatData = (i, field, value) => {
    const newCats = [...formData.cats];
    newCats[i][field] = value;
    setFormData(prev => ({ ...prev, cats: newCats }));
  };

  // ค้นหาชื่อแมวจาก bookings
  const searchCatName = async (index, value) => {
    if (value.length < 1) {
      setCatSuggestions(prev => ({ ...prev, [index]: [] }));
      return;
    }
    const { data, error } = await supabase
      .from('bookings')
      .select('cat_names, room_type, customer_name, start_date')
      .ilike('cat_names', `%${value}%`)
      .order('created_at', { ascending: false })
      .limit(8);

    if (!error && data) {
      // กรองซ้ำโดยใช้ cat_names + customer_name เป็น key
      const seen = new Set();
      const unique = data.filter(row => {
        const key = `${row.cat_names}__${row.customer_name}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setCatSuggestions(prev => ({ ...prev, [index]: unique }));
    }
  };

  const selectCat = (index, item) => {
    updateCatData(index, 'cat_name', item.cat_names);
    updateCatData(index, 'room_type', item.room_type || 'สแตนดาร์ด');
    // ถ้ายังไม่ได้ใส่ชื่อลูกค้า ให้ใส่อัตโนมัติ
    if (!formData.customer_name) {
      setFormData(prev => ({ ...prev, customer_name: item.customer_name }));
    }
    setShowCatSuggestions(prev => ({ ...prev, [index]: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (bookingSummary.nights <= 0)
      return showAlert('warning', 'วันที่ไม่ถูกต้อง', 'วันออกต้องหลังจากวันเข้าพักอย่างน้อย 1 คืน');

    setLoading(true);
    try {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .upsert({ customer_name: formData.customer_name }, { onConflict: 'customer_name' })
        .select('id')
        .single();

      if (customerError) throw customerError;

      const bookingsToInsert = formData.cats.map(cat => {
        const roomPrice = ROOM_PRICES[cat.room_type] || 0;
        let catDeposit = 0;
        if (formData.is_deposited)
          catDeposit = bookingSummary.nights === 1 ? roomPrice / 2 : roomPrice;
        return {
          customer_id: customerData.id,
          customer_name: formData.customer_name,
          cat_names: cat.cat_name,
          room_type: cat.room_type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          booking_status: 'Confirmed',
          total_price: roomPrice * bookingSummary.nights,
          deposit: catDeposit,
        };
      });

      const { error: bookingError } = await supabase.from('bookings').insert(bookingsToInsert);
      if (bookingError) throw bookingError;
      showAlert('success', 'บันทึกสำเร็จ!', 'บันทึกข้อมูลการจองเรียบร้อยแล้ว 🎉');
    } catch (error) {
      showAlert('error', 'เกิดข้อผิดพลาด', error.message);
    } finally {
      setLoading(false);
    }
  };

  const amountDue = formData.is_deposited
    ? Math.max(0, bookingSummary.total - bookingSummary.depositValue)
    : bookingSummary.total;

  return (
    <>

      <div className="max-w-2xl mx-auto py-4 md:py-8 px-2 md:px-4 font-sans form-slide-up">

        {/* ── Hero Header ── */}
        <div className="relative overflow-hidden bg-[#372C2E] rounded-[2rem] px-6 py-7 mb-6 shadow-2xl shadow-[#372C2E]/20">
          <div className="absolute -top-4 -right-4 text-7xl opacity-[0.07] rotate-12 select-none pointer-events-none">🐱</div>
          <div className="absolute bottom-2 right-16 text-3xl opacity-[0.06] -rotate-6 select-none pointer-events-none">🐾</div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-[#DE9E48] p-3.5 rounded-2xl shadow-lg shadow-[#DE9E48]/30 shrink-0">
              <Cat size={26} className="text-[#372C2E]" />
            </div>
            <div>
              <p className="text-[#DE9E48] text-[10px] font-black uppercase tracking-[0.25em] mb-0.5">Admin · New Booking</p>
              <h2 className="text-2xl font-black text-white tracking-tight">จองที่พักใหม่</h2>
              <p className="text-white/40 text-xs mt-0.5">ลงทะเบียนเข้าพักและจัดการมัดจำ</p>
            </div>
          </div>
        </div>

        {/* Gold divider */}
        <div className="divider-gold mb-6" />

        {/* ── Form Card ── */}
        <div className="bg-white rounded-[2.5rem] border border-[#efebe9] shadow-xl shadow-[#372C2E]/5 overflow-visible">
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">

            {/* ─── 1. ชื่อเจ้าของแมว ─── */}
            <div className="relative" ref={suggestionRef}>
              <label className="section-label">👤 ชื่อเจ้าของแมว</label>
              <div className="relative">
                <input
                  className="booking-input"
                  placeholder="ระบุชื่อลูกค้า"
                  required
                  value={formData.customer_name}
                  onFocus={() => setShowSuggestions(true)}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, customer_name: e.target.value }));
                    setShowSuggestions(true);
                  }}
                />
              </div>

              {/* Autocomplete dropdown */}
              {showSuggestions && customerSuggestions.length > 0 && (
                <div className="absolute z-[200] w-full mt-2 bg-white rounded-2xl shadow-2xl border border-[#efebe9] overflow-hidden">
                  <div className="px-4 py-2 bg-[#FDFBFA] border-b border-[#f5f0ec]">
                    <span className="text-[10px] font-black text-[#A1887F] uppercase tracking-widest">
                      ลูกค้าที่เคยใช้บริการ
                    </span>
                  </div>
                  {customerSuggestions.map((item, idx) => (
                    <button
                      key={idx} type="button"
                      onClick={() => selectCustomer(item.customer_name)}
                      className="w-full px-4 py-3 text-left hover:bg-[#FDF8F5] flex items-center gap-3 transition-colors border-b border-[#f5f0ec] last:border-0"
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#f5e6d8] flex items-center justify-center shrink-0">
                        <User size={14} className="text-[#885E43]" />
                      </div>
                      <span className="font-bold text-[#372C2E] text-sm">{item.customer_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ─── 2. น้องแมว ─── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="section-label mb-0">🐱 รายละเอียดน้องแมว</label>
                <button
                  type="button" onClick={addCatField}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#372C2E] hover:bg-[#5D4037] text-white rounded-xl text-[11px] font-black transition-all active:scale-95 shadow-md"
                >
                  <Plus size={13} /> เพิ่มน้องแมว
                </button>
              </div>

              <div className="space-y-3">
                {formData.cats.map((cat, index) => {
                  const roomCfg = ROOM_CONFIG[cat.room_type] || {};
                  return (
                    <div
                      key={index}
                      className="cat-card-in relative rounded-2xl border transition-all"
                      style={{ borderColor: roomCfg.color + '30', background: roomCfg.accent || '#FDFBFA' }}
                    >
                      {/* Color strip */}
                      <div className="h-1 w-full rounded-t-2xl" style={{ background: roomCfg.color }} />

                      <div className="p-4">
                        {/* Cat number label */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: roomCfg.color }}>
                            น้องแมว #{index + 1}
                          </span>
                          {formData.cats.length > 1 && (
                            <button
                              type="button" onClick={() => removeCatField(index)}
                              className="w-7 h-7 rounded-full bg-white border border-red-100 text-red-400 hover:text-red-600 hover:border-red-200 flex items-center justify-center transition-all shadow-sm"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Cat name with autocomplete */}
                          <div
                            className="relative"
                            ref={el => catSuggestionRefs.current[index] = el}
                          >
                            <input
                              className="booking-input"
                              placeholder="ชื่อน้องแมว"
                              required
                              value={cat.cat_name}
                              onFocus={() => {
                                if (cat.cat_name.length >= 1)
                                  setShowCatSuggestions(prev => ({ ...prev, [index]: true }));
                              }}
                              onChange={e => {
                                updateCatData(index, 'cat_name', e.target.value);
                                setShowCatSuggestions(prev => ({ ...prev, [index]: true }));
                                searchCatName(index, e.target.value);
                              }}
                            />

                            {/* Cat autocomplete dropdown */}
                            {showCatSuggestions[index] && catSuggestions[index]?.length > 0 && (
                              <div className="absolute z-[300] left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-[#efebe9] overflow-hidden max-h-56 overflow-y-auto">
                                <div className="px-4 py-2 bg-[#FDFBFA] border-b border-[#f5f0ec] sticky top-0">
                                  <span className="text-[10px] font-black text-[#A1887F] uppercase tracking-widest">
                                    แมวที่เคยเข้าพัก
                                  </span>
                                </div>
                                {catSuggestions[index].map((item, idx) => (
                                  <button
                                    key={idx} type="button"
                                    onClick={() => selectCat(index, item)}
                                    className="w-full px-4 py-2.5 text-left hover:bg-[#FDF8F5] flex items-center gap-3 transition-colors border-b border-[#f5f0ec] last:border-0"
                                  >
                                    <div className="w-7 h-7 rounded-xl bg-[#f5e6d8] flex items-center justify-center shrink-0">
                                      <Cat size={13} className="text-[#885E43]" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-[#372C2E] text-xs truncate">{item.cat_names}</p>
                                      <p className="text-[10px] text-[#A1887F] font-medium truncate">
                                        {item.customer_name} · {item.room_type}
                                      </p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Room type */}
                          <div className="relative">
                            <select
                              className="room-select"
                              value={cat.room_type}
                              onChange={e => updateCatData(index, 'room_type', e.target.value)}
                            >
                              {Object.entries(ROOM_CONFIG).map(([type, cfg]) => (
                                <option key={type} value={type}>{type} (฿{cfg.price}/คืน)</option>
                              ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1887F] pointer-events-none" />
                          </div>
                        </div>

                        {/* Room price badge */}
                        <div className="mt-2.5 flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: roomCfg.color }} />
                          <span className="text-[10px] font-black" style={{ color: roomCfg.color }}>
                            {cat.room_type} · ฿{roomCfg.price}/คืน
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── 3. วันที่ + มัดจำ ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dates */}
              <div>
                <label className="section-label">ระยะเวลาเข้าพัก</label>
                <div className="bg-[#FDFBFA] rounded-2xl border border-[#efebe9] overflow-hidden divide-y divide-[#f0ece8]">
                  <div className="flex items-center gap-3 px-4 py-1">
                    <span className="text-[10px] font-black text-[#A1887F] uppercase tracking-wider w-16 shrink-0">เช็คอิน</span>
                    <input
                      type="date" required
                      className="flex-1 py-3 bg-transparent outline-none font-bold text-[#372C2E] text-sm border-0"
                      value={formData.start_date}
                      onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center gap-3 px-4 py-1">
                    <span className="text-[10px] font-black text-[#A1887F] uppercase tracking-wider w-16 shrink-0">เช็คเอาท์</span>
                    <input
                      type="date" required
                      className="flex-1 py-3 bg-transparent outline-none font-bold text-[#372C2E] text-sm border-0"
                      value={formData.end_date}
                      onChange={e => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Nights badge */}
                {bookingSummary.nights > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 px-1">
                    <span className="f-number text-[#885E43]" style={{ fontSize: "1.2rem" }}>
                      {bookingSummary.nights}</span>
                  <span className="text-xs font-bold text-[#A1887F]"> คืน
                    </span>
                  </div>
                )}
              </div>

              {/* Deposit toggle */}
              <div>
                <label className="section-label">สถานะเงินมัดจำ</label>
                <div className="bg-[#FDFBFA] p-1.5 rounded-2xl border border-[#efebe9] flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_deposited: false }))}
                    className={`flex-1 py-3.5 rounded-xl text-xs font-black transition-all duration-200 ${
                      !formData.is_deposited
                        ? 'bg-white shadow-md text-[#372C2E] border border-[#efebe9]'
                        : 'text-[#A1887F] hover:text-[#885E43]'
                    }`}
                  >
                    ยังไม่มัดจำ
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_deposited: true }))}
                    className={`flex-1 py-3.5 rounded-xl text-xs font-black transition-all duration-200 flex items-center justify-center gap-1.5 ${
                      formData.is_deposited
                        ? 'bg-[#885E43] text-white shadow-lg shadow-[#885E43]/25'
                        : 'text-[#A1887F] hover:text-[#885E43]'
                    }`}
                  >
                    {formData.is_deposited && <Check size={13} />}
                    มัดจำแล้ว ✓
                  </button>
                </div>

                {/* Deposit amount preview */}
                {formData.is_deposited && (
                  <div className="mt-2 px-3 py-2 bg-[#885E43]/8 rounded-xl border border-[#885E43]/15 flex items-center justify-between">
                    <span className="text-[10px] font-black text-[#885E43] uppercase tracking-wider">ยอดมัดจำ</span>
                    <span className="f-number text-[#885E43]" style={{ fontSize: "1.1rem" }}>฿{bookingSummary.depositValue.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ─── 4. Price Summary ─── */}
            <div className="bg-[#372C2E] rounded-[2rem] overflow-hidden shadow-2xl shadow-[#372C2E]/20">
              {/* Price rows */}
              <div className="px-7 pt-6 pb-4 space-y-3 border-b border-white/8">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white/50 uppercase tracking-wider">
                    ค่าห้องรวม ({bookingSummary.nights} คืน)
                  </span>
                  <span className="f-number text-white" style={{ fontSize: "1.15rem" }}>
                    ฿{bookingSummary.total.toLocaleString()}
                  </span>
                </div>
                {formData.is_deposited && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#DE9E48]/80 uppercase tracking-wider flex items-center gap-1.5">
                      <Wallet size={12} /> หักมัดจำแล้ว
                    </span>
                    <span className="f-number text-[#DE9E48]" style={{ fontSize: "1.15rem" }}>
                      − ฿{bookingSummary.depositValue.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Main amount */}
              <div className="px-7 py-6 flex items-end justify-between relative overflow-hidden">
                <div>
                  <p className="text-xs font-black text-white/30 uppercase tracking-[0.25em] mb-2">
                    {formData.is_deposited ? 'ยอดคงเหลือที่ต้องจ่าย' : 'ยอดที่ต้องชำระทั้งหมด'}
                  </p>
                  <p className="f-number text-white leading-none" style={{ fontSize: "3.5rem" }}>
                    ฿{amountDue.toLocaleString()}
                  </p>
                  {formData.cats.length > 1 && (
                    <p className="text-[10px] text-white/30 font-bold mt-2 tracking-wide">
                      {formData.cats.length} น้องแมว
                    </p>
                  )}
                </div>
                <Banknote size={120} className="absolute -right-6 -bottom-4 text-white opacity-[0.05] rotate-6" />
              </div>
            </div>

            {/* ─── Submit ─── */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading ? '#C4A99A' : 'linear-gradient(135deg, #885E43 0%, #5D4037 100%)',
                color: 'white',
                boxShadow: loading ? 'none' : '0 8px 24px rgba(136,94,67,0.35)',
              }}
            >
              {loading
                ? <><span className="animate-spin text-xl">🐱</span> กำลังบันทึก...</>
                : <><CheckCircle2 size={22} /> ยืนยันการจอง</>
              }
            </button>

          </form>
        </div>
      </div>

      {/* ── Alert Modal ── */}
      {alertConfig.isOpen && (
        <div
          className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeAlert(); }}
        >
          <div className="modal-pop bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#efebe9]">
            {/* Header band */}
            <div className={`h-2 w-full ${
              alertConfig.type === 'success' ? 'bg-emerald-400' :
              alertConfig.type === 'warning' ? 'bg-amber-400' : 'bg-red-400'
            }`} />

            <div className="p-8 text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${
                alertConfig.type === 'success' ? 'bg-emerald-50'  :
                alertConfig.type === 'warning' ? 'bg-amber-50'    : 'bg-red-50'
              }`}>
                {alertConfig.type === 'success'
                  ? <CheckCircle2 size={40} className="text-emerald-500" />
                  : alertConfig.type === 'warning'
                  ? <AlertTriangle size={40} className="text-amber-500" />
                  : <XCircle size={40} className="text-red-500" />
                }
              </div>

              <h3 className="text-xl font-black text-[#372C2E] mb-2">{alertConfig.title}</h3>
              <p className="text-sm text-[#A1887F] font-medium leading-relaxed px-2 mb-8">
                {alertConfig.message}
              </p>

              <button
                onClick={closeAlert}
                className="w-full py-4 rounded-2xl font-black text-white transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #885E43, #5D4037)' }}
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
