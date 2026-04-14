import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  User, Phone, Plus, Cat, Upload, Loader2, Edit3, Trash2, Utensils, FileText,
  Calendar, X, AlertTriangle, Save, ChevronLeft, ChevronRight,
  MessageCircle, Facebook, ArrowUpDown, CheckCircle2, Search, Users, Banknote
} from 'lucide-react';

export default function CustomerDatabase() {
  const [customers, setCustomers]   = useState([]);
  const [bookings, setBookings]     = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading]       = useState(true);
  const [uploading, setUploading]   = useState(false);
  const fileInputRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [sortOrder, setSortOrder] = useState('desc');

  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [modalMode, setModalMode]       = useState('add');
  const [historyModal, setHistoryModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [alertConfig, setAlertConfig] = useState({ show: false, type: 'success', title: '', message: '' });
  const showAlert = (type, title, message) => setAlertConfig({ show: true, type, title, message });

  const [editingCustomer, setEditingCustomer] = useState({
    customer_name: '', phone: '', source: 'Line', source_id: '', camera_id: '',
    eating_habit: '-', note: '-', customer_image: ''
  });

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: cust, error: ce }, { data: book, error: be }] = await Promise.all([
        supabase.from('customers').select('*').order('customer_name', { ascending: true }),
        supabase.from('bookings').select('*').order('start_date', { ascending: false }),
      ]);
      if (ce) throw ce;
      if (be) throw be;
      setCustomers(cust || []);
      setBookings(book || []);
    } catch (err) {
      showAlert('error', 'เกิดข้อผิดพลาด', err.message);
    } finally { setLoading(false); }
  };

  const formatThaiDate = (ds) => {
    if (!ds) return '-';
    const d = new Date(ds);
    if (isNaN(d)) return ds;
    const dd = d.getDate().toString().padStart(2, '0');
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    let y = d.getFullYear();
    if (y < 2500) y += 543;
    return `${dd}/${mm}/${y}`;
  };

  const calculateNights = (start, end) => {
    if (!start || !end) return 0;
    const n = Math.ceil((new Date(end) - new Date(start)) / 86400000);
    return n > 0 ? n : 0;
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('customers').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      showAlert('success', 'ลบสำเร็จ', 'ลบข้อมูลลูกค้าเรียบร้อยแล้ว');
      setDeleteTarget(null); fetchData();
    } catch (err) { showAlert('error', 'เกิดข้อผิดพลาด', err.message); }
  };

  const handleSave = async () => {
    if (!editingCustomer.customer_name)
      return showAlert('warning', 'ข้อมูลไม่ครบถ้วน', 'กรุณาระบุชื่อลูกค้า');
    const payload = {
      customer_name: editingCustomer.customer_name,
      phone: editingCustomer.phone || '',
      source: editingCustomer.source || 'Line',
      source_id: editingCustomer.source_id || '',
      camera_id: editingCustomer.camera_id || '',
      eating_habit: editingCustomer.eating_habit || '-',
      note: editingCustomer.note || '-',
      customer_image: editingCustomer.customer_image || ''
    };
    if (modalMode === 'edit' && editingCustomer.id) payload.id = editingCustomer.id;
    try {
      const { error } = await supabase.from('customers').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      showAlert('success', 'บันทึกสำเร็จ!', 'บันทึกข้อมูลลูกค้าเรียบร้อยแล้ว 🎉');
      setIsModalOpen(false); fetchData();
    } catch (err) { showAlert('error', 'เกิดข้อผิดพลาด', err.message); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `customer-photos/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('customer-images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('customer-images').getPublicUrl(filePath);
      setEditingCustomer(prev => ({ ...prev, customer_image: publicUrl }));
    } catch (err) { showAlert('error', 'อัปโหลดไม่สำเร็จ', err.message); }
    finally { setUploading(false); }
  };

  const customerStats = useMemo(() => customers.map(c => {
    const history = bookings.filter(b => b.customer_id === c.id || b.customer_name === c.customer_name);
    const catNames = new Set();
    history.forEach(h => h.cat_names?.split(',').forEach(n => catNames.add(n.trim())));
    return {
      ...c,
      phone: c.phone || '', camera_id: c.camera_id || '', source_id: c.source_id || '',
      eating_habit: c.eating_habit || '-', note: c.note || '-', customer_image: c.customer_image || '',
      totalSpent: history.reduce((s, h) => s + (Number(h.total_price) || 0), 0),
      stayCount: history.length,
      lastStayDate: history[0]?.start_date || null,
      catNamesDisplay: Array.from(catNames).join(', '),
      catNamesSearch: Array.from(catNames).join(' ').toLowerCase(),
      history,
    };
  }), [customers, bookings]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return customerStats
      .filter(c =>
        (c.customer_name || '').toLowerCase().includes(term) ||
        (c.phone || '').includes(term) ||
        (c.catNamesSearch || '').includes(term)
      )
      .sort((a, b) => {
        const dA = new Date(a.lastStayDate || 0), dB = new Date(b.lastStayDate || 0);
        return sortOrder === 'desc' ? dB - dA : dA - dB;
      });
  }, [customerStats, searchTerm, sortOrder]);

  const totalPages      = Math.ceil(filtered.length / itemsPerPage);
  const indexOfLast     = currentPage * itemsPerPage;
  const indexOfFirst    = indexOfLast - itemsPerPage;
  const currentData     = filtered.slice(indexOfFirst, indexOfLast);

  const openAdd = () => {
    setModalMode('add');
    setEditingCustomer({ customer_name: '', phone: '', source: 'Line', source_id: '', camera_id: '', eating_habit: '-', note: '-', customer_image: '' });
    setIsModalOpen(true);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
      <div style={{ animation: 'catBounce 1.4s ease-in-out infinite', fontSize: '3rem' }}>🐱</div>
      <p className="text-[#A1887F] font-bold text-sm tracking-widest uppercase">กำลังโหลดข้อมูล...</p>
    </div>
  );

  return (
    <>

      <div className="space-y-5 py-2 pb-20 cdb-fade font-sans">

        {/* ── Hero Header ── */}
        <div className="relative overflow-hidden bg-[#372C2E] rounded-[2rem] px-6 py-7 shadow-2xl shadow-[#372C2E]/20">
          <div className="absolute -top-6 -right-6 text-9xl opacity-[0.04] rotate-12 select-none pointer-events-none">🐱</div>
          <div className="absolute bottom-2 right-24 text-4xl opacity-[0.04] -rotate-6 select-none pointer-events-none">🐾</div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-5">
            <div className="flex items-center gap-4">
              <div className="bg-[#DE9E48] p-4 rounded-2xl shadow-lg shadow-[#DE9E48]/30 shrink-0">
                <Users size={26} className="text-[#372C2E]" />
              </div>
              <div>
                <p className="text-[#DE9E48] text-[10px] font-black uppercase tracking-[0.25em] mb-0.5">Admin · Customer Records</p>
                <h2 className="text-2xl font-black text-white tracking-tight">ข้อมูลลูกค้า</h2>
                <p className="text-white/40 text-xs mt-0.5">ประวัติการเข้าพักและรายละเอียดทั้งหมด</p>
              </div>
            </div>
            {/* Stats */}
            <div className="md:ml-auto flex items-center gap-3">
              <div className="bg-white/10 border border-white/15 rounded-2xl px-5 py-3 text-center">
                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-0.5">ลูกค้าทั้งหมด</p>
                <p className="f-number text-[#DE9E48]" style={{ fontSize: "2rem" }}>{customers.length}</p>
              </div>
              <div className="bg-white/10 border border-white/15 rounded-2xl px-5 py-3 text-center">
                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-0.5">ผลลัพธ์</p>
                <p className="f-number text-white" style={{ fontSize: "2rem" }}>{filtered.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="bg-white rounded-[1.75rem] border border-[#efebe9] px-5 py-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
          {/* Sort */}
          <button
            onClick={() => setSortOrder(p => p === 'desc' ? 'asc' : 'desc')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black border transition-all shrink-0 ${
              sortOrder === 'desc' ? 'bg-[#372C2E] text-[#DE9E48] border-[#372C2E]' : 'bg-white text-[#A1887F] border-[#efebe9] hover:border-[#885E43]'
            }`}
          >
            <ArrowUpDown size={14} />
            {sortOrder === 'desc' ? 'เข้าพักล่าสุด' : 'เก่าไปใหม่'}
          </button>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C4A99A]" />
            <input
              type="text" placeholder="ค้นชื่อลูกค้า, น้องแมว, เบอร์..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#FDFBFA] border-[1.5px] border-[#efebe9] rounded-xl outline-none focus:border-[#885E43] text-sm font-bold text-[#372C2E] transition-all"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Add button */}
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#885E43] hover:bg-[#5D4037] text-white rounded-xl font-black text-sm shadow-lg shadow-[#885E43]/25 transition-all active:scale-95 shrink-0"
          >
            <Plus size={16} /> เพิ่มลูกค้า
          </button>
        </div>

        {/* Gold divider */}
        <div className="divider-gold" />

        {/* ── </div>

        {/* ── Customer Cards Grid ── */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[2rem] border border-[#efebe9]">
            <div className="text-5xl mb-3 opacity-30">🐾</div>
            <p className="text-[#A1887F] font-bold text-sm">ไม่พบข้อมูลลูกค้าที่ค้นหา</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentData.map((customer, idx) => (
              <div
                key={idx}
                onClick={() => setHistoryModal(customer)}
                className="card-in bg-white rounded-[2rem] border border-[#efebe9] shadow-sm hover:shadow-xl hover:border-[#DBD0C5] transition-all duration-300 cursor-pointer group overflow-hidden"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Top accent strip */}
                <div className="h-1 w-full" style={{ background: customer.source === 'Line' ? '#4ade80' : '#60a5fa' }} />

                <div className="p-5">
                  {/* Top row: avatar + name + actions */}
                  <div className="flex gap-4 mb-4">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#F5EEE8] border-2 border-[#efebe9] shrink-0 shadow-sm">
                      {customer.customer_image
                        ? <img src={customer.customer_image} className="w-full h-full object-cover" alt="" />
                        : <div className="w-full h-full flex items-center justify-center text-[#C4A99A]"><User size={28} /></div>}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-black text-[#372C2E] text-base leading-tight truncate">{customer.customer_name}</h3>
                          {/* Source badge */}
                          <span className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            customer.source === 'Line'
                              ? 'bg-green-50 text-green-600 border-green-100'
                              : 'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                            {customer.source === 'Line'
                              ? <MessageCircle size={9} fill="currentColor" />
                              : <Facebook size={9} fill="currentColor" />}
                            {customer.source_id || customer.source}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.stopPropagation(); setEditingCustomer(customer); setModalMode('edit'); setIsModalOpen(true); }}
                            className="w-8 h-8 rounded-xl text-[#A1887F] hover:text-[#885E43] hover:bg-[#F5EEE8] flex items-center justify-center transition-all"
                          ><Edit3 size={15} /></button>
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteTarget(customer); }}
                            className="w-8 h-8 rounded-xl text-[#A1887F] hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all"
                          ><Trash2 size={15} /></button>
                        </div>
                      </div>

                      {/* Phone & cats */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#FDFBFA] text-[#885E43] px-2 py-0.5 rounded-lg border border-[#f0ece8]">
                          <Phone size={9} /> {customer.phone || '-'}
                        </span>
                        {customer.catNamesDisplay && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#FDFBFA] text-[#DE9E48] px-2 py-0.5 rounded-lg border border-[#f0ece8] max-w-[160px] truncate">
                            <Cat size={9} /> {customer.catNamesDisplay}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Eating habit */}
                  {customer.eating_habit && customer.eating_habit !== '-' && (
                    <div className="flex items-start gap-2 bg-[#FDFBFA] rounded-xl px-3 py-2.5 border border-[#f0ece8] mb-4">
                      <Utensils size={11} className="text-[#DE9E48] mt-0.5 shrink-0" />
                      <p className="text-[11px] text-[#5D4037] leading-relaxed line-clamp-2">
                        <span className="font-black text-[#885E43]">การกิน: </span>{customer.eating_habit}
                      </p>
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#f5f0ec]">
                    <div className="text-center">
                      <p className="text-[8px] font-black text-[#A1887F] uppercase tracking-widest mb-0.5">กล้อง</p>
                      <p className="text-sm font-black text-[#368daf]">{customer.camera_id || '—'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] font-black text-[#A1887F] uppercase tracking-widest mb-0.5">ยอดรวม</p>
                      <p className="f-number text-[#885E43]" style={{ fontSize: "1.05rem" }}>฿{(customer.totalSpent || 0).toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] font-black text-[#A1887F] uppercase tracking-widest mb-0.5">เข้าพัก</p>
                      <p className="text-sm font-black text-[#372C2E]">{customer.stayCount} ครั้ง</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-2">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="w-9 h-9 rounded-xl hover:bg-white border border-transparent hover:border-[#efebe9] disabled:opacity-30 text-[#885E43] flex items-center justify-center transition-all">
              <ChevronLeft size={16} />
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button key={i + 1} onClick={() => setCurrentPage(i + 1)}
                className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${
                  currentPage === i + 1 ? 'bg-[#372C2E] text-[#DE9E48] shadow-md' : 'text-[#A1887F] hover:bg-white hover:border hover:border-[#efebe9]'
                }`}>
                {i + 1}
              </button>
            ))}
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="w-9 h-9 rounded-xl hover:bg-white border border-transparent hover:border-[#efebe9] disabled:opacity-30 text-[#885E43] flex items-center justify-center transition-all">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          Modal: Add / Edit Customer
      ══════════════════════════════════════ */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-md p-0 md:p-4 overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div className="modal-pop bg-white w-full max-w-md md:rounded-[2.5rem] rounded-t-[2.5rem] overflow-hidden shadow-2xl border border-[#efebe9] max-h-[95vh] overflow-y-auto">

            {/* Header */}
            <div className="bg-[#372C2E] px-6 py-5 text-white flex items-center justify-between">
              <div>
                <p className="text-[#DE9E48] text-[10px] font-black uppercase tracking-widest mb-0.5">
                  {modalMode === 'edit' ? 'แก้ไขข้อมูล' : 'เพิ่มลูกค้าใหม่'}
                </p>
                <h3 className="text-lg font-black">{modalMode === 'edit' ? editingCustomer.customer_name : 'ลูกค้าใหม่'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Avatar upload */}
              <div className="flex justify-center">
                <div
                  className="w-24 h-24 rounded-[1.5rem] bg-[#F5EEE8] border-2 border-dashed border-[#C39A7A]/40 overflow-hidden relative cursor-pointer hover:border-[#885E43] transition-all shadow-sm"
                  onClick={() => fileInputRef.current.click()}
                >
                  {editingCustomer.customer_image
                    ? <img src={editingCustomer.customer_image} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-[#C4A99A]">
                        <Upload size={20} />
                        <span className="text-[9px] font-black uppercase tracking-wider">รูปภาพ</span>
                      </div>}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="animate-spin text-white" size={24} />
                    </div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileUpload} />
              </div>

              {/* Customer name */}
              <div>
                <label className="cdb-label">ชื่อลูกค้า</label>
                <input className="cdb-input" placeholder="ระบุชื่อลูกค้า" value={editingCustomer.customer_name || ''}
                  onChange={e => setEditingCustomer(p => ({ ...p, customer_name: e.target.value }))} />
              </div>

              {/* Phone + Camera */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="cdb-label">เบอร์โทร</label>
                  <input className="cdb-input" placeholder="0xx-xxx-xxxx" value={editingCustomer.phone || ''}
                    onChange={e => setEditingCustomer(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="cdb-label" style={{ color: '#368daf' }}>ไอดีกล้อง</label>
                  <input className="cdb-input" style={{ background: '#e6f4fa', borderColor: '#b3d9ed', color: '#368daf' }}
                    placeholder="Camera ID" value={editingCustomer.camera_id || ''}
                    onChange={e => setEditingCustomer(p => ({ ...p, camera_id: e.target.value }))} />
                </div>
              </div>

              {/* Source + Source ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="cdb-label">ช่องทาง</label>
                  <div className="relative">
                    <select className="cdb-input appearance-none pr-8 cursor-pointer" value={editingCustomer.source || 'Line'}
                      onChange={e => setEditingCustomer(p => ({ ...p, source: e.target.value }))}>
                      <option value="Line">Line</option>
                      <option value="Facebook">Facebook</option>
                    </select>
                    <ChevronLeft size={12} className="absolute right-3 top-1/2 -translate-y-1/2 -rotate-90 text-[#A1887F] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="cdb-label">ไอดี {editingCustomer.source}</label>
                  <input className="cdb-input" placeholder="ไอดีช่องทาง" value={editingCustomer.source_id || ''}
                    onChange={e => setEditingCustomer(p => ({ ...p, source_id: e.target.value }))} />
                </div>
              </div>

              {/* Eating habit */}
              <div>
                <label className="cdb-label">การกิน</label>
                <textarea className="cdb-input resize-none" rows={2} placeholder="ข้อมูลการกินของน้องแมว..."
                  value={editingCustomer.eating_habit || ''}
                  onChange={e => setEditingCustomer(p => ({ ...p, eating_habit: e.target.value }))} />
              </div>

              {/* Note */}
              <div>
                <label className="cdb-label">หมายเหตุ</label>
                <textarea className="cdb-input resize-none" rows={2} placeholder="หมายเหตุทั่วไป..."
                  value={editingCustomer.note || ''}
                  onChange={e => setEditingCustomer(p => ({ ...p, note: e.target.value }))} />
              </div>

              {/* Save */}
              <button onClick={handleSave}
                className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl"
                style={{ background: 'linear-gradient(135deg, #885E43 0%, #5D4037 100%)', boxShadow: '0 8px 24px rgba(136,94,67,.3)' }}>
                <Save size={18} /> บันทึกข้อมูลลูกค้า
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          Modal: Booking History
      ══════════════════════════════════════ */}
      {historyModal && (
        <div
          className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={e => { if (e.target === e.currentTarget) setHistoryModal(null); }}
        >
          <div className="modal-pop bg-white w-full max-w-3xl md:rounded-[2.5rem] rounded-t-[2.5rem] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-[#efebe9]">

            {/* Header */}
            <div className="bg-[#372C2E] px-6 py-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#DE9E48] shadow-md shrink-0">
                  {historyModal.customer_image
                    ? <img src={historyModal.customer_image} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full bg-[#DE9E48]/15 flex items-center justify-center text-[#DE9E48]"><User size={26} /></div>}
                </div>
                <div>
                  <p className="text-[#DE9E48] text-[10px] font-black uppercase tracking-widest mb-0.5">ประวัติการเข้าพัก</p>
                  <h3 className="text-xl font-black">{historyModal.customer_name}</h3>
                  <p className="text-white/40 text-xs mt-0.5">{historyModal.stayCount} ครั้ง · ฿{(historyModal.totalSpent || 0).toLocaleString()}</p>
                </div>
              </div>
              <button onClick={() => setHistoryModal(null)} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-5 space-y-4 bg-[#FDFBFA]">

              {/* Info cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-[#efebe9] shadow-sm">
                  <div className="flex items-center gap-2 text-[#885E43] text-[10px] font-black uppercase tracking-wider mb-2">
                    <Utensils size={12} /> การกิน
                  </div>
                  <p className="text-sm text-[#372C2E] leading-relaxed">{historyModal.eating_habit || '-'}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-[#efebe9] shadow-sm">
                  <div className="flex items-center gap-2 text-[#DE9E48] text-[10px] font-black uppercase tracking-wider mb-2">
                    <FileText size={12} /> หมายเหตุ
                  </div>
                  <p className="text-sm text-[#372C2E] leading-relaxed">{historyModal.note || '-'}</p>
                </div>
              </div>

              {/* Booking history list */}
              <div className="space-y-3">
                {historyModal.history.length === 0 ? (
                  <div className="text-center py-12 text-[#A1887F] font-bold text-sm bg-white rounded-2xl border border-[#efebe9]">
                    <div className="text-4xl mb-2 opacity-30">🐾</div>
                    ไม่พบประวัติการเข้าพัก
                  </div>
                ) : historyModal.history.map((h, i) => {
                  const nights = calculateNights(h.start_date, h.end_date);
                  const extMatch = h.note?.match(/เพิ่ม\s*(\d+)\s*คืน/);
                  const extNights = extMatch ? extMatch[1] : null;

                  return (
                    <div key={i} className="bg-white rounded-2xl border border-[#efebe9] overflow-hidden shadow-sm">
                      {/* Top strip */}
                      <div className="h-0.5 w-full bg-gradient-to-r from-[#885E43] to-[#DE9E48]" />
                      <div className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-center">
                        {/* Dates */}
                        <div>
                          <p className="text-[9px] font-black text-[#A1887F] uppercase tracking-wider mb-1">วันที่เข้าพัก</p>
                          <p className="text-xs font-black text-[#372C2E]">{formatThaiDate(h.start_date)}</p>
                          <p className="text-xs font-bold text-[#A1887F]">ถึง {formatThaiDate(h.end_date)}</p>
                        </div>
                        {/* Nights */}
                        <div>
                          <p className="text-[9px] font-black text-[#A1887F] uppercase tracking-wider mb-1">คืน</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-black text-[#372C2E]">{nights}</span>
                            <span className="text-[10px] text-[#A1887F] font-bold">คืน</span>
                            {extNights && <span className="text-[10px] text-emerald-600 font-black">(+{extNights})</span>}
                          </div>
                        </div>
                        {/* Room */}
                        <div>
                          <p className="text-[9px] font-black text-[#A1887F] uppercase tracking-wider mb-1">ห้อง</p>
                          <p className="text-xs font-black text-[#368daf]">{h.room_type}</p>
                        </div>
                        {/* Cat */}
                        <div>
                          <p className="text-[9px] font-black text-[#A1887F] uppercase tracking-wider mb-1">แมว</p>
                          <p className="text-xs font-black text-[#DE9E48] truncate max-w-[100px]">{h.cat_names}</p>
                        </div>
                        {/* Price */}
                        <div className="md:text-right">
                          <p className="text-[9px] font-black text-[#A1887F] uppercase tracking-wider mb-1">ราคา</p>
                          <p className="f-number text-[#885E43]" style={{ fontSize: "1.1rem" }}>฿{(h.total_price || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          Modal: Delete Confirm
      ══════════════════════════════════════ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
          <div className="modal-pop bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#efebe9]">
            <div className="h-1.5 bg-red-400 w-full" />
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5">
                <AlertTriangle size={38} />
              </div>
              <h3 className="text-xl font-black text-[#372C2E] mb-2">ยืนยันการลบ?</h3>
              <p className="text-sm text-[#A1887F] mb-7 leading-relaxed">
                คุณกำลังจะลบข้อมูลของ <span className="font-black text-red-500">"{deleteTarget.customer_name}"</span>
                <br /><span className="text-xs opacity-70">ข้อมูลนี้จะไม่สามารถกู้คืนได้</span>
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-4 bg-[#F5F2F0] text-[#372C2E] rounded-2xl font-black hover:bg-[#efebe9] transition-all">ยกเลิก</button>
                <button onClick={confirmDelete} className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-200 transition-all active:scale-[0.98]">ลบทันที</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          Modal: Alert
      ══════════════════════════════════════ */}
      {alertConfig.show && (
        <div className="fixed inset-0 z-[3000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="modal-pop bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#efebe9]">
            <div className={`h-1.5 w-full ${alertConfig.type === 'success' ? 'bg-emerald-400' : alertConfig.type === 'warning' ? 'bg-amber-400' : 'bg-red-400'}`} />
            <div className="p-8 text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${alertConfig.type === 'success' ? 'bg-emerald-50' : alertConfig.type === 'warning' ? 'bg-amber-50' : 'bg-red-50'}`}>
                {alertConfig.type === 'success' ? <CheckCircle2 size={40} className="text-emerald-500" />
                  : alertConfig.type === 'warning' ? <AlertTriangle size={40} className="text-amber-500" />
                  : <X size={40} className="text-red-500" />}
              </div>
              <h3 className="text-xl font-black text-[#372C2E] mb-2">{alertConfig.title}</h3>
              <p className="text-sm text-[#A1887F] mb-7 leading-relaxed">{alertConfig.message}</p>
              <button onClick={() => setAlertConfig(p => ({ ...p, show: false }))}
                className={`w-full py-4 rounded-2xl font-black text-white transition-all active:scale-[0.98] ${alertConfig.type === 'success' ? 'bg-[#885E43]' : alertConfig.type === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`}>
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
