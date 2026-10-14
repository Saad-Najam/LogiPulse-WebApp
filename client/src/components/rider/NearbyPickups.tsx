import React, { useState } from 'react'
import { Compass, MapPin, Navigation, Layers, Radio } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { haversineDistance, estimateTimeMinutes, KARACHI_LOCATIONS } from '../../utils/haversine'
import { PriorityLevel } from '../../types'
import { OpenStreetMap } from '../common/OpenStreetMap'

export const NearbyPickups: React.FC = () => {
  const {
    orders,
    riderLocation,
    updateRiderLocation,
    acceptOrder,
    setRiderView,
    isLiveGpsActive,
    toggleDeviceGps,
  } = useApp()

  const [filterPriority, setFilterPriority] = useState<PriorityLevel | 'ALL'>('ALL')
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [displayMode, setDisplayMode] = useState<'map' | 'radar'>('map')

  // Real Haversine distance calculations
  const availableOrders = orders
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
            <div className="mfl-backer mb-2">
              <span className="mfl-backer-mark">✓</span>
              <b>Proximity Radar Engine</b>
              <span className="text-[#7f857b]">· 10km Haversine Scan</span>
            </div>

            <h1 className="text-[26px] sm:text-[34px] font-normal tracking-[-0.04em] text-[#141a16] leading-tight">
              <span className="text-[#7f857b]">Available Pickups / </span>
              <span>Nearby Karachi Dispatches</span>
            </h1>
            <p className="text-[12.5px] text-[#7f857b] mt-1 font-mono">
              Current Origin: <span className="font-semibold text-[#141a16]">{riderLocation.name}</span>
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
              <span>{isLiveGpsActive ? '● GPS Streaming Live' : 'Use Device GPS'}</span>
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

      {/* TWO COLUMN WORKSPACE (55% Left Orders, 45% Right Night Radar Console) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Column (55% width) — Available Orders List */}
        <div className="w-full md:w-[55%] h-full overflow-y-auto p-6 flex flex-col gap-4 border-r border-[rgba(20,26,22,0.10)]">
          {availableOrders.length === 0 ? (
            <div className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.10)] rounded-[8px] p-12 text-center text-[#7f857b] my-auto">
              <Compass size={24} className="text-[#7f857b] mx-auto mb-2" />
              <div className="text-[14px] font-bold text-[#141a16]">No nearby pickups detected</div>
              <p className="text-[12px] text-[#7f857b] mt-1">
                There are no orders matching this filter within the 10km radar scan.
              </p>
            </div>
          ) : (
            availableOrders.map((order, idx) => {
              const isNearest = idx === 0
              const isUrgent = order.priority === 'URGENT'
              const badge = getPriorityBadgeStyle(order.priority)

              return (
                <div
                  key={order.id}
                  className={`w-full bg-[#fbfaf7] border rounded-[8px] p-4.5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all ${
                    isUrgent
                      ? 'border-[#C94040]/40 ring-1 ring-[#C94040]/20'
                      : 'border-[rgba(20,26,22,0.12)]'
                  }`}
                >
                  {/* Top row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12.5px] font-bold text-[#2f5640] bg-[#2f5640]/8 px-2 py-0.5 rounded">
                        {order.displayId}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-[3px] font-mono text-[10px] font-bold uppercase shadow-2xs"
                        style={{ backgroundColor: badge.bg, color: badge.text }}
                      >
                        {order.priority}
                      </span>
                    </div>

                    {isNearest && (
                      <span className="font-mono text-[10.5px] uppercase text-[#2DB67D] bg-[#2DB67D]/12 px-2 py-0.5 rounded font-extrabold tracking-wider">
                        ★ NEAREST TO YOU
                      </span>
                    )}
                  </div>

                  {/* Route details */}
                  <div className="text-[12.5px]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#2f5640]" />
                      <span className="text-[#7f857b] font-mono text-[10.5px]">FROM:</span>
                      <span className="text-[#141a16] font-semibold">{order.pickupAddress}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-2 h-2 rounded-full bg-[#2DB67D]" />
                      <span className="text-[#7f857b] font-mono text-[10.5px]">TO:</span>
                      <span className="text-[#7f857b]">{order.deliveryAddress}</span>
                    </div>
                  </div>

                  {/* Distance hero element */}
                  <div className="pt-2.5 border-t border-[rgba(20,26,22,0.08)] flex items-baseline justify-between">
                    <div>
                      <div className="font-mono text-[20px] font-bold text-[#2DB67D] leading-none">
                        {order.calculatedDistance} km away
                      </div>
                      <div className="text-[11px] text-[#7f857b] mt-1 font-mono">
                        {order.estimateTime} travel time
                      </div>
                    </div>

                    <span className="text-[11.5px] font-mono text-[#7f857b] bg-[#eeede6] px-2 py-0.5 rounded">
                      {order.packageSize} Parcel
                    </span>
                  </div>

                  {/* Accept Button */}
                  <button
                    type="button"
                    onClick={() => handleAccept(order.id)}
                    className="mfl-btn mfl-btn--brand mfl-btn--wide mt-1 shadow-sm cursor-pointer"
                  >
                    Accept Dispatch
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Right Column (48% width) — Interactive OpenStreetMap / Radar Console */}
        <div className="w-full md:w-[48%] h-full p-4 md:p-6 flex flex-col justify-center items-center bg-[#e5e4da]">
          <div className="w-full max-w-[460px] bg-[#121d17] border border-[rgba(255,255,255,0.12)] rounded-[12px] p-5 shadow-2xl flex flex-col relative overflow-hidden">
            
            {/* Header with Mode Switcher */}
            <div className="w-full flex items-center justify-between mb-3 z-10">
              <div className="flex items-center gap-2">
                <span className="mfl-live" />
                <span className="font-mono text-[11.5px] uppercase text-[#ffd98a] font-bold tracking-wider">
                  {displayMode === 'map' ? 'OpenStreetMap Karachi Radar' : 'Radar Console'}
                </span>
              </div>
              
              <div className="flex items-center gap-1 bg-[#1c2c22] p-0.5 rounded-[4px] border border-[rgba(255,255,255,0.10)]">
                <button
                  type="button"
                  onClick={() => setDisplayMode('map')}
                  className={`px-2 py-0.5 rounded-[3px] text-[10px] font-mono cursor-pointer transition-all ${
                    displayMode === 'map' ? 'bg-[#2DB67D] text-white font-bold' : 'text-[#ecebe1]/60 hover:text-[#ecebe1]'
                  }`}
                >
                  Map
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode('radar')}
                  className={`px-2 py-0.5 rounded-[3px] text-[10px] font-mono cursor-pointer transition-all ${
                    displayMode === 'radar' ? 'bg-[#2DB67D] text-white font-bold' : 'text-[#ecebe1]/60 hover:text-[#ecebe1]'
                  }`}
                >
                  Radar
                </button>
              </div>
            </div>

            {displayMode === 'map' ? (
              <div className="w-full flex flex-col gap-2">
                <OpenStreetMap
                  height="300px"
                  center={[riderLocation.lat, riderLocation.lng]}
                  zoom={12}
                  courier={{
                    lat: riderLocation.lat,
                    lng: riderLocation.lng,
                    label: `YOU (${riderLocation.name})`,
                    isLive: isLiveGpsActive,
                  }}
                  markers={availableOrders.map((ord) => ({
                    id: ord.id,
                    lat: ord.pickupLat,
                    lng: ord.pickupLng,
                    label: `${ord.displayId} (${ord.calculatedDistance} km)`,
                    sublabel: ord.pickupAddress,
                    priority: ord.priority,
                    type: 'pickup',
                    onClick: () => handleAccept(ord.id),
                  }))}
                  showRoute={false}
                />
                <div className="flex items-center justify-between px-1 text-[11px] font-mono text-[#ecebe1]/70">
                  <span>● Yellow: You · Pins: Pickups</span>
                  <span className="text-[#ffd98a]">{availableOrders.length} nearby dispatches</span>
                </div>
              </div>
            ) : (
              <>
                {/* Radar Canvas with concentric rings */}
                <div className="w-[280px] h-[280px] mx-auto rounded-full border border-[rgba(255,255,255,0.14)] relative flex items-center justify-center bg-[#1c2c22]/50 shadow-inner">
                  
                  {/* 5km Ring */}
                  <div className="w-[180px] h-[180px] rounded-full border border-[rgba(255,255,255,0.12)] absolute flex items-center justify-center">
                    {/* 2km Ring */}
                    <div className="w-[90px] h-[90px] rounded-full border border-[rgba(255,255,255,0.10)] absolute" />
                  </div>

                  {/* Crosshairs */}
                  <div className="w-full h-[1px] bg-[rgba(255,255,255,0.06)] absolute" />
                  <div className="h-full w-[1px] bg-[rgba(255,255,255,0.06)] absolute" />

                  {/* Range labels */}
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] text-[#ecebe1]/40">10km</span>
                  <span className="absolute right-[52px] top-1/2 -translate-y-1/2 font-mono text-[9px] text-[#ecebe1]/40">5km</span>
                  <span className="absolute right-[96px] top-1/2 -translate-y-1/2 font-mono text-[9px] text-[#ecebe1]/40">2km</span>

                  {/* Center Rider Position */}
                  <div className="relative z-20 flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-[#2DB67D] shadow-[0_0_12px_#2DB67D] border-2 border-white" />
                    <span className="text-[9.5px] font-mono text-[#2DB67D] mt-1 font-bold">
                      YOU
                    </span>
                  </div>

                  {/* Order Radar Blips */}
                  {availableOrders.slice(0, 6).map((ord, idx) => {
                    const angle = (idx * 65 + 35) * (Math.PI / 180)
                    const distanceFactor = Math.min(10, ord.calculatedDistance) / 10
                    const radius = distanceFactor * 120 + 15
                    const x = Math.cos(angle) * radius
                    const y = Math.sin(angle) * radius

                    const pinColor =
                      ord.priority === 'URGENT'
                        ? '#C94040'
                        : ord.priority === 'HIGH'
                        ? '#ffd98a'
                        : '#2DB67D'

                    return (
                      <div
                        key={ord.id}
                        style={{ transform: `translate(${x}px, ${y}px)` }}
                        className="absolute z-30 flex items-center gap-1 group cursor-pointer"
                        title={`${ord.displayId} (${ord.calculatedDistance} km)`}
                      >
                        <div
                          style={{ backgroundColor: pinColor }}
                          className="w-2.5 h-2.5 rounded-full shadow-sm animate-pulse"
                        />
                        <span className="font-mono text-[9px] text-[#ecebe1] bg-[#121d17]/90 px-1 py-0.2 rounded border border-[rgba(255,255,255,0.12)]">
                          {ord.displayId}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 text-center">
                  <span className="text-[11.5px] text-[#ecebe1]/70 font-mono">
                    {availableOrders.length} orders within current dispatch sector
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
export default NearbyPickups
