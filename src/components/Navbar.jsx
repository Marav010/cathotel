import { Calendar, PlusCircle, History, BarChart3, LogOut, Users, PawPrint, Sparkles, ShoppingBag } from 'lucide-react';
import NavNotif from './NavNotif';

export default function Navbar({ activeTab, setActiveTab, onLogout }) {
  const menus = [
    { id: 'calendar',    label: 'ปฏิทินการจอง', icon: <Calendar size={17} /> },
    { id: 'booking',     label: 'จองห้องพัก',    icon: <PlusCircle size={17} /> },
    { id: 'playtracker', label: 'รอบปล่อยเล่น',  icon: <PawPrint size={17} /> },
    { id: 'history',     label: 'ประวัติการจอง',  icon: <History size={17} /> },
    { id: 'customers',   label: 'ข้อมูลลูกค้า',   icon: <Users size={17} /> },
    { id: 'shop',        label: 'จัดการร้านค้า',  icon: <ShoppingBag size={17} /> },
    { id: 'report',      label: 'รายงานสรุป',     icon: <BarChart3 size={17} /> },
    { id: 'ai',          label: 'AI ผู้ช่วย',     icon: <Sparkles size={17} />, special: true },
  ];

  return (
    <nav className="bg-[#FDFBFA] border-b border-[#DBD0C5] sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">

        {/* Left: Logo + nav items */}
        <div className="flex items-center gap-4 min-w-0">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden border-2 border-[#DBD0C5] bg-white shadow-sm shrink-0">
              <img src="/img/JingJai-Cat-Hotel-final1.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-base font-black tracking-tight hidden xl:block uppercase text-[#372C2E]">โรงแรมแมวจริงใจ</span>
          </div>

          {/* Nav items */}
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
            {menus.map((m) => (
              <button key={m.id} onClick={() => setActiveTab(m.id)}
                className={`flex items-center gap-1.5 px-2.5 md:px-3 py-2 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap shrink-0 ${
                  m.special
                    ? activeTab === m.id
                      ? 'bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-white shadow-md'
                      : 'text-[#7c3aed] hover:bg-purple-50 border border-purple-200'
                    : activeTab === m.id
                    ? 'bg-[#885E43] text-white shadow-md shadow-[#885E43]/20'
                    : 'text-[#A1887F] hover:bg-[#F5F2F0] hover:text-[#372C2E]'
                }`}>
                <span className={
                  activeTab === m.id
                    ? m.special ? 'text-white' : 'text-[#DE9E48]'
                    : m.special ? 'text-[#7c3aed]' : ''
                }>{m.icon}</span>
                <span className="hidden lg:inline">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Notification bell + Logout */}
        <div className="flex items-center gap-1.5 shrink-0 ml-3">
          {/* 🔔 Notification dropdown — เช็คอิน/เช็คเอ้าท์ */}
          <NavNotif />

          {/* Logout */}
          <button onClick={onLogout}
            className="p-2.5 text-[#A1887F] hover:text-[#b71c1c] hover:bg-red-50 rounded-2xl transition-all active:scale-90"
            title="ออกจากระบบ">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}
