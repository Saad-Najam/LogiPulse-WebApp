import React from 'react'
import { MessageSquare, ArrowLeft, ShieldCheck, MapPin } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { OrderStatus } from '../../types'
import { OpenStreetMap } from '../common/OpenStreetMap'

export const OrderTracking: React.FC = () => {
  const { orders, selectedOrderId, setCustomerView, ridersList } = useApp()

  const currentOrder =
    orders.find((o) => o.id === selectedOrderId) ||
    orders.find((o) => o.status === 'IN_TRANSIT') ||
    orders[0]

  const createdTime = currentOrder?.createdAt
    ? new Date(currentOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Pending'
  const updatedTime = currentOrder?.updatedAt
    ? new Date(currentOrder.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Pending'

  const statusPriorityMap: Record<OrderStatus, number> = {
    PENDING: 0,
    ACCEPTED: 1,
    PICKED_UP: 2,
    IN_TRANSIT: 3,
    DELIVERED: 4,
  }

  const currentLevel = currentOrder ? statusPriorityMap[currentOrder.status] : 0

  const timelineSteps: { status: OrderStatus; label: string; time: string }[] = [
    { status: 'PENDING', label: 'Order Created', time: createdTime },
    { status: 'ACCEPTED', label: 'Rider Assigned', time: currentLevel >= 1 ? updatedTime : 'Awaiting Rider' },
    { status: 'PICKED_UP', label: 'Package Picked Up', time: currentLevel >= 2 ? updatedTime : 'Pending Pickup' },
    { status: 'IN_TRANSIT', label: 'In Transit', time: currentLevel >= 3 ? updatedTime : 'Pending Transit' },
    { status: 'DELIVERED', label: 'Delivered', time: currentLevel >= 4 ? updatedTime : `Est. ${currentOrder?.estimatedTime || '~20 min'}` },
  ]

  const assignedRider = ridersList.find((r) => String(r.id) === String(currentOrder?.riderId))
  const courierLat = assignedRider?.currentLat || (currentOrder ? currentOrder.pickupLat + 0.005 : undefined)
  const courierLng = assignedRider?.currentLng || (currentOrder ? currentOrder.pickupLng + 0.005 : undefined)

  return (
    <div className="flex-1 flex flex-col bg-[#e5e4da] overflow-y-auto pb-10">
      {/* HERO SUBHEADER */}
      <section className="px-6 md:px-10 py-5 border-b border-[rgba(20,26,22,0.08)] bg-gradient-to-b from-[#e0dfd4] to-[#e5e4da] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="mfl-backer mb-2">
            <span className="mfl-backer-mark">✓</span>
            <b>Telemetry Active</b>
            <span className="text-[#7f857b]">· OpenStreetMap Karachi Real-Time Tracking</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] sm:text-[30px] font-normal tracking-[-0.03em] text-[#141a16] leading-tight">
              <span className="text-[#7f857b]">Tracking parcel </span>
              <span className="font-mono font-bold text-[#2f5640]">{currentOrder?.displayId || '#LP-01'}</span>
            </h1>
          </div>
          <p className="text-[12.5px] text-[#7f857b] font-mono mt-0.5">
            {currentOrder?.pickupAddress || 'PECHS'} → {currentOrder?.deliveryAddress || 'Clifton'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCustomerView('chat')}
            className="mfl-btn mfl-btn--brand mfl-btn--sm shadow-sm cursor-pointer"
          >
            <MessageSquare size={14} />
            <span>Chat Courier</span>
          </button>
          <button
            type="button"
            onClick={() => setCustomerView('dashboard')}
            className="mfl-btn mfl-btn--white mfl-btn--sm shadow-sm cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </button>
        </div>
      </section>

      {/* MAIN CONTAINER */}
      <div className="px-6 md:px-10 py-6 max-w-6xl w-full mx-auto flex flex-col gap-6">
        
        {/* OPENSTREETMAP LIVE TRACKING CONSOLE */}
        <div className="w-full relative bg-[#121d17] rounded-[10px] overflow-hidden border border-[rgba(255,255,255,0.08)] shadow-xl flex flex-col">
          {/* Top Left Live ETA Pill */}
          <div className="absolute top-4 left-4 z-20 bg-[#1c2c22]/90 backdrop-blur-md border border-[rgba(255,255,255,0.14)] px-3.5 py-2 rounded-[6px] shadow-lg flex items-center gap-2 pointer-events-none">
            <span className="mfl-live" />
            <div>
              <span className="font-mono text-[13.5px] text-[#ffd98a] font-bold block leading-none">
                {currentOrder?.estimatedTime || '~15 min'}
              </span>
              <span className="text-[10px] text-[#ecebe1]/60 font-mono">OpenStreetMap Live Telemetry</span>
            </div>
          </div>

          {/* Top Right Distance Pill */}
          <div className="absolute top-4 right-4 z-20 bg-[#1c2c22]/90 backdrop-blur-md border border-[rgba(255,255,255,0.14)] px-3 py-1.5 rounded-[5px] text-[11px] font-mono text-[#ecebe1] pointer-events-none">
            Distance: <span className="text-[#2DB67D] font-bold">{currentOrder?.distanceKm ? `${currentOrder.distanceKm} km` : 'Active Route'}</span>
          </div>

          {currentOrder ? (
            <OpenStreetMap
              height="380px"
              pickup={{
                lat: currentOrder.pickupLat,
                lng: currentOrder.pickupLng,
                label: `Pickup: ${currentOrder.pickupAddress}`,
              }}
              delivery={{
                lat: currentOrder.deliveryLat,
                lng: currentOrder.deliveryLng,
                label: `Dropoff: ${currentOrder.deliveryAddress}`,
              }}
              courier={
                currentOrder.riderId && courierLat && courierLng
                  ? {
                      lat: courierLat,
                      lng: courierLng,
                      label: `${currentOrder.riderName || 'Assigned Courier'} (Live)`,
                      isLive: true,
                    }
                  : undefined
              }
              showRoute={true}
            />
          ) : (
            <div className="h-[380px] flex items-center justify-center text-[#ecebe1]/60 font-mono text-[13px]">
              No active shipment tracking. Place a delivery to view OpenStreetMap telemetry.
            </div>
          )}
        </div>

        {/* BOTTOM SECTION: 2 COLUMNS (Timeline + Courier Card) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Status Timeline (2 cols) */}
          <div className="md:col-span-2 bg-[#fbfaf7] border border-[rgba(20,26,22,0.10)] rounded-[8px] p-6 shadow-sm">
            <h2 className="text-[15px] font-semibold text-[#141a16] pb-3 border-b border-[rgba(20,26,22,0.08)] mb-5">
              Live Transit Milestones
            </h2>

            <div className="flex flex-col gap-5">
              {timelineSteps.map((step, idx) => {
                const isCompleted = idx < currentLevel
                const isCurrent = idx === currentLevel
                const isLast = idx === timelineSteps.length - 1

                return (
                  <div key={step.status} className="flex items-start gap-4 relative">
                    {!isLast && (
                      <div
                        className={`absolute left-[7px] top-[18px] bottom-[-22px] w-[2px] ${
                          isCompleted ? 'bg-[#2DB67D]' : 'bg-[rgba(20,26,22,0.10)]'
                        }`}
                      />
                    )}

                    {/* Step Icon */}
                    <div className="relative z-10 flex items-center justify-center pt-0.5">
                      {isCompleted ? (
                        <div className="w-4 h-4 rounded-full bg-[#2DB67D] text-white flex items-center justify-center shadow-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                      ) : isCurrent ? (
                        <div className="w-4 h-4 rounded-full bg-[#C97A3A] ring-4 ring-[#C97A3A]/25 flex items-center justify-center animate-pulse">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-[rgba(20,26,22,0.25)] bg-[#fbfaf7]" />
                      )}
                    </div>

                    {/* Step Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[13.5px] ${
                            isCurrent
                              ? 'text-[#141a16] font-bold'
                              : isCompleted
                              ? 'text-[#141a16] font-semibold'
                              : 'text-[#7f857b]'
                          }`}
                        >
                          {step.label}
                        </span>
                        <span className="text-[11px] font-mono text-[#7f857b]">
                          {isCurrent ? (
                            <span className="text-[#C97A3A] font-semibold">In Progress...</span>
                          ) : (
                            step.time
                          )}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-[#7f857b] mt-0.5">
                        {idx === 0 && 'Package logged into Karachi central dispatch matrix'}
                        {idx === 1 && 'Ahmed Raza confirmed dispatch pickup assignment'}
                        {idx === 2 && 'Courier inspected package and verified receipt barcode'}
                        {idx === 3 && 'Courier en-route on Shahrah-e-Faisal corridor'}
                        {idx === 4 && 'Recipient signature and physical handoff required'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Courier Stat Card (1 col, Dark Inspo Card) */}
          <article className="mfl-stat w-full flex flex-col justify-between">
            <div>
              <header className="mfl-stat-top">
                <div>
                  <h3 className="mfl-stat-t">Assigned Courier</h3>
                  <p className="mfl-stat-d">Fleet Driver Profile</p>
                </div>
                <span className="mfl-ico">
                  <ShieldCheck size={13} className="text-[#2DB67D]" />
                </span>
              </header>

              <div className="flex items-center gap-3.5 mt-4">
                <div className="w-12 h-12 rounded-[8px] bg-[#2f4436] border border-[rgba(255,255,255,0.15)] flex items-center justify-center text-[#ffd98a] font-bold text-[16px] shadow-sm">
                  AR
                </div>
                <div>
                  <div className="text-[15px] font-bold text-[#ecebe1]">
                    {currentOrder?.riderName || 'Ahmed Raza'}
                  </div>
                  <div className="text-[11.5px] text-[#ecebe1]/70 font-mono">
                    Yamaha YBR · Karachi West
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-1.5 py-0.2 rounded bg-[#2DB67D]/20 text-[#2DB67D] text-[10px] font-mono font-semibold">
                      ★ 4.9 (420+ trips)
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.08)] flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11.5px] text-[#ecebe1]/70 font-mono">
                  <span>Current Proximity:</span>
                  <span className="text-[#2DB67D] font-bold">1.4 km</span>
                </div>
                <div className="flex items-center justify-between text-[11.5px] text-[#ecebe1]/70 font-mono">
                  <span>Estimated Hand-off:</span>
                  <span className="text-[#ffd98a] font-bold">12:05 PM</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCustomerView('chat')}
              className="mfl-btn mfl-btn--cream mfl-btn--wide mt-6 cursor-pointer shadow-md"
            >
              <MessageSquare size={14} />
              <span>Direct Courier Chat</span>
            </button>
          </article>

        </div>

      </div>
    </div>
  )
}
export default OrderTracking
