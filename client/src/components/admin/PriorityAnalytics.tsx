import React, { useState } from 'react'
import {
  Sparkles,
  AlertTriangle,
  Flame,
  Clock,
  ArrowUpRight,
  TrendingUp,
  ShieldAlert,
  Zap,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { haversineDistance } from '../../utils/haversine'
import { PriorityLevel } from '../../types'

export const PriorityAnalytics: React.FC = () => {
  const { orders, ridersList, assignRiderToOrder, updateOrderPriority } = useApp()
  const [filterPriority, setFilterPriority] = useState<PriorityLevel | 'ALL'>('ALL')
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)

  const urgentOrders = orders.filter((o) => o.priority === 'URGENT')
  const highOrders = orders.filter((o) => o.priority === 'HIGH')
  const normalOrders = orders.filter((o) => o.priority === 'NORMAL')
  const total = orders.length || 1

  const urgentPct = Math.round((urgentOrders.length / total) * 100)
  const highPct = Math.round((highOrders.length / total) * 100)
  const normalPct = 100 - (urgentPct + highPct)

  // Priority queue sorted: URGENT first, then HIGH, then NORMAL
  const sortedPriorityOrders = [...orders]
    .filter((o) => filterPriority === 'ALL' || o.priority === filterPriority)
    .sort((a, b) => {
      const priorityWeight = { URGENT: 3, HIGH: 2, NORMAL: 1 }
      return priorityWeight[b.priority] - priorityWeight[a.priority]
    })

  // Algorithmic matches: find unassigned pending orders for online riders
  const unassignedPending = orders.filter((o) => o.status === 'PENDING')
  const onlineRiders = ridersList.filter((r) => r.isOnline)

  const recommendedAssignments = onlineRiders.map((rider) => {
    const nearest = [...unassignedPending]
      .map((ord) => ({
        ...ord,
        distanceToRider: haversineDistance(
          rider.currentLat || 24.8607,
          rider.currentLng || 67.0011,
          ord.pickupLat,
          ord.pickupLng
        ),
      }))
      .sort((a, b) => a.distanceToRider - b.distanceToRider)[0]

    return {
      rider,
      recommendedOrder: nearest,
    }
  })

  const handleEscalate = async (orderId: string, newPriority: PriorityLevel) => {
    setUpdatingOrderId(orderId)
    await updateOrderPriority(orderId, newPriority)
    setUpdatingOrderId(null)
  }

  return (
    <div className="flex-1 flex flex-col bg-[#e5e4da] overflow-hidden select-none">
      {/* HERO SUBHEADER */}
      <section className="px-6 md:px-10 py-5 border-b border-[rgba(20,26,22,0.08)] bg-gradient-to-b from-[#e0dfd4] to-[#e5e4da] flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="mfl-backer">
                <span className="mfl-backer-mark">✓</span>
                <b>Algorithmic Dispatch Engine</b>
                <span className="text-[#7f857b]">· Urgency Arbitration Matrix</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-[4px] bg-[#C94040]/15 border border-[#C94040] text-[#C94040] font-mono text-[11px] uppercase font-bold tracking-wider animate-pulse flex items-center gap-1">
                <Flame size={12} />
                REAL-TIME SLA ENGINE
              </span>
            </div>

            <h1 className="text-[26px] sm:text-[34px] font-normal tracking-[-0.04em] text-[#141a16] leading-tight">
              <span className="text-[#7f857b]">Priority Engine · </span>
              <span>Dynamic Queue Escalation & Pairing</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-[#fbfaf7] border border-[rgba(20,26,22,0.12)] p-1 rounded-[6px] shadow-2xs font-mono text-[11px]">
              {(['ALL', 'URGENT', 'HIGH', 'NORMAL'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFilterPriority(p)}
                  className={`px-2.5 py-1 rounded-[4px] cursor-pointer transition-all ${
                    filterPriority === p
                      ? p === 'URGENT'
                        ? 'bg-[#C94040] text-white font-bold'
                        : p === 'HIGH'
                        ? 'bg-[#D4920A] text-white font-bold'
                        : 'bg-[#2f5640] text-white font-bold'
                      : 'text-[#7f857b] hover:text-[#141a16]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TWO COLUMN WORKSPACE (Main Queue + Smart Recommendations) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Priority Distribution & Interactive Queue */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6">
          {/* THREE LARGE PRIORITY TIERS WITH INTERACTIVE SLA METRICS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* URGENT TIER */}
            <div className="bg-[#fbfaf7] border-[1.5px] border-[#C94040] rounded-[8px] p-4.5 flex flex-col justify-between shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#C94040]/5 rounded-bl-full pointer-events-none" />
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase text-[#C94040] font-bold tracking-wider flex items-center gap-1">
                    <AlertTriangle size={13} />
                    URGENT PRIORITY
                  </span>
                  <span className="text-[11.5px] font-mono text-[#7f857b]">
                    {urgentPct}% share
                  </span>
                </div>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="font-mono text-[36px] text-[#C94040] font-extrabold leading-none">
                    {urgentOrders.length}
                  </span>
                  <span className="text-[11px] font-mono text-[#7f857b]">Active Orders</span>
                </div>
              </div>
              <div className="pt-2 border-t border-[rgba(20,26,22,0.06)] flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#C94040] font-semibold">SLA Window: &lt; 15 min</span>
                <span className="text-[#7f857b]">Audio Alert Active</span>
              </div>
            </div>

            {/* HIGH PRIORITY TIER */}
            <div className="bg-[#fbfaf7] border border-[#D4920A] rounded-[8px] p-4.5 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase text-[#D4920A] font-bold tracking-wider flex items-center gap-1">
                    <TrendingUp size={13} />
                    HIGH PRIORITY
                  </span>
                  <span className="text-[11.5px] font-mono text-[#7f857b]">
                    {highPct}% share
                  </span>
                </div>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="font-mono text-[36px] text-[#D4920A] font-extrabold leading-none">
                    {highOrders.length}
                  </span>
                  <span className="text-[11px] font-mono text-[#7f857b]">Active Orders</span>
                </div>
              </div>
              <div className="pt-2 border-t border-[rgba(20,26,22,0.06)] flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#D4920A] font-semibold">SLA Window: &lt; 30 min</span>
                <span className="text-[#7f857b]">Priority Queue</span>
              </div>
            </div>

            {/* NORMAL QUEUE TIER */}
            <div className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.12)] rounded-[8px] p-4.5 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase text-[#7f857b] font-bold tracking-wider">
                    NORMAL QUEUE
                  </span>
                  <span className="text-[11.5px] font-mono text-[#7f857b]">
                    {normalPct}% share
                  </span>
                </div>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="font-mono text-[36px] text-[#141a16] font-extrabold leading-none">
                    {normalOrders.length}
                  </span>
                  <span className="text-[11px] font-mono text-[#7f857b]">Active Orders</span>
                </div>
              </div>
              <div className="pt-2 border-t border-[rgba(20,26,22,0.06)] flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#7f857b] font-semibold">SLA Window: &lt; 60 min</span>
                <span className="text-[#7f857b]">Standard Flow</span>
              </div>
            </div>
          </div>

          {/* DYNAMIC PIPELINE BAR */}
          <div className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.10)] rounded-[8px] p-4 shadow-sm flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-bold text-[#141a16]">
                Real-Time Urgency Distribution
              </span>
              <span className="font-mono text-[11px] text-[#7f857b]">
                {orders.length} Total Shipments Loaded
              </span>
            </div>
            <div className="w-full h-[24px] rounded-[5px] overflow-hidden flex shadow-xs font-mono text-[10px] text-white font-bold">
              <div
                style={{ width: `${Math.max(10, urgentPct)}%` }}
                className="bg-[#C94040] flex items-center justify-center transition-all duration-300"
              >
                URGENT ({urgentOrders.length})
              </div>
              <div
                style={{ width: `${Math.max(10, highPct)}%` }}
                className="bg-[#D4920A] flex items-center justify-center transition-all duration-300"
              >
                HIGH ({highOrders.length})
              </div>
              <div
                style={{ width: `${Math.max(15, normalPct)}%` }}
                className="bg-[#7f857b] flex items-center justify-center transition-all duration-300"
              >
                NORMAL ({normalOrders.length})
              </div>
            </div>
          </div>

          {/* ACTIONABLE PRIORITY FEED & ESCALATION TABLE */}
          <div className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.10)] rounded-[8px] overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-[rgba(20,26,22,0.08)] bg-[#eeede6] flex items-center justify-between">
              <div>
                <span className="text-[12px] font-bold text-[#141a16] font-mono uppercase tracking-wider block">
                  Priority-Sorted Delivery Queue
                </span>
                <span className="text-[11px] text-[#7f857b]">
                  Admins can dynamically escalate urgency tier or auto-dispatch
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#2f5640] font-bold bg-[#2f5640]/10 px-2 py-0.5 rounded">
                Live Auto-Sorting
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="h-[34px] border-b border-[rgba(20,26,22,0.08)] text-[10.5px] font-mono uppercase text-[#7f857b] bg-[#fbfaf7]">
                    <th className="pl-5 w-[110px]">Order ID</th>
                    <th className="pl-3 w-[120px]">Priority Tier</th>
                    <th className="pl-3 min-w-[200px]">Corridor Route</th>
                    <th className="pl-3 w-[150px]">Courier Status</th>
                    <th className="pr-5 w-[180px] text-right">Escalate Urgency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(20,26,22,0.06)] text-[12.5px]">
                  {sortedPriorityOrders.map((order) => {
                    const isUrgent = order.priority === 'URGENT'
                    const isHigh = order.priority === 'HIGH'

                    return (
                      <tr
                        key={order.id}
                        className={`h-[48px] hover:bg-[#f5f4ef] transition-colors ${
                          isUrgent ? 'bg-[#C94040]/3' : ''
                        }`}
                      >
                        <td className="pl-5 font-mono font-bold text-[#2f5640]">
                          {order.displayId}
                        </td>
                        <td className="pl-3">
                          <span
                            className={`px-2 py-0.5 rounded-[3px] font-mono text-[10px] font-bold uppercase shadow-2xs ${
                              isUrgent
                                ? 'bg-[#C94040] text-white ring-1 ring-[#C94040]'
                                : isHigh
                                ? 'bg-[#D4920A] text-white ring-1 ring-[#D4920A]'
                                : 'bg-[#eeede6] text-[#7f857b]'
                            }`}
                          >
                            {order.priority}
                          </span>
                        </td>
                        <td className="pl-3 text-[#141a16] truncate max-w-[240px]">
                          <span className="font-semibold">
                            {order.pickupAddress.split(',')[0]}
                          </span>{' '}
                          → {order.deliveryAddress.split(',')[0]}
                        </td>
                        <td className="pl-3 text-[#141a16] font-medium">
                          {order.riderName || (
                            <span className="text-[#D4920A] font-mono text-[11px] bg-[#D4920A]/10 px-1.5 py-0.5 rounded">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="pr-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {order.priority !== 'URGENT' && (
                              <button
                                type="button"
                                disabled={updatingOrderId === order.id}
                                onClick={() => handleEscalate(order.id, 'URGENT')}
                                className="px-2 py-1 rounded bg-[#C94040]/10 hover:bg-[#C94040] text-[#C94040] hover:text-white font-mono text-[10.5px] font-bold transition-all cursor-pointer border border-[#C94040]/20"
                                title="Escalate to URGENT priority tier"
                              >
                                ⚡ URGENT
                              </button>
                            )}
                            {order.priority !== 'HIGH' && (
                              <button
                                type="button"
                                disabled={updatingOrderId === order.id}
                                onClick={() => handleEscalate(order.id, 'HIGH')}
                                className="px-2 py-1 rounded bg-[#D4920A]/10 hover:bg-[#D4920A] text-[#D4920A] hover:text-white font-mono text-[10.5px] font-bold transition-all cursor-pointer border border-[#D4920A]/20"
                                title="Promote to HIGH priority tier"
                              >
                                HIGH
                              </button>
                            )}
                            {order.priority !== 'NORMAL' && (
                              <button
                                type="button"
                                disabled={updatingOrderId === order.id}
                                onClick={() => handleEscalate(order.id, 'NORMAL')}
                                className="px-2 py-1 rounded bg-[#7f857b]/10 hover:bg-[#7f857b] text-[#7f857b] hover:text-white font-mono text-[10.5px] font-bold transition-all cursor-pointer border border-[#7f857b]/20"
                                title="Reset to NORMAL queue"
                              >
                                NORMAL
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Algorithmic Courier Matches (350px) */}
        <aside className="w-full lg:w-[350px] h-full border-t lg:border-t-0 lg:border-l border-[rgba(20,26,22,0.12)] bg-[#f5f4ef] p-6 flex flex-col flex-shrink-0 overflow-y-auto">
          <div className="pb-3 border-b border-[rgba(20,26,22,0.10)] mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-[#2f5640]" />
              <span className="font-mono text-[11px] uppercase text-[#141a16] font-bold tracking-wider block">
                Algorithmic Matches
              </span>
            </div>
            <p className="text-[11.5px] text-[#7f857b] mt-0.5">
              Haversine proximity pairing for active couriers
            </p>
          </div>

          <div className="flex flex-col gap-3.5">
            {recommendedAssignments.map((rec) =>
              rec.recommendedOrder ? (
                <div
                  key={rec.rider.id}
                  className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.12)] rounded-[8px] p-3.5 flex flex-col gap-2.5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-bold text-[#141a16] block">
                        {rec.rider.name}
                      </span>
                      <span className="text-[10.5px] font-mono text-[#7f857b]">
                        Zone: {rec.rider.currentZone || 'Karachi Central'}
                      </span>
                    </div>
                    <span className="font-mono text-[12px] font-bold text-[#2DB67D] bg-[#2DB67D]/10 px-2 py-0.5 rounded">
                      {rec.recommendedOrder.distanceToRider
                        ? `${rec.recommendedOrder.distanceToRider.toFixed(1)} km`
                        : '1.2 km'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11.5px] text-[#7f857b] bg-[#f5f4ef] p-2 rounded">
                    <span className="font-mono font-semibold text-[#141a16]">
                      {rec.recommendedOrder.displayId}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        rec.recommendedOrder.priority === 'URGENT'
                          ? 'bg-[#C94040] text-white'
                          : 'bg-[#D4920A] text-white'
                      }`}
                    >
                      {rec.recommendedOrder.priority}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      assignRiderToOrder(rec.recommendedOrder.id, rec.rider.id)
                    }
                    className="mfl-btn mfl-btn--brand mfl-btn--wide h-[34px] text-[12px] cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Zap size={13} />
                    <span>Auto-Dispatch Courier</span>
                  </button>
                </div>
              ) : null
            )}

            {recommendedAssignments.every((r) => !r.recommendedOrder) && (
              <div className="text-[12px] text-[#7f857b] text-center py-10 bg-[#fbfaf7] rounded-[8px] border border-[rgba(20,26,22,0.08)]">
                All courier requests currently dispatched.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
export default PriorityAnalytics
