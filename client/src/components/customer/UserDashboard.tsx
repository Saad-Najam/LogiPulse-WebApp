import React, { useState } from 'react'
import {
  ChevronRight,
  Package,
  ArrowRight,
  Plus,
  Clock,
  Sparkles,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { Order, OrderStatus } from '../../types'

export const UserDashboard: React.FC = () => {
  const { orders, currentUser, setCustomerView, setSelectedOrderId } = useApp()
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  const userOrders = orders.filter((o) => currentUser && String(o.userId) === String(currentUser.id))
  const activeOrder = userOrders.find(
    (o) => o.status === 'IN_TRANSIT' || o.status === 'ACCEPTED' || o.status === 'PICKED_UP'
  )

  const stats = {
    total: userOrders.length,
    inTransit: userOrders.filter((o) => o.status === 'IN_TRANSIT' || o.status === 'PICKED_UP').length,
    delivered: userOrders.filter((o) => o.status === 'DELIVERED').length,
    pending: userOrders.filter((o) => o.status === 'PENDING').length,
  }

  const getStatusBadgeStyle = (status: OrderStatus) => {
    switch (status) {
      case 'DELIVERED':
        return { bg: 'rgba(45, 182, 125, 0.12)', text: '#2DB67D', label: 'DELIVERED' }
      case 'IN_TRANSIT':
        return { bg: 'rgba(201, 122, 58, 0.15)', text: '#C97A3A', label: 'IN TRANSIT' }
      case 'PICKED_UP':
        return { bg: 'rgba(201, 122, 58, 0.15)', text: '#C97A3A', label: 'PICKED UP' }
      case 'ACCEPTED':
        return { bg: 'rgba(47, 86, 64, 0.15)', text: '#2f5640', label: 'ACCEPTED' }
      case 'PENDING':
      default:
        return { bg: 'rgba(127, 133, 123, 0.15)', text: '#7f857b', label: 'PENDING' }
    }
  }

  const filteredOrders = userOrders.filter((o) => {
    if (filterStatus === 'ALL') return true
    if (filterStatus === 'ACTIVE') return o.status === 'IN_TRANSIT' || o.status === 'PICKED_UP' || o.status === 'ACCEPTED'
    if (filterStatus === 'DELIVERED') return o.status === 'DELIVERED'
    if (filterStatus === 'PENDING') return o.status === 'PENDING'
    return true
  })

  const handleOpenOrder = (order: Order) => {
    setSelectedOrderId(order.id)
    setCustomerView('tracking')
  }

  return (
    <div className="flex-1 flex flex-col bg-[#e5e4da] overflow-y-auto relative pb-12">
      {/* HERO SECTION WITH SUBTLE TRACES BACKGROUND */}
      <section className="relative px-6 md:px-10 pt-8 pb-6 border-b border-[rgba(20,26,22,0.08)] bg-gradient-to-b from-[#e1e0d5] to-[#e5e4da]">
        
        {/* Eyebrow Pill */}
        <div className="mfl-backer mb-3">
          <span className="mfl-backer-mark">✓</span>
          <b>Karachi Central Hub</b>
          <span className="text-[#7f857b]">· 18 Active Couriers Synced</span>
        </div>

        {/* Home-Page Style Display Headline */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-[32px] sm:text-[42px] font-normal tracking-[-0.04em] text-[#141a16] leading-[1.05]">
              <span className="block text-[#7f857b]">Track, dispatch & manage</span>
              <span>all shipments in one calm workspace.</span>
            </h1>
            <p className="text-[#7f857b] text-[14px] mt-2 max-w-xl">
              Real-time telemetry, automated rider dispatching, and instant verification across all Karachi corridors.
            </p>
          </div>

          {/* Quick CTA Actions */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setCustomerView('new-order')}
              className="mfl-btn mfl-btn--brand shadow-md"
            >
              <Plus size={15} />
              <span>Create Delivery</span>
            </button>
            <button
              type="button"
              onClick={() => setCustomerView('tracking')}
              className="mfl-btn mfl-btn--white shadow-sm"
            >
              Live Radar
            </button>
          </div>
        </div>

        {/* HERO STAT CARDS - MODELED ON HOME PAGE mfl-stat */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-8">
          
          {/* Stat Card 1: Total Flow (Dark Inspo Card) */}
          <article className="mfl-stat w-full">
            <header className="mfl-stat-top">
              <div>
                <h3 className="mfl-stat-t">Courier Flow</h3>
                <p className="mfl-stat-d">All Registered Shipments</p>
              </div>
              <span className="mfl-ico">
                <Sparkles size={11} className="text-[#ffd98a]" />
              </span>
            </header>
            <div className="mfl-stat-amt font-mono">{stats.total} Orders</div>
            <div className="mfl-stat-chg">
              <span className="mfl-chg">
                +14.8%
              </span>
              <span>from last week</span>
            </div>
            {/* Split breakdown */}
            <div className="mfl-stat-split">
              <svg className="mfl-donut" viewBox="0 0 64 64" width="48" height="48">
                <circle cx="32" cy="32" r="22" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                <circle
                  cx="32"
                  cy="32"
                  r="22"
                  fill="none"
                  pathLength="100"
                  stroke="#2DB67D"
                  strokeWidth="8"
                  strokeDasharray="50 50"
                  transform="rotate(-90 32 32)"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="22"
                  fill="none"
                  pathLength="100"
                  stroke="#C97A3A"
                  strokeWidth="8"
                  strokeDasharray="25 75"
                  strokeDashoffset="-50"
                  transform="rotate(-90 32 32)"
                />
              </svg>
              <div className="mfl-legend">
                <div className="mfl-legend-h">Status Split</div>
                <ul>
                  <li><i style={{ background: '#2DB67D' }} /><span>Delivered:</span> <b>{stats.delivered}</b></li>
                  <li><i style={{ background: '#C97A3A' }} /><span>In Transit:</span> <b>{stats.inTransit}</b></li>
                </ul>
              </div>
            </div>
          </article>

          {/* Stat Card 2: In-Transit Active */}
          <article className="mfl-stat w-full">
            <header className="mfl-stat-top">
              <div>
                <h3 className="mfl-stat-t">In Transit</h3>
                <p className="mfl-stat-d">Live on the Road</p>
              </div>
              <span className="mfl-ico">
                <span className="mfl-live" />
              </span>
            </header>
            <div className="mfl-stat-amt text-[#ffd98a] font-mono">{stats.inTransit} Active</div>
            <div className="mfl-stat-chg">
              <span className="mfl-chg">PECHS · Clifton · Gulshan</span>
            </div>
            <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.07)] text-[11px] text-[#ecebe1]/70 flex items-center justify-between">
              <span>Avg Transit Time:</span>
              <span className="font-mono text-[#ecebe1] font-semibold">22.4 min</span>
            </div>
          </article>

          {/* Stat Card 3: Delivered Today */}
          <div className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.10)] rounded-[6px] p-4 flex flex-col justify-between shadow-sm">
            <div>
              <span className="text-[10.5px] font-mono uppercase text-[#7f857b] tracking-wider block">
                Delivered
              </span>
              <span className="font-mono text-[28px] text-[#2DB67D] font-medium leading-tight mt-1 block">
                {stats.delivered}
              </span>
            </div>
            <div className="mt-4 pt-3 border-t border-[rgba(20,26,22,0.08)] flex items-center justify-between text-[11px] text-[#7f857b]">
              <span>Success Rate</span>
              <span className="font-mono font-semibold text-[#141a16]">100%</span>
            </div>
          </div>

          {/* Stat Card 4: Pending Dispatch */}
          <div className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.10)] rounded-[6px] p-4 flex flex-col justify-between shadow-sm">
            <div>
              <span className="text-[10.5px] font-mono uppercase text-[#7f857b] tracking-wider block">
                Pending Assign
              </span>
              <span className="font-mono text-[28px] text-[#7f857b] font-medium leading-tight mt-1 block">
                {stats.pending}
              </span>
            </div>
            <div className="mt-4 pt-3 border-t border-[rgba(20,26,22,0.08)] flex items-center justify-between text-[11px] text-[#7f857b]">
              <span>Queue Status</span>
              <span className="font-mono font-semibold text-[#2f5640]">Healthy</span>
            </div>
          </div>

        </div>
      </section>

      {/* MAIN CONTENT AREA */}
      <div className="px-6 md:px-10 py-6 max-w-7xl w-full flex flex-col gap-6 mx-auto">
        
        {/* ACTIVE ORDER CALLOUT BANNER (Inspired by mfl-callout / mfl-panel) */}
        {activeOrder && (
          <div
            onClick={() => handleOpenOrder(activeOrder)}
            className="w-full bg-[#fbfaf7] border border-[rgba(20,26,22,0.12)] border-l-[4px] border-l-[#C97A3A] rounded-[8px] p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-[#f5f4ef] hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <span className="w-9 h-9 rounded-[5px] bg-[#C97A3A]/10 text-[#C97A3A] flex items-center justify-center flex-shrink-0">
                <span className="mfl-live" style={{ background: '#C97A3A' }} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] font-semibold text-[#141a16]">
                    {activeOrder.displayId}
                  </span>
                  {(() => {
                    const badge = getStatusBadgeStyle(activeOrder.status)
                    return (
                      <span
                        className="px-2 py-0.5 rounded-[3px] font-mono text-[10px] font-semibold uppercase"
                        style={{ backgroundColor: badge.bg, color: badge.text }}
                      >
                        {badge.label}
                      </span>
                    )
                  })()}
                </div>
                <p className="text-[13px] text-[#141a16] font-medium mt-0.5">
                  {activeOrder.riderName ? `${activeOrder.riderName} is on route with your parcel` : 'Awaiting courier pickup confirmation'}
                </p>
                <p className="text-[11.5px] text-[#7f857b]">
                  {activeOrder.pickupAddress} → {activeOrder.deliveryAddress}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 self-end sm:self-center">
              <div className="text-right">
                <span className="font-mono text-[13px] text-[#2DB67D] font-bold block">
                  {activeOrder.distanceKm ? `${activeOrder.distanceKm} km away` : '1.4 km away'}
                </span>
                <span className="text-[11px] text-[#7f857b] flex items-center gap-1 justify-end">
                  <Clock size={11} />
                  <span>ETA ~12 min</span>
                </span>
              </div>
              <span className="mfl-btn mfl-btn--brand mfl-btn--sm group-hover:bg-[#244231] transition-colors">
                <span>Track</span>
                <ChevronRight size={13} />
              </span>
            </div>
          </div>
        )}

        {/* SHIPMENT MATRIX / RECENT DELIVERIES (Inspired by mfl-panel / wallet grid) */}
        <section className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.10)] rounded-[8px] p-5 shadow-sm">
          
          {/* Header Row with Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[rgba(20,26,22,0.08)] gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-[#141a16] tracking-tight">Recent Deliveries</h2>
              <p className="text-[12px] text-[#7f857b]">Complete log of parcels dispatched through the platform</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#eeede6] p-1 rounded-[5px]">
              {(['ALL', 'ACTIVE', 'DELIVERED', 'PENDING'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterStatus(tab)}
                  className={`px-2.5 py-1 rounded-[3px] text-[11px] font-mono transition-all cursor-pointer ${
                    filterStatus === tab
                      ? 'bg-[#2f5640] text-white font-medium shadow-xs'
                      : 'text-[#7f857b] hover:text-[#141a16]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Table Rows */}
          {filteredOrders.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-[6px] bg-[#eeede7] flex items-center justify-center text-[#7f857b] mb-3">
                <Package size={20} />
              </div>
              <h3 className="text-[15px] font-semibold text-[#141a16]">No deliveries found</h3>
              <p className="text-[12.5px] text-[#7f857b] mt-1 max-w-sm">
                There are no orders matching the selected filter criteria. Click below to initiate a dispatch.
              </p>
              <button
                type="button"
                onClick={() => setCustomerView('new-order')}
                className="mfl-btn mfl-btn--brand mfl-btn--sm mt-4 cursor-pointer"
              >
                + New Delivery
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[rgba(20,26,22,0.06)] mt-2">
              {filteredOrders.map((order) => {
                const badge = getStatusBadgeStyle(order.status)
                return (
                  <div
                    key={order.id}
                    onClick={() => handleOpenOrder(order)}
                    className="py-3.5 px-2 flex items-center justify-between cursor-pointer hover:bg-[#f5f4ef] rounded-[4px] transition-colors group"
                  >
                    <div className="flex items-center gap-4 min-w-0 pr-4">
                      <span className="font-mono text-[12px] font-semibold text-[#2f5640] flex-shrink-0 bg-[#2f5640]/8 px-2 py-1 rounded-[3px]">
                        {order.displayId}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[13px] font-medium text-[#141a16] truncate">
                          <span className="truncate">{order.pickupAddress}</span>
                          <ArrowRight size={12} className="text-[#7f857b] flex-shrink-0" />
                          <span className="text-[#7f857b] truncate">{order.deliveryAddress}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-[#7f857b] mt-0.5 font-mono">
                          <span>{order.packageSize} Parcel</span>
                          <span>·</span>
                          <span>Priority: {order.priority}</span>
                          {order.riderName && (
                            <>
                              <span>·</span>
                              <span className="text-[#141a16]">Courier: {order.riderName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span
                        className="px-2 py-0.5 rounded-[3px] font-mono text-[10.5px] font-medium uppercase"
                        style={{ backgroundColor: badge.bg, color: badge.text }}
                      >
                        {badge.label}
                      </span>
                      <ChevronRight size={14} className="text-[#7f857b] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
export default UserDashboard
