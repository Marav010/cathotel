import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Navbar from './components/Navbar';
import BookingForm from './components/BookingForm';
import CalendarView from './components/CalendarView';
import HistoryTable from './components/HistoryTable';
import ReportSummary from './components/ReportSummary';
import CustomerDatabase from './components/CustomerDatabase';
import DailyOps from './components/DailyOps';
import PlayTracker from './components/PlayTracker';
import UserHome from './components/UserHome';
import UserCalendar from './components/UserCalendar';
import UserNavbar from './components/UserNavbar';
import AIAssistant from './components/AIAssistant';
import AdminShop from './components/AdminShop';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

const IS_ADMIN_DOMAIN = window.location.hostname.includes('admin');

function App() {
  const [session, setSession]         = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab]     = useState('calendar');
  const [preSelectedDate, setPreSelectedDate] = useState('');
  const [viewMode, setViewMode]       = useState(IS_ADMIN_DOMAIN ? 'login' : 'user');
  const [userTab, setUserTab]         = useState('home');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError]   = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setViewMode('admin');
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setViewMode(session ? 'admin' : IS_ADMIN_DOMAIN ? 'login' : 'user');
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleDateClick = (date) => { setPreSelectedDate(date); setActiveTab('booking'); };
  const handleLogin = async (e) => {
    e.preventDefault(); setLoginError(''); setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setLoginError('อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่');
    setLoginLoading(false);
  };
  const handleLogout = () => supabase.auth.signOut();

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#F5F2F0]">
      <div className="flex flex-col items-center gap-4">
        <style>{`@keyframes catBounce{0%,100%{transform:translateY(0) rotate(-5deg)}50%{transform:translateY(-12px) rotate(5deg)}}`}</style>
        <div style={{ animation: 'catBounce 1.4s ease-in-out infinite', fontSize: '3rem' }}>🐱</div>
        <p className="text-[#A1887F] font-bold text-xs tracking-widest uppercase">กำลังโหลด...</p>
      </div>
    </div>
  );

  if (viewMode === 'user') return (
    <div className="min-h-screen bg-[#F5F2F0]">
      <UserNavbar activeTab={userTab} setActiveTab={setUserTab} />
      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {userTab === 'home'     && <UserHome />}
        {userTab === 'calendar' && <UserCalendar />}
      </main>
      <footer className="py-10 text-center text-[#A1887F] text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">© 2024 Jingjai Cat Hotel.</footer>
    </div>
  );

  if (viewMode === 'login') return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F2F0] p-4 relative overflow-hidden">
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-[#DE9E48] opacity-[0.08] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-[#885E43] opacity-[0.06] rounded-full blur-3xl pointer-events-none" />
      <div className="jj-modal-pop bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl shadow-[#372C2E]/10 border border-[#DBD0C5] overflow-hidden relative z-10">
        <div className="bg-[#372C2E] px-8 pt-8 pb-6 text-center relative overflow-hidden">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#DE9E48] mx-auto mb-4 shadow-lg">
            <img src="/img/JingJai-Cat-Hotel-final1.jpg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-lg font-black text-white tracking-tight">JINGJAI CAT HOTEL</h1>
          <p className="text-[#DE9E48] text-[11px] font-bold mt-1 uppercase tracking-widest">Admin Portal</p>
        </div>
        <form onSubmit={handleLogin} className="px-8 py-7 space-y-4">
          <div>
            <label className="jj-label">อีเมล</label>
            <input type="email" required placeholder="admin@jingjai.com" value={email} onChange={e => setEmail(e.target.value)} className="jj-input" />
          </div>
          <div>
            <label className="jj-label">รหัสผ่าน</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="jj-input pr-11" />
              <button type="button" tabIndex={-1} onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1887F] hover:text-[#885E43] transition-colors">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {loginError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <AlertCircle size={14} className="text-red-500 shrink-0" />
              <p className="text-xs font-bold text-red-600">{loginError}</p>
            </div>
          )}
          <button type="submit" disabled={loginLoading}
            className="w-full py-4 rounded-2xl font-black text-white text-sm transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #885E43 0%, #372C2E 100%)' }}>
            {loginLoading ? <><Loader2 size={16} className="animate-spin" /> กำลังเข้าสู่ระบบ...</> : 'เข้าสู่ระบบ'}
          </button>
          <p className="text-center text-[#C4A99A] text-[10px] font-bold pt-1">© 2024 Jingjai Cat Hotel.</p>
        </form>
        <div className="px-8 pb-7 -mt-2">
          <button type="button" onClick={() => window.location.href = 'https://jingjaicathotel.vercel.app'}
            className="w-full text-[10px] font-black text-[#A1887F] hover:text-[#372C2E] uppercase tracking-widest transition-colors py-2">
            ← กลับสู่หน้าเว็บไซต์หลัก
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F2F0]">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="bg-white rounded-[3rem] shadow-xl shadow-[#372C2E]/5 border border-[#DBD0C5] p-4 md:p-10 min-h-[700px]">
          {activeTab === 'calendar'    && <CalendarView onDateClick={handleDateClick} />}
          {activeTab === 'booking'     && <BookingForm initialDate={preSelectedDate} onSaved={() => { setPreSelectedDate(''); setActiveTab('calendar'); }} />}
          {activeTab === 'dailyops'    && <DailyOps />}
          {activeTab === 'playtracker' && <PlayTracker />}
          {activeTab === 'history'     && <HistoryTable />}
          {activeTab === 'customers'   && <CustomerDatabase />}
          {activeTab === 'shop'        && <AdminShop />}
          {activeTab === 'report'      && <ReportSummary />}
          {activeTab === 'ai'          && <AIAssistant />}
        </div>
      </main>
    </div>
  );
}

export default App;
