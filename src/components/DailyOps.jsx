import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  LogIn, LogOut, Clock, PawPrint, CheckCircle2, Circle,
  CalendarDays, RefreshCw, Loader2, Sun, Moon, Home,
  ArrowRightCircle, AlarmClock,
} from 'lucide-react';

const todayStr = () => new Date().toLocaleDateString('sv-SE');
const addDays  = (ds, n) => { const d = new Date(ds); d.setDate(d.getDate()+n); return d.toLocaleDateString('sv-SE'); };
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'}) : '-';
const nowTime  = () => new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',hour12:false});

const getDisplayReason = (b, ops, date) => {
  if (ops?.checked_out) return null;
  const tom = addDays(date,1);
  const ci  = b.start_date >= date && b.start_date <= tom;
  const co  = b.end_date   >= date && b.end_date   <= tom;
  if (ci && co) return 'both';
  if (ci) return 'checkin';
  if (co) return 'checkout';
  return null;
};

const ROOM_NEIGHBORS = {
  'สแตนดาร์ด':['ดีลักซ์'],
  'ดีลักซ์':  ['สแตนดาร์ด','ซูพีเรีย'],
  'ซูพีเรีย': ['ดีลักซ์','พรีเมี่ยม'],
  'พรีเมี่ยม':['ซูพีเรีย','วีไอพี'],
  'วีไอพี':   ['พรีเมี่ยม','วีวีไอพี'],
  'วีวีไอพี': ['วีไอพี'],
};
const ROOM_COLOR = {
  'สแตนดาร์ด':'#C39A7A','ดีลักซ์':'#ad6ea8','ซูพีเรีย':'#d98a8a',
  'พรีเมี่ยม':'#368daf','วีไอพี':'#4a7a46','วีวีไอพี':'#7a6a5a',
};

