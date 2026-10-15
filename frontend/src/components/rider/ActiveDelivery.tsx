import React, { useState, useEffect } from 'react'
import { Phone, ArrowRight, Check, Lock, PackageCheck, Truck, CheckCircle2, ArrowLeft } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { OrderStatus } from '../../types'

export const ActiveDelivery: React.FC = () => {
  const { orders, selectedOrderId, updateOrderStatus, setRiderView, currentUser } = useApp()

  // Find the active order
  const activeOrder =
    orders.find((o) => o.id === selectedOrderId && o.status !== 'DELIVERED') ||
    orders.find((o) => (o.status === 'IN_TRANSIT' || o.status === 'ACCEPTED' || o.status === 'PICKED_UP') && (currentUser ? String(o.riderId) === String(currentUser.id) : true))

  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [showDeliveredCelebration, setShowDeliveredCelebration] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(384) // ~6 min ticking

  // Live-ticking elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 2000)
  }

  const handleStatusChange = (newStatus: OrderStatus) => {
    if (!activeOrder) return

    if (newStatus === 'DELIVERED') {
      updateOrderStatus(activeOrder.id, 'DELIVERED')
      setShowDeliveredCelebration(true)
      setTimeout(() => {
        setShowDeliveredCelebration(false)
        setRiderView('dashboard')
      }, 1500)
    } else {
      updateOrderStatus(activeOrder.id, newStatus)
      const label = newStatus === 'PICKED_UP' ? 'Picked Up' : 'In Transit'
      triggerToast(`Status updated to ${label}`)
    }
  }

  const getStatusStage = (status: OrderStatus) => {
    switch (status) {
      case 'ACCEPTED':
        return 1
      case 'PICKED_UP':
        return 2
      case 'IN_TRANSIT':
        return 3
      case 'DELIVERED':
        return 4
      default:
        return 1
    }
  }

  const currentStage = activeOrder ? getStatusStage(activeOrder.status) : 1

  if (!activeOrder) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#121d17] text-[#ecebe1] text-center min-h-[500px]">
        <div className="w-16 h-16 rounded-full bg-[#1c2c22] border border-[rgba(255,255,255,0.12)] flex items-center justify-center mb-4">
          <Truck size={28} className="text-[#2DB67D]" />
        </div>
        <h2 className="text-[20px] font-semibold">No Active Delivery in Progress</h2>
        <p className="text-[13px] font-mono text-[rgba(236,235,225,0.50)] max-w-sm mt-1 mb-6">
          You currently have no assigned delivery. Accept a dispatch from Nearby Pickups to begin route transit.
        </p>
        <button
          onClick={() => setRiderView('nearby')}
          className="mfl-btn mfl-btn--brand shadow-md cursor-pointer"
        >
          Browse Nearby Pickups
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#121d17] text-[#ecebe1] relative select-none">
      {/* 2-Second Toast Notification at Top */}
      {toastMessage && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 h-[36px] px-4 rounded-[6px] bg-[#2DB67D] text-white flex items-center gap-2 shadow-lg transition-all duration-200 text-[13px] font-medium">
          <Check size={16} strokeWidth={2.5} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* FULL VIEWPORT CELEBRATION OVERLAY ON DELIVERED (1.5 SECONDS) */}
      {showDeliveredCelebration && (
        <div className="fixed inset-0 z-50 bg-[#2DB67D] flex flex-col items-center justify-center transition-opacity duration-300">
          <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center mb-4">
            <Check size={48} strokeWidth={3} className="text-white" />
          </div>
          <h1 className="text-[28px] font-semibold text-white tracking-tight">
            Delivered!
          </h1>
          <p className="text-white/80 font-mono text-[13px] mt-1">
            Dispatch workflow completed successfully
          </p>
        </div>
      )}

      {/* Compact Top Bar (44px tall, sidebar is completely removed) */}
      <header className="h-[44px] border-b border-[rgba(255,255,255,0.08)] px-4 flex items-center justify-between flex-shrink-0 bg-[#121d17]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRiderView('dashboard')}
            className="text-[rgba(236,235,225,0.50)] hover:text-[#ecebe1] transition-colors p-1"
          >
            <ArrowLeft size={15} />
          </button>
          <span className="font-mono text-[13px] text-[#ecebe1]">
            Active Task · {activeOrder?.displayId || '#LP-042'}
          </span>
        </div>

        <button
          onClick={() => alert(`Calling customer ${activeOrder?.userName || 'Tariq Khan'} (+92 300 1234567)`)}
          title="Call Customer"
          className="w-8 h-8 rounded-[6px] bg-[#1c2c22] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[rgba(236,235,225,0.50)] hover:text-[#ecebe1] transition-colors cursor-pointer"
        >
          <Phone size={14} />
        </button>
      </header>

      {/* Main Task Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-6 flex flex-col justify-between">
        {/* Order Summary Block (16px padding card, purely informational) */}
        <div className="bg-[#1c2c22] border border-[rgba(255,255,255,0.08)] rounded-[8px] p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-[13px]">
            <div className="flex-1 truncate pr-3">
              <span className="text-[10px] font-mono uppercase text-[rgba(236,235,225,0.40)] block">PICKUP</span>
              <span className="text-[#ecebe1] font-medium">{activeOrder?.pickupAddress || 'Block 6, PECHS'}</span>
            </div>
            <ArrowRight size={14} className="text-[rgba(236,235,225,0.30)] flex-shrink-0" />
            <div className="flex-1 truncate pl-3 text-right">
              <span className="text-[10px] font-mono uppercase text-[rgba(236,235,225,0.40)] block">DROP</span>
              <span className="text-[#ecebe1] font-medium">{activeOrder?.deliveryAddress || 'Dolmen Mall, Clifton'}</span>
            </div>
          </div>

          <div className="h-[1px] bg-[rgba(255,255,255,0.08)]" />

          <div className="flex items-center justify-between text-[12px] text-[rgba(236,235,225,0.55)]">
            <span>Recipient: {activeOrder?.userName || 'Tariq Khan'}</span>
            <span className="font-mono">{activeOrder?.description || 'Parcel'}</span>
          </div>
        </div>

        {/* STATUS UPDATE SECTION (The core of this page) */}
        <div className="flex flex-col gap-3 my-6">
          <span className="font-mono text-[11px] uppercase text-[rgba(236,235,225,0.45)] tracking-wider text-center">
            Progression Controls
          </span>

          {/* Three large 90px tall status buttons */}
          <div className="grid grid-cols-3 gap-3">
            {/* Tile 1: Picked Up */}
            {(() => {
              const isCompleted = currentStage >= 2
              const isCurrent = currentStage === 1
              return (
                <button
                  type="button"
                  disabled={isCompleted}
                  onClick={() => handleStatusChange('PICKED_UP')}
                  style={{
                    borderColor: isCompleted
                      ? '#2DB67D'
                      : isCurrent
                      ? '#C97A3A'
                      : 'rgba(255,255,255,0.08)',
                    backgroundColor: isCompleted
                      ? 'rgba(45,182,125,0.08)'
                      : isCurrent
                      ? 'rgba(201,122,58,0.08)'
                      : '#1c2c22',
                  }}
                  className={`h-[90px] rounded-[8px] border flex flex-col items-center justify-center gap-2 transition-all ${
                    isCompleted
                      ? 'cursor-default'
                      : 'cursor-pointer hover:bg-[#243324]'
                  }`}
                >
                  <div className="relative">
                    <PackageCheck size={24} className={isCompleted ? 'text-[#2DB67D]' : isCurrent ? 'text-[#C97A3A]' : 'text-[rgba(236,235,225,0.40)]'} />
                    {isCompleted && (
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#2DB67D] flex items-center justify-center">
                        <Check size={10} strokeWidth={3} className="text-white" />
                      </div>
                    )}
                  </div>
                  <span className="text-[13px] font-medium text-[#ecebe1]">Picked Up</span>
                </button>
              )
            })()}

            {/* Tile 2: In Transit */}
            {(() => {
              const isCompleted = currentStage >= 3
              const isCurrent = currentStage === 2
              const isLocked = currentStage < 2
              return (
                <button
                  type="button"
                  disabled={isCompleted || isLocked}
                  onClick={() => handleStatusChange('IN_TRANSIT')}
                  style={{
                    borderColor: isCompleted
                      ? '#2DB67D'
                      : isCurrent
                      ? '#C97A3A'
                      : 'rgba(255,255,255,0.08)',
                    backgroundColor: isCompleted
                      ? 'rgba(45,182,125,0.08)'
                      : isCurrent
                      ? 'rgba(201,122,58,0.08)'
                      : '#1c2c22',
                  }}
                  className={`h-[90px] rounded-[8px] border flex flex-col items-center justify-center gap-2 transition-all ${
                    isLocked
                      ? 'opacity-40 cursor-not-allowed'
                      : isCompleted
                      ? 'cursor-default'
                      : 'cursor-pointer hover:bg-[#243324]'
                  }`}
                >
                  <div className="relative">
                    {isLocked ? (
                      <Lock size={22} className="text-[rgba(236,235,225,0.40)]" />
                    ) : (
                      <Truck size={24} className={isCompleted ? 'text-[#2DB67D]' : isCurrent ? 'text-[#C97A3A]' : 'text-[rgba(236,235,225,0.40)]'} />
                    )}
                    {isCompleted && (
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#2DB67D] flex items-center justify-center">
                        <Check size={10} strokeWidth={3} className="text-white" />
                      </div>
                    )}
                  </div>
                  <span className="text-[13px] font-medium text-[#ecebe1]">In Transit</span>
                </button>
              )
            })()}

            {/* Tile 3: Delivered */}
            {(() => {
              const isCompleted = currentStage >= 4
              const isCurrent = currentStage === 3
              const isLocked = currentStage < 3
              return (
                <button
                  type="button"
                  disabled={isLocked || isCompleted}
                  onClick={() => handleStatusChange('DELIVERED')}
                  style={{
                    borderColor: isCurrent ? '#2DB67D' : 'rgba(255,255,255,0.08)',
                    backgroundColor: isCurrent ? 'rgba(45,182,125,0.08)' : '#1c2c22',
                  }}
                  className={`h-[90px] rounded-[8px] border flex flex-col items-center justify-center gap-2 transition-all ${
                    isLocked
                      ? 'opacity-40 cursor-not-allowed'
                      : 'cursor-pointer hover:bg-[#243324]'
                  }`}
                >
                  <div className="relative">
                    {isLocked ? (
                      <Lock size={22} className="text-[rgba(236,235,225,0.40)]" />
                    ) : (
                      <CheckCircle2 size={24} className="text-[#2DB67D]" />
                    )}
                  </div>
                  <span className="text-[13px] font-medium text-[#ecebe1]">Delivered</span>
                </button>
              )
            })()}
          </div>
        </div>

        {/* Active Metrics Row (3 cells beneath status buttons) */}
        <div className="bg-[#1c2c22] border border-[rgba(255,255,255,0.08)] rounded-[8px] grid grid-cols-3 divide-x divide-[rgba(255,255,255,0.08)] py-3">
          <div className="flex flex-col items-center">
            <span className="font-mono text-[14px] text-[#ffd98a]">
              {formatTimer(elapsedSeconds)}
            </span>
            <span className="text-[11px] text-[rgba(236,235,225,0.40)] uppercase mt-0.5">Elapsed</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="font-mono text-[14px] text-[#ecebe1]">
              {activeOrder?.estimatedTime || '~12 min'}
            </span>
            <span className="text-[11px] text-[rgba(236,235,225,0.40)] uppercase mt-0.5">Remaining</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="font-mono text-[14px] text-[#ecebe1]">
              {activeOrder?.distanceKm ? `${activeOrder.distanceKm} km` : '1.4 km'}
            </span>
            <span className="text-[11px] text-[rgba(236,235,225,0.40)] uppercase mt-0.5">Distance</span>
          </div>
        </div>

        {/* Chat shortcut button */}
        <button
          onClick={() => setRiderView('chat')}
          className="w-full h-[40px] rounded-[6px] border border-[rgba(255,255,255,0.08)] bg-[#1c2c22] text-[rgba(236,235,225,0.55)] hover:text-[#ecebe1] text-[13px] font-medium mt-4 cursor-pointer transition-colors"
        >
          Message Customer
        </button>
      </main>
    </div>
  )
}
