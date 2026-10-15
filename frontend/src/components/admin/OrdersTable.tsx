import React, { useState } from 'react'
import { Search, X, ArrowRight, Eye } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { Order, OrderStatus, PriorityLevel } from '../../types'

export const OrdersTable: React.FC = () => {
  const { orders, updateOrderPriority, updateOrderStatus } = useApp()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.displayId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.pickupAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.deliveryAddress.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter
    const matchesPriority = priorityFilter === 'ALL' || o.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'DELIVERED':
        return { bg: 'rgba(45, 182, 125, 0.12)', text: '#2DB67D', label: 'DELIVERED' }
      case 'IN_TRANSIT':
      case 'PICKED_UP':
        return { bg: 'rgba(201, 122, 58, 0.12)', text: '#C97A3A', label: status.replace('_', ' ') }
      case 'ACCEPTED':
        return { bg: 'rgba(47, 86, 64, 0.12)', text: '#2f5640', label: 'ACCEPTED' }
      case 'PENDING':
      default:
        return { bg: 'rgba(127, 133, 123, 0.12)', text: '#7f857b', label: 'PENDING' }
    }
  }

  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'URGENT':
        return { bg: '#C94040', text: '#fff' }
      case 'HIGH':
        return { bg: '#D4920A', text: '#fff' }
      case 'NORMAL':
      default:
        return { bg: '#eeede6', text: '#7f857b' }
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-[#e5e4da] overflow-hidden relative select-none">
      {/* HERO SUBHEADER */}
      <section className="px-6 md:px-10 py-5 border-b border-[rgba(20,26,22,0.08)] bg-gradient-to-b from-[#e0dfd4] to-[#e5e4da] flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="mfl-backer mb-2">
              <span className="mfl-backer-mark">✓</span>
              <b>Logistics Audit Ledger</b>
              <span className="text-[#7f857b]">· {orders.length} Verified Entries</span>
            </div>

            <h1 className="text-[26px] sm:text-[34px] font-normal tracking-[-0.04em] text-[#141a16] leading-tight">
              <span className="text-[#7f857b]">Shipment Ledger / </span>
              <span>All Corridor Deliveries</span>
            </h1>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search */}
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-3 text-[#7f857b]" />
              <input
                type="text"
                placeholder="Search ID, merchant, address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[220px] h-[34px] rounded-[5px] bg-[#fbfaf7] border border-[rgba(20,26,22,0.12)] pl-8 pr-3 text-[12px] text-[#141a16] placeholder-[#7f857b] outline-none focus:border-[#2f5640] transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 text-[#7f857b] hover:text-[#141a16]"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-[34px] rounded-[5px] bg-[#fbfaf7] border border-[rgba(20,26,22,0.12)] px-2.5 text-[11.5px] font-mono text-[#141a16] outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DELIVERED">Delivered</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-[34px] rounded-[5px] bg-[#fbfaf7] border border-[rgba(20,26,22,0.12)] px-2.5 text-[11.5px] font-mono text-[#141a16] outline-none cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent Only</option>
              <option value="HIGH">High Priority</option>
              <option value="NORMAL">Normal</option>
            </select>
          </div>
        </div>
      </section>

      {/* MAIN DATA TABLE WORKSPACE */}
      <div className="flex-1 overflow-x-auto overflow-y-auto px-6 md:px-10 py-6">
        <div className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.10)] rounded-[8px] overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="h-[36px] bg-[#eeede6] border-b border-[rgba(20,26,22,0.08)] text-[10.5px] font-mono uppercase text-[#7f857b]">
                <th className="pl-5 w-[110px]">Order ID</th>
                <th className="pl-3 w-[150px]">Customer</th>
                <th className="pl-3 w-[260px]">Route Corridors</th>
                <th className="pl-3 w-[110px]">Priority</th>
                <th className="pl-3 w-[120px]">Status</th>
                <th className="pl-3 w-[140px]">Courier</th>
                <th className="pr-5 w-[90px] text-right">Inspect</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[rgba(20,26,22,0.06)] text-[12.5px]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#7f857b]">
                    No shipments found matching current query.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusBadge = getStatusBadge(order.status)
                  const priorityBadge = getPriorityBadge(order.priority)
                  const isSelected = selectedOrder?.id === order.id

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className={`h-[48px] hover:bg-[#f5f4ef] transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#eeede6]' : ''
                      }`}
                    >
                      <td className="pl-5 font-mono font-bold text-[#2f5640]">
                        {order.displayId}
                      </td>

                      <td className="pl-3 font-medium text-[#141a16] truncate max-w-[140px]">
                        {order.userName}
                      </td>

                      <td className="pl-3 text-[#141a16]">
                        <div className="flex items-center gap-1.5 truncate max-w-[250px]">
                          <span className="truncate">{order.pickupAddress}</span>
                          <ArrowRight size={11} className="text-[#7f857b] flex-shrink-0" />
                          <span className="text-[#7f857b] truncate">{order.deliveryAddress}</span>
                        </div>
                      </td>

                      <td className="pl-3">
                        <span
                          className="px-2 py-0.5 rounded-[3px] font-mono text-[10px] font-bold uppercase"
                          style={{ backgroundColor: priorityBadge.bg, color: priorityBadge.text }}
                        >
                          {order.priority}
                        </span>
                      </td>

                      <td className="pl-3">
                        <span
                          className="px-2 py-0.5 rounded-[3px] font-mono text-[10.5px] font-medium uppercase"
                          style={{ backgroundColor: statusBadge.bg, color: statusBadge.text }}
                        >
                          {statusBadge.label}
                        </span>
                      </td>

                      <td className="pl-3 text-[#7f857b] font-mono text-[11.5px] truncate max-w-[130px]">
                        {order.riderName || 'Unassigned'}
                      </td>

                      <td className="pr-5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedOrder(order)
                          }}
                          className="p-1 rounded text-[#7f857b] hover:text-[#2f5640] transition-colors cursor-pointer"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL SIDE PANEL (Tactile Inspo Console Drawer) */}
      {selectedOrder && (
        <aside className="absolute right-0 top-0 bottom-0 w-[380px] bg-[#fbfaf7] border-l border-[rgba(20,26,22,0.12)] p-6 shadow-2xl flex flex-col justify-between z-40 animate-pop">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[rgba(20,26,22,0.08)] mb-5">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#7f857b] block">Shipment Detail</span>
                <h3 className="text-[18px] font-bold text-[#2f5640] font-mono">
                  {selectedOrder.displayId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-7 h-7 rounded-full bg-[#eeede6] flex items-center justify-center text-[#7f857b] hover:text-[#141a16] cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-4 text-[13px]">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#7f857b] block">Sender Customer</span>
                <span className="text-[#141a16] font-semibold">{selectedOrder.userName}</span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-[#7f857b] block">Origin Pickup</span>
                <span className="text-[#141a16] font-medium">{selectedOrder.pickupAddress}</span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-[#7f857b] block">Delivery Destination</span>
                <span className="text-[#141a16] font-medium">{selectedOrder.deliveryAddress}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[rgba(20,26,22,0.08)]">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#7f857b] block">Priority</span>
                  <select
                    value={selectedOrder.priority}
                    onChange={(e) => updateOrderPriority(selectedOrder.id, e.target.value as PriorityLevel)}
                    className="mt-1 h-[32px] w-full rounded-[4px] bg-[#f5f4ef] border border-[rgba(20,26,22,0.12)] px-2 text-[11.5px] font-mono"
                  >
                    <option value="NORMAL">NORMAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase text-[#7f857b] block">Status</span>
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value as OrderStatus)}
                    className="mt-1 h-[32px] w-full rounded-[4px] bg-[#f5f4ef] border border-[rgba(20,26,22,0.12)] px-2 text-[11.5px] font-mono"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="ACCEPTED">ACCEPTED</option>
                    <option value="IN_TRANSIT">IN TRANSIT</option>
                    <option value="DELIVERED">DELIVERED</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-[rgba(20,26,22,0.08)]">
                <span className="text-[10px] font-mono uppercase text-[#7f857b] block">Assigned Courier</span>
                <span className="text-[#141a16] font-semibold">
                  {selectedOrder.riderName ? selectedOrder.riderName : 'No Courier Assigned Yet'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedOrder(null)}
            className="mfl-btn mfl-btn--brand mfl-btn--wide mt-6 cursor-pointer shadow-sm"
          >
            Close Details
          </button>
        </aside>
      )}
    </div>
  )
}
export default OrdersTable
