import React, { useState, useEffect, useRef } from 'react'
import {
  MessageSquare,
  ArrowLeft,
  ShieldCheck,
  MapPin,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Navigation,
  CheckCircle2,
  PackageCheck,
  PlusCircle,
  Truck,
  ExternalLink,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { OrderStatus, Order } from '../../types'
import { OpenStreetMap } from '../common/OpenStreetMap'
import { API_URL } from '../../services/api'

export const OrderTracking: React.FC = () => {
  const {
    orders,
    selectedOrderId,
    setSelectedOrderId,
    setCustomerView,
    ridersList,
    currentUser,
  } = useApp()

  // Relevant orders for customer (or all if admin)
  const relevantOrders =
    currentUser && currentUser.role === 'customer'
      ? orders.filter((o) => String(o.userId) === String(currentUser.id))
      : orders

  const activeOrders = relevantOrders.filter((o) => o.status !== 'DELIVERED')
  const deliveredOrders = relevantOrders.filter((o) => o.status === 'DELIVERED')

  // Find the order currently targeted for live tracking:
  // 1. If selectedOrderId is an active order, track that.
  // 2. Otherwise pick active order in IN_TRANSIT, PICKED_UP, ACCEPTED, or PENDING.
  // 3. If no active order exists, check if user explicitly selected a completed order to inspect,
  //    otherwise null (shows All Deliveries Complete screen).
  const [inspectCompletedOrder, setInspectCompletedOrder] = useState<Order | null>(null)

  const activeCurrentOrder =
    activeOrders.find((o) => o.id === selectedOrderId) ||
    activeOrders.find((o) => o.status === 'IN_TRANSIT') ||
    activeOrders.find((o) => o.status === 'PICKED_UP' || o.status === 'ACCEPTED') ||
    activeOrders[0] ||
    null

  const currentOrder = activeCurrentOrder || inspectCompletedOrder

  // Simulation state for live demonstration
  const [isSimulating, setIsSimulating] = useState(false)
  const [simProgress, setSimProgress] = useState(0) // 0 to 1
  const [simSpeed, setSimSpeed] = useState<1 | 2 | 4>(1)
  const simTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Real road geometry fetched from OSRM via backend proxy
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([])
  const [roadDistanceKm, setRoadDistanceKm] = useState<number>(0)
  const [roadDurationMin, setRoadDurationMin] = useState<number>(0)

  useEffect(() => {
    if (!currentOrder) return
    const pLat = currentOrder.pickupLat
    const pLng = currentOrder.pickupLng
    const dLat = currentOrder.deliveryLat
    const dLng = currentOrder.deliveryLng

    fetch(`${API_URL}/api/routes/directions?originLat=${pLat}&originLng=${pLng}&destLat=${dLat}&destLng=${dLng}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.coordinates) && data.coordinates.length > 0) {
          setRouteGeometry(data.coordinates)
          setRoadDistanceKm(data.distanceKm)
          setRoadDurationMin(data.durationMin)
        }
      })
      .catch((err) => console.warn('Failed to fetch route directions:', err))
  }, [
    currentOrder?.id,
    currentOrder?.pickupLat,
    currentOrder?.pickupLng,
    currentOrder?.deliveryLat,
    currentOrder?.deliveryLng,
  ])

  // Reset simulation when tracked order changes
  useEffect(() => {
    setIsSimulating(false)
    setSimProgress(0)
  }, [currentOrder?.id])

  // Simulation step timer
  useEffect(() => {
    if (!isSimulating) {
      if (simTimerRef.current) clearInterval(simTimerRef.current)
      return
    }

    simTimerRef.current = setInterval(() => {
      setSimProgress((prev) => {
        const next = prev + 0.012 * simSpeed
        if (next >= 1) {
          setIsSimulating(false)
          return 1
        }
        return next
      })
    }, 400)

    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current)
    }
  }, [isSimulating, simSpeed])

  const handleToggleSimulation = () => {
    if (simProgress >= 1) {
      setSimProgress(0)
    }
    setIsSimulating((prev) => !prev)
  }

  const handleResetSimulation = () => {
    setIsSimulating(false)
    setSimProgress(0)
  }

  // Calculate coordinates for the current order
  const pickupPt = {
    lat: currentOrder?.pickupLat || 24.886,
    lng: currentOrder?.pickupLng || 67.195,
  }
  const dropPt = {
    lat: currentOrder?.deliveryLat || 24.928,
    lng: currentOrder?.deliveryLng || 67.0785,
  }

  const assignedRider = ridersList.find(
    (r) => String(r.id) === String(currentOrder?.riderId)
  )

  // Courier position: travels smoothly along actual road waypoints!
  let courierLat = assignedRider?.currentLat || pickupPt.lat
  let courierLng = assignedRider?.currentLng || pickupPt.lng

  if (routeGeometry.length > 1) {
    if (simProgress <= 0) {
      courierLat = assignedRider?.currentLat || routeGeometry[0][0]
      courierLng = assignedRider?.currentLng || routeGeometry[0][1]
    } else if (simProgress >= 1) {
      courierLat = routeGeometry[routeGeometry.length - 1][0]
      courierLng = routeGeometry[routeGeometry.length - 1][1]
    } else {
      const exactIndex = simProgress * (routeGeometry.length - 1)
      const lowerIndex = Math.floor(exactIndex)
      const upperIndex = Math.min(routeGeometry.length - 1, lowerIndex + 1)
      const fraction = exactIndex - lowerIndex

      const p1 = routeGeometry[lowerIndex]
      const p2 = routeGeometry[upperIndex]
      courierLat = p1[0] + (p2[0] - p1[0]) * fraction
      courierLng = p1[1] + (p2[1] - p1[1]) * fraction
    }
  } else if (simProgress > 0) {
    const curveOffset = Math.sin(simProgress * Math.PI) * 0.005
    courierLat = pickupPt.lat + (dropPt.lat - pickupPt.lat) * simProgress + curveOffset
    courierLng = pickupPt.lng + (dropPt.lng - pickupPt.lng) * simProgress - curveOffset * 0.6
  }

  const totalDistance = roadDistanceKm || currentOrder?.distanceKm || 12.4
  const remainingDistance = Math.max(
    0.1,
    Math.round((1 - simProgress) * totalDistance * 10) / 10
  )
  const totalDuration = roadDurationMin || 25
  const remainingMinutes = Math.max(1, Math.round((1 - simProgress) * totalDuration))

  const createdTime = currentOrder?.createdAt
    ? new Date(currentOrder.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Pending'
  const updatedTime = currentOrder?.updatedAt
    ? new Date(currentOrder.updatedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Pending'

  const statusPriorityMap: Record<OrderStatus, number> = {
    PENDING: 0,
    ACCEPTED: 1,
    PICKED_UP: 2,
    IN_TRANSIT: 3,
    DELIVERED: 4,
  }

  let currentLevel = currentOrder ? statusPriorityMap[currentOrder.status] : 1
  if (isSimulating || simProgress > 0) {
    if (simProgress >= 0.95) currentLevel = 4
    else if (simProgress >= 0.5) currentLevel = 3
    else if (simProgress >= 0.15) currentLevel = 2
    else currentLevel = 1
  }

  const activeRiderName =
    currentOrder?.riderName ||
    (ridersList.length > 0 ? ridersList[0].name : 'Courier Partner')

  const riderInitials = activeRiderName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'CP'

  const timelineSteps: { status: OrderStatus; label: string; time: string }[] = [
    { status: 'PENDING', label: 'Order Created', time: createdTime },
    {
      status: 'ACCEPTED',
      label: 'Rider Assigned',
      time: currentLevel >= 1 ? updatedTime : 'Awaiting Rider Match',
    },
    {
      status: 'PICKED_UP',
      label: 'Package Picked Up',
      time: currentLevel >= 2 ? updatedTime : 'Pending Pickup Verification',
    },
    {
      status: 'IN_TRANSIT',
      label: 'In Transit along Corridor',
      time: currentLevel >= 3 ? updatedTime : 'En Route to Destination',
    },
    {
      status: 'DELIVERED',
      label: 'Delivered',
      time:
        currentLevel >= 4
          ? updatedTime
          : simProgress > 0
          ? `Est. ~${remainingMinutes} min`
          : `Est. ${currentOrder?.estimatedTime || '~20 min'}`,
    },
  ]

  // ----------------------------------------------------
  // EMPTY / ALL DELIVERIES COMPLETED SCREEN
  // ----------------------------------------------------
  if (!currentOrder) {
    const latestDelivered = deliveredOrders[0]

    return (
      <div className="flex-1 flex flex-col bg-[#e5e4da] overflow-y-auto pb-12 select-none">
        {/* HERO HEADER */}
        <section className="px-6 md:px-10 py-6 border-b border-[rgba(20,26,22,0.08)] bg-gradient-to-b from-[#e0dfd4] to-[#e5e4da] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="mfl-backer mb-2">
              <span className="mfl-backer-mark">✓</span>
              <b>LogiPulse Radar Status</b>
              <span className="text-[#2DB67D] font-bold">· 100% Fulfilled</span>
            </div>
            <h1 className="text-[26px] sm:text-[32px] font-normal tracking-[-0.03em] text-[#141a16] leading-tight">
              <span>Live Radar / </span>
              <span className="text-[#7f857b]">No Active Deliveries</span>
            </h1>
            <p className="text-[13px] text-[#7f857b] mt-1">
              All your packages have been successfully delivered to their destinations.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCustomerView('new-order')}
              className="mfl-btn mfl-btn--brand shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle size={15} />
              <span>Create New Delivery</span>
            </button>
            <button
              type="button"
              onClick={() => setCustomerView('dashboard')}
              className="mfl-btn mfl-btn--white shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Dashboard</span>
            </button>
          </div>
        </section>

        {/* CENTER CONTENT */}
        <div className="px-6 md:px-10 py-10 max-w-3xl w-full mx-auto flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#2DB67D]/15 border border-[#2DB67D]/30 flex items-center justify-center text-[#2DB67D] shadow-sm mb-5">
            <PackageCheck size={32} />
          </div>

          <h2 className="text-[22px] font-bold text-[#141a16]">
            All Deliveries Completed
          </h2>
          <p className="text-[14px] text-[#7f857b] mt-2 max-w-lg">
            There are currently no shipments in transit. When a rider accepts a new delivery request, live OpenStreetMap telemetry, route curves, and GPS milestone tracking will activate here automatically.
          </p>

          <div className="flex items-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => setCustomerView('new-order')}
              className="mfl-btn mfl-btn--brand shadow-md flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle size={15} />
              <span>Place New Shipment</span>
            </button>
            <button
              type="button"
              onClick={() => setCustomerView('dashboard')}
              className="mfl-btn mfl-btn--white shadow-sm cursor-pointer"
            >
              Back to Overview
            </button>
          </div>

          {/* RECENTLY DELIVERED SHIPMENT CARD */}
          {latestDelivered && (
            <div className="w-full mt-10 bg-[#fbfaf7] border border-[rgba(20,26,22,0.12)] rounded-[10px] p-5 shadow-sm text-left">
              <div className="flex items-center justify-between pb-3 border-b border-[rgba(20,26,22,0.08)] mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#2DB67D]" />
                  <span className="text-[13px] font-bold text-[#141a16]">
                    Most Recently Delivered Shipment
                  </span>
                  <span className="font-mono text-[11px] text-[#2f5640] bg-[#2f5640]/10 px-2 py-0.5 rounded font-bold">
                    {latestDelivered.displayId}
                  </span>
                </div>
                <span className="font-mono text-[11px] bg-[#2DB67D] text-white px-2 py-0.5 rounded font-semibold uppercase">
                  DELIVERED
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12.5px]">
                <div>
                  <span className="text-[10.5px] font-mono text-[#7f857b] uppercase block">
                    Pickup Station
                  </span>
                  <span className="text-[#141a16] font-medium block truncate mt-0.5">
                    {latestDelivered.pickupAddress}
                  </span>
                </div>
                <div>
                  <span className="text-[10.5px] font-mono text-[#7f857b] uppercase block">
                    Destination Dropoff
                  </span>
                  <span className="text-[#141a16] font-medium block truncate mt-0.5">
                    {latestDelivered.deliveryAddress}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[rgba(20,26,22,0.08)] flex items-center justify-between text-[11.5px] font-mono text-[#7f857b]">
                <span>Distance: {latestDelivered.distanceKm} km</span>
                <button
                  type="button"
                  onClick={() => setInspectCompletedOrder(latestDelivered)}
                  className="text-[#2f5640] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Review Map & Route</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ----------------------------------------------------
  // ACTIVE TRACKING SCREEN
  // ----------------------------------------------------
  return (
    <div className="flex-1 flex flex-col bg-[#e5e4da] overflow-y-auto pb-10 select-none">
      {/* HERO SUBHEADER */}
      <section className="px-6 md:px-10 py-5 border-b border-[rgba(20,26,22,0.08)] bg-gradient-to-b from-[#e0dfd4] to-[#e5e4da] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="mfl-backer mb-2">
            <span className="mfl-backer-mark">✓</span>
            <b>Real-Time GPS Telemetry</b>
            <span className="text-[#7f857b]">· OpenStreetMap Karachi Active Corridor</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] sm:text-[30px] font-normal tracking-[-0.03em] text-[#141a16] leading-tight">
              <span className="text-[#7f857b]">Tracking shipment </span>
              <span className="font-mono font-bold text-[#2f5640]">
                {currentOrder.displayId}
              </span>
            </h1>
            {currentOrder.status === 'DELIVERED' && (
              <span className="font-mono text-[11px] bg-[#2DB67D] text-white px-2 py-0.5 rounded font-bold">
                DELIVERED
              </span>
            )}
          </div>
          <p className="text-[12.5px] text-[#7f857b] font-mono mt-0.5 truncate max-w-2xl">
            {currentOrder.pickupAddress} → {currentOrder.deliveryAddress}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {inspectCompletedOrder && (
            <button
              type="button"
              onClick={() => setInspectCompletedOrder(null)}
              className="mfl-btn mfl-btn--white mfl-btn--sm shadow-sm cursor-pointer"
            >
              Close Review
            </button>
          )}
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

      {/* ACTIVE SHIPMENTS SWITCHER PILLS (if user has multiple active deliveries) */}
      {activeOrders.length > 1 && (
        <div className="px-6 md:px-10 py-2.5 bg-[#dbdad0] border-b border-[rgba(20,26,22,0.08)] flex items-center gap-2 overflow-x-auto">
          <span className="text-[11.5px] font-mono font-bold text-[#141a16] flex-shrink-0 flex items-center gap-1.5">
            <Truck size={13} className="text-[#2f5640]" />
            Active Shipments ({activeOrders.length}):
          </span>
          {activeOrders.map((ord) => {
            const isSelected = ord.id === currentOrder.id
            return (
              <button
                key={ord.id}
                type="button"
                onClick={() => {
                  setInspectCompletedOrder(null)
                  setSelectedOrderId(ord.id)
                }}
                className={`px-3 py-1 rounded-[4px] font-mono text-[11.5px] flex items-center gap-1.5 transition-all flex-shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#2f5640] text-white font-bold shadow-xs ring-1 ring-[#2f5640]'
                    : 'bg-[#fbfaf7] text-[#141a16] border border-[rgba(20,26,22,0.12)] hover:bg-white'
                }`}
              >
                <span>{ord.displayId}</span>
                <span className={`text-[9.5px] px-1 py-0.2 rounded font-semibold ${
                  ord.status === 'IN_TRANSIT'
                    ? 'bg-[#C97A3A] text-white'
                    : 'bg-[#7f857b]/20 text-[#141a16]'
                }`}>
                  {ord.status}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="px-6 md:px-10 py-6 max-w-6xl w-full mx-auto flex flex-col gap-6">
        {/* SIMULATION CONTROL TOOLBAR */}
        <div className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.12)] rounded-[8px] p-3.5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#2f5640]/10 border border-[#2f5640]/25 flex items-center justify-center text-[#2f5640]">
              <Zap size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-[#141a16]">
                  Live GPS Route Simulation
                </span>
                {isSimulating && (
                  <span className="flex items-center gap-1 font-mono text-[10px] bg-[#2DB67D] text-white px-2 py-0.5 rounded font-bold animate-pulse">
                    ● ACTIVE CORRIDOR
                  </span>
                )}
                {simProgress >= 1 && (
                  <span className="flex items-center gap-1 font-mono text-[10px] bg-[#2f5640] text-white px-2 py-0.5 rounded font-bold">
                    ✓ ARRIVED AT DESTINATION
                  </span>
                )}
              </div>
              <p className="text-[11.5px] text-[#7f857b]">
                Demonstrates real-time courier movement, road bends, and distance countdown along Karachi streets.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Speed selection */}
            <div className="flex items-center gap-1 bg-[#eeede6] p-1 rounded-[4px] border border-[rgba(20,26,22,0.08)] font-mono text-[11px]">
              {([1, 2, 4] as const).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setSimSpeed(spd)}
                  className={`px-2 py-0.5 rounded-[3px] transition-all cursor-pointer ${
                    simSpeed === spd
                      ? 'bg-[#2f5640] text-white font-bold shadow-xs'
                      : 'text-[#7f857b] hover:text-[#141a16]'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleToggleSimulation}
              className={`mfl-btn mfl-btn--sm shadow-sm cursor-pointer flex items-center gap-1.5 ${
                isSimulating
                  ? 'bg-[#C97A3A] text-white font-bold'
                  : 'mfl-btn--brand'
              }`}
            >
              {isSimulating ? <Pause size={13} /> : <Play size={13} />}
              <span>
                {isSimulating
                  ? 'Pause Simulation'
                  : simProgress > 0 && simProgress < 1
                  ? 'Resume En-Route'
                  : 'Start Live Simulation'}
              </span>
            </button>

            {simProgress > 0 && (
              <button
                type="button"
                onClick={handleResetSimulation}
                className="mfl-btn mfl-btn--white mfl-btn--sm shadow-xs cursor-pointer"
                title="Reset simulation to origin"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* OPENSTREETMAP LIVE TRACKING CONSOLE */}
        <div className="w-full relative bg-[#121d17] rounded-[10px] overflow-hidden border border-[rgba(255,255,255,0.08)] shadow-xl flex flex-col">
          {/* Top Left Live ETA Pill */}
          <div className="absolute top-4 left-4 z-1000 bg-[#1c2c22]/90 backdrop-blur-md border border-[rgba(255,255,255,0.14)] px-3.5 py-2 rounded-[6px] shadow-lg flex items-center gap-2 pointer-events-none">
            <span className="mfl-live" />
            <div>
              <span className="font-mono text-[13.5px] text-[#ffd98a] font-bold block leading-none">
                {simProgress > 0
                  ? simProgress >= 1
                    ? 'Delivered'
                    : `~${remainingMinutes} min`
                  : currentOrder.estimatedTime || '~15 min'}
              </span>
              <span className="text-[10px] text-[#ecebe1]/60 font-mono">
                {isSimulating
                  ? `Live Telemetry: ${38 * simSpeed} km/h`
                  : 'OpenStreetMap Live Telemetry'}
              </span>
            </div>
          </div>

          {/* Top Right Distance Pill */}
          <div className="absolute top-4 right-4 z-1000 bg-[#1c2c22]/90 backdrop-blur-md border border-[rgba(255,255,255,0.14)] px-3 py-1.5 rounded-[5px] text-[11px] font-mono text-[#ecebe1] pointer-events-none flex items-center gap-1.5">
            <span>Remaining:</span>
            <span className="text-[#2DB67D] font-bold">
              {simProgress > 0
                ? `${remainingDistance} km`
                : currentOrder.distanceKm
                ? `${currentOrder.distanceKm} km`
                : 'Active Route'}
            </span>
          </div>

          <OpenStreetMap
            height="390px"
            center={[courierLat || pickupPt.lat, courierLng || pickupPt.lng]}
            zoom={13}
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
              courierLat && courierLng
                ? {
                    lat: courierLat,
                    lng: courierLng,
                    label: `${activeRiderName} (${
                      isSimulating
                        ? 'Moving En-Route'
                        : simProgress >= 1
                        ? 'Arrived'
                        : 'Live GPS'
                    })`,
                    isLive: true,
                  }
                : undefined
            }
            routeCoordinates={routeGeometry}
            showRoute={true}
          />
        </div>

        {/* BOTTOM SECTION: 2 COLUMNS (Timeline + Courier Card) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Status Timeline (2 cols) */}
          <div className="md:col-span-2 bg-[#fbfaf7] border border-[rgba(20,26,22,0.10)] rounded-[8px] p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(20,26,22,0.08)] mb-5">
              <h2 className="text-[15px] font-semibold text-[#141a16]">
                Live Transit Milestones
              </h2>
              {simProgress > 0 && (
                <span className="font-mono text-[11px] text-[#2f5640] bg-[#2f5640]/10 px-2 py-0.5 rounded font-bold">
                  Progress: {Math.round(simProgress * 100)}%
                </span>
              )}
            </div>

            <div className="flex flex-col gap-5">
              {timelineSteps.map((step, idx) => {
                const isCompleted = idx < currentLevel
                const isCurrent = idx === currentLevel
                const isLast = idx === timelineSteps.length - 1

                return (
                  <div key={step.status} className="flex items-start gap-4 relative">
                    {!isLast && (
                      <div
                        className={`absolute left-[7px] top-[18px] bottom-[-22px] w-[2px] transition-colors duration-500 ${
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
                          className={`text-[13px] ${
                            isCurrent
                              ? 'font-bold text-[#141a16]'
                              : isCompleted
                              ? 'font-semibold text-[#141a16]'
                              : 'text-[#7f857b]'
                          }`}
                        >
                          {step.label}
                        </span>
                        <span className="font-mono text-[11.5px] text-[#7f857b]">
                          {step.time}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-[#7f857b] mt-0.5">
                        {idx === 0 && 'Package logged into Karachi central dispatch matrix'}
                        {idx === 1 && `${activeRiderName} confirmed dispatch pickup assignment`}
                        {idx === 2 && `${activeRiderName} inspected package and verified receipt barcode`}
                        {idx === 3 && `${activeRiderName} actively traversing delivery corridor`}
                        {idx === 4 && 'Recipient physical verification and package drop-off'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Courier Stat Card (1 col) */}
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
                  {riderInitials}
                </div>
                <div>
                  <div className="text-[15px] font-bold text-[#ecebe1]">
                    {activeRiderName}
                  </div>
                  <div className="text-[11.5px] text-[#ecebe1]/70 font-mono">
                    Yamaha YBR · Karachi Operations
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-1.5 py-0.2 rounded bg-[#2DB67D]/20 text-[#2DB67D] text-[10px] font-mono font-semibold">
                      ★ 4.9 (Verified Courier)
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.08)] flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11.5px] text-[#ecebe1]/70 font-mono">
                  <span>Corridor Distance:</span>
                  <span className="text-[#2DB67D] font-bold">
                    {simProgress > 0 ? `${remainingDistance} km` : `${totalDistance} km`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11.5px] text-[#ecebe1]/70 font-mono">
                  <span>Transit Window:</span>
                  <span className="text-[#ffd98a] font-bold">
                    {simProgress > 0 ? `~${remainingMinutes} min` : currentOrder.estimatedTime || '~20 min'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCustomerView('chat')}
              className="mfl-btn mfl-btn--brand mfl-btn--wide mt-5 shadow-sm cursor-pointer"
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
