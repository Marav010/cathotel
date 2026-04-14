import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PawPrint, Sun, Moon, CheckCircle2, Circle, CalendarDays, RefreshCw, Loader2 } from 'lucide-react';

const todayStr = () => new Date().toLocaleDateString('sv-SE');
const addDays  = (ds, n) => { const d = new Date(ds); d.setDate(d.getDate()+n); return d.toLocaleDateString('sv-SE'); };
const nowTime  = () => new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',hour12:false});

const ROOM_COLOR = {
  'สแตนดาร์ด':'#C39A7A','ดีลักซ์':'#ad6ea8','ซูพีเรีย':'#d98a8a',
  'พรีเมี่ยม':'#368daf','วีไอพี':'#4a7a46','วีวีไอพี':'#7a6a5a',
};

export default function PlayTracker() {
  const [date,setDate]     = useState(todayStr());
  const [bookings,setBookings] = useState([]);   // bookings ที่กำลังพักอยู่วันนี้
  const [playMap,setPlayMap]   = useState({});   // booking_id → {morning,evening}
  const [loading,setLoading]   = useState(true);
  const [toast,setToast]       = useState(null);
  const [saving,setSaving]     = useState({});

  const fetchData = async () => {
    setLoading(true);
    // bookings ที่ start_date ≤ date ≤ end_date (กำลังเข้าพักอยู่)
    const {data:bData} = await supabase
      .from('bookings').select('*')
      .lte('start_date', date).gte('end_date', date)
      .order('room_type');

    setBookings(bData||[]);
    if(!bData?.length){setLoading(false);return;}
    const ids = bData.map(b=>b.id);

    const {data:pData} = await supabase
      .from('booking_playtime').select('*')
      .in('booking_id',ids).eq('play_date',date).order('released_at');

    const pm={};
    ids.forEach(id=>{ pm[id]={morning:null,evening:null}; });
    (pData||[]).forEach(p=>{
      if(!pm[p.booking_id]) pm[p.booking_id]={morning:null,evening:null};
      if(p.session==='morning')      pm[p.booking_id].morning=p;
      else if(p.session==='evening') pm[p.booking_id].evening=p;
      else if(!pm[p.booking_id].morning) pm[p.booking_id].morning=p;
      else if(!pm[p.booking_id].evening) pm[p.booking_id].evening=p;
    });
    setPlayMap(pm);
    setLoading(false);
  };

  useEffect(()=>{ fetchData(); },[date]);

  const showToast=(type,msg)=>{ setToast({type,msg}); setTimeout(()=>setToast(null),3000); };

  const togglePlay=async(bookingId,catNames,session)=>{
    const key=`${bookingId}_${session}`;
    setSaving(s=>({...s,[key]:true}));
    const ex=playMap[bookingId]?.[session];
    if(ex){
      const {error}=await supabase.from('booking_playtime').delete().eq('id',ex.id);
      if(error) showToast('error','ลบไม่สำเร็จ');
      else { showToast('success','ยกเลิกรอบเล่น'); await fetchData(); }
    } else {
      const {error}=await supabase.from('booking_playtime').insert({
        booking_id:bookingId, play_date:date, cat_names:catNames,
        session, released_at:nowTime(), returned_at:null,
      });
      if(error) showToast('error','บันทึกไม่สำเร็จ');
      else { showToast('success',session==='morning'?'รอบเช้าแล้ว 🌅':'รอบเย็นแล้ว 🌙'); await fetchData(); }
    }
    setSaving(s=>({...s,[key]:false}));
  };

  const returnCat=async(playId)=>{
    const {error}=await supabase.from('booking_playtime').update({returned_at:nowTime()}).eq('id',playId);
    if(error) showToast('error','บันทึกไม่สำเร็จ');
    else { showToast('success','บันทึกกลับแล้ว ✓'); await fetchData(); }
  };

  const morningTotal = bookings.filter(b=>playMap[b.id]?.morning).length;
  const eveningTotal = bookings.filter(b=>playMap[b.id]?.evening).length;
  const allMorning   = bookings.length > 0 && morningTotal === bookings.length;
  const allEvening   = bookings.length > 0 && eveningTotal === bookings.length;

  return (
    <div className="space-y-6 py-2">
      {toast&&(
        <div className={`fixed top-5 right-5 z-[9999] px-5 py-3 rounded-2xl text-sm font-bold shadow-xl ${toast.type==='success'?'bg-[#372C2E] text-[#DE9E48]':'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#372C2E] to-[#4a3530] rounded-[2rem] px-6 py-6 shadow-2xl">
        <div className="absolute -top-4 -right-4 text-8xl opacity-[0.05] rotate-12 select-none">🐾</div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex items-center gap-4">
            <div className="bg-[#DE9E48] p-3.5 rounded-2xl shadow-lg shrink-0"><PawPrint size={24} className="text-[#372C2E]"/></div>
            <div>
              <p className="text-[#DE9E48] text-[10px] font-black uppercase tracking-[0.25em] mb-0.5">Admin · Play Tracker</p>
              <h2 className="text-2xl font-black text-white tracking-tight">ติดตามรอบปล่อยเล่น</h2>
              <p className="text-white/40 text-xs mt-0.5">เช็คว่าแมวห้องไหนได้เล่นรอบเช้า/เย็นแล้วบ้าง</p>
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

      {/* Progress summary */}
      {!loading&&bookings.length>0&&(
        <div className="grid grid-cols-2 gap-4">
          {/* Morning card */}
          <div className={`rounded-[1.5rem] border-2 p-5 shadow-sm transition-all ${allMorning?'bg-amber-50 border-amber-300':'bg-white border-[#efebe9]'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${allMorning?'bg-amber-400':'bg-amber-100'}`}>
                <Sun size={20} className={allMorning?'text-white':'text-amber-500'}/>
              </div>
              <div>
                <p className="text-xs font-black text-[#372C2E] uppercase tracking-wider">รอบเช้า</p>
                <p className="text-[11px] text-[#A1887F]">Morning Session</p>
              </div>
              {allMorning&&<span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-white">✓ ครบทุกห้อง</span>}
            </div>
            {/* progress bar */}
            <div className="h-2 bg-amber-100 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-amber-400 rounded-full transition-all duration-500"
                style={{width:`${bookings.length?morningTotal/bookings.length*100:0}%`}}/>
            </div>
            <p className="text-sm font-black text-amber-600">{morningTotal} / {bookings.length} ห้อง</p>
          </div>

          {/* Evening card */}
          <div className={`rounded-[1.5rem] border-2 p-5 shadow-sm transition-all ${allEvening?'bg-indigo-50 border-indigo-300':'bg-white border-[#efebe9]'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${allEvening?'bg-indigo-500':'bg-indigo-100'}`}>
                <Moon size={20} className={allEvening?'text-white':'text-indigo-500'}/>
              </div>
              <div>
                <p className="text-xs font-black text-[#372C2E] uppercase tracking-wider">รอบเย็น</p>
                <p className="text-[11px] text-[#A1887F]">Evening Session</p>
              </div>
              {allEvening&&<span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500 text-white">✓ ครบทุกห้อง</span>}
            </div>
            <div className="h-2 bg-indigo-100 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{width:`${bookings.length?eveningTotal/bookings.length*100:0}%`}}/>
            </div>
            <p className="text-sm font-black text-indigo-600">{eveningTotal} / {bookings.length} ห้อง</p>
          </div>
        </div>
      )}

      {/* Room grid */}
      {loading?(
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-[#A1887F]"/></div>
      ):bookings.length===0?(
        <div className="text-center py-20 bg-white rounded-[2rem] border border-[#efebe9]">
          <div className="text-5xl mb-3 opacity-30">🐾</div>
          <p className="text-[#A1887F] font-bold text-sm">ไม่มีแมวเข้าพักในวันที่เลือก</p>
        </div>
      ):(
        <div className="bg-white rounded-[2rem] border border-[#efebe9] overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_90px_90px] bg-[#F5F2F0] border-b border-[#efebe9] px-5 py-3">
            <span className="text-[10px] font-black text-[#A1887F] uppercase tracking-widest">ห้อง / แมว</span>
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest text-center flex items-center justify-center gap-1"><Sun size={11}/>เช้า</span>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center flex items-center justify-center gap-1"><Moon size={11}/>เย็น</span>
          </div>

          <div className="divide-y divide-[#f5f0ec]">
            {bookings.map(b=>{
              const rc=ROOM_COLOR[b.room_type]||'#885E43';
              const mp=playMap[b.id]?.morning;
              const ep=playMap[b.id]?.evening;

              return(
                <div key={b.id} className="grid grid-cols-[1fr_90px_90px] items-center px-5 py-3.5 hover:bg-[#FDFBFA] transition-colors">
                  {/* Room info */}
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black"
                        style={{background:rc+'18',color:rc}}>
                        <span className="w-1 h-1 rounded-full" style={{background:rc}}/>
                        {b.room_type}
                      </span>
                    </div>
                    <p className="text-sm font-black text-[#372C2E] truncate">{b.customer_name}</p>
                    <p className="text-[11px] text-[#885E43] truncate">🐱 {b.cat_names}</p>
                  </div>

                  {/* Morning toggle */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={()=>togglePlay(b.id,b.cat_names,'morning')}
                      disabled={saving[`${b.id}_morning`]}
                      className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-90 disabled:opacity-50 ${mp?'bg-amber-400 border-amber-400':'bg-white border-[#efebe9] hover:border-amber-300'}`}>
                      {saving[`${b.id}_morning`]
                        ?<Loader2 size={14} className="animate-spin text-amber-500"/>
                        :mp?<CheckCircle2 size={16} className="text-white"/>:<Circle size={16} className="text-[#C4A99A]"/>
                      }
                    </button>
                    {mp&&(
                      <div className="text-center">
                        <p className="text-[9px] font-black text-amber-600">{mp.released_at}</p>
                        {mp.returned_at
                          ?<p className="text-[9px] font-black text-green-600">↩ {mp.returned_at}</p>
                          :<button onClick={()=>returnCat(mp.id)} className="text-[9px] font-black text-green-600 hover:underline">กลับแล้ว?</button>
                        }
                      </div>
                    )}
                  </div>

                  {/* Evening toggle */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={()=>togglePlay(b.id,b.cat_names,'evening')}
                      disabled={saving[`${b.id}_evening`]}
                      className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-90 disabled:opacity-50 ${ep?'bg-indigo-500 border-indigo-500':'bg-white border-[#efebe9] hover:border-indigo-300'}`}>
                      {saving[`${b.id}_evening`]
                        ?<Loader2 size={14} className="animate-spin text-indigo-500"/>
                        :ep?<CheckCircle2 size={16} className="text-white"/>:<Circle size={16} className="text-[#C4A99A]"/>
                      }
                    </button>
                    {ep&&(
                      <div className="text-center">
                        <p className="text-[9px] font-black text-indigo-600">{ep.released_at}</p>
                        {ep.returned_at
                          ?<p className="text-[9px] font-black text-green-600">↩ {ep.returned_at}</p>
                          :<button onClick={()=>returnCat(ep.id)} className="text-[9px] font-black text-green-600 hover:underline">กลับแล้ว?</button>
                        }
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
