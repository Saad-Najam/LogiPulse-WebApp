import React, { useState } from 'react'
import { MapPin, ArrowRight, Compass, Bike, Sparkles } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { haversineDistance, KARACHI_LOCATIONS } from '../../utils/haversine'

export const RiderDashboard: React.FC = () => {
  const {
    orders,
    isRiderOnline,
    toggleRiderOnline,
    riderLocation,
    updateRiderLocation,
    setRiderView,
    acceptOrder,
  } = useApp()

  const [showLocationPicker, setShowLocationPicker] = useState(false)

  // Calculate real distance for all pending orders using Haversine formula
  const pendingOrdersWithDistance = orders
    .filter((o) => o.status === 'PENDING')
    .map((order) => {
      const dist = haversineDistance(
        riderLocation.lat,
        riderLocation.lng,
        order.pickupLat,
        order.pickupLng
      )
      return {
        ...order,
        calculatedDistance: dist,
      }
    })
    .sort((a, b) => a.calculatedDistance - b.calculatedDistance)

  const previewOrders = pendingOrdersWithDistance.slice(0, 3)

  const handleAccept = (orderId: string) => {
    acceptOrder(orderId)
    setRiderView('active')
  }

  return (
    <div className="flex-1 flex flex-col bg-[#e5e4da] overflow-y-auto pb-12">
      {/* HERO BANNER SECTION */}
      <section className="px-6 md:px-10 pt-8 pb-6 border-b border-[rgba(20,26,22,0.08)] bg-gradient-to-b from-[#e0dfd4] to-[#e5e4da]">
        
        {/* Eyebrow Pill */}
        <div className="mfl-backer mb-3">
          <span className="mfl-backer-mark">✓</span>
          <b>Karachi Courier Unit #AR-09</b>
          <span className="text-[#7f857b]">· {riderLocation.name} GPS Locked</span>
        </div>

        {/* Display Headline */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-[32px] sm:text-[42px] font-normal tracking-[-0.04em] text-[#141a16] leading-[1.05]">
              <span className="block text-[#7f857b]">Rider Dispatch Console ·</span>
              <span>{isRiderOnline ? 'Ready for immediate dispatch' : 'Currently offline'}</span>
            </h1>
            <p className="text-[#7f857b] text-[14px] mt-2 max-w-xl">
              Automatic order dispatching based on real-time Haversine distance, corridor traffic, and priority rating.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setRiderView('nearby')}
              className="mfl-btn mfl-btn--brand shadow-md cursor-pointer"
            >
              <Compass size={15} />
              <span>Nearby Radar</span>
            </button>
            <button
              type="button"
              onClick={() => setRiderView('active')}
              className="mfl-btn mfl-btn--white shadow-sm cursor-pointer"
            >
              <Bike size={14} />
              <span>Active Delivery</span>
            </button>
          </div>
        </div>

        {/* STAT & CONSOLE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          
          {/* Card 1: Online Status Hardware Switch (Tactile Card) */}
          <div className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.12)] rounded-[8px] p-5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-[#7f857b] tracking-wider">
                Fleet Signal Mode
              </span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isRiderOnline ? 'bg-[#2DB67D] shadow-[0_0_8px_#2DB67D]' : 'bg-[#7f857b]'
                }`}
              />
            </div>

            <div className="my-3">
              <span
                className={`text-[24px] font-bold tracking-tight block ${
                  isRiderOnline ? 'text-[#2DB67D]' : 'text-[#7f857b]'
                }`}
              >
                {isRiderOnline ? 'ONLINE & ACTIVE' : 'OFFLINE'}
              </span>
              <span className="text-[12px] text-[#7f857b] mt-0.5 block">
                {isRiderOnline
                  ? 'Receiving priority pickups within 12km'
                  : 'Toggle switch to open telemetry pipeline'}
              </span>
            </div>

            <button
              type="button"
              onClick={toggleRiderOnline}
              className={`h-[40px] rounded-[5px] text-[13px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs ${
                isRiderOnline
                  ? 'bg-[#2DB67D] text-[#141a16] hover:bg-[#259b69]'
                  : 'bg-[#2f4436] text-white hover:bg-[#244231]'
              }`}
            >
              <span>{isRiderOnline ? 'Switch to Offline' : 'Go Online Now'}</span>
            </button>
          </div>

          {/* Card 2: Earnings & Performance (Inspo Dark Card) */}
          <article className="mfl-stat w-full">
            <header className="mfl-stat-top">
              <div>
                <h3 className="mfl-stat-t">Weekly Payout</h3>
                <p className="mfl-stat-d">7 Completed Deliveries</p>
              </div>
              <span className="mfl-ico">
                <Sparkles size={11} className="text-[#ffd98a]" />
              </span>
            </header>

            <div className="mfl-stat-amt font-mono text-[#ffd98a]">Rs 22,800</div>
            <div className="mfl-stat-chg">
              <span className="mfl-chg">+18.2%</span>
              <span>vs last cycle</span>
            </div>

            <div className="mfl-stat-split">
              <div className="flex-1 flex items-center justify-between text-[11px] text-[#ecebe1]/80 font-mono">
                <span>Rating:</span>
                <span className="text-[#ffd98a] font-bold">★ 4.9 (420+ trips)</span>
              </div>
            </div>
          </article>

          {/* Card 3: GPS Zone Selector */}
          <div className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.12)] rounded-[8px] p-5 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-[#7f857b] tracking-wider">
                  GPS Anchor Corridor
                </span>
                <MapPin size={15} className="text-[#2DB67D]" />
              </div>
              <div className="text-[16px] font-bold text-[#141a16] mt-2">
                {riderLocation.name}
              </div>
              <p className="text-[11.5px] text-[#7f857b] font-mono mt-0.5">
                Lat: {riderLocation.lat.toFixed(4)}, Lng: {riderLocation.lng.toFixed(4)}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[rgba(20,26,22,0.08)] flex items-center justify-between">
              <span className="text-[11px] text-[#7f857b]">Haversine Origin</span>
              <button
                type="button"
                onClick={() => setShowLocationPicker((prev) => !prev)}
                className="text-[12px] font-semibold text-[#2f5640] hover:underline cursor-pointer"
              >
                {showLocationPicker ? 'Close' : 'Change Zone'}
              </button>
            </div>
          </div>

        </div>

        {/* LOCATION SELECTOR DRAWER */}
        {showLocationPicker && (
          <div className="mt-4 bg-[#fbfaf7] border border-[rgba(20,26,22,0.12)] rounded-[8px] p-4 shadow-sm animate-fade">
            <span className="text-[11px] font-mono uppercase text-[#7f857b] mb-2 block font-semibold">
              Select Karachi Station (Auto-recomputes real distance for all orders)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {KARACHI_LOCATIONS.map((loc) => (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => {
                    updateRiderLocation(loc.name, loc.lat, loc.lng)
                    setShowLocationPicker(false)
                  }}
                  className={`text-left text-[12px] p-2.5 rounded-[5px] border transition-all cursor-pointer ${
                    riderLocation.name === loc.name
                      ? 'bg-[#2f5640] text-white border-[#2f5640] font-bold shadow-xs'
                      : 'bg-[#f5f4ef] text-[#141a16] border-[rgba(20,26,22,0.10)] hover:bg-[#eeede6]'
                  }`}
                >
                  {loc.name}
                </button>
              ))}
            </div>
          </div>
        )}

      </section>

      {/* MAIN NEARBY ORDERS PREVIEW MATRIX */}
      <div className="px-6 md:px-10 py-6 max-w-7xl w-full mx-auto flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-[#141a16] tracking-tight">
              Nearby Dispatch Opportunities
            </h2>
            <p className="text-[12px] text-[#7f857b]">
              Orders sorted dynamically by Haversine proximity to {riderLocation.name}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setRiderView('nearby')}
            className="text-[12px] font-semibold text-[#2f5640] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Full Radar Scanner</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {previewOrders.length === 0 ? (
          <div className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.10)] rounded-[8px] p-10 text-center shadow-sm">
            <Bike size={24} className="text-[#7f857b] mx-auto mb-2" />
            <h3 className="text-[14px] font-bold text-[#141a16]">No pending pickups nearby</h3>
            <p className="text-[12px] text-[#7f857b] mt-0.5">
              Check back in a few minutes or switch location zone to view adjacent corridors.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {previewOrders.map((order) => {
              const isUrgent = order.priority === 'URGENT'
              const isHigh = order.priority === 'HIGH'

              return (
                <div
                  key={order.id}
                  className={`bg-[#fbfaf7] rounded-[8px] p-5 border flex flex-col justify-between shadow-sm transition-all hover:shadow-md ${
                    isUrgent
                      ? 'border-[#C94040]/40 ring-1 ring-[#C94040]/20'
                      : 'border-[rgba(20,26,22,0.12)]'
                  }`}
                >
                  <div>
                    {/* Top Order Row */}
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="font-mono text-[12px] font-bold text-[#2f5640] bg-[#2f5640]/8 px-2 py-0.5 rounded">
                        {order.displayId}
                      </span>
                      <span
                        className={`text-[10.5px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                          isUrgent
                            ? 'bg-[#C94040] text-white shadow-xs'
                            : isHigh
                            ? 'bg-[#D4920A] text-white shadow-xs'
                            : 'bg-[#eeede6] text-[#7f857b]'
                        }`}
                      >
                        {order.priority}
                      </span>
                    </div>

                    {/* Proximity Pill */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-mono text-[14px] font-extrabold text-[#2DB67D]">
                        {order.calculatedDistance.toFixed(1)} km away
                      </span>
                      <span className="text-[11px] text-[#7f857b]">from your location</span>
                    </div>

                    {/* Route */}
                    <div className="text-[12.5px] text-[#141a16] font-medium">
                      <div className="flex items-center gap-1.5 text-[#141a16]">
                        <span className="w-2 h-2 rounded-full bg-[#2f5640]" />
                        <span className="truncate">{order.pickupAddress}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#7f857b] mt-1">
                        <span className="w-2 h-2 rounded-full bg-[#2DB67D]" />
                        <span className="truncate">{order.deliveryAddress}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-[#7f857b] font-mono mt-3 pt-2.5 border-t border-[rgba(20,26,22,0.06)]">
                      {order.packageSize} Parcel · {order.description}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAccept(order.id)}
                    className="mfl-btn mfl-btn--brand mfl-btn--wide mt-4 shadow-sm cursor-pointer"
                  >
                    Accept Dispatch
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
export default RiderDashboard
