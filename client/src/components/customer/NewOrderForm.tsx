import React, { useState, useEffect, useRef } from 'react'
import {
  Check,
  Navigation,
  Box,
  Clock,
  ArrowLeft,
  Loader2,
  MapPin,
  Sparkles,
  Search,
  Crosshair,
  Compass,
  ArrowRight,
  CheckCircle2,
  X,
} from 'lucide-react'
import { PriorityLevel } from '../../types'
import { useApp } from '../../context/AppContext'
import {
  KARACHI_LOCATIONS,
  haversineDistance,
  formatDistance,
  estimateTimeMinutes,
} from '../../utils/haversine'
import { OpenStreetMap } from '../common/OpenStreetMap'

export const NewOrderForm: React.FC = () => {
  const { createOrder, setCustomerView } = useApp()
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)

  // Step 1: Location & Map state
  const [pickupLocation, setPickupLocation] = useState(KARACHI_LOCATIONS[0].name)
  const [dropLocation, setDropLocation] = useState(KARACHI_LOCATIONS[2].name)
  const [pickupCoord, setPickupCoord] = useState({
    lat: KARACHI_LOCATIONS[0].lat,
    lng: KARACHI_LOCATIONS[0].lng,
  })
  const [dropCoord, setDropCoord] = useState({
    lat: KARACHI_LOCATIONS[2].lat,
    lng: KARACHI_LOCATIONS[2].lng,
  })

  // Mode: which pin the user is currently choosing on the map
  const [activeTarget, setActiveTarget] = useState<'pickup' | 'drop'>('pickup')
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    KARACHI_LOCATIONS[0].lat,
    KARACHI_LOCATIONS[0].lng,
  ])
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false)
  const [isGpsLoading, setIsGpsLoading] = useState(false)

  // Autocomplete / Search state (Google Maps style)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<
    Array<{ name: string; displayName: string; lat: number; lng: number }>
  >([])
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Step 2: Package state
  const [description, setDescription] = useState('')
  const [packageSize, setPackageSize] = useState<'Small' | 'Medium' | 'Large'>('Small')
  const [priority, setPriority] = useState<PriorityLevel>('NORMAL')

  // Step 3: Submission
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Real-time distance and time between pickup and dropoff
  const routeDistance = haversineDistance(
    pickupCoord.lat,
    pickupCoord.lng,
    dropCoord.lat,
    dropCoord.lng
  )
  const routeDistFormatted = formatDistance(routeDistance)
  const routeTimeFormatted = estimateTimeMinutes(routeDistance)

  // Google Maps Search / Autocomplete handler
  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (!val.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/locations/search?q=${encodeURIComponent(val.trim())}`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data)
        }
      } catch {
        // fallback
      } finally {
        setIsSearching(false)
      }
    }, 280)
  }

  // User selects an autocomplete result
  const handleSelectLocation = (loc: {
    name: string
    displayName?: string
    lat: number
    lng: number
  }) => {
    const chosenName = loc.displayName || loc.name
    if (activeTarget === 'pickup') {
      setPickupCoord({ lat: loc.lat, lng: loc.lng })
      setPickupLocation(chosenName)
      setActiveTarget('drop')
    } else {
      setDropCoord({ lat: loc.lat, lng: loc.lng })
      setDropLocation(chosenName)
    }
    setMapCenter([loc.lat, loc.lng])
    setSearchQuery('')
    setSearchResults([])
  }

  // Interactive Map Click: Set pin and reverse-geocode address
  const handleMapClick = async (lat: number, lng: number) => {
    setIsReverseGeocoding(true)
    if (activeTarget === 'pickup') {
      setPickupCoord({ lat, lng })
    } else {
      setDropCoord({ lat, lng })
    }

    try {
      const res = await fetch(`/api/locations/reverse?lat=${lat}&lng=${lng}`)
      if (res.ok) {
        const data = await res.json()
        const resolvedName = data.displayName || data.name
        if (activeTarget === 'pickup') {
          setPickupLocation(resolvedName)
          // Switch to drop after setting pickup
          setTimeout(() => setActiveTarget('drop'), 500)
        } else {
          setDropLocation(resolvedName)
        }
      }
    } catch {
      const fallback = `Karachi (${lat.toFixed(4)}, ${lng.toFixed(4)})`
      if (activeTarget === 'pickup') setPickupLocation(fallback)
      else setDropLocation(fallback)
    } finally {
      setIsReverseGeocoding(false)
    }
  }

  // Real device GPS locate (Google Maps "My Location" button)
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }
    setIsGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setPickupCoord({ lat, lng })
        setMapCenter([lat, lng])
        setActiveTarget('drop')

        try {
          const res = await fetch(`/api/locations/reverse?lat=${lat}&lng=${lng}`)
          if (res.ok) {
            const data = await res.json()
            setPickupLocation(data.displayName || data.name || 'Current Device Location')
          } else {
            setPickupLocation(`Current GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
          }
        } catch {
          setPickupLocation(`Current GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
        }
        setIsGpsLoading(false)
      },
      (err) => {
        console.warn('GPS error:', err.message)
        setIsGpsLoading(false)
        setPickupCoord({ lat: 24.9207, lng: 67.0982 })
        setPickupLocation('Gulshan-e-Iqbal Block 13 (Simulated GPS)')
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    setTimeout(() => {
      createOrder({
        pickupAddress: pickupLocation,
        pickupLat: pickupCoord.lat,
        pickupLng: pickupCoord.lng,
        deliveryAddress: dropLocation,
        deliveryLat: dropCoord.lat,
        deliveryLng: dropCoord.lng,
        description: description || 'Delivery Parcel',
        packageSize,
        priority,
      })
      setIsSubmitting(false)
      setCustomerView('tracking')
    }, 450)
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#e5e4da] overflow-y-auto pb-12">
      {/* HERO BANNER */}
      <section className="px-6 md:px-10 pt-8 pb-6 border-b border-[rgba(20,26,22,0.08)] bg-gradient-to-b from-[#e1e0d5] to-[#e5e4da]">
        <div className="max-w-4xl mx-auto">
          <div className="mfl-backer mb-3">
            <span className="mfl-backer-mark">✓</span>
            <b>Interactive Map Dispatch</b>
            <span className="text-[#7f857b]">· OpenStreetMap Karachi Grid</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-[28px] sm:text-[38px] font-normal tracking-[-0.04em] text-[#141a16] leading-tight">
                <span className="text-[#7f857b]">Initiate dispatch / </span>
                <span>Select locations on map</span>
              </h1>
              <p className="text-[#7f857b] text-[13.5px] mt-1.5">
                Pinpoint pickup and drop-off on the interactive Karachi map or search any landmark.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCustomerView('dashboard')}
              className="mfl-btn mfl-btn--white mfl-btn--sm self-start sm:self-auto cursor-pointer shadow-sm"
            >
              <ArrowLeft size={13} />
              <span>Back to Overview</span>
            </button>
          </div>
        </div>
      </section>

      {/* FORM CARD CONTAINER */}
      <div className="px-4 py-8 flex justify-center">
        <div
          className={`w-full ${
            currentStep === 1 ? 'max-w-[780px]' : 'max-w-[580px]'
          } bg-[#fbfaf7] border border-[rgba(20,26,22,0.12)] rounded-[10px] p-5 sm:p-7 shadow-sm transition-all`}
        >
          {/* STEP INDICATOR */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[rgba(20,26,22,0.08)]">
            {[
              { num: 1, label: 'Location Map' },
              { num: 2, label: 'Package Specs' },
              { num: 3, label: 'Confirm & Dispatch' },
            ].map((s, idx) => {
              const isCompleted = currentStep > s.num
              const isActive = currentStep === s.num

              return (
                <React.Fragment key={s.num}>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10.5px] font-mono transition-all ${
                        isCompleted
                          ? 'bg-[#2f5640] text-white'
                          : isActive
                          ? 'border-[1.5px] border-[#2f5640] text-[#2f5640] bg-[#2f5640]/5 font-bold'
                          : 'border border-[rgba(20,26,22,0.16)] text-[#7f857b] bg-transparent'
                      }`}
                    >
                      {isCompleted ? <Check size={11} strokeWidth={3} /> : s.num}
                    </div>
                    <span
                      className={`text-[12.5px] ${
                        isActive ? 'text-[#141a16] font-semibold' : 'text-[#7f857b]'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>

                  {idx < 2 && (
                    <div className="flex-1 mx-3 h-[1.5px] bg-[rgba(20,26,22,0.10)] relative overflow-hidden rounded-full">
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-[#2f5640] transition-all duration-300"
                        style={{
                          width: currentStep > idx + 1 ? '100%' : '0%',
                        }}
                      />
                    </div>
                  )}
                </React.Fragment>
              )
            })}
          </div>

          {/* STEP 1: INTERACTIVE GOOGLE MAPS STYLE LOCATION PICKER */}
          {currentStep === 1 && (
            <div className="flex flex-col gap-4">
              {/* GOOGLE MAPS STYLE AUTOCOMPLETE SEARCH BAR */}
              <div className="relative">
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-[#7f857b] pointer-events-none">
                    {isSearching ? (
                      <Loader2 size={16} className="animate-spin text-[#2f5640]" />
                    ) : (
                      <Search size={16} />
                    )}
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder={`Search address or landmark for ${
                      activeTarget === 'pickup' ? 'Pickup' : 'Drop-off'
                    } (e.g. Dolmen Mall, NED University, PECHS)...`}
                    className="w-full h-[46px] rounded-[6px] bg-[#f5f4ef] border border-[rgba(20,26,22,0.14)] pl-10 pr-24 text-[13.5px] text-[#141a16] placeholder-[#7f857b] focus:border-[#2f5640] focus:ring-2 focus:ring-[#2f5640]/15 outline-none font-sans shadow-xs transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('')
                        setSearchResults([])
                      }}
                      className="absolute right-12 text-[#7f857b] hover:text-[#141a16] p-1 cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    title="Use live device GPS"
                    className="absolute right-2 px-2.5 py-1.5 rounded-[4px] bg-white border border-[rgba(20,26,22,0.12)] text-[11px] font-mono font-medium text-[#2f5640] flex items-center gap-1 hover:bg-[#eeede6] cursor-pointer shadow-xs"
                  >
                    {isGpsLoading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Crosshair size={13} />
                    )}
                    <span className="hidden sm:inline">GPS</span>
                  </button>
                </div>

                {/* Floating Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute top-[52px] left-0 right-0 z-50 bg-[#fbfaf7] border border-[rgba(20,26,22,0.16)] rounded-[8px] shadow-xl overflow-hidden max-h-[260px] overflow-y-auto divide-y divide-[rgba(20,26,22,0.06)]">
                    {searchResults.map((loc, idx) => (
                      <button
                        key={`${loc.lat}-${loc.lng}-${idx}`}
                        type="button"
                        onClick={() => handleSelectLocation(loc)}
                        className="w-full p-3 text-left hover:bg-[#2f5640]/8 transition-colors flex items-start gap-2.5 cursor-pointer"
                      >
                        <div className="mt-0.5 text-[#2f5640] flex-shrink-0">
                          <MapPin size={15} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[13px] font-bold text-[#141a16] block truncate">
                            {loc.name}
                          </span>
                          <span className="text-[11.5px] text-[#7f857b] block truncate">
                            {loc.displayName}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* QUICK HOTSPOT CHIPS (Google Maps style quick pills) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px] font-mono">
                <span className="text-[#7f857b] uppercase tracking-wider text-[10px] mr-1 flex-shrink-0">
                  Quick Hubs:
                </span>
                {KARACHI_LOCATIONS.slice(0, 6).map((kLoc) => (
                  <button
                    key={kLoc.name}
                    type="button"
                    onClick={() =>
                      handleSelectLocation({
                        name: kLoc.name,
                        displayName: kLoc.name,
                        lat: kLoc.lat,
                        lng: kLoc.lng,
                      })
                    }
                    className="px-2.5 py-1 rounded-full bg-[#f0eee6] border border-[rgba(20,26,22,0.08)] hover:border-[#2f5640] hover:bg-[#2f5640]/5 text-[#141a16] transition-all flex-shrink-0 cursor-pointer"
                  >
                    {kLoc.name.split(',')[0]}
                  </button>
                ))}
              </div>

              {/* MODE SWITCHER TABS (Pickup vs Drop-off destination) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                {/* Pickup Card Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTarget('pickup')
                    setMapCenter([pickupCoord.lat, pickupCoord.lng])
                  }}
                  className={`p-3.5 rounded-[8px] border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    activeTarget === 'pickup'
                      ? 'border-[#2f5640] bg-[#2f5640]/6 shadow-sm ring-1 ring-[#2f5640]/30'
                      : 'border-[rgba(20,26,22,0.12)] bg-[#f5f4ef] hover:bg-[#eeede6]'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-[#2f5640] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs font-mono text-[12px] font-bold">
                    P
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono uppercase text-[#2f5640] font-bold tracking-wider">
                        1. Pickup Origin
                      </span>
                      {activeTarget === 'pickup' && (
                        <span className="text-[10px] font-mono bg-[#2f5640] text-white px-1.5 py-0.5 rounded font-semibold">
                          Active Pin
                        </span>
                      )}
                    </div>
                    <span className="text-[13px] font-semibold text-[#141a16] block truncate mt-0.5">
                      {pickupLocation}
                    </span>
                    <span className="text-[10.5px] font-mono text-[#7f857b] block truncate mt-0.5">
                      [{pickupCoord.lat.toFixed(4)}, {pickupCoord.lng.toFixed(4)}]
                    </span>
                  </div>
                </button>

                {/* Drop-off Card Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTarget('drop')
                    setMapCenter([dropCoord.lat, dropCoord.lng])
                  }}
                  className={`p-3.5 rounded-[8px] border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    activeTarget === 'drop'
                      ? 'border-[#2DB67D] bg-[#2DB67D]/6 shadow-sm ring-1 ring-[#2DB67D]/30'
                      : 'border-[rgba(20,26,22,0.12)] bg-[#f5f4ef] hover:bg-[#eeede6]'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-[#2DB67D] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs font-mono text-[12px] font-bold">
                    D
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono uppercase text-[#2DB67D] font-bold tracking-wider">
                        2. Drop-off Destination
                      </span>
                      {activeTarget === 'drop' && (
                        <span className="text-[10px] font-mono bg-[#2DB67D] text-white px-1.5 py-0.5 rounded font-semibold">
                          Active Pin
                        </span>
                      )}
                    </div>
                    <span className="text-[13px] font-semibold text-[#141a16] block truncate mt-0.5">
                      {dropLocation}
                    </span>
                    <span className="text-[10.5px] font-mono text-[#7f857b] block truncate mt-0.5">
                      [{dropCoord.lat.toFixed(4)}, {dropCoord.lng.toFixed(4)}]
                    </span>
                  </div>
                </button>
              </div>

              {/* ACTION HINT BANNER */}
              <div className="px-3.5 py-2 rounded-[6px] bg-[#f0eee6] border border-[rgba(20,26,22,0.10)] flex items-center justify-between text-[11.5px] text-[#141a16]">
                <div className="flex items-center gap-2">
                  <span className="mfl-live" />
                  <span>
                    Click anywhere on the map to place{' '}
                    <b>{activeTarget === 'pickup' ? '📦 Pickup Pin' : '🎯 Drop-off Pin'}</b>
                  </span>
                </div>
                {isReverseGeocoding && (
                  <span className="flex items-center gap-1 font-mono text-[#2f5640] text-[10.5px]">
                    <Loader2 size={12} className="animate-spin" />
                    Locating address...
                  </span>
                )}
              </div>

              {/* INTERACTIVE OPENSTREETMAP CONTAINER (Google Maps style view) */}
              <div className="relative rounded-[8px] overflow-hidden border border-[rgba(20,26,22,0.14)] shadow-sm">
                <OpenStreetMap
                  height="380px"
                  center={mapCenter}
                  zoom={13}
                  pickup={{
                    lat: pickupCoord.lat,
                    lng: pickupCoord.lng,
                    label: pickupLocation,
                  }}
                  delivery={{
                    lat: dropCoord.lat,
                    lng: dropCoord.lng,
                    label: dropLocation,
                  }}
                  showRoute={true}
                  interactive={true}
                  onLocationSelect={handleMapClick}
                />

                {/* Floating Route Distance HUD (Google Maps style) */}
                <div className="absolute top-3 left-3 z-1000 bg-[#1c2c22]/90 backdrop-blur-md text-white px-3.5 py-2 rounded-[6px] border border-white/10 shadow-lg font-mono text-[11px] flex items-center gap-3">
                  <div>
                    <span className="text-[#ecebe1]/60 block text-[9.5px] uppercase">
                      Calculated Distance
                    </span>
                    <span className="text-[#ffd98a] font-bold text-[13px]">
                      {routeDistFormatted}
                    </span>
                  </div>
                  <div className="w-[1px] h-6 bg-white/10" />
                  <div>
                    <span className="text-[#ecebe1]/60 block text-[9.5px] uppercase">
                      Est. Transit
                    </span>
                    <span className="text-[#2DB67D] font-bold text-[13px]">
                      {routeTimeFormatted}
                    </span>
                  </div>
                </div>

                {/* Floating "Locate Me" button */}
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  title="Center to my device GPS"
                  className="absolute bottom-4 right-3 z-1000 w-10 h-10 rounded-[6px] bg-[#fbfaf7] hover:bg-white text-[#2f5640] border border-[rgba(20,26,22,0.18)] shadow-md flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
                >
                  {isGpsLoading ? (
                    <Loader2 size={18} className="animate-spin text-[#2f5640]" />
                  ) : (
                    <Compass size={20} />
                  )}
                </button>
              </div>

              {/* CONFIRMATION STRIP & CONTINUE BUTTON */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-[12px] text-[#7f857b]">
                  Route: <b className="text-[#141a16]">{routeDistFormatted}</b> · Transit:{' '}
                  <b className="text-[#2f5640]">{routeTimeFormatted}</b>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="mfl-btn mfl-btn--brand shadow-md cursor-pointer flex items-center justify-center gap-2 sm:w-auto w-full"
                >
                  <span>Continue to Package Specs</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PACKAGE SPECS */}
          {currentStep === 2 && (
            <div className="flex flex-col gap-5">
              {/* Description textarea */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10.5px] font-mono uppercase text-[#7f857b] tracking-wider">
                  Parcel Contents & Notes
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Legal contracts in waterproof sleeve, handle with care"
                  className="w-full rounded-[5px] bg-[#f5f4ef] border border-[rgba(20,26,22,0.12)] p-3 text-[13.5px] text-[#141a16] placeholder-[#7f857b] focus:border-[#2f5640] focus:ring-2 focus:ring-[#2f5640]/15 outline-none resize-none font-sans transition-all"
                />
              </div>

              {/* Size selector tiles */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10.5px] font-mono uppercase text-[#7f857b] tracking-wider">
                  Package Size
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(['Small', 'Medium', 'Large'] as const).map((size) => {
                    const isSelected = packageSize === size
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setPackageSize(size)}
                        className={`h-[68px] rounded-[6px] flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[1.5px] border-[#2f5640] bg-[#2f5640]/8 shadow-sm text-[#2f5640]'
                            : 'bg-[#f5f4ef] border border-[rgba(20,26,22,0.10)] hover:bg-[#eeede6] text-[#7f857b]'
                        }`}
                      >
                        <Box
                          size={20}
                          className={isSelected ? 'text-[#2f5640]' : 'text-[#7f857b]'}
                        />
                        <span className="text-[12.5px] font-semibold text-[#141a16]">{size}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Priority selector */}
              <div className="flex flex-col gap-2 pt-2">
                <label className="text-[10.5px] font-mono uppercase text-[#7f857b] tracking-wider">
                  Dispatch Priority Tier
                </label>
                <div className="flex items-center gap-2">
                  {(['NORMAL', 'HIGH', 'URGENT'] as const).map((p) => {
                    const isSelected = priority === p
                    let chipStyle =
                      'bg-[#f5f4ef] text-[#7f857b] border border-[rgba(20,26,22,0.10)]'

                    if (isSelected) {
                      if (p === 'NORMAL') {
                        chipStyle = 'bg-[#2f5640] text-white font-bold shadow-xs'
                      } else if (p === 'HIGH') {
                        chipStyle = 'bg-[#D4920A] text-white font-bold shadow-xs'
                      } else {
                        chipStyle = 'bg-[#C94040] text-white font-bold shadow-xs'
                      }
                    }

                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`px-3.5 py-1.5 rounded-[4px] font-mono text-[11px] tracking-wider transition-all cursor-pointer ${chipStyle}`}
                      >
                        {p}
                      </button>
                    )
                  })}
                </div>

                {priority === 'URGENT' && (
                  <div className="text-[11.5px] text-[#C94040] mt-1 bg-[#C94040]/8 p-2 rounded-[4px] border border-[#C94040]/20 flex items-center gap-1.5">
                    <Sparkles size={13} />
                    <span>Surfaced to nearest couriers with audio alert + immediate pickup window.</span>
                  </div>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="mfl-btn mfl-btn--white flex-1 cursor-pointer"
                >
                  Back to Map
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="mfl-btn mfl-btn--brand flex-[2] shadow-md cursor-pointer"
                >
                  Review & Confirm
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIRM & DISPATCH */}
          {currentStep === 3 && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Summary card */}
              <div className="bg-[#f5f4ef] border border-[rgba(20,26,22,0.12)] rounded-[8px] p-5 flex flex-col gap-3.5 shadow-sm">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#7f857b] tracking-wider block">
                    Pickup Location
                  </span>
                  <span className="text-[13.5px] text-[#141a16] font-semibold mt-0.5 block">
                    {pickupLocation}
                  </span>
                  <span className="text-[11px] font-mono text-[#7f857b] block mt-0.5">
                    Coordinates: {pickupCoord.lat.toFixed(4)}, {pickupCoord.lng.toFixed(4)}
                  </span>
                </div>

                <div className="h-[1px] bg-[rgba(20,26,22,0.08)]" />

                <div>
                  <span className="text-[10px] font-mono uppercase text-[#7f857b] tracking-wider block">
                    Destination
                  </span>
                  <span className="text-[13.5px] text-[#141a16] font-semibold mt-0.5 block">
                    {dropLocation}
                  </span>
                  <span className="text-[11px] font-mono text-[#7f857b] block mt-0.5">
                    Coordinates: {dropCoord.lat.toFixed(4)}, {dropCoord.lng.toFixed(4)}
                  </span>
                </div>

                <div className="h-[1px] bg-[rgba(20,26,22,0.08)]" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#7f857b] tracking-wider block">
                      Package
                    </span>
                    <span className="text-[13px] text-[#141a16] font-medium mt-0.5 block">
                      {packageSize} · {description || 'Standard Parcel'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#7f857b] tracking-wider block">
                      Priority Tier
                    </span>
                    <span
                      className={`text-[12px] font-mono font-bold mt-0.5 block ${
                        priority === 'URGENT'
                          ? 'text-[#C94040]'
                          : priority === 'HIGH'
                          ? 'text-[#D4920A]'
                          : 'text-[#2f5640]'
                      }`}
                    >
                      {priority}
                    </span>
                  </div>
                </div>

                <div className="h-[1px] bg-[rgba(20,26,22,0.08)]" />

                <div className="flex items-center justify-between text-[12px] font-mono">
                  <div className="flex items-center gap-1.5 text-[#141a16]">
                    <span className="text-[#7f857b]">Distance:</span>
                    <b>{routeDistFormatted}</b>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#2f5640]">
                    <Clock size={13} />
                    <span>Est. Window: {routeTimeFormatted}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setCurrentStep(2)}
                  className="mfl-btn mfl-btn--white flex-1 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mfl-btn mfl-btn--brand flex-[2] shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-white" />
                      <span>Dispatching Courier...</span>
                    </>
                  ) : (
                    'Confirm & Dispatch'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
export default NewOrderForm
