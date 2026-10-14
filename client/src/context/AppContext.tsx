import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import {
  AuthUser,
  Order,
  ChatMessage,
  Role,
  OrderStatus,
  PriorityLevel,
  User,
  Rider,
  CustomerPageView,
  RiderPageView,
  AdminPageView,
} from '../types'
import { haversineDistance, estimateTimeMinutes } from '../utils/haversine'
import {
  apiFetch,
  getStoredToken,
  setStoredToken,
  getStoredUser,
  setStoredUser,
  mapBackendOrder,
  mapBackendMessage,
  mapBackendUser,
  mapBackendRider,
  connectSocket,
  disconnectSocket,
  getSocket,
} from '../services/api'

interface AppContextType {
  currentUser: AuthUser | null
  activeRole: Role | null
  orders: Order[]
  messages: ChatMessage[]
  usersList: User[]
  ridersList: Rider[]

  // Navigation views
  customerView: CustomerPageView
  setCustomerView: (view: CustomerPageView) => void
  riderView: RiderPageView
  setRiderView: (view: RiderPageView) => void
  adminView: AdminPageView
  setAdminView: (view: AdminPageView) => void

  // Selected order for tracking or chatting
  selectedOrderId: string | null
  setSelectedOrderId: (id: string | null) => void

  // Rider states
  isRiderOnline: boolean
  toggleRiderOnline: () => void
  riderLocation: { name: string; lat: number; lng: number }
  updateRiderLocation: (name: string, lat: number, lng: number) => void
  isLiveGpsActive: boolean
  toggleDeviceGps: () => void

