import { Home, CalendarDays, ShieldCheck, ShoppingBag } from 'lucide-react';

export default function UserNavbar({ activeTab, setActiveTab }) {
  const menus = [
    { id: 'home',     label: 'หน้าแรก',       icon: <Home size={18} /> },
    { id: 'calendar', label: 'ปฏิทินห้องพัก', icon: <CalendarDays size={18} /> },
  ];

  return (
    <nav className="bg-[#FDFBFA] border-b border-[#DBD0C5] sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 flex justify-between items-center h-16">

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-[#DBD0C5] bg-white shadow-sm flex items-center justify-center">
              <img src="/img/JingJai-Cat-Hotel-final1.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-black tracking-tight hidden lg:block uppercase text-[#372C2E]">
              โรงแรมแมวจริงใจ
            </span>
          </div>

          <div className="flex items-center gap-1">
            {menus.map((m) => (
              <button
                key={m.id}
                onClick={() => setActiveTab(m.id)}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-bold transition-all duration-300 ${
                  activeTab === m.id
                    ? 'bg-[#885E43] text-white shadow-lg shadow-[#885E43]/20'
                    : 'text-[#A1887F] hover:bg-[#F5F2F0] hover:text-[#372C2E]'
                }`}
              >
                <span className={activeTab === m.id ? 'text-[#DE9E48]' : ''}>{m.icon}</span>
                <span className="hidden md:inline">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => window.location.href = 'https://jingjaicathotel-admin.vercel.app'}
          className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-[#372C2E] text-white rounded-full text-xs font-black shadow-lg hover:bg-[#885E43] transition-all"
        >
          <ShieldCheck size={14} /> สำหรับแอดมิน
        </button>
      </div>
    </nav>
  );
}
