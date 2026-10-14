export type Role = 'customer' | 'rider' | 'admin'

export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED'

export type PriorityLevel = 'NORMAL' | 'HIGH' | 'URGENT'

export type CustomerPageView = 'dashboard' | 'new-order' | 'tracking' | 'chat'
export type RiderPageView = 'dashboard' | 'nearby' | 'active' | 'chat'
export type AdminPageView = 'overview' | 'orders' | 'people' | 'priority'

export interface User {
  id: string
  name: string
  email: string
  role: 'customer'
  createdAt: string
  totalOrders: number
  status: 'Active' | 'Inactive'
}

export interface Rider {
  id: string
  name: string
  email: string
  role: 'rider'
  currentLat: number
  currentLng: number
  currentZone: string
  isAvailable: boolean
  isOnline: boolean
  rating: number
  todayEarnings: number
  weekEarnings: number
  activeDeliveriesCount: number
}

export interface Admin {
  id: string
  name: string
  email: string
  role: 'admin'
}

export type AuthUser = User | Rider | Admin

export interface Order {
  id: string
  displayId: string
  userId: string
  userName: string
  riderId: string | null
  riderName: string | null
  pickupAddress: string
  pickupLat: number
  pickupLng: number
  deliveryAddress: string
  deliveryLat: number
  deliveryLng: number
  description: string
  packageSize: 'Small' | 'Medium' | 'Large'
  priority: PriorityLevel
  status: OrderStatus
  estimatedTime?: string
  distanceKm?: number
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  orderId: string
  senderRole: 'customer' | 'rider' | 'system'
  senderId: string
  senderName: string
  content: string
  createdAt: string
}
