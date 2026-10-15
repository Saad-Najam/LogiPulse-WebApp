import { io, Socket } from 'socket.io-client';
import {
  AuthUser,
  Order,
  ChatMessage,
  OrderStatus,
  PriorityLevel,
  User,
  Rider,
} from '../types';
import { haversineDistance, estimateTimeMinutes } from '../utils/haversine';

const TOKEN_KEY = 'lp_token';
const AUTH_USER_KEY = 'lp_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser | null) {
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // not json
    }
    const msg = errorData.message || errorData.error || `HTTP error ${response.status}`;
    const err = new Error(msg);
    (err as any).status = response.status;
    (err as any).data = errorData;
    throw err;
  }

  return response.json();
}

// Convert Backend Order to Frontend Order
export function mapBackendOrder(b: any): Order {
  const idStr = String(b.id);
  const distance =
    typeof b.distance_km === 'number'
      ? Math.round(b.distance_km * 10) / 10
      : b.pickup_lat && b.delivery_lat
      ? Math.round(haversineDistance(b.pickup_lat, b.pickup_lng, b.delivery_lat, b.delivery_lng) * 10) / 10
      : 3.5;

  return {
    id: idStr,
    displayId: `#LP-0${b.id}`,
    userId: String(b.user_id),
    userName: b.user_name || 'Customer',
    riderId: b.rider_id ? String(b.rider_id) : null,
    riderName: b.rider_name || (b.rider ? b.rider.name : null),
    pickupAddress: b.pickup_address,
    pickupLat: Number(b.pickup_lat),
    pickupLng: Number(b.pickup_lng),
    deliveryAddress: b.delivery_address,
    deliveryLat: b.delivery_lat != null && !isNaN(Number(b.delivery_lat))
      ? Number(b.delivery_lat)
      : Number(b.pickup_lat || 24.8607) - 0.02,
    deliveryLng: b.delivery_lng != null && !isNaN(Number(b.delivery_lng))
      ? Number(b.delivery_lng)
      : Number(b.pickup_lng || 67.0011) - 0.02,
    description: b.description || '',
    packageSize: (b.package_size as any) || 'Medium',
    priority: (b.priority as PriorityLevel) || 'NORMAL',
    status: (b.status as OrderStatus) || 'PENDING',
    distanceKm: distance,
    estimatedTime: estimateTimeMinutes(distance),
    createdAt: b.created_at || new Date().toISOString(),
    updatedAt: b.updated_at || b.created_at || new Date().toISOString(),
  };
}

// Convert Backend Message to Frontend ChatMessage
export function mapBackendMessage(m: any): ChatMessage {
  const role: 'customer' | 'rider' | 'system' =
    m.sender_role === 'user' ? 'customer' : m.sender_role === 'rider' ? 'rider' : 'system';

  return {
    id: String(m.id),
    orderId: String(m.order_id),
    senderRole: role,
    senderId: String(m.sender_id),
    senderName: m.sender_name || (role === 'customer' ? 'Customer' : 'Rider'),
    content: m.content,
    createdAt: m.created_at || new Date().toISOString(),
  };
}

// Convert Backend User to Frontend User
export function mapBackendUser(u: any): User {
  return {
    id: String(u.id),
    name: u.name,
    email: u.email,
    role: 'customer',
    createdAt: u.created_at || new Date().toISOString(),
    totalOrders: Number(u.order_count || u.total_orders || 0),
    status: 'Active',
  };
}

// Convert Backend Rider to Frontend Rider
export function mapBackendRider(r: any): Rider {
  const delivered = Number(r.delivered_count || 0);
  return {
    id: String(r.id),
    name: r.name,
    email: r.email,
    role: 'rider',
    currentLat: Number(r.current_lat || 24.86),
    currentLng: Number(r.current_lng || 67.0),
    currentZone: 'Karachi Central',
    isAvailable: Boolean(r.is_available),
    isOnline: Boolean(r.is_available),
    rating: 4.9,
    todayEarnings: delivered * 150,
    weekEarnings: delivered * 900,
    activeDeliveriesCount: r.active_order_id ? 1 : 0,
  };
}

// WebSocket Connection
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = getStoredToken();
    socket = io(window.location.origin, {
      auth: { token },
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(token: string): Socket {
  if (socket) {
    socket.disconnect();
  }
  socket = io(window.location.origin, {
    auth: { token },
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
