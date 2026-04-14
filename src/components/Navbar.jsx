import { Calendar, PlusCircle, History, BarChart3, LogOut, Users, ClipboardCheck, PawPrint } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onLogout }) {
  const menus = [
    { id: 'calendar',    label: 'ปฏิทินการจอง',        icon: <Calendar size={18} /> },
    { id: 'booking',     label: 'จองห้องพัก',            icon: <PlusCircle size={18} /> },
    { id: 'dailyops',   label: 'เช็คอิน/เช็คเอ้าท์',    icon: <ClipboardCheck size={18} /> },
    { id: 'playtracker', label: 'รอบปล่อยเล่น',          icon: <PawPrint size={18} /> },
    { id: 'history',     label: 'ประวัติการจอง',          icon: <History size={18} /> },
    { id: 'customers',   label: 'ข้อมูลลูกค้า',           icon: <Users size={18} /> },
    { id: 'report',      label: 'รายงานสรุป',             icon: <BarChart3 size={18} /> },
  ];

  return (
    <nav className="bg-[#FDFBFA] border-b border-[#DBD0C5] sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-[#DBD0C5] bg-white shadow-sm">
              <img src="/img/JingJai-Cat-Hotel-final1.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-black tracking-tight hidden xl:block uppercase text-[#372C2E]">โรงแรมแมวจริงใจ</span>
          </div>
          {/* Nav items */}
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
            {menus.map((m) => (
              <button key={m.id} onClick={() => setActiveTab(m.id)}
                className={`flex items-center gap-1.5 px-2.5 md:px-3 py-2 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap shrink-0 ${
                  activeTab === m.id
                    ? 'bg-[#885E43] text-white shadow-md shadow-[#885E43]/20'
                    : 'text-[#A1887F] hover:bg-[#F5F2F0] hover:text-[#372C2E]'
                }`}>
                <span className={activeTab === m.id ? 'text-[#DE9E48]' : ''}>{m.icon}</span>
                <span className="hidden lg:inline">{m.label}</span>
              </button>
            ))}
          </div>
        </div>
        <button onClick={onLogout}
          className="p-2 text-[#A1887F] hover:text-[#b71c1c] hover:bg-red-50 rounded-full transition-all active:scale-90 shrink-0 ml-2"
          title="ออกจากระบบ">
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  );
}
