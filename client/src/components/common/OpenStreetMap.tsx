import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface MapMarkerItem {
  id: string
  lat: number
  lng: number
  label: string
  sublabel?: string
  priority?: 'NORMAL' | 'HIGH' | 'URGENT'
  type?: 'pickup' | 'delivery' | 'courier' | 'hub'
  onClick?: () => void
}

interface OpenStreetMapProps {
  center?: [number, number]
  zoom?: number
  height?: string
  pickup?: { lat: number; lng: number; label?: string }
  delivery?: { lat: number; lng: number; label?: string }
  courier?: { lat: number; lng: number; label?: string; isLive?: boolean }
  markers?: MapMarkerItem[]
  showRoute?: boolean
  interactive?: boolean
  className?: string
  onLocationSelect?: (lat: number, lng: number) => void
}

export const OpenStreetMap: React.FC<OpenStreetMapProps> = ({
  center = [24.8607, 67.0011], // Karachi Central
  zoom = 12,
  height = '340px',
  pickup,
  delivery,
  courier,
  markers = [],
  showRoute = true,
  interactive = true,
  className = '',
  onLocationSelect,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const layerGroupRef = useRef<L.LayerGroup | null>(null)
  const onLocationSelectRef = useRef(onLocationSelect)

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect
  }, [onLocationSelect])

  // Center panTo when center coordinates change
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.panTo(center, { animate: true })
    }
  }, [center?.[0], center?.[1]])

  // 1. Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return
    if (mapInstanceRef.current) return

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      attributionControl: true,
    })

    // Compliant OpenStreetMap tile layer served through local backend cache
    // No API keys required, no rate limit watermarks, zero 403 blocks
    const tileLayer = L.tileLayer('/api/tiles/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    })
    tileLayer.addTo(map)

    const layerGroup = L.layerGroup().addTo(map)
    layerGroupRef.current = layerGroup
    mapInstanceRef.current = map

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onLocationSelectRef.current) {
        onLocationSelectRef.current(e.latlng.lat, e.latlng.lng)
      }
    })

    // Leaflet needs an invalidateSize when container is rendered
    setTimeout(() => {
      map.invalidateSize()
    }, 200)

    return () => {
      map.remove()
      mapInstanceRef.current = null
      layerGroupRef.current = null
    }
  }, [])

  // 2. Render Markers and Route Polylines
  useEffect(() => {
    const map = mapInstanceRef.current
    const layerGroup = layerGroupRef.current
    if (!map || !layerGroup) return

    layerGroup.clearLayers()
    const boundsPoints: [number, number][] = []

    // Helper: Create HTML div icon
    const createCustomIcon = (
      bgColor: string,
      textColor: string,
      symbol: string,
      glow = false
    ) => {
      return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            transform: translate(-50%, -100%);
          ">
            <div style="
              width: 32px;
              height: 32px;
              border-radius: 50% 50% 50% 0;
              background: ${bgColor};
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 10px rgba(0,0,0,0.35)${glow ? ', 0 0 15px ' + bgColor : ''};
              border: 2px solid #ffffff;
            ">
              <span style="
                transform: rotate(45deg);
                font-family: 'JetBrains Mono', monospace;
                font-size: 13px;
                font-weight: bold;
                color: ${textColor};
              ">${symbol}</span>
            </div>
            <div style="
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: rgba(0,0,0,0.4);
              margin-top: 2px;
            "></div>
          </div>
        `,
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        popupAnchor: [0, -42],
      })
    }

    // Pickup Marker
    if (pickup && pickup.lat && pickup.lng) {
      boundsPoints.push([pickup.lat, pickup.lng])
      const pickupIcon = createCustomIcon('#2f5640', '#ffffff', '📦')
      const marker = L.marker([pickup.lat, pickup.lng], { icon: pickupIcon }).addTo(layerGroup)
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
          <b style="color: #2f5640;">PICKUP LOCATION</b><br/>
          <span>${pickup.label || 'Pickup Location'}</span>
        </div>
      `)
    }

    // Delivery Marker
    if (delivery && delivery.lat && delivery.lng) {
      boundsPoints.push([delivery.lat, delivery.lng])
      const dropIcon = createCustomIcon('#2DB67D', '#ffffff', '📍')
      const marker = L.marker([delivery.lat, delivery.lng], { icon: dropIcon }).addTo(layerGroup)
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
          <b style="color: #2DB67D;">DROP-OFF DESTINATION</b><br/>
          <span>${delivery.label || 'Delivery Address'}</span>
        </div>
      `)
    }

    // Courier Marker
    if (courier && courier.lat && courier.lng) {
      boundsPoints.push([courier.lat, courier.lng])
      const courierIcon = createCustomIcon('#ffd98a', '#141a16', '🚴', true)
      const marker = L.marker([courier.lat, courier.lng], { icon: courierIcon }).addTo(layerGroup)
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
          <b style="color: #D4920A;">COURIER EN ROUTE</b><br/>
          <span>${courier.label || 'Assigned Courier'}</span>
          ${courier.isLive ? '<br/><span style="color:#2DB67D; font-weight:bold;">● Live Telemetry Active</span>' : ''}
        </div>
      `)
    }

    // Draw Route Polyline
    if (showRoute) {
      const routeCoords: [number, number][] = []
      if (pickup && pickup.lat && pickup.lng) routeCoords.push([pickup.lat, pickup.lng])
      if (courier && courier.lat && courier.lng) routeCoords.push([courier.lat, courier.lng])
      if (delivery && delivery.lat && delivery.lng) routeCoords.push([delivery.lat, delivery.lng])

      if (routeCoords.length >= 2) {
        L.polyline(routeCoords, {
          color: '#2f5640',
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 6',
        }).addTo(layerGroup)
      }
    }

    // Additional generic markers
    for (const m of markers) {
      if (!m.lat || !m.lng) continue
      boundsPoints.push([m.lat, m.lng])

      let color = '#2DB67D'
      let iconSymbol = '📍'
      if (m.priority === 'URGENT') {
        color = '#C94040'
        iconSymbol = '⚡'
      } else if (m.priority === 'HIGH') {
        color = '#D4920A'
        iconSymbol = '★'
      } else if (m.type === 'courier') {
        color = '#ffd98a'
        iconSymbol = '🚴'
      }

      const icon = createCustomIcon(color, '#ffffff', iconSymbol, m.priority === 'URGENT')
      const marker = L.marker([m.lat, m.lng], { icon }).addTo(layerGroup)
      
      const popupContent = `
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
          <b>${m.label}</b>
          ${m.sublabel ? `<br/><span style="color:#7f857b;">${m.sublabel}</span>` : ''}
          ${m.priority ? `<br/><span style="font-weight:bold; color:${color}; font-size:10px;">${m.priority} PRIORITY</span>` : ''}
        </div>
      `
      marker.bindPopup(popupContent)
      if (m.onClick) {
        marker.on('click', () => m.onClick!())
      }
    }

    // Auto fit bounds
    if (boundsPoints.length > 1) {
      map.fitBounds(L.latLngBounds(boundsPoints), { padding: [40, 40], maxZoom: 14 })
    } else if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], Math.max(map.getZoom(), 13))
    }
  }, [pickup, delivery, courier, markers, showRoute])

  return (
    <div
      ref={mapContainerRef}
      style={{ height, width: '100%' }}
      className={`rounded-[8px] overflow-hidden shadow-inner border border-[rgba(20,26,22,0.12)] z-0 ${className}`}
    />
  )
}
export default OpenStreetMap
