import React from 'react'
import { LayoutDashboard, Compass, Bike, MessageSquare, LogOut, type LucideIcon } from 'lucide-react'
import { RiderPageView } from '../../types'
import { useApp } from '../../context/AppContext'

export const RiderSidebar: React.FC = () => {
  const { riderView, setRiderView, currentUser, logout, isRiderOnline } = useApp()
  const navItems: { id: RiderPageView; label: string; icon: LucideIcon }[] = [
    { id: 'dashboard', label: 'Rider Console', icon: LayoutDashboard },
    { id: 'nearby', label: 'Nearby Pickups', icon: Compass },
    { id: 'active', label: 'Active Delivery', icon: Bike },
    { id: 'chat', label: 'Customer Chat', icon: MessageSquare },
  ]
  return (
    <aside className="w-[220px] h-screen bg-[#2f4436] border-r border-[rgba(255,255,255,0.08)] flex flex-col justify-between select-none flex-shrink-0">
      <div>
        <div className="px-3.5 py-4 flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-[4px] bg-[#2DB67D] flex items-center justify-center flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#121d17" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#121d17" />
            </svg>
          </div>
          <span className="text-[15px] font-bold text-[#ecebe1] tracking-tight">LogiPulse Rider</span>
        </div>
        <div className="h-[1px] bg-[rgba(255,255,255,0.08)] mx-3.5 mb-3" />
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = riderView === item.id
            return (
              <button
                key={item.id}
                onClick={() => setRiderView(item.id)}
                className={`w-full h-[36px] flex items-center pl-3 pr-2.5 text-[13px] font-medium transition-colors cursor-pointer relative ${
                  isActive
                    ? 'bg-[rgba(255,255,255,0.10)] text-[#ecebe1]'
                    : 'text-[rgba(236,235,225,0.55)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#ecebe1]'
                }`}
              >
                {isActive && (<div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#2DB67D]" />)}
                <div className="mr-2 text-current flex-shrink-0"><Icon size={16} /></div>
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
      <div className="p-3 border-t border-[rgba(255,255,255,0.08)] bg-[#2f4436]">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-[28px] h-[28px] rounded-full bg-[rgba(255,255,255,0.10)] border border-[rgba(255,255,255,0.12)] flex items-center justify-center text-[11px] font-medium text-[#ecebe1]">AR</div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-[#2f4436] ${isRiderOnline ? 'bg-[#2DB67D]' : 'bg-[rgba(236,235,225,0.25)]'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-[#ecebe1] truncate leading-tight">{currentUser?.name || 'Ahmed Raza'}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] px-1.5 py-0.2 rounded-[4px] border border-[#2DB67D] text-[#2DB67D] leading-none">Rider</span>
              <span className="text-[11px] font-mono text-[#ffd98a]">★ 4.9</span>
            </div>
          </div>
          <button onClick={logout} title="Sign Out" className="text-[rgba(236,235,225,0.40)] hover:text-[#ecebe1] transition-colors p-1 cursor-pointer">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
