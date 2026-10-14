import React from 'react'
import { Sparkles } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { haversineDistance } from '../../utils/haversine'

export const PriorityAnalytics: React.FC = () => {
  const { orders, ridersList, assignRiderToOrder } = useApp()

  const urgentOrders = orders.filter((o) => o.priority === 'URGENT')
  const highOrders = orders.filter((o) => o.priority === 'HIGH')
  const normalOrders = orders.filter((o) => o.priority === 'NORMAL')
  const total = orders.length || 1

  const urgentPct = Math.round((urgentOrders.length / total) * 100)
  const highPct = Math.round((highOrders.length / total) * 100)
  const normalPct = 100 - (urgentPct + highPct)

  // Fixed sort: URGENT first, then HIGH, then NORMAL
  const sortedPriorityOrders = [...orders].sort((a, b) => {
    const priorityWeight = { URGENT: 3, HIGH: 2, NORMAL: 1 }
    return priorityWeight[b.priority] - priorityWeight[a.priority]
  })

  // Recommended assignments: find unassigned pending orders for online riders
  const unassignedPending = orders.filter((o) => o.status === 'PENDING')
  const onlineRiders = ridersList.filter((r) => r.isOnline)

  const recommendedAssignments = onlineRiders.map((rider) => {
    const nearest = [...unassignedPending]
      .map((ord) => ({
        ...ord,
        distanceToRider: haversineDistance(
          rider.currentLat,
          rider.currentLng,
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
                <span className="text-[#7f857b]">· Karachi Grid Telemetry</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-[4px] bg-[#C94040]/15 border border-[#C94040] text-[#C94040] font-mono text-[11px] uppercase font-bold tracking-wider animate-pulse">
                PEAK HOURS
              </span>
            </div>

            <h1 className="text-[26px] sm:text-[34px] font-normal tracking-[-0.04em] text-[#141a16] leading-tight">
              <span className="text-[#7f857b]">Priority Engine · </span>
              <span>Automated Dispatch & Urgency Matrix</span>
            </h1>
          </div>

          <div className="text-[12px] font-mono text-[#7f857b] bg-[#fbfaf7] border border-[rgba(20,26,22,0.12)] px-3 py-1.5 rounded-[5px] shadow-2xs">
            Dynamic Re-sorting: <span className="text-[#C94040] font-bold">Active</span>
          </div>
        </div>
      </section>

      {/* TWO COLUMN WORKSPACE (Main Queue + Smart Recommendations) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Column: Priority Distribution & Queue */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6">
          
          {/* THREE LARGE PRIORITY STAT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* URGENT CARD (Modeled on Inspo Card) */}
            <div className="bg-[#fbfaf7] border-[1.5px] border-[#C94040] rounded-[8px] p-4.5 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase text-[#C94040] font-bold tracking-wider">
                  URGENT TIER
                </span>
                <span className="text-[11.5px] font-mono text-[#7f857b]">{urgentPct}% share</span>
              </div>
              <div className="my-2">
                <span className="font-mono text-[36px] text-[#C94040] font-extrabold leading-none">
                  {urgentOrders.length}
                </span>
              </div>
              <span className="text-[11px] text-[#7f857b] border-t border-[rgba(20,26,22,0.06)] pt-2 block">
                Immediate audio dispatch to nearest rider
              </span>
            </div>

            {/* HIGH CARD */}
            <div className="bg-[#fbfaf7] border-[1.5px] border-[#D4920A] rounded-[8px] p-4.5 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase text-[#D4920A] font-bold tracking-wider">
                  HIGH PRIORITY
                </span>
                <span className="text-[11.5px] font-mono text-[#7f857b]">{highPct}% share</span>
              </div>
              <div className="my-2">
                <span className="font-mono text-[36px] text-[#D4920A] font-extrabold leading-none">
                  {highOrders.length}
                </span>
              </div>
              <span className="text-[11px] text-[#7f857b] border-t border-[rgba(20,26,22,0.06)] pt-2 block">
                SLA target under 25 minutes
              </span>
            </div>

            {/* NORMAL CARD */}
            <div className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.12)] rounded-[8px] p-4.5 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase text-[#7f857b] font-bold tracking-wider">
                  NORMAL QUEUE
                </span>
                <span className="text-[11.5px] font-mono text-[#7f857b]">{normalPct}% share</span>
              </div>
              <div className="my-2">
                <span className="font-mono text-[36px] text-[#141a16] font-extrabold leading-none">
                  {normalOrders.length}
                </span>
              </div>
              <span className="text-[11px] text-[#7f857b] border-t border-[rgba(20,26,22,0.06)] pt-2 block">
                Standard dispatch schedule (45m window)
              </span>
            </div>

          </div>

          {/* DISTRIBUTION BAR */}
          <div className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.10)] rounded-[8px] p-4 shadow-sm flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-bold text-[#141a16]">Live Pipeline Urgency Distribution</span>
              <span className="font-mono text-[11px] text-[#7f857b]">{orders.length} total orders</span>
            </div>

            <div className="w-full h-[24px] rounded-[5px] overflow-hidden flex shadow-xs font-mono text-[10px] text-white font-bold">
              <div
                style={{ width: `${Math.max(12, urgentPct)}%` }}
                className="bg-[#C94040] flex items-center justify-center"
              >
                URGENT ({urgentOrders.length})
              </div>
              <div
                style={{ width: `${Math.max(12, highPct)}%` }}
                className="bg-[#D4920A] flex items-center justify-center"
              >
                HIGH ({highOrders.length})
              </div>
              <div
                style={{ width: `${Math.max(15, normalPct)}%` }}
                className="bg-[#7f857b] flex items-center justify-center"
              >
                NORMAL ({normalOrders.length})
              </div>
            </div>
          </div>

          {/* LIVE PRIORITY FEED TABLE */}
          <div className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.10)] rounded-[8px] overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-[rgba(20,26,22,0.08)] bg-[#eeede6] flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#141a16] font-mono uppercase tracking-wider">
                Priority-Sorted Delivery Queue
              </span>
              <span className="text-[11px] text-[#7f857b] font-mono">Urgent orders prioritized top</span>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="h-[32px] border-b border-[rgba(20,26,22,0.08)] text-[10.5px] font-mono uppercase text-[#7f857b]">
                  <th className="pl-5 w-[110px]">Order ID</th>
                  <th className="pl-3 w-[110px]">Priority</th>
                  <th className="pl-3 min-w-[200px]">Corridor Route</th>
                  <th className="pl-3 w-[150px]">Courier</th>
                  <th className="pr-5 w-[100px] text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(20,26,22,0.06)] text-[12.5px]">
                {sortedPriorityOrders.map((order) => {
                  const isUrgent = order.priority === 'URGENT'
                  const isHigh = order.priority === 'HIGH'

                  return (
                    <tr
                      key={order.id}
                      className={`h-[44px] hover:bg-[#f5f4ef] transition-colors ${
                        isUrgent ? 'bg-[#C94040]/3' : ''
                      }`}
                    >
                      <td className="pl-5 font-mono font-bold text-[#2f5640]">
                        {order.displayId}
                      </td>
                      <td className="pl-3">
                        <span
                          className={`px-2 py-0.5 rounded-[3px] font-mono text-[10px] font-bold uppercase ${
                            isUrgent
                              ? 'bg-[#C94040] text-white shadow-2xs'
                              : isHigh
                              ? 'bg-[#D4920A] text-white shadow-2xs'
                              : 'bg-[#eeede6] text-[#7f857b]'
                          }`}
                        >
                          {order.priority}
                        </span>
                      </td>
                      <td className="pl-3 text-[#141a16] truncate max-w-[220px]">
                        {order.pickupAddress.split(',')[0]} → {order.deliveryAddress.split(',')[0]}
                      </td>
                      <td className="pl-3 text-[#141a16] font-medium">
                        {order.riderName || <span className="text-[#D4920A] font-mono text-[11.5px]">Unassigned</span>}
                      </td>
                      <td className="pr-5 text-right font-mono text-[11px] text-[#7f857b]">
                        {order.status}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

        </div>

        {/* Right Column: Smart Automated Rider Recommendations (340px) */}
        <aside className="w-full lg:w-[340px] h-full border-t lg:border-t-0 lg:border-l border-[rgba(20,26,22,0.12)] bg-[#f5f4ef] p-6 flex flex-col flex-shrink-0 overflow-y-auto">
          <div className="pb-3 border-b border-[rgba(20,26,22,0.10)] mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-[#2f5640]" />
              <span className="font-mono text-[11px] uppercase text-[#141a16] font-bold tracking-wider block">
                Algorithmic Matches
              </span>
            </div>
            <p className="text-[11.5px] text-[#7f857b] mt-0.5">
              Haversine proximity pairing for online couriers
            </p>
          </div>

          <div className="flex flex-col gap-3.5">
            {recommendedAssignments.map((rec) => {
              if (!rec.recommendedOrder) return null

              return (
                <div
                  key={rec.rider.id}
                  className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.12)] rounded-[8px] p-3.5 flex flex-col gap-2.5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-[#141a16]">
                      {rec.rider.name}
                    </span>
                    <span className="font-mono text-[12px] font-bold text-[#2DB67D]">
                      {rec.recommendedOrder.distanceToRider
                        ? `${rec.recommendedOrder.distanceToRider.toFixed(1)} km`
                        : '1.2 km'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11.5px] text-[#7f857b] bg-[#f5f4ef] p-2 rounded">
                    <span className="font-mono font-semibold text-[#141a16]">{rec.recommendedOrder.displayId}</span>
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
                    className="mfl-btn mfl-btn--brand mfl-btn--wide h-[34px] text-[12px] cursor-pointer shadow-xs"
                  >
                    Dispatch Now
                  </button>
                </div>
              )
            })}

            {unassignedPending.length === 0 && (
              <div className="text-[12px] text-[#7f857b] text-center py-8 bg-[#fbfaf7] rounded-[8px] border border-[rgba(20,26,22,0.08)]">
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