  // Core actions
  login: (role: Role, email: string, password?: string) => Promise<void> | void
  register: (role: Role, name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  createOrder: (orderData: {
    pickupAddress: string
    pickupLat: number
    pickupLng: number
    deliveryAddress: string
    deliveryLat: number
    deliveryLng: number
    description: string
    packageSize: 'Small' | 'Medium' | 'Large'
    priority: PriorityLevel
  }) => Order | Promise<Order>
  acceptOrder: (orderId: string) => Promise<void> | void
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void> | void
  updateOrderPriority: (orderId: string, priority: PriorityLevel) => Promise<void> | void
  assignRiderToOrder: (orderId: string, riderId: string) => Promise<void> | void
  sendMessage: (orderId: string, content: string) => Promise<void> | void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredUser())
  const [orders, setOrders] = useState<Order[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [usersList, setUsersList] = useState<User[]>([])
  const [ridersList, setRidersList] = useState<Rider[]>([])

  // Navigation views
  const [customerView, setCustomerView] = useState<CustomerPageView>('dashboard')
  const [riderView, setRiderView] = useState<RiderPageView>('dashboard')
  const [adminView, setAdminView] = useState<AdminPageView>('overview')

  // Selected order for tracking or chatting
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  // Rider states
  const [isRiderOnline, setIsRiderOnline] = useState<boolean>(true)
  const [riderLocation, setRiderLocation] = useState<{ name: string; lat: number; lng: number }>({
    name: 'Gulshan-e-Iqbal Block 13',
    lat: 24.9207,
    lng: 67.0982,
  })
  const [isLiveGpsActive, setIsLiveGpsActive] = useState<boolean>(false)
  const watchIdRef = useRef<number | null>(null)

  // Keep a ref to selectedOrderId for socket handlers
  const selectedOrderIdRef = useRef(selectedOrderId)
  useEffect(() => {
    selectedOrderIdRef.current = selectedOrderId
  }, [selectedOrderId])

  // Fetch data from backend according to role
  const refreshData = useCallback(async (userToUse?: AuthUser | null) => {
    const user = userToUse || currentUser
    const token = getStoredToken()
    if (!token || !user) return

    try {
      if (user.role === 'customer') {
        const mine = await apiFetch<any[]>('/api/orders/mine')
        if (Array.isArray(mine)) {
          setOrders(mine.map(mapBackendOrder))
        }
      } else if (user.role === 'rider') {
        const [mine, available, active, profile] = await Promise.all([
          apiFetch<any[]>('/api/orders/mine').catch(() => []),
          apiFetch<any[]>('/api/orders/available').catch(() => []),
          apiFetch<any>('/api/orders/active').catch(() => null),
          apiFetch<any>('/api/riders/me').catch(() => null),
        ])

        const orderMap = new Map<string, Order>()
        if (Array.isArray(available)) {
          for (const o of available) {
            const mapped = mapBackendOrder(o)
            orderMap.set(mapped.id, mapped)
          }
        }
        if (Array.isArray(mine)) {
          for (const o of mine) {
            const mapped = mapBackendOrder(o)
            orderMap.set(mapped.id, mapped)
          }
        }
        const merged = Array.from(orderMap.values())
        if (merged.length > 0) {
          setOrders(merged)
        }

        if (active && active.id) {
          setSelectedOrderId(String(active.id))
        }

        if (profile) {
          setIsRiderOnline(Boolean(profile.is_available))
          if (profile.current_lat && profile.current_lng) {
            setRiderLocation({
              name: 'Current GPS Position',
              lat: Number(profile.current_lat),
              lng: Number(profile.current_lng),
            })
          }
        }
      } else if (user.role === 'admin') {
        const [ordersRes, usersRes, ridersRes] = await Promise.all([
          apiFetch<any>('/api/orders?limit=100').catch(() => null),
          apiFetch<any[]>('/api/users').catch(() => []),
          apiFetch<any[]>('/api/riders').catch(() => []),
        ])

        if (ordersRes && Array.isArray(ordersRes.orders)) {
          setOrders(ordersRes.orders.map(mapBackendOrder))
        }
        if (Array.isArray(usersRes)) {
          setUsersList(usersRes.map(mapBackendUser))
        }
        if (Array.isArray(ridersRes)) {
          setRidersList(ridersRes.map(mapBackendRider))
        }
      }
    } catch (err) {
      console.warn('Error refreshing data from backend:', err)
    }
  }, [currentUser])

  // Initial session rehydration & data fetch
  useEffect(() => {
    const token = getStoredToken()
    if (!token) return

    apiFetch<any>('/api/auth/me')
      .then((me) => {
        const role: Role = me.role === 'user' ? 'customer' : (me.role as Role)
        const updatedUser: AuthUser = {
          id: String(me.id),
          name: me.name,
          email: me.email,
          role: role as any,
        }
        setCurrentUser(updatedUser)
        setStoredUser(updatedUser)
        connectSocket(token)
        refreshData(updatedUser)
      })
      .catch(() => {
        setStoredToken(null)
        setStoredUser(null)
        setCurrentUser(null)
        disconnectSocket()
      })
  }, [])

  // Socket event listeners
  useEffect(() => {
    const token = getStoredToken()
    if (!token) return

    const s = connectSocket(token)

    const handleOrderNew = (backendOrder: any) => {
      const newOrder = mapBackendOrder(backendOrder)
      setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)])
    }

    const handleOrderAccepted = (backendOrder: any) => {
      const updated = mapBackendOrder(backendOrder)
      setOrders((prev) =>
        prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
      )
    }

    const handleStatusUpdated = (data: { orderId?: number; id?: number; status: OrderStatus }) => {
      const targetId = String(data.orderId || data.id)
      setOrders((prev) =>
        prev.map((o) => (o.id === targetId ? { ...o, status: data.status } : o))
      )
    }

    const handlePriorityChanged = (data: { orderId?: number; id?: number; priority: PriorityLevel }) => {
      const targetId = String(data.orderId || data.id)
      setOrders((prev) =>
        prev.map((o) => (o.id === targetId ? { ...o, priority: data.priority } : o))
      )
    }

    const handleMessageNew = (backendMsg: any) => {
      const msg = mapBackendMessage(backendMsg)
      setMessages((prev) => [...prev, msg])
    }

    const handleLocationUpdated = (data: { riderId: number; lat: number; lng: number }) => {
      setRidersList((prev) =>
        prev.map((r) =>
          r.id === String(data.riderId)
            ? { ...r, currentLat: data.lat, currentLng: data.lng }
            : r
        )
      )
    }

