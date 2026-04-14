import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit3, Trash2, Upload, Loader2, Eye, EyeOff, X } from 'lucide-react';

const CATEGORIES = ['อาหารเม็ด', 'อาหารเปียก', 'ทรายแมว', 'ของเล่น', 'อื่นๆ'];

const EMPTY = {
  name: '', category: 'อาหารเม็ด', price: '', unit: 'ชิ้น',
  description: '', image_url: '', stock: '', visible: true,
  line_shop_url: '',
};

export default function AdminShop() {
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filterCat, setFilterCat]   = useState('ทั้งหมด');
  const [isModalOpen, setIsModal]   = useState(false);
  const [mode, setMode]             = useState('add');
  const [form, setForm]             = useState(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast]           = useState(null);
  const fileRef                     = useRef();

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from('shop_products').select('*').order('created_at', { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const openAdd = () => { setForm(EMPTY); setMode('add'); setIsModal(true); };
  const openEdit = (p) => { setForm({ ...p }); setMode('edit'); setIsModal(true); };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const filename = `shop_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(filename, file, { upsert: true });
    if (error) { showToast('error', 'อัปโหลดรูปไม่สำเร็จ'); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filename);
    setForm(f => ({ ...f, image_url: publicUrl }));
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('error', 'กรุณากรอกชื่อสินค้า'); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(), category: form.category,
      price: form.price !== '' ? Number(form.price) : null,
      unit: form.unit || 'ชิ้น',
      description: form.description || '',
      image_url: form.image_url || '',
      stock: form.stock !== '' ? Number(form.stock) : null,
      visible: form.visible,
      line_shop_url: form.line_shop_url || '',
    };
    let error;
    if (mode === 'edit' && form.id) {
      ({ error } = await supabase.from('shop_products').update(payload).eq('id', form.id));
    } else {
      ({ error } = await supabase.from('shop_products').insert(payload));
    }
    if (error) showToast('error', 'บันทึกไม่สำเร็จ');
    else { showToast('success', mode === 'edit' ? 'แก้ไขสินค้าแล้ว' : 'เพิ่มสินค้าแล้ว'); setIsModal(false); fetchProducts(); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('shop_products').delete().eq('id', deleteTarget.id);
    if (error) showToast('error', 'ลบไม่สำเร็จ');
    else { showToast('success', 'ลบสินค้าแล้ว'); fetchProducts(); }
    setDeleteTarget(null);
  };

  const toggleVisible = async (p) => {
    await supabase.from('shop_products').update({ visible: !p.visible }).eq('id', p.id);
    fetchProducts();
  };

  const filtered = filterCat === 'ทั้งหมด' ? products : products.filter(p => p.category === filterCat);

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[9999] px-5 py-3 rounded-2xl text-sm font-bold shadow-xl transition-all ${toast.type === 'success' ? 'bg-[#372C2E] text-[#DE9E48]' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-[#A1887F] mb-1">จัดการร้านค้า</p>
          <h2 className="text-2xl font-black tracking-tight text-[#372C2E]">สินค้าทั้งหมด</h2>
          <p className="text-xs text-[#A1887F] mt-0.5">{products.length} รายการ</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black text-white transition-all hover:opacity-90 active:scale-95 shadow-lg self-start"
          style={{ background: 'linear-gradient(135deg,#885E43,#372C2E)' }}>
          <Plus size={16} strokeWidth={3} /> เพิ่มสินค้า
        </button>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['ทั้งหมด', ...CATEGORIES].map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat)}
            className="text-xs font-bold px-3.5 py-1.5 rounded-full transition-all"
            style={{ background: filterCat === cat ? '#372C2E' : '#F5F2F0', color: filterCat === cat ? '#DE9E48' : '#A1887F', border: filterCat === cat ? '1px solid #372C2E' : '1px solid #DBD0C5' }}>
            {cat}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin text-[#A1887F]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-[#A1887F] text-sm font-semibold">
          ยังไม่มีสินค้า — กดเพิ่มสินค้าเพื่อเริ่มต้น
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <div key={p.id}
              className="flex items-center gap-4 px-4 py-3 rounded-2xl transition-all hover:shadow-sm"
              style={{ background: '#fdfbfa', border: '1px solid #ede5dc', opacity: p.visible ? 1 : 0.5 }}>

              {/* Thumbnail */}
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0" style={{ background: '#f5ede4' }}>
                {p.image_url
                  ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-[#C39A7A] text-[11px] font-semibold">ไม่มีรูป</div>
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-[#372C2E] truncate">{p.name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: '#F5EEE8', color: '#885E43' }}>{p.category}</span>
                  {!p.visible && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">ซ่อนอยู่</span>}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-0.5">
                  {p.price != null && <span className="text-sm font-black text-[#885E43]">฿{Number(p.price).toLocaleString()}</span>}
                  {p.unit  && <span className="text-[11px] text-[#A1887F]">/ {p.unit}</span>}
                  {p.stock != null && (
                    <span className={`text-[11px] font-semibold ${p.stock === 0 ? 'text-red-500' : 'text-[#A1887F]'}`}>
                      คงเหลือ {p.stock}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => toggleVisible(p)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all"
                  style={{ background: '#F5F2F0', color: '#A1887F', border: '1px solid #DBD0C5' }}>
                  {p.visible ? <><Eye size={12} /><span className="hidden md:inline">แสดง</span></> : <><EyeOff size={12} /><span className="hidden md:inline">ซ่อน</span></>}
                </button>
                <button onClick={() => openEdit(p)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all"
                  style={{ background: '#F5EEE8', color: '#885E43', border: '1px solid #e8d9cc' }}>
                  <Edit3 size={12} /> แก้ไข
                </button>
                <button onClick={() => setDeleteTarget(p)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all"
                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                  <Trash2 size={12} /> ลบ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal Add/Edit ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(55,44,46,0.55)', backdropFilter: 'blur(6px)' }}>
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden jj-modal-pop"
            style={{ border: '1px solid #DBD0C5' }}>

            <div className="flex items-center justify-between px-7 py-5" style={{ background: '#372C2E' }}>
              <div>
                <p className="text-[10px] font-black tracking-[0.2em] uppercase mb-0.5" style={{ color: 'rgba(222,158,72,0.7)' }}>
                  {mode === 'edit' ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
                </p>
                <h3 className="text-base font-black text-white">{mode === 'edit' ? form.name : 'สินค้าใหม่'}</h3>
              </div>
              <button onClick={() => setIsModal(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/10 text-white/60 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="px-7 py-6 space-y-4 max-h-[68vh] overflow-y-auto">
              {/* Image */}
              <div>
                <label className="jj-label">รูปสินค้า</label>
                <div className="flex gap-3 items-start">
                  <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0" style={{ background: '#F5F2F0', border: '1.5px solid #DBD0C5' }}>
                    {form.image_url
                      ? <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-[#C39A7A] text-xs font-semibold">ไม่มีรูป</div>
                    }
                  </div>
                  <div className="flex-1">
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-60"
                      style={{ background: '#F5EEE8', color: '#885E43', border: '1px solid #e8d9cc' }}>
                      {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                      {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูป'}
                    </button>
                    {form.image_url && (
                      <button onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                        className="mt-1.5 text-[11px] text-red-400 hover:text-red-600 block">
                        ลบรูป
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="jj-label">ชื่อสินค้า *</label>
                <input className="jj-input" placeholder="เช่น อาหารเม็ด Royal Canin"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              {/* Category + Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="jj-label">หมวดหมู่</label>
                  <select className="jj-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="jj-label">หน่วย</label>
                  <input className="jj-input" placeholder="ชิ้น / ถุง / กระป๋อง"
                    value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
                </div>
              </div>

              {/* Price + Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="jj-label">ราคา (บาท)</label>
                  <input type="number" min="0" className="jj-input" placeholder="0"
                    value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                </div>
                <div>
                  <label className="jj-label">จำนวนคงเหลือ</label>
                  <input type="number" min="0" className="jj-input" placeholder="ไม่ระบุ"
                    value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="jj-label">รายละเอียด</label>
                <textarea className="jj-input resize-none" rows={3} placeholder="รายละเอียดสินค้า..."
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              {/* LINE Shop URL */}
              <div>
                <label className="jj-label" style={{ color: '#06C755' }}>
                  <span className="inline-flex items-center gap-1.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="#06C755"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                    URL สินค้าใน LINE Shopping (ไม่บังคับ)
                  </span>
                </label>
                <input
                  type="url" className="jj-input"
                  placeholder="https://shop.line.me/..."
                  value={form.line_shop_url || ''}
                  onChange={e => setForm(f => ({ ...f, line_shop_url: e.target.value }))}
                  style={{ borderColor: form.line_shop_url ? '#06C755' : undefined }}
                />
                {form.line_shop_url && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#06C755]" />
                    <p className="text-[10px] font-bold" style={{ color: '#06C755' }}>
                      ลูกค้าจะสามารถกดซื้อสินค้านี้ใน LINE Shopping ได้โดยตรง
                    </p>
                  </div>
                )}
              </div>

              {/* Visible toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#F5F2F0' }}>
                <div>
                  <p className="text-xs font-black text-[#372C2E]">แสดงสินค้าให้ลูกค้าเห็น</p>
                  <p className="text-[10px] text-[#A1887F] mt-0.5">{form.visible ? 'สินค้านี้จะปรากฏในหน้าร้านค้า' : 'สินค้านี้ถูกซ่อนจากลูกค้า'}</p>
                </div>
                <button onClick={() => setForm(f => ({ ...f, visible: !f.visible }))}
                  className="w-11 h-6 rounded-full transition-all relative shrink-0"
                  style={{ background: form.visible ? '#885E43' : '#DBD0C5' }}>
                  <div className="w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-all"
                    style={{ left: form.visible ? '1.5rem' : '0.25rem' }} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 px-7 pb-6">
              <button onClick={() => setIsModal(false)}
                className="flex-1 py-3 rounded-2xl text-sm font-bold transition-all hover:opacity-80"
                style={{ background: '#F5F2F0', color: '#A1887F' }}>
                ยกเลิก
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-2xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#885E43,#372C2E)' }}>
                {saving ? <><Loader2 size={15} className="animate-spin" /> บันทึก...</> : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(55,44,46,0.55)', backdropFilter: 'blur(6px)' }}>
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl p-8 text-center jj-modal-pop"
            style={{ border: '1px solid #DBD0C5' }}>
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4"
              style={{ border: '1px solid #fecaca' }}>
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-base font-black text-[#372C2E] mb-1">ลบสินค้า?</h3>
            <p className="text-sm text-[#A1887F] mb-6">
              <span className="font-bold text-[#372C2E]">"{deleteTarget.name}"</span> จะถูกลบถาวร
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-2xl text-sm font-bold"
                style={{ background: '#F5F2F0', color: '#A1887F' }}>
                ยกเลิก
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-3 rounded-2xl text-sm font-black text-white"
                style={{ background: '#dc2626' }}>
                ลบเลย
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
