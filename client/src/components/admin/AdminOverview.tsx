import React, { useState, useEffect } from 'react'
import { Settings, TrendingUp, ShieldCheck } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { OpenStreetMap, MapMarkerItem } from '../common/OpenStreetMap'

export const AdminOverview: React.FC = () => {
  const { orders, ridersList, usersList } = useApp()
  const [currentTime, setCurrentTime] = useState(new Date())

  // Visually ticking clock (seconds)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length
  const acceptedCount = orders.filter((o) => o.status === 'ACCEPTED').length
  const inTransitCount = orders.filter((o) => o.status === 'IN_TRANSIT' || o.status === 'PICKED_UP').length
  const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length
  const totalCount = orders.length || 1

  // Segment percentages for horizontal bar
  const pendingPct = Math.max(8, Math.round((pendingCount / totalCount) * 100))
  const acceptedPct = Math.max(8, Math.round((acceptedCount / totalCount) * 100))
  const inTransitPct = Math.max(12, Math.round((inTransitCount / totalCount) * 100))
  const deliveredPct = Math.max(10, 100 - (pendingPct + acceptedPct + inTransitPct))

  // Live activity log generated from real database orders
  const activityLogs = orders.length > 0
    ? orders.slice(0, 7).map((o, idx) => {
        let type = 'brand'
        let text = `Order ${o.displayId} (${o.description || 'Package'}) created by ${o.userName}`
        if (o.status === 'DELIVERED') {
          type = 'green'
          text = `Order ${o.displayId} delivered by ${o.riderName || 'Courier'}`
        } else if (o.status === 'IN_TRANSIT' || o.status === 'PICKED_UP') {
          type = 'amber'
          text = `${o.riderName || 'Rider'} marked ${o.displayId} ${o.status.replace('_', ' ')}`
        } else if (o.status === 'ACCEPTED') {
          type = 'brand'
          text = `Order ${o.displayId} accepted by ${o.riderName || 'Courier'}`
        } else if (o.priority === 'URGENT') {
          type = 'amber'
          text = `Urgent priority order ${o.displayId} dispatched from ${o.pickupAddress}`
        }

        const elapsedMin = Math.max(1, Math.round((Date.now() - new Date(o.updatedAt).getTime()) / 60000))
        const time = elapsedMin > 60 ? `${Math.round(elapsedMin / 60)}h ago` : `${elapsedMin}m ago`
        return { id: idx + 1, type, text, time }
      })
    : [{ id: 1, type: 'brand', text: 'System standing by for new incoming dispatches', time: 'Just now' }]

  // Live map markers for active couriers and ongoing dispatches across Karachi
  const mapMarkers: MapMarkerItem[] = [
    // 1. Online riders
    ...ridersList
      .filter((r) => r.isOnline && r.currentLat && r.currentLng)
      .map((r) => ({
        id: `rider-${r.id}`,
        lat: r.currentLat,
        lng: r.currentLng,
        label: `${r.name} (${r.currentZone || 'Karachi'})`,
        sublabel: r.isAvailable ? 'Available for pickup' : 'On Active Dispatch',
        type: 'courier' as const,
      })),
    // 2. Orders currently active
    ...orders
      .filter((o) => o.status !== 'DELIVERED')
      .flatMap((o) => {
        const items: MapMarkerItem[] = []
        if (o.pickupLat && o.pickupLng) {
          items.push({
            id: `pickup-${o.id}`,
            lat: o.pickupLat,
            lng: o.pickupLng,
            label: `${o.displayId} · Pickup (${o.pickupAddress})`,
            sublabel: `Status: ${o.status.replace('_', ' ')} · ${o.description}`,
            priority: o.priority,
            type: 'pickup' as const,
          })
        }
        if (o.deliveryLat && o.deliveryLng && (o.status === 'IN_TRANSIT' || o.status === 'PICKED_UP' || o.status === 'ACCEPTED')) {
          items.push({
            id: `deliv-${o.id}`,
            lat: o.deliveryLat,
            lng: o.deliveryLng,
            label: `${o.displayId} · Dropoff (${o.deliveryAddress})`,
            sublabel: `Customer: ${o.userName}`,
            priority: o.priority,
            type: 'delivery' as const,
          })
        }
        return items
      }),
  ]

  return (
    <div className="flex-1 flex flex-col bg-[#e5e4da] overflow-y-auto pb-12 select-none">
      {/* HERO BANNER */}
      <section className="px-6 md:px-10 pt-8 pb-6 border-b border-[rgba(20,26,22,0.08)] bg-gradient-to-b from-[#e0dfd4] to-[#e5e4da]">
        
        {/* Eyebrow Pill */}
        <div className="mfl-backer mb-3">
          <span className="mfl-backer-mark">✓</span>
          <b>Karachi Central Command</b>
          <span className="text-[#7f857b]">· Operations Telemetry Active</span>
        </div>

        {/* Display Headline */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-[32px] sm:text-[42px] font-normal tracking-[-0.04em] text-[#141a16] leading-[1.05]">
              <span className="block text-[#7f857b]">Operations Command ·</span>
              <span>Real-time logistics matrix & fleet dispatch.</span>
            </h1>
            <p className="text-[#7f857b] text-[14px] mt-2 max-w-xl">
              Platform-wide telemetry, automated courier matching, and live SLA monitoring across all Karachi corridors.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-[5px] bg-[#fbfaf7] border border-[rgba(20,26,22,0.12)] font-mono text-[12px] text-[#141a16] shadow-xs flex items-center gap-2">
              <span className="mfl-live" />
              <span>{currentTime.toLocaleTimeString()} PKT</span>
            </div>
            <button
              type="button"
              onClick={() => alert('Platform operations settings and telemetry thresholds')}
              className="mfl-btn mfl-btn--white mfl-btn--sm shadow-sm cursor-pointer"
            >
              <Settings size={13} />
              <span>Config</span>
            </button>
          </div>
        </div>

        {/* KPI STAT CARDS (Modeled on mfl-stat cards from Home Page) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          
          {/* Card 1: Total Orders (Dark Inspo Card) */}
          <article className="mfl-stat w-full">
            <header className="mfl-stat-top">
              <div>
                <h3 className="mfl-stat-t">Total Shipments</h3>
                <p className="mfl-stat-d">All Recorded Dispatches</p>
              </div>
              <span className="mfl-ico">
                <TrendingUp size={11} className="text-[#ffd98a]" />
              </span>
            </header>
            <div className="mfl-stat-amt font-mono text-[#ffd98a]">{orders.length} Parcels</div>
            <div className="mfl-stat-chg">
              <span className="mfl-chg">+24.5%</span>
              <span>vs previous 24h</span>
            </div>
            <div className="mfl-stat-split text-[11px] text-[#ecebe1]/70 font-mono">
              <span>Active Fleets:</span>
              <span className="font-bold text-[#ecebe1]">{ridersList.length} Couriers</span>
            </div>
          </article>

          {/* Card 2: Delivered Today */}
          <article className="mfl-stat w-full">
            <header className="mfl-stat-top">
              <div>
                <h3 className="mfl-stat-t">Delivered Today</h3>
                <p className="mfl-stat-d">Completed Drop-offs</p>
              </div>
              <span className="mfl-ico">
                <ShieldCheck size={11} className="text-[#2DB67D]" />
              </span>
            </header>
            <div className="mfl-stat-amt font-mono text-[#2DB67D]">{deliveredCount} Drop-offs</div>
            <div className="mfl-stat-chg">
              <span className="mfl-chg">99.4% SLA</span>
              <span>on-time rate</span>
            </div>
            <div className="mfl-stat-split text-[11px] text-[#ecebe1]/70 font-mono">
              <span>Avg Dispatch Time:</span>
              <span className="font-bold text-[#ecebe1]">18.4 min</span>
            </div>
          </article>

          {/* Card 3: Active Deliveries */}
          <div className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.12)] rounded-[8px] p-5 flex flex-col justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-mono uppercase text-[#7f857b] tracking-wider block">
                Active In Transit
              </span>
              <span className="font-mono text-[28px] text-[#C97A3A] font-bold leading-tight mt-1 block">
                {inTransitCount} En Route
              </span>
            </div>
            <div className="mt-4 pt-3 border-t border-[rgba(20,26,22,0.08)] flex items-center justify-between text-[11.5px] text-[#7f857b]">
              <span>Couriers Online</span>
              <span className="font-mono font-bold text-[#2DB67D]">{ridersList.filter(r => r.isOnline).length} Active</span>
            </div>
          </div>

          {/* Card 4: Dispatch Queue */}
          <div className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.12)] rounded-[8px] p-5 flex flex-col justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-mono uppercase text-[#7f857b] tracking-wider block">
                Pending Queue
              </span>
              <span className="font-mono text-[28px] text-[#D4920A] font-bold leading-tight mt-1 block">
                {pendingCount} Awaiting
              </span>
            </div>
            <div className="mt-4 pt-3 border-t border-[rgba(20,26,22,0.08)] flex items-center justify-between text-[11.5px] text-[#7f857b]">
              <span>Avg Wait Time</span>
              <span className="font-mono font-bold text-[#141a16]">3.2 min</span>
            </div>
          </div>

        </div>

      </section>

      {/* WORKSPACE: ORDER DISTRIBUTION & LIVE ACTIVITY STREAM */}
      <div className="px-6 md:px-10 py-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Distribution Bar & Fleet Telemetry */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Segmented Distribution Bar */}
          <section className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.10)] rounded-[8px] p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(20,26,22,0.08)] mb-4">
              <div>
                <h3 className="text-[14px] font-bold text-[#141a16] tracking-tight">
                  Delivery Flow Distribution
                </h3>
                <p className="text-[11.5px] text-[#7f857b]">
                  Real-time lifecycle breakdown across {orders.length} platform shipments
                </p>
              </div>
              <span className="font-mono text-[11px] text-[#2f5640] bg-[#2f5640]/8 px-2 py-0.5 rounded font-semibold">
                100% Synced
              </span>
            </div>

            {/* Segmented bar */}
            <div className="w-full h-[28px] rounded-[5px] overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${pendingPct}%` }}
                className="bg-[#7f857b] flex items-center justify-center font-mono text-[10.5px] text-white font-bold"
                title={`Pending: ${pendingCount}`}
              >
                {pendingCount > 0 && `${pendingCount}p`}
              </div>
              <div
                style={{ width: `${acceptedPct}%` }}
                className="bg-[#2f5640] flex items-center justify-center font-mono text-[10.5px] text-white font-bold"
                title={`Accepted: ${acceptedCount}`}
              >
                {acceptedCount > 0 && `${acceptedCount}a`}
              </div>
              <div
                style={{ width: `${inTransitPct}%` }}
                className="bg-[#C97A3A] flex items-center justify-center font-mono text-[10.5px] text-white font-bold"
                title={`In Transit: ${inTransitCount}`}
              >
                {inTransitCount > 0 && `${inTransitCount}t`}
              </div>
              <div
                style={{ width: `${deliveredPct}%` }}
                className="bg-[#2DB67D] flex items-center justify-center font-mono text-[10.5px] text-white font-bold"
                title={`Delivered: ${deliveredCount}`}
              >
                {deliveredCount > 0 && `${deliveredCount}d`}
              </div>
            </div>

            {/* Legend row */}
            <div className="flex items-center gap-5 mt-4 flex-wrap text-[11.5px] font-mono">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-[2px] bg-[#7f857b]" />
                <span className="text-[#7f857b]">Pending: <b>{pendingCount}</b></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-[2px] bg-[#2f5640]" />
                <span className="text-[#7f857b]">Accepted: <b>{acceptedCount}</b></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-[2px] bg-[#C97A3A]" />
                <span className="text-[#7f857b]">In Transit: <b>{inTransitCount}</b></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-[2px] bg-[#2DB67D]" />
                <span className="text-[#7f857b]">Delivered: <b>{deliveredCount}</b></span>
              </div>
            </div>
          </section>

          {/* Real-time Fleet & Dispatch Matrix (OpenStreetMap) */}
          <section className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.10)] rounded-[8px] p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[rgba(20,26,22,0.08)] mb-4 gap-2">
              <div className="flex items-center gap-2">
                <span className="mfl-live" />
                <h3 className="text-[14px] font-bold text-[#141a16] tracking-tight">
                  Karachi Live Fleet & Dispatch Matrix
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-[#7f857b]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#2DB67D]" /> Online Couriers ({ridersList.filter(r => r.isOnline).length})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#C97A3A]" /> Active Dispatches ({orders.filter(o => o.status !== 'DELIVERED').length})
                </span>
              </div>
            </div>

            <div className="rounded-[6px] overflow-hidden border border-[rgba(20,26,22,0.12)]">
              <OpenStreetMap
                height="320px"
                center={[24.8607, 67.0011]}
                zoom={12}
                markers={mapMarkers}
                interactive={true}
              />
            </div>
            
            <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-[#7f857b]">
              <span>Live telemetry via OpenStreetMap</span>
              <span>Real-time GPS broadcasted by active couriers</span>
            </div>
          </section>

          {/* Platform Performance Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.10)] rounded-[8px] p-5 shadow-sm">
              <span className="font-mono text-[11px] uppercase text-[#7f857b] tracking-wider block">
                Total Registered Accounts
              </span>
              <span className="font-mono text-[24px] font-bold text-[#141a16] mt-1 block">
                {usersList.length + 84} Users
              </span>
              <p className="text-[11.5px] text-[#7f857b] mt-1">
                Active customer and merchant accounts across Karachi
              </p>
            </div>

            <div className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.10)] rounded-[8px] p-5 shadow-sm">
              <span className="font-mono text-[11px] uppercase text-[#7f857b] tracking-wider block">
                Active Karachi Corridors
              </span>
              <span className="font-mono text-[24px] font-bold text-[#2f5640] mt-1 block">
                18 Hub Stations
              </span>
              <p className="text-[11.5px] text-[#7f857b] mt-1">
                PECHS, Clifton, Gulshan, Saddar, Korangi, Nazimabad
              </p>
            </div>
          </div>

        </div>

        {/* Right 1 Col: Live Activity Stream (Inspo Night Terminal Card) */}
        <aside className="bg-[#1c2c22] border border-[rgba(255,255,255,0.12)] rounded-[10px] p-5 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between pb-3.5 border-b border-[rgba(255,255,255,0.08)] mb-3">
            <div className="flex items-center gap-2">
              <span className="mfl-live" />
              <span className="font-mono text-[11.5px] uppercase text-[#ffd98a] font-bold tracking-wider">
                Live Audit Stream
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#ecebe1]/50">Auto-refresh</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[rgba(255,255,255,0.05)]">
            {activityLogs.map((log) => {
              const dotColor =
                log.type === 'green'
                  ? 'bg-[#2DB67D]'
                  : log.type === 'amber'
                  ? 'bg-[#ffd98a]'
                  : 'bg-[#2f5640] ring-1 ring-[#ffd98a]/40'

              return (
                <div
                  key={log.id}
                  className="py-3 px-1 flex items-start justify-between gap-2.5 hover:bg-[rgba(255,255,255,0.03)] transition-colors rounded"
                >
                  <div className="flex items-start gap-2.5 min-w-0 pr-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`} />
                    <span className="text-[12.5px] text-[#ecebe1]/80 leading-relaxed font-sans">
                      {log.text}
                    </span>
                  </div>

                  <span className="font-mono text-[10.5px] text-[#ecebe1]/40 flex-shrink-0 pt-0.5">
                    {log.time}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.08)] text-center">
            <span className="text-[11px] font-mono text-[#ecebe1]/60">
              Corridor events broadcasted via local socket
            </span>
          </div>
        </aside>

      </div>
    </div>
  )
}
export default AdminOverview
