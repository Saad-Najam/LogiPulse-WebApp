import React from 'react'
import { LayoutDashboard, PlusCircle, MapPin, MessageSquare, LogOut, type LucideIcon } from 'lucide-react'
import { CustomerPageView } from '../../types'
import { useApp } from '../../context/AppContext'

interface CustomerSidebarProps {
  collapsed?: boolean
}

export const CustomerSidebar: React.FC<CustomerSidebarProps> = ({ collapsed = false }) => {
  const { customerView, setCustomerView, currentUser, logout } = useApp()

  const navItems: { id: CustomerPageView; label: string; icon: LucideIcon }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new-order', label: 'New Delivery', icon: PlusCircle },
    { id: 'tracking', label: 'Live Tracking', icon: MapPin },
    { id: 'chat', label: 'Rider Chat', icon: MessageSquare },
  ]

  if (collapsed) {
    return (
      <aside className="w-[48px] h-screen bg-[#2f4436] border-r border-[rgba(255,255,255,0.08)] flex flex-col items-center py-3 flex-shrink-0 select-none justify-between">
        <div className="flex flex-col items-center gap-4 w-full">
          <div
            onClick={() => setCustomerView('dashboard')}
            className="w-7 h-7 rounded-[5px] bg-[#2f5640] flex items-center justify-center cursor-pointer"
            title="LogiPulse"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ecebe1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#ecebe1" />
            </svg>
          </div>
          <div className="w-6 h-[1px] bg-[rgba(255,255,255,0.10)] my-1" />
          <nav className="flex flex-col items-center gap-2 w-full">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = customerView === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setCustomerView(item.id)}
                  title={item.label}
                  className={`w-9 h-9 rounded-[6px] flex items-center justify-center transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[rgba(255,255,255,0.10)] text-[#ecebe1]'
                      : 'text-[rgba(236,235,225,0.55)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#ecebe1]'
                  }`}
                >
                  <Icon size={16} />
                </button>
              )
            })}
          </nav>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div
            title={currentUser?.name || 'Customer'}
            className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.10)] border border-[rgba(255,255,255,0.10)] flex items-center justify-center text-[10px] text-[#ecebe1] font-medium"
          >
            TK
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="w-7 h-7 flex items-center justify-center text-[rgba(236,235,225,0.55)] hover:text-[#ecebe1] transition-colors cursor-pointer"
          >
            <LogOut size={14} />
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-[220px] h-screen bg-[#2f4436] border-r border-[rgba(255,255,255,0.08)] flex flex-col justify-between select-none flex-shrink-0">
      <div>
        <div className="px-3.5 py-4 flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-[4px] bg-[#2f5640] flex items-center justify-center flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ecebe1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#ecebe1" />
            </svg>
          </div>
          <span className="text-[15px] font-bold text-[#ecebe1] tracking-tight">LogiPulse</span>
        </div>
        <div className="h-[1px] bg-[rgba(255,255,255,0.10)] mx-3.5 mb-3" />
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = customerView === item.id
            return (
              <button
                key={item.id}
                onClick={() => setCustomerView(item.id)}
                className={`w-full h-[36px] flex items-center pl-3 pr-2.5 text-[13px] font-medium transition-colors cursor-pointer relative ${
                  isActive
                    ? 'bg-[rgba(255,255,255,0.10)] text-[#ecebe1]'
                    : 'text-[rgba(236,235,225,0.55)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#ecebe1]'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#ffd98a]" />
                )}
                <div className="mr-2 text-current flex-shrink-0">
                  <Icon size={16} />
                </div>
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
      <div className="p-3 border-t border-[rgba(255,255,255,0.10)] bg-[#2f4436]">
        <div className="flex items-center gap-2.5">
          <div className="w-[28px] h-[28px] rounded-full bg-[rgba(255,255,255,0.10)] border border-[rgba(255,255,255,0.10)] flex items-center justify-center text-[11px] font-medium text-[#ecebe1] flex-shrink-0">
            TK
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-[#ecebe1] truncate leading-tight">
              {currentUser?.name || 'Tariq Khan'}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] px-1.5 py-0.2 rounded-[3px] border border-[#ffd98a] text-[#ffd98a] leading-none">
                Customer
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="text-[rgba(236,235,225,0.55)] hover:text-[#ecebe1] transition-colors p-1"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
