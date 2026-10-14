// Demo data around Karachi so distances look realistic.
module.exports = function seed() {
  const t = Date.now();
  const ago = (min) => new Date(t - min * 60000).toISOString();

  const users = [
    { id: 1, name: 'Ayesha Khan', email: 'user@logipulse.com', password: 'user123', created_at: ago(5000) },
    { id: 2, name: 'Bilal Ahmed', email: 'bilal@logipulse.com', password: 'user123', created_at: ago(4000) },
    { id: 3, name: 'Sara Malik', email: 'sara@logipulse.com', password: 'user123', created_at: ago(3000) },
  ];

  const riders = [
    { id: 1, name: 'Hamza Ali', email: 'rider@logipulse.com', password: 'rider123', current_lat: 24.8607, current_lng: 67.0011, is_available: true },
    { id: 2, name: 'Usman Tariq', email: 'usman@logipulse.com', password: 'rider123', current_lat: 24.9056, current_lng: 67.0822, is_available: true },
    { id: 3, name: 'Zain Raza', email: 'zain@logipulse.com', password: 'rider123', current_lat: 24.8138, current_lng: 67.0299, is_available: true },
  ];

  const mk = (id, user_id, pickup_address, pickup_lat, pickup_lng, delivery_address, description, priority, minsAgo) => ({
    id, user_id, rider_id: null,
    pickup_address, pickup_lat, pickup_lng, delivery_address, description,
    status: 'PENDING', priority,
    created_at: ago(minsAgo), updated_at: ago(minsAgo),
    history: [{ status: 'PENDING', at: ago(minsAgo) }],
  });

  const orders = [
    mk(101, 1, 'Dolmen Mall Clifton', 24.8002, 67.0305, 'Gulshan-e-Iqbal Block 13', 'Documents envelope', 'NORMAL', 40),
    mk(102, 2, 'Saddar Empress Market', 24.8556, 67.0225, 'PECHS Block 2', 'Gift box (fragile)', 'HIGH', 30),
    mk(103, 3, 'Port Grand', 24.8416, 66.9987, 'Defence Phase 5', 'Medicine parcel', 'URGENT', 22),
    mk(104, 1, 'Karachi University', 24.9419, 67.1228, 'North Nazimabad Block H', 'Laptop bag', 'NORMAL', 15),
    mk(105, 2, 'Lucky One Mall', 24.9302, 67.0998, 'Nazimabad No. 1', 'Groceries', 'NORMAL', 8),
  ];

  return {
    counters: { users: 4, riders: 4, orders: 106, messages: 1 },
    users, riders, orders, messages: [],
  };
};