export default function DailyOps() {
  const [date,setDate]               = useState(todayStr());
  const [allBookings,setAllBookings] = useState([]);
  const [opsMap,setOpsMap]           = useState({});
  const [playMap,setPlayMap]         = useState({});
  const [loading,setLoading]         = useState(true);
  const [toast,setToast]             = useState(null);
  const [saving,setSaving]           = useState({});

  const fetchData = async () => {
    setLoading(true);
    const tom = addDays(date,1);
    const [{data:bIn},{data:bOut}] = await Promise.all([
      supabase.from('bookings').select('*').gte('start_date',date).lte('start_date',tom),
      supabase.from('bookings').select('*').gte('end_date',date).lte('end_date',tom),
    ]);
    const seen=new Set();
    const bData=[...(bIn||[]),...(bOut||[])].filter(b=>{ if(seen.has(b.id))return false; seen.add(b.id); return true; });
    bData.sort((a,b)=>a.start_date.localeCompare(b.start_date));
    setAllBookings(bData);
    if(!bData.length){setLoading(false);return;}
    const ids=bData.map(b=>b.id);

    const {data:oData}=await supabase.from('booking_ops').select('*').in('booking_id',ids);
    const om={}; (oData||[]).forEach(o=>{ om[o.booking_id]=o; }); setOpsMap(om);

    const {data:pData}=await supabase.from('booking_playtime').select('*').in('booking_id',ids).eq('play_date',date).order('released_at');
    const pm={}; ids.forEach(id=>{ pm[id]={morning:null,evening:null}; });
    (pData||[]).forEach(p=>{
      if(!pm[p.booking_id]) pm[p.booking_id]={morning:null,evening:null};
      if(p.session==='morning')       pm[p.booking_id].morning=p;
      else if(p.session==='evening')  pm[p.booking_id].evening=p;
      else if(!pm[p.booking_id].morning)  pm[p.booking_id].morning=p;
      else if(!pm[p.booking_id].evening)  pm[p.booking_id].evening=p;
    });
    setPlayMap(pm); setLoading(false);
  };

  useEffect(()=>{ fetchData(); },[date]);

  const bookings = allBookings.filter(b=>getDisplayReason(b,opsMap[b.id],date)!==null);

  const showToast=(type,msg)=>{ setToast({type,msg}); setTimeout(()=>setToast(null),3000); };

  const upsertOps=async(bookingId,patch)=>{
    setSaving(s=>({...s,[bookingId]:true}));
    const ex=opsMap[bookingId];
    const {error}=ex
      ? await supabase.from('booking_ops').update(patch).eq('id',ex.id)
      : await supabase.from('booking_ops').insert({booking_id:bookingId,ops_date:date,...patch});
    if(error) showToast('error','บันทึกไม่สำเร็จ: '+error.message);
    else { showToast('success','บันทึกแล้ว ✓'); await fetchData(); }
    setSaving(s=>({...s,[bookingId]:false}));
  };

  const toggleCheckin=async(b)=>{
    const ops=opsMap[b.id]||{}; const now=!ops.checked_in;
    await upsertOps(b.id,{checked_in:now,checkin_time:now?(ops.checkin_time||nowTime()):null});
  };
  const toggleCheckout=async(b)=>{
    const ops=opsMap[b.id]||{}; const now=!ops.checked_out;
    await upsertOps(b.id,{checked_out:now,checkout_time:now?(ops.checkout_time||nowTime()):null});
  };
  const updateTime=(bookingId,field,val)=>upsertOps(bookingId,{[field]:val});

  const togglePlaySession=async(bookingId,catNames,session)=>{
    const key=`play_${bookingId}_${session}`;
    setSaving(s=>({...s,[key]:true}));
    const ex=playMap[bookingId]?.[session];
    if(ex){
      const {error}=await supabase.from('booking_playtime').delete().eq('id',ex.id);
      if(error) showToast('error','ลบไม่สำเร็จ');
      else { showToast('success','ยกเลิกรอบเล่นแล้ว'); await fetchData(); }
    } else {
      const {error}=await supabase.from('booking_playtime').insert({
        booking_id:bookingId,play_date:date,cat_names:catNames,
        session,released_at:nowTime(),returned_at:null,
      });
      if(error) showToast('error','บันทึกไม่สำเร็จ');
      else { showToast('success',session==='morning'?'บันทึกรอบเช้าแล้ว 🌅':'บันทึกรอบเย็นแล้ว 🌙'); await fetchData(); }
    }
    setSaving(s=>({...s,[key]:false}));
  };

  const returnCat=async(playId)=>{
    const {error}=await supabase.from('booking_playtime').update({returned_at:nowTime()}).eq('id',playId);
    if(error) showToast('error','บันทึกไม่สำเร็จ');
    else { showToast('success','บันทึกกลับแล้ว ✓'); await fetchData(); }
  };

  const getNeighbors=(b)=>{
    const ns=ROOM_NEIGHBORS[b.room_type]||[];
    return allBookings.filter(o=>{
      if(o.id===b.id||!ns.includes(o.room_type)) return false;
      const oo=opsMap[o.id]||{}; return !!oo.checked_in&&!oo.checked_out;
    });
  };

  return (
    <div className="space-y-6 py-2">
      {toast&&(
        <div className={`fixed top-5 right-5 z-[9999] px-5 py-3 rounded-2xl text-sm font-bold shadow-xl ${toast.type==='success'?'bg-[#372C2E] text-[#DE9E48]':'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="relative overflow-hidden bg-[#372C2E] rounded-[2rem] px-6 py-6 shadow-2xl shadow-[#372C2E]/20">
        <div className="absolute -top-4 -right-4 text-8xl opacity-[0.05] rotate-12 select-none">🐾</div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex items-center gap-4">
            <div className="bg-[#DE9E48] p-3.5 rounded-2xl shadow-lg shrink-0"><CalendarDays size={24} className="text-[#372C2E]"/></div>
            <div>
              <p className="text-[#DE9E48] text-[10px] font-black uppercase tracking-[0.25em] mb-0.5">Admin · Daily Operations</p>
              <h2 className="text-2xl font-black text-white tracking-tight">เช็คอิน / เช็คเอ้าท์ & เล่น</h2>
              <p className="text-white/40 text-xs mt-0.5">แสดงเฉพาะห้องที่ใกล้เช็คอิน/เอ้าท์ วันนี้และพรุ่งนี้</p>
            </div>
          </div>
          <div className="md:ml-auto flex items-center gap-3">
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              className="bg-white/10 border border-white/20 text-white font-bold text-sm rounded-2xl px-4 py-2.5 outline-none focus:border-[#DE9E48] transition-all cursor-pointer"
              style={{colorScheme:'dark'}}/>
            <button onClick={fetchData} className="p-2.5 bg-white/10 border border-white/20 rounded-2xl text-white/70 hover:text-white transition-all hover:bg-white/20">
              <RefreshCw size={16}/>
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      {!loading&&bookings.length>0&&(()=>{
        const md=bookings.filter(b=>playMap[b.id]?.morning).length;
        const ed=bookings.filter(b=>playMap[b.id]?.evening).length;
        return(
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {label:'รายการวันนี้',icon:<PawPrint size={18}/>,val:bookings.length,color:'#885E43',bg:'#f5e6d8'},
              {label:'เช็คอินแล้ว',icon:<LogIn size={18}/>,val:Object.values(opsMap).filter(o=>o.checked_in).length,color:'#4a7a46',bg:'#eaf4e9'},
              {label:'เล่นรอบเช้า',icon:<Sun size={18}/>,val:`${md}/${bookings.length}`,color:'#d97706',bg:'#fef3c7'},
              {label:'เล่นรอบเย็น',icon:<Moon size={18}/>,val:`${ed}/${bookings.length}`,color:'#6366f1',bg:'#ede9fe'},
            ].map(s=>(
              <div key={s.label} className="bg-white rounded-[1.5rem] border border-[#efebe9] px-4 py-4 text-center shadow-sm">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2" style={{background:s.bg,color:s.color}}>{s.icon}</div>
                <p className="text-2xl font-black" style={{color:s.color}}>{s.val}</p>
                <p className="text-[10px] font-bold text-[#A1887F] uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Content */}
      {loading?(
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-[#A1887F]"/></div>
      ):bookings.length===0?(
        <div className="text-center py-20 bg-white rounded-[2rem] border border-[#efebe9]">
          <div className="text-5xl mb-3 opacity-30">🐾</div>
          <p className="text-[#A1887F] font-bold text-sm">ไม่มีรายการเช็คอิน/เช็คเอ้าท์ที่ใกล้ถึงในวันนี้หรือพรุ่งนี้</p>
          <p className="text-[#C4A99A] text-xs mt-1">เปลี่ยนวันที่เพื่อดูวันอื่น</p>
        </div>
      ):(
        <div className="space-y-4">
          {bookings.map(b=>{
            const ops=opsMap[b.id]||{};
            const plays=playMap[b.id]||{morning:null,evening:null};
            const rc=ROOM_COLOR[b.room_type]||'#885E43';
            const isSaving=saving[b.id];
            const isCI=!!ops.checked_in;
            const isCO=!!ops.checked_out;
            const mp=plays.morning;
            const ep=plays.evening;
            const reason=getDisplayReason(b,ops,date);
            const neighbors=getNeighbors(b);
            const borderColor=isCI?'#bfdbfe':reason==='checkout'?'#fecaca':'#fde68a';

            return(
              <div key={b.id} className="bg-white rounded-[2rem] border overflow-hidden shadow-sm" style={{borderColor}}>

                {/* Card header */}
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border"
                      style={{background:rc+'18',borderColor:rc+'40',color:rc}}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{background:rc}}/>
                      {b.room_type}
                    </span>
                    {isCI&&<span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">● อยู่ระหว่างเข้าพัก</span>}
                    {(reason==='checkin'||reason==='both')&&(
                      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                        <AlarmClock size={10}/>{b.start_date===date?'เช็คอินวันนี้':'เช็คอินพรุ่งนี้'}
                      </span>
                    )}
                    {(reason==='checkout'||reason==='both')&&(
                      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                        <ArrowRightCircle size={10}/>{b.end_date===date?'เช็คเอ้าท์วันนี้':'เช็คเอ้าท์พรุ่งนี้'}
                      </span>
                    )}
                  </div>
                  <p className="font-black text-[#372C2E] text-base leading-tight">{b.customer_name||'ไม่ระบุ'}</p>
                  <p className="text-sm font-bold text-[#885E43] mt-0.5">🐱 {b.cat_names||'ไม่ระบุ'}</p>
                  <p className="text-[11px] text-[#A1887F] mt-1">{fmtDate(b.start_date)} → {fmtDate(b.end_date)}</p>
                </div>

                {/* Section 1: Check-in / Check-out */}
                <div className="mx-5 mb-4 rounded-2xl border border-[#efebe9] overflow-hidden">
                  <div className="px-4 py-2 bg-[#FDFBFA] border-b border-[#efebe9]">
                    <p className="text-[10px] font-black text-[#A1887F] uppercase tracking-widest">เช็คอิน / เช็คเอ้าท์</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#efebe9]">
                    {/* CHECK-IN */}
                    <div className="px-4 py-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <LogIn size={16} className={isCI?'text-green-500':'text-[#C4A99A]'}/>
                          <span className="text-sm font-black text-[#372C2E]">เช็คอิน</span>
                        </div>
                        <button onClick={()=>toggleCheckin(b)} disabled={isSaving}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all active:scale-95 disabled:opacity-50 ${isCI?'bg-green-50 text-green-600 border-green-200 hover:bg-green-100':'bg-[#F5F2F0] text-[#A1887F] border-[#efebe9] hover:border-[#885E43] hover:text-[#885E43]'}`}>
                          {isCI?<CheckCircle2 size={13}/>:<Circle size={13}/>}
                          {isCI?'เช็คอินแล้ว':'ยังไม่เช็คอิน'}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={13} className="text-[#C4A99A] shrink-0"/>
                        <span className="text-[11px] text-[#A1887F] font-bold whitespace-nowrap">เวลาเช็คอิน</span>
                        <input type="time" value={ops.checkin_time||''}
                          onChange={e=>updateTime(b.id,'checkin_time',e.target.value)}
                          className="flex-1 min-w-0 bg-[#FDFBFA] border border-[#efebe9] rounded-xl px-2 py-1.5 text-sm font-bold text-[#372C2E] outline-none focus:border-[#885E43] transition-all"/>
                        <button onClick={()=>updateTime(b.id,'checkin_time',nowTime())}
                          className="text-[10px] font-black px-2 py-1.5 rounded-lg bg-[#F5EEE8] text-[#885E43] hover:bg-[#e8d9cc] transition-all whitespace-nowrap">ตอนนี้</button>
                      </div>
                    </div>
                    {/* CHECK-OUT */}
                    <div className="px-4 py-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <LogOut size={16} className={isCO?'text-blue-500':'text-[#C4A99A]'}/>
                          <span className="text-sm font-black text-[#372C2E]">เช็คเอ้าท์</span>
                        </div>
                        <button onClick={()=>toggleCheckout(b)} disabled={isSaving}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all active:scale-95 disabled:opacity-50 ${isCO?'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100':'bg-[#F5F2F0] text-[#A1887F] border-[#efebe9] hover:border-[#885E43] hover:text-[#885E43]'}`}>
                          {isCO?<CheckCircle2 size={13}/>:<Circle size={13}/>}
                          {isCO?'เช็คเอ้าท์แล้ว':'ยังไม่เช็คเอ้าท์'}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={13} className="text-[#C4A99A] shrink-0"/>
                        <span className="text-[11px] text-[#A1887F] font-bold whitespace-nowrap">เวลาเช็คเอ้าท์</span>
                        <input type="time" value={ops.checkout_time||''}
                          onChange={e=>updateTime(b.id,'checkout_time',e.target.value)}
                          className="flex-1 min-w-0 bg-[#FDFBFA] border border-[#efebe9] rounded-xl px-2 py-1.5 text-sm font-bold text-[#372C2E] outline-none focus:border-[#885E43] transition-all"/>
                        <button onClick={()=>updateTime(b.id,'checkout_time',nowTime())}
                          className="text-[10px] font-black px-2 py-1.5 rounded-lg bg-[#F5EEE8] text-[#885E43] hover:bg-[#e8d9cc] transition-all whitespace-nowrap">ตอนนี้</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: ห้องข้างเคียง (โชว์เฉพาะเมื่อเช็คอินแล้ว) */}
                {isCI&&neighbors.length>0&&(
                  <div className="mx-5 mb-4 rounded-2xl border border-[#efebe9] overflow-hidden">
                    <div className="px-4 py-2 bg-[#FDFBFA] border-b border-[#efebe9] flex items-center gap-2">
                      <Home size={13} className="text-[#885E43]"/>
                      <p className="text-[10px] font-black text-[#A1887F] uppercase tracking-widest">ห้องข้างเคียงที่กำลังเข้าพัก</p>
                    </div>
                    <div className="divide-y divide-[#f5f0ec]">
                      {neighbors.map(nb=>{
                        const nc=ROOM_COLOR[nb.room_type]||'#885E43';
                        return(
                          <div key={nb.id} className="px-4 py-3 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base" style={{background:nc+'18'}}>🏠</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black" style={{color:nc}}>{nb.room_type}</span>
                                <span className="text-[11px] font-bold text-[#885E43]">{nb.customer_name}</span>
                              </div>
                              <p className="text-[11px] text-[#A1887F] truncate">🐱 {nb.cat_names||'ไม่ระบุ'}</p>
                            </div>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 shrink-0">● เข้าพักอยู่</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section 3: รอบปล่อยเล่น (เช้า / เย็น) */}
                <div className="mx-5 mb-5 rounded-2xl border border-[#efebe9] overflow-hidden">
                  <div className="px-4 py-2 bg-[#FDFBFA] border-b border-[#efebe9] flex items-center gap-2">
                    <PawPrint size={13} className="text-[#885E43]"/>
                    <p className="text-[10px] font-black text-[#A1887F] uppercase tracking-widest">รอบปล่อยเล่น</p>
                    <span className="ml-auto text-[10px] font-black text-[#A1887F]">
                      {(mp?1:0)+(ep?1:0)}/2 รอบ
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#efebe9]">
                    {[
                      {session:'morning',label:'รอบเช้า',icon:<Sun size={15}/>,color:'#d97706',bg:'#fef3c7',border:'#fde68a',activeBg:'#fffbeb',row:mp},
                      {session:'evening',label:'รอบเย็น',icon:<Moon size={15}/>,color:'#6366f1',bg:'#ede9fe',border:'#c4b5fd',activeBg:'#f5f3ff',row:ep},
                    ].map(({session,label,icon,color,bg,border,activeBg,row})=>{
                      const done=!!row;
                      const out=done&&!row.returned_at;
                      const back=done&&!!row.returned_at;
                      const sk=`play_${b.id}_${session}`;
                      const sp=saving[sk];
                      return(
                        <div key={session} className="px-4 py-4 flex flex-col gap-3" style={{background:done?activeBg:'transparent'}}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2" style={{color}}>
                              {icon}
                              <span className="text-sm font-black text-[#372C2E]">{label}</span>
                            </div>
                            <button onClick={()=>togglePlaySession(b.id,b.cat_names,session)} disabled={sp}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all active:scale-95 disabled:opacity-50"
                              style={done?{background:bg,color,borderColor:border}:{background:'#F5F2F0',color:'#A1887F',borderColor:'#efebe9'}}>
                              {sp?<Loader2 size={12} className="animate-spin"/>:done?<CheckCircle2 size={13}/>:<Circle size={13}/>}
                              {done?'ปล่อยเล่นแล้ว':'ยังไม่ได้ปล่อย'}
                            </button>
                          </div>
                          {done&&(
                            <div className="rounded-xl border px-3 py-2.5 flex items-center justify-between gap-2 flex-wrap"
                              style={{borderColor:border,background:bg+'55'}}>
                              <div>
                                <p className="text-[11px] font-bold text-[#372C2E]">🐱 {row.cat_names}</p>
                                <p className="text-[11px] text-[#A1887F] mt-0.5">
                                  🐾 ออก <span className="font-black" style={{color}}>{row.released_at}</span>
                                  {back&&<> · 🏠 กลับ <span className="font-black text-green-600">{row.returned_at}</span></>}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {out&&(
                                  <button onClick={()=>returnCat(row.id)}
                                    className="text-[11px] font-black px-2.5 py-1.5 rounded-xl bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-all">
                                    กลับแล้ว
                                  </button>
                                )}
                                {back&&<span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-100">✓ กลับแล้ว</span>}
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
      )}
    </div>
  );
}
