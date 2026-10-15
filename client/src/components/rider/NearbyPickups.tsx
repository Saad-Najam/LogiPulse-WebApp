import React, { useState, useEffect } from 'react'
import {
  Compass,
  MapPin,
  Navigation,
  Layers,
  Radio,
  Clock,
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2,
  Package,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  haversineDistance,
  estimateTimeMinutes,
  KARACHI_LOCATIONS,
} from '../../utils/haversine'
import { PriorityLevel } from '../../types'
import { OpenStreetMap } from '../common/OpenStreetMap'
import { apiFetch, mapBackendOrder } from '../../services/api'

export const NearbyPickups: React.FC = () => {
  const {
    orders,
    riderLocation,
    updateRiderLocation,
    acceptOrder,
    setRiderView,
    isLiveGpsActive,
    toggleDeviceGps,
    currentUser,
  } = useApp()

  const [filterPriority, setFilterPriority] = useState<PriorityLevel | 'ALL'>('ALL')
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [displayMode, setDisplayMode] = useState<'map' | 'radar'>('map')
  const [liveOrders, setLiveOrders] = useState(orders)

  // Auto-poll available orders every 2.5s so rides show up in real-time with zero page refresh!
  useEffect(() => {
    let active = true

    const fetchLiveAvailable = async () => {
      try {
        const res = await apiFetch<any[]>('/api/orders/available')
        if (active && Array.isArray(res)) {
          const mapped = res.map(mapBackendOrder)
          setLiveOrders(mapped)
        }
      } catch {
        // Fallback to context orders
        if (active) setLiveOrders(orders)
      }
    }

    fetchLiveAvailable()
    const timer = setInterval(fetchLiveAvailable, 2500)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [orders])

  // Real Haversine distance calculations
  const availableOrders = (liveOrders.length > 0 ? liveOrders : orders)
    .filter((o) => o.status === 'PENDING')
    .filter((o) => filterPriority === 'ALL' || o.priority === filterPriority)
    .map((order) => {
      const dist = haversineDistance(
        riderLocation.lat,
        riderLocation.lng,
        order.pickupLat,
        order.pickupLng
      )
      return {
        ...order,
        calculatedDistance: Math.round(dist * 10) / 10,
        estimateTime: estimateTimeMinutes(dist),
        estimatedFare: Math.max(250, Math.round(dist * 45 + 180)),
      }
    })
    .sort((a, b) => a.calculatedDistance - b.calculatedDistance)

  const handleAccept = (orderId: string) => {
    acceptOrder(orderId)
    setRiderView('active')
  }

  const getPriorityBadgeStyle = (priority: PriorityLevel) => {
    switch (priority) {
      case 'URGENT':
        return { bg: '#C94040', text: '#fff' }
      case 'HIGH':
        return { bg: '#D4920A', text: '#fff' }
      case 'NORMAL':
      default:
        return { bg: '#eeede6', text: '#7f857b' }
    }
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
                <b>Real-Time Dispatch Radar</b>
                <span className="text-[#7f857b]">· Karachi Grid Live Stream</span>
              </div>
              <span className="px-2 py-0.5 rounded-[4px] bg-[#2DB67D]/15 text-[#2DB67D] font-mono text-[11px] font-bold tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2DB67D] animate-ping" />
                LIVE SYNC
              </span>
            </div>

            <h1 className="text-[26px] sm:text-[34px] font-normal tracking-[-0.04em] text-[#141a16] leading-tight">
              <span className="text-[#7f857b]">Available Pickups · </span>
              <span>Nearby Karachi Dispatches</span>
            </h1>
            <p className="text-[12.5px] text-[#7f857b] mt-1 font-mono">
              Current Location: <span className="font-semibold text-[#141a16]">{riderLocation.name}</span>
            </p>
          </div>

          {/* Quick Actions & Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Priority Filter */}
            <div className="flex items-center gap-1 bg-[#eeede6] p-1 rounded-[5px] border border-[rgba(20,26,22,0.08)]">
              {(['ALL', 'URGENT', 'HIGH', 'NORMAL'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFilterPriority(p)}
                  className={`px-2.5 py-1 rounded-[3px] text-[10.5px] font-mono cursor-pointer transition-all ${
                    filterPriority === p
                      ? 'bg-[#2f5640] text-white font-bold shadow-xs'
                      : 'text-[#7f857b] hover:text-[#141a16]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={toggleDeviceGps}
              className={`mfl-btn mfl-btn--sm shadow-sm cursor-pointer ${
                isLiveGpsActive ? 'bg-[#2DB67D] text-white font-bold' : 'mfl-btn--white text-[#141a16]'
              }`}
            >
              <Navigation size={12} className={isLiveGpsActive ? 'text-white animate-pulse' : 'text-[#2DB67D]'} />
              <span>{isLiveGpsActive ? '● GPS Streaming' : 'Use Device GPS'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowLocationPicker((prev) => !prev)}
              className="mfl-btn mfl-btn--white mfl-btn--sm shadow-sm cursor-pointer"
            >
              <MapPin size={12} className="text-[#2DB67D]" />
              <span>Change Zone</span>
            </button>
          </div>
        </div>

        {/* Location selector toggle */}
        {showLocationPicker && (
          <div className="mt-4 p-3 bg-[#fbfaf7] border border-[rgba(20,26,22,0.12)] rounded-[6px] shadow-sm animate-fade">
            <span className="text-[10px] font-mono uppercase text-[#7f857b] block mb-2 font-semibold">
              Select Karachi Origin Station:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {KARACHI_LOCATIONS.map((loc) => (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => {
                    updateRiderLocation(loc.name, loc.lat, loc.lng)
                    setShowLocationPicker(false)
                  }}
                  className={`px-2.5 py-1.5 text-[11px] rounded-[4px] border text-left cursor-pointer transition-all ${
                    riderLocation.name === loc.name
                      ? 'border-[#2f5640] bg-[#2f5640] text-white font-bold'
                      : 'border-[rgba(20,26,22,0.10)] bg-[#f5f4ef] text-[#141a16] hover:bg-[#eeede6]'
                  }`}
                >
                  {loc.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* TWO COLUMN WORKSPACE (Available Orders List + Map / Radar) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Column (55% width) — High-Tech Available Orders Cards */}
        <div className="w-full md:w-[55%] h-full overflow-y-auto p-6 flex flex-col gap-4 border-r border-[rgba(20,26,22,0.10)]">
          <div className="flex items-center justify-between pb-2 border-b border-[rgba(20,26,22,0.08)]">
            <span className="font-mono text-[12px] font-bold text-[#141a16] uppercase tracking-wider flex items-center gap-1.5">
              <Package size={14} className="text-[#2f5640]" />
              Available Dispatches ({availableOrders.length})
            </span>
            <span className="text-[11px] font-mono text-[#7f857b]">
              Auto-updating via live socket
            </span>
          </div>

          {availableOrders.length === 0 ? (
            <div className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.10)] rounded-[8px] p-12 text-center text-[#7f857b] my-auto">
              <Compass size={28} className="text-[#7f857b] mx-auto mb-2 animate-spin" />
              <div className="text-[14px] font-bold text-[#141a16]">
                Scanning Karachi Corridor...
              </div>
              <p className="text-[12px] text-[#7f857b] mt-1">
                Waiting for incoming customer dispatch requests. New orders appear automatically without refresh.
              </p>
            </div>
          ) : (
            availableOrders.map((order, idx) => {
              const isNearest = idx === 0
              const isUrgent = order.priority === 'URGENT'
              const isHigh = order.priority === 'HIGH'
              const badge = getPriorityBadgeStyle(order.priority)

              return (
                <div
                  key={order.id}
                  className={`w-full bg-[#fbfaf7] border rounded-[10px] p-5 flex flex-col gap-3.5 shadow-sm hover:shadow-md transition-all ${
                    isUrgent
                      ? 'border-[#C94040] ring-1 ring-[#C94040]/30 bg-gradient-to-br from-[#fbfaf7] to-[#fff6f6]'
                      : isHigh
                      ? 'border-[#D4920A]/60 bg-gradient-to-br from-[#fbfaf7] to-[#fffdf5]'
                      : 'border-[rgba(20,26,22,0.12)]'
                  }`}
                >
                  {/* Top Bar: ID, Priority, Fare */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] font-extrabold text-[#2f5640] bg-[#2f5640]/10 px-2 py-0.5 rounded">
                        {order.displayId}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-[3px] font-mono text-[10.5px] font-bold uppercase shadow-2xs"
                        style={{ backgroundColor: badge.bg, color: badge.text }}
                      >
                        {order.priority}
                      </span>
                      {isNearest && (
                        <span className="font-mono text-[10px] uppercase text-[#2DB67D] bg-[#2DB67D]/12 px-2 py-0.5 rounded font-extrabold tracking-wider border border-[#2DB67D]/25">
                          ★ CLOSEST
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-[15px] font-extrabold text-[#2DB67D]">
                        PKR {order.estimatedFare}
                      </span>
                      <span className="block text-[9.5px] font-mono text-[#7f857b] uppercase">
                        Est. Payout
                      </span>
                    </div>
                  </div>

                  {/* Route corridor details */}
                  <div className="bg-[#f5f4ef] rounded-[6px] p-3 flex flex-col gap-2 border border-[rgba(20,26,22,0.06)]">
                    <div className="flex items-start gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#2f5640] mt-1 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-mono uppercase text-[#7f857b] block">
                          Pickup Location
                        </span>
                        <span className="text-[13px] font-semibold text-[#141a16] block truncate">
                          {order.pickupAddress}
                        </span>
                      </div>
                    </div>
                    <div className="w-[1px] h-2 bg-[#2f5640]/30 ml-1" />
                    <div className="flex items-start gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#2DB67D] mt-1 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-mono uppercase text-[#7f857b] block">
                          Drop-off Destination
                        </span>
                        <span className="text-[13px] font-semibold text-[#7f857b] block truncate">
                          {order.deliveryAddress}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metrics and Action */}
                  <div className="pt-2 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-[12px] font-mono">
                      <div>
                        <span className="text-[#7f857b] text-[10px] uppercase block">
                          Proximity
                        </span>
                        <span className="font-bold text-[#141a16]">
                          {order.calculatedDistance} km
                        </span>
                      </div>
                      <div className="w-[1px] h-5 bg-[rgba(20,26,22,0.10)]" />
                      <div>
                        <span className="text-[#7f857b] text-[10px] uppercase block">
                          Est. Transit
                        </span>
                        <span className="font-bold text-[#2f5640]">
                          {order.estimateTime}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAccept(order.id)}
                      className={`h-[38px] px-5 rounded-[5px] font-mono text-[12.5px] font-bold shadow-sm transition-all cursor-pointer flex items-center gap-2 ${
                        isUrgent
                          ? 'bg-[#C94040] hover:bg-[#a93030] text-white'
                          : 'bg-[#2f5640] hover:bg-[#254533] text-white'
                      }`}
                    >
                      <Zap size={14} />
                      <span>Accept Delivery</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right Column (45% width) — Interactive OpenStreetMap Radar */}
        <div className="w-full md:w-[45%] h-full flex flex-col bg-[#121d17] border-t md:border-t-0 md:border-l border-[rgba(255,255,255,0.08)] relative">
          <div className="p-3 bg-[#1c2c22] border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between text-[#ecebe1] text-[11px] font-mono z-10">
            <div className="flex items-center gap-2">
              <span className="mfl-live" />
              <span className="font-bold text-[#ffd98a] uppercase">
                OpenStreetMap Karachi Radar
              </span>
            </div>
            <span>{availableOrders.length} pending pickup points</span>
          </div>

          <div className="flex-1 relative">
            <OpenStreetMap
              height="100%"
              center={[riderLocation.lat, riderLocation.lng]}
              zoom={13}
              courier={{
                lat: riderLocation.lat,
                lng: riderLocation.lng,
                label: `${currentUser?.name || 'You'} (${riderLocation.name})`,
                isLive: true,
              }}
              markers={availableOrders.map((o) => ({
                id: o.id,
                lat: o.pickupLat,
                lng: o.pickupLng,
                label: `${o.displayId} (${o.calculatedDistance} km away)`,
                sublabel: `${o.pickupAddress} · ${o.priority}`,
                priority: o.priority,
                type: 'pickup' as const,
              }))}
              interactive={true}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
export default NearbyPickups
