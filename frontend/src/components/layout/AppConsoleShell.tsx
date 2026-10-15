import React, { useState } from 'react'
import {
  LayoutDashboard,
  PlusCircle,
  MapPin,
  MessageSquare,
  Compass,
  Bike,
  TableProperties,
  Users,
  AlertTriangle,
  LogOut,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react'
import { Role, CustomerPageView, RiderPageView, AdminPageView } from '../../types'
import { useApp } from '../../context/AppContext'

const FlowerGlyph: React.FC<{ size?: number; color?: string; className?: string }> = ({
  size = 14,
  color = '#ecebe1',
  className = '',
}) => {
  const PETAL_PATH = 'M12 12C9.2 9.6 9.3 4 12 2.6C14.7 4 14.8 9.6 12 12Z'
  return (
    <svg
      className={`mfl-svg ${className}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <g fill={color} stroke={color} strokeWidth="1.6" strokeLinejoin="round">
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <path key={deg} d={PETAL_PATH} transform={`rotate(${deg} 12 12)`} />
        ))}
      </g>
    </svg>
  )
}

interface NavTab<T> {
  id: T
  label: string
  icon: LucideIcon
}

interface AppConsoleShellProps {
  children: React.ReactNode
  onGoToLanding?: () => void
}

export const AppConsoleShell: React.FC<AppConsoleShellProps> = ({ children, onGoToLanding }) => {
  const {
    currentUser,
    login,
    logout,
    customerView,
    setCustomerView,
    riderView,
    setRiderView,
    adminView,
    setAdminView,
  } = useApp()

  const [menuOpen, setMenuOpen] = useState(false)
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false)

  const customerTabs: NavTab<CustomerPageView>[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'new-order', label: 'New Delivery', icon: PlusCircle },
    { id: 'tracking', label: 'Live Tracking', icon: MapPin },
    { id: 'chat', label: 'Rider Chat', icon: MessageSquare },
  ]

  const riderTabs: NavTab<RiderPageView>[] = [
    { id: 'dashboard', label: 'Rider Console', icon: LayoutDashboard },
    { id: 'nearby', label: 'Nearby Pickups', icon: Compass },
    { id: 'active', label: 'Active Delivery', icon: Bike },
    { id: 'chat', label: 'Customer Chat', icon: MessageSquare },
  ]

  const adminTabs: NavTab<AdminPageView>[] = [
    { id: 'overview', label: 'Operations', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders Matrix', icon: TableProperties },
    { id: 'people', label: 'Fleet & Users', icon: Users },
    { id: 'priority', label: 'Priority Engine', icon: AlertTriangle },
  ]

  const role = currentUser?.role || 'customer'

  const getRoleBadge = (r: Role) => {
    switch (r) {
      case 'customer':
        return { label: 'Customer Portal', bg: '#2f5640', color: '#ecebe1' }
      case 'rider':
        return { label: 'Rider Console', bg: '#2DB67D', color: '#141a16' }
      case 'admin':
        return { label: 'Admin Command', bg: '#ffd98a', color: '#141a16' }
      default:
        return { label: 'Portal', bg: '#7f857b', color: '#fff' }
    }
  }

  const handleAdminAccess = () => {
    setRoleSwitcherOpen(false)
    setMenuOpen(false)
    if (currentUser?.role === 'admin') return
    const pass = window.prompt('Admin Verification Required\nEnter Administrator Password:')
    if (!pass) return
    if (pass === 'admin123' || pass === 'admin') {
      login('admin', 'admin@logipulse.com', pass)
    } else {
      alert('Access Denied: Invalid administrator credentials.')
    }
  }

  const roleBadge = getRoleBadge(role)

  return (
    <div
      className="mfl-root min-h-screen w-screen flex flex-col box-border overflow-hidden select-none"
      style={
        {
          '--mfl-frame': '#2f4436',
          '--mfl-paper': '#e5e4da',
          '--mfl-ink': '#141a16',
          '--mfl-muted': '#7f857b',
          '--mfl-brand': '#2f5640',
          '--mfl-night': '#121d17',
          '--mfl-card': '#1c2c22',
          '--mfl-cream': '#ecebe1',
          '--mfl-glow': '#ffd98a',
          padding: '12px 12px 0',
          background: 'var(--mfl-frame)',
        } as React.CSSProperties
      }
    >
      {/* INNER PAPER CONTAINER */}
      <div className="bg-[#e5e4da] rounded-t-[10px] md:rounded-t-[14px] flex-1 flex flex-col overflow-hidden shadow-2xl border border-[rgba(255,255,255,0.08)] relative">
        
        {/* UNIFIED TOP CONSOLE APP BAR */}
        <header className="h-[58px] bg-gradient-to-b from-[#e0dfd4] to-[#e5e4da] border-b border-[rgba(20,26,22,0.12)] px-3.5 md:px-5 flex items-center justify-between flex-shrink-0 z-30 relative shadow-sm">
          
          {/* LEFT: Inspo Logo Pill */}
          <div className="flex items-center gap-2.5">
            <div className="mfl-logo-pill shadow-sm">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (onGoToLanding) onGoToLanding()
                }}
                className="mfl-logo"
                title="Return to Main Marketing Portal"
              >
                <span className="mfl-logo-mark" aria-hidden="true">
                  <FlowerGlyph size={13} color="#ecebe1" />
                </span>
                <span>
                  logipulse<span className="mfl-dot">.</span>
                </span>
              </a>

              {/* Role badge pill */}
              <span
                className="px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-medium tracking-tight uppercase hidden sm:inline-block"
                style={{ backgroundColor: roleBadge.bg, color: roleBadge.color }}
              >
                {roleBadge.label}
              </span>

              {/* Inspo Menu Burger */}
              <button
                type="button"
                className={`mfl-burger ${menuOpen ? 'is-open' : ''}`}
                aria-label="Toggle Navigation Menu"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <i />
                <i />
              </button>
            </div>

            {/* Inspo Dropdown Menu */}
            {menuOpen && (
              <div className="mfl-dropdown z-50 absolute left-4 top-[50px] shadow-2xl">
                <ul>
                  {[
                    { n: '01', label: 'Customer View', action: () => login('customer', 'customer@logipulse.com') },
                    { n: '02', label: 'Rider Console', action: () => login('rider', 'rider@logipulse.com') },
                    { n: '03', label: 'Admin Command (Protected)', action: handleAdminAccess },
                  ].map((item, idx) => (
                    <li key={item.label} style={{ animationDelay: `${idx * 40}ms` }}>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          setMenuOpen(false)
                          item.action()
                        }}
                      >
                        <span className="mfl-dd-n">{item.n}</span>
                        {item.label}
                      </a>
                    </li>
                  ))}
                  <li>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setMenuOpen(false)
                        if (onGoToLanding) {
                          onGoToLanding()
                        }
                      }}
                      className="text-[#ffd98a]"
                    >
                      <span className="mfl-dd-n">04</span>
                      ← LogiPulse Landing Page
                    </a>
                  </li>
                </ul>
                <div className="mfl-dd-foot">
                  <span className="mfl-live" />
                  Karachi fleet synced · Multi-tab active
                </div>
              </div>
            )}
          </div>

          {/* CENTER: Role-Specific Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-[#dcdbd0] p-1 rounded-[6px] border border-[rgba(20,26,22,0.08)]">
            {role === 'customer' &&
              customerTabs.map((tab) => {
                const Icon = tab.icon
                const isActive = customerView === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setCustomerView(tab.id)}
                    className={`h-[32px] px-3 rounded-[4px] text-[12.5px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-[#2f5640] text-white shadow-sm font-semibold'
                        : 'text-[#141a16]/70 hover:text-[#141a16] hover:bg-[rgba(20,26,22,0.05)]'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}

            {role === 'rider' &&
              riderTabs.map((tab) => {
                const Icon = tab.icon
                const isActive = riderView === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setRiderView(tab.id)}
                    className={`h-[32px] px-3 rounded-[4px] text-[12.5px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-[#2DB67D] text-[#141a16] shadow-sm font-semibold'
                        : 'text-[#141a16]/70 hover:text-[#141a16] hover:bg-[rgba(20,26,22,0.05)]'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}

            {role === 'admin' &&
              adminTabs.map((tab) => {
                const Icon = tab.icon
                const isActive = adminView === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setAdminView(tab.id)}
                    className={`h-[32px] px-3 rounded-[4px] text-[12.5px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-[#2f5640] text-[#ffd98a] shadow-sm font-semibold'
                        : 'text-[#141a16]/70 hover:text-[#141a16] hover:bg-[rgba(20,26,22,0.05)]'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
          </nav>

          {/* RIGHT: Status, Quick Switcher & User Profile */}
          <div className="flex items-center gap-2">
            {/* Live Ticker Chip */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-[#fbfaf7] border border-[rgba(20,26,22,0.09)] text-[11px] font-mono text-[#7f857b]">
              <span className="mfl-live" />
              <span>Karachi Fleet Live</span>
            </div>

            {/* Quick Role Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleSwitcherOpen((prev) => !prev)}
                className="h-[34px] px-2.5 rounded-[4px] bg-[#fbfaf7] border border-[rgba(20,26,22,0.12)] text-[11.5px] font-medium text-[#141a16] hover:bg-[#f5f4ef] transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: roleBadge.bg }}
                />
                <span className="hidden sm:inline">Role:</span>
                <span className="font-semibold uppercase">{role}</span>
                <ChevronDown size={12} className="text-[#7f857b]" />
              </button>

              {roleSwitcherOpen && (
                <div className="absolute right-0 top-[40px] z-50 bg-[#1c2c22] border border-[rgba(255,255,255,0.12)] rounded-[6px] p-2 shadow-2xl flex flex-col gap-1 min-w-[200px] text-[#ecebe1]">
                  <span className="text-[9.5px] font-mono uppercase text-[#7f857b] tracking-wider px-2 py-0.5">
                    Switch Mode
                  </span>
                  <button
                    onClick={() => {
                      login('customer', 'customer@logipulse.com')
                      setRoleSwitcherOpen(false)
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-[4px] text-[12px] font-medium transition-colors cursor-pointer ${
                      role === 'customer'
                        ? 'bg-[#2f5640] text-white'
                        : 'text-[#ecebe1]/80 hover:bg-[rgba(255,255,255,0.06)]'
                    }`}
                  >
                    Customer Portal
                  </button>
                  <button
                    onClick={() => {
                      login('rider', 'rider@logipulse.com')
                      setRoleSwitcherOpen(false)
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-[4px] text-[12px] font-medium transition-colors cursor-pointer ${
                      role === 'rider'
                        ? 'bg-[#2DB67D] text-[#141a16]'
                        : 'text-[#ecebe1]/80 hover:bg-[rgba(255,255,255,0.06)]'
                    }`}
                  >
                    Rider Console
                  </button>
                  <button
                    onClick={handleAdminAccess}
                    className={`w-full text-left px-2.5 py-1.5 rounded-[4px] text-[12px] font-medium transition-colors cursor-pointer ${
                      role === 'admin'
                        ? 'bg-[#ffd98a] text-[#141a16]'
                        : 'text-[#ecebe1]/80 hover:bg-[rgba(255,255,255,0.06)]'
                    }`}
                  >
                    Admin Operations (Protected)
                  </button>
                  <div className="h-[1px] bg-[rgba(255,255,255,0.08)] my-1" />
                  {onGoToLanding && (
                    <button
                      onClick={() => {
                        setRoleSwitcherOpen(false)
                        onGoToLanding()
                      }}
                      className="w-full text-left px-2.5 py-1 rounded-[4px] text-[11px] text-[#ffd98a] hover:bg-[rgba(255,255,255,0.06)] cursor-pointer"
                    >
                      ← LogiPulse Landing Page
                    </button>
                  )}
                  <button
                    onClick={() => {
                      logout()
                      setRoleSwitcherOpen(false)
                    }}
                    className="w-full text-left px-2.5 py-1 rounded-[4px] text-[11px] text-[#c0392b] hover:bg-[rgba(255,255,255,0.06)] cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Sign Out icon */}
            <button
              type="button"
              onClick={logout}
              className="w-[34px] h-[34px] rounded-[4px] bg-[#fbfaf7] border border-[rgba(20,26,22,0.12)] flex items-center justify-center text-[#7f857b] hover:text-[#c0392b] hover:bg-[#f5f4ef] transition-colors cursor-pointer shadow-sm"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>

        {/* MOBILE SUB-NAV BAR (visible on screens < 768px) */}
        <div className="md:hidden flex items-center gap-1 bg-[#dcdbd0] px-3 py-1.5 border-b border-[rgba(20,26,22,0.10)] overflow-x-auto">
          {role === 'customer' &&
            customerTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = customerView === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setCustomerView(tab.id)}
                  className={`h-[28px] px-2.5 rounded-[4px] text-[11.5px] font-medium whitespace-nowrap flex items-center gap-1 ${
                    isActive ? 'bg-[#2f5640] text-white shadow-sm' : 'text-[#141a16]/70'
                  }`}
                >
                  <Icon size={12} />
                  <span>{tab.label}</span>
                </button>
              )
            })}

          {role === 'rider' &&
            riderTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = riderView === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setRiderView(tab.id)}
                  className={`h-[28px] px-2.5 rounded-[4px] text-[11.5px] font-medium whitespace-nowrap flex items-center gap-1 ${
                    isActive ? 'bg-[#2DB67D] text-[#141a16] shadow-sm' : 'text-[#141a16]/70'
                  }`}
                >
                  <Icon size={12} />
                  <span>{tab.label}</span>
                </button>
              )
            })}

          {role === 'admin' &&
            adminTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = adminView === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setAdminView(tab.id)}
                  className={`h-[28px] px-2.5 rounded-[4px] text-[11.5px] font-medium whitespace-nowrap flex items-center gap-1 ${
                    isActive ? 'bg-[#2f5640] text-[#ffd98a] shadow-sm' : 'text-[#141a16]/70'
                  }`}
                >
                  <Icon size={12} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
        </div>

        {/* MAIN CANVAS BODY: EXPANSIVE PARCHMENT CONTAINER */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-[#e5e4da] relative">
          {children}
        </main>
      </div>
    </div>
  )
}
export default AppConsoleShell