    const handleAvailabilityChanged = (data: { riderId: number; is_available: boolean }) => {
      setRidersList((prev) =>
        prev.map((r) =>
          r.id === String(data.riderId)
            ? { ...r, isAvailable: data.is_available, isOnline: data.is_available }
            : r
        )
      )
    }

    s.on('order:new', handleOrderNew)
    s.on('order:accepted', handleOrderAccepted)
    s.on('order:status_updated', handleStatusUpdated)
    s.on('order:priority_changed', handlePriorityChanged)
    s.on('message:new', handleMessageNew)
    s.on('rider:location_updated', handleLocationUpdated)
    s.on('rider:availability_changed', handleAvailabilityChanged)

    return () => {
      s.off('order:new', handleOrderNew)
      s.off('order:accepted', handleOrderAccepted)
      s.off('order:status_updated', handleStatusUpdated)
      s.off('order:priority_changed', handlePriorityChanged)
      s.off('message:new', handleMessageNew)
      s.off('rider:location_updated', handleLocationUpdated)
      s.off('rider:availability_changed', handleAvailabilityChanged)
    }
  }, [currentUser])

  // Join order room & load chat messages when selectedOrderId changes
  useEffect(() => {
    const token = getStoredToken()
    if (!selectedOrderId || !token) return

    const s = getSocket()
    if (s.connected) {
      s.emit('order:join', { orderId: Number(selectedOrderId) || selectedOrderId })
    }

    apiFetch<any[]>(`/api/orders/${selectedOrderId}/messages`)
      .then((msgs) => {
        if (Array.isArray(msgs)) {
          setMessages((prev) => {
            const others = prev.filter((m) => m.orderId !== selectedOrderId)
            return [...others, ...msgs.map(mapBackendMessage)]
          })
        }
      })
      .catch(() => {
        // chat might not be open yet
      })

    return () => {
      if (s.connected) {
        s.emit('order:leave', { orderId: Number(selectedOrderId) || selectedOrderId })
      }
    }
  }, [selectedOrderId])

  // Rider toggle online
  const toggleRiderOnline = async () => {
    const nextVal = !isRiderOnline
    setIsRiderOnline(nextVal)
    try {
      await apiFetch('/api/riders/me/availability', {
        method: 'PATCH',
        body: JSON.stringify({ is_available: nextVal }),
      })
    } catch (err) {
      console.warn('Failed to toggle rider availability:', err)
    }
  }

  // Rider location update
  const updateRiderLocation = async (name: string, lat: number, lng: number) => {
    setRiderLocation({ name, lat, lng })
    try {
      await apiFetch('/api/riders/me/location', {
        method: 'PATCH',
        body: JSON.stringify({ lat, lng }),
      })
      const s = getSocket()
      if (s.connected) {
        s.emit('rider:location_update', { lat, lng })
      }
    } catch (err) {
      console.warn('Failed to update rider location:', err)
    }
  }

  // Live Device Geolocation Tracking
  const toggleDeviceGps = () => {
    if (isLiveGpsActive) {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      setIsLiveGpsActive(false)
    } else {
      if (!('geolocation' in navigator)) {
        alert('Geolocation is not supported by this browser.')
        return
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          updateRiderLocation('Live Device GPS', pos.coords.latitude, pos.coords.longitude)
          setIsLiveGpsActive(true)

          const id = navigator.geolocation.watchPosition(
            (watchPos) => {
              updateRiderLocation('Live Device GPS', watchPos.coords.latitude, watchPos.coords.longitude)
            },
            (err) => console.warn('GPS watch error:', err),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
          )
          watchIdRef.current = id
        },
        (err) => {
          alert('Could not access device GPS: ' + err.message + '. Defaulting to selected Karachi corridor.')
        },
        { enableHighAccuracy: true }
      )
    }
  }

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  // Core Actions
  const login = async (role: Role, email: string, password = 'password123') => {
    const backendRole = role === 'customer' ? 'user' : role
    let normalizedEmail = email.trim()

    // Map default frontend emails to backend seed users
    if (normalizedEmail === 'customer@logipulse.com' || !normalizedEmail) {
      normalizedEmail = 'user@logipulse.com'
    } else if (normalizedEmail === 'rider@logipulse.com') {
      normalizedEmail = 'rider@logipulse.com'
    } else if (normalizedEmail === 'admin@logipulse.com') {
      normalizedEmail = 'admin@logipulse.com'
    }

    try {
      const res = await apiFetch<{ token: string; user: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          role: backendRole,
          email: normalizedEmail,
          password,
        }),
      })

      const authUser: AuthUser = {
        id: String(res.user.id),
        name: res.user.name,
        email: res.user.email,
        role: role as any,
      }

      setStoredToken(res.token)
      setStoredUser(authUser)
      setCurrentUser(authUser)
      connectSocket(res.token)
      await refreshData(authUser)
    } catch (err: any) {
      console.error('Login error:', err)
      // Fallback local mock if backend is down
      const fallbackUser: AuthUser = {
        id: '1',
        name: role === 'customer' ? 'Ayesha Khan' : role === 'rider' ? 'Hamza Ali' : 'Admin Operations',
        email: normalizedEmail,
        role: role as any,
      }
      setStoredUser(fallbackUser)
      setCurrentUser(fallbackUser)
    }
  }

  const register = async (
    role: Role,
    name: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const backendRole = role === 'customer' ? 'user' : role
    try {
      const res = await apiFetch<{ token: string; user: any }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: backendRole,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      })

      const authUser: AuthUser = {
        id: String(res.user.id),
        name: res.user.name,
        email: res.user.email,
        role: role as any,
      }

      setStoredToken(res.token)
      setStoredUser(authUser)
      setCurrentUser(authUser)
      connectSocket(res.token)
      await refreshData(authUser)
      return { success: true }
    } catch (err: any) {
      console.error('Registration error:', err)
      const msg = err.data?.message || err.message || 'Registration failed'
      return { success: false, error: msg }
    }
  }

  const logout = () => {
    apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    disconnectSocket()
    setStoredToken(null)
    setStoredUser(null)
    setCurrentUser(null)
    setOrders([])
    setUsersList([])
    setRidersList([])
  }

  const createOrder = async (orderData: {
    pickupAddress: string
    pickupLat: number
    pickupLng: number
    deliveryAddress: string
    deliveryLat: number
    deliveryLng: number
    description: string
    packageSize: 'Small' | 'Medium' | 'Large'
    priority: PriorityLevel
  }): Promise<Order> => {
    const rawDistance = haversineDistance(
      orderData.pickupLat,
      orderData.pickupLng,
      orderData.deliveryLat,
      orderData.deliveryLng
    )
    const distanceKm = Math.round(rawDistance * 10) / 10

    try {
      const res = await apiFetch<any>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          pickup_address: orderData.pickupAddress,
          pickup_lat: orderData.pickupLat,
          pickup_lng: orderData.pickupLng,
          delivery_address: orderData.deliveryAddress,
          description: orderData.description || `Size: ${orderData.packageSize}`,
        }),
      })

      const newOrder = mapBackendOrder(res)
      newOrder.packageSize = orderData.packageSize
      newOrder.deliveryLat = orderData.deliveryLat
      newOrder.deliveryLng = orderData.deliveryLng

      setOrders((prev) => [newOrder, ...prev])
      setSelectedOrderId(newOrder.id)
      return newOrder
    } catch (err) {
      console.warn('Backend order creation failed, saving locally:', err)
      const nextSeq = orders.length + 1
      const localOrder: Order = {
        id: String(Date.now()),
        displayId: `#LP-0${nextSeq}`,
        userId: currentUser?.id || '1',
        userName: currentUser?.name || 'Customer',
        riderId: null,
        riderName: null,
        pickupAddress: orderData.pickupAddress,
        pickupLat: orderData.pickupLat,
        pickupLng: orderData.pickupLng,
        deliveryAddress: orderData.deliveryAddress,
        deliveryLat: orderData.deliveryLat,
        deliveryLng: orderData.deliveryLng,
        description: orderData.description,
        packageSize: orderData.packageSize,
        priority: orderData.priority,
        status: 'PENDING',
        distanceKm,
        estimatedTime: estimateTimeMinutes(distanceKm),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setOrders((prev) => [localOrder, ...prev])
      setSelectedOrderId(localOrder.id)
      return localOrder
    }
  }

  const acceptOrder = async (orderId: string) => {
    // Optimistic update
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              riderId: currentUser?.id || '1',
              riderName: currentUser?.name || 'Rider',
              status: 'ACCEPTED',
              updatedAt: new Date().toISOString(),
            }
          : o
      )
    )
    setSelectedOrderId(orderId)

    try {
      const res = await apiFetch<any>(`/api/orders/${orderId}/accept`, {
        method: 'PATCH',
      })
      if (res && res.id) {
        const updated = mapBackendOrder(res)
        setOrders((prev) => prev.map((o) => (o.id === String(res.id) ? updated : o)))
      }
    } catch (err) {
      console.warn('Backend accept order error:', err)
    }
  }

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    // Optimistic update
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status,
              updatedAt: new Date().toISOString(),
            }
          : o
      )
    )

    try {
      const res = await apiFetch<any>(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      if (res && res.id) {
        const updated = mapBackendOrder(res)
        setOrders((prev) => prev.map((o) => (o.id === String(res.id) ? updated : o)))
      }
    } catch (err) {
      console.warn('Backend update status error:', err)
    }
  }

  const updateOrderPriority = async (orderId: string, priority: PriorityLevel) => {
    // Optimistic update
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              priority,
              updatedAt: new Date().toISOString(),
            }
          : o
      )
    )

    try {
      const res = await apiFetch<any>(`/api/orders/${orderId}/priority`, {
        method: 'PATCH',
        body: JSON.stringify({ priority }),
      })
      if (res && res.id) {
        const updated = mapBackendOrder(res)
        setOrders((prev) => prev.map((o) => (o.id === String(res.id) ? updated : o)))
      }
    } catch (err) {
      console.warn('Backend update priority error:', err)
    }
  }

  const assignRiderToOrder = (orderId: string, riderId: string) => {
    const assignedRider = ridersList.find((r) => r.id === riderId) || ridersList[0]
    if (!assignedRider) return
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            riderId: assignedRider.id,
            riderName: assignedRider.name,
            status: 'ACCEPTED' as OrderStatus,
            updatedAt: new Date().toISOString(),
          }
        }
        return ord
      })
    )
  }

  const sendMessage = async (orderId: string, content: string) => {
    if (!content.trim()) return
    const senderRole = currentUser?.role === 'customer' ? 'customer' : 'rider'

    const localMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      orderId,
      senderRole,
      senderId: currentUser?.id || '1',
      senderName: currentUser?.name || (senderRole === 'customer' ? 'Customer' : 'Rider'),
      content: content.trim(),
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, localMsg])

    try {
      const res = await apiFetch<any>(`/api/orders/${orderId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: content.trim() }),
      })
      if (res && res.id) {
        const mapped = mapBackendMessage(res)
        setMessages((prev) =>
          prev.map((m) => (m.id === localMsg.id ? mapped : m))
        )
      }
    } catch (err) {
      console.warn('Backend send message error:', err)
    }
  }

  return (
    <AppContext.Provider
      value={{
        currentUser,
        activeRole: currentUser?.role || null,
        orders,
        messages,
        usersList,
        ridersList,
        customerView,
        setCustomerView,
        riderView,
        setRiderView,
        adminView,
        setAdminView,
        selectedOrderId,
        setSelectedOrderId,
        isRiderOnline,
        toggleRiderOnline,
        riderLocation,
        updateRiderLocation,
        isLiveGpsActive,
        toggleDeviceGps,
        login,
        register,
        logout,
        createOrder,
        acceptOrder,
        updateOrderStatus,
        updateOrderPriority,
        assignRiderToOrder,
        sendMessage,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
