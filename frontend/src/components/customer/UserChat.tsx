import React, { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Send, CheckCheck, MapPin } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export const UserChat: React.FC = () => {
  const { messages, sendMessage, selectedOrderId, orders, setCustomerView, currentUser } = useApp()
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const relevantOrders = currentUser && currentUser.role === 'customer'
    ? orders.filter((o) => String(o.userId) === String(currentUser.id))
    : orders
  const activeOrders = relevantOrders.filter((o) => o.status !== 'DELIVERED')

  const activeOrder =
    relevantOrders.find((o) => o.id === selectedOrderId) ||
    activeOrders.find((o) => o.status === 'IN_TRANSIT') ||
    activeOrders[0] ||
    relevantOrders[0]

  const orderMessages = messages.filter(
    (m) => m.orderId === (activeOrder?.id || 'ord_101')
  )

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [orderMessages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return
    sendMessage(activeOrder?.id || 'ord_101', inputText)
    setInputText('')
  }

  const quickReplies = [
    'I am outside the gate',
    'Please leave with building reception',
    'Calling you now',
    'Gate code is #1042',
  ]

  return (
    <div className="flex-1 flex flex-col h-full bg-[#e5e4da] overflow-hidden select-none">
      {/* CONSOLE CHAT HEADER */}
      <header className="h-[56px] border-b border-[rgba(20,26,22,0.10)] px-6 flex items-center justify-between flex-shrink-0 bg-[#dddcd2]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCustomerView('tracking')}
            className="text-[#7f857b] hover:text-[#141a16] transition-colors p-1.5 rounded-[4px] hover:bg-[rgba(20,26,22,0.06)] cursor-pointer"
            title="Back to Tracking"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-[#2f4436] text-[#ffd98a] flex items-center justify-center text-[12px] font-bold shadow-xs">
              {(activeOrder?.riderName || 'Rider').slice(0, 2).toUpperCase()}
            </div>
            {activeOrder?.riderName && (
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#2DB67D] ring-2 ring-[#dddcd2]" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-[#141a16]">
                {activeOrder?.riderName || (activeOrder ? 'Pending Rider Assignment' : 'No Active Order')}
              </span>
              {activeOrder?.riderName && (
                <span className="text-[10px] font-mono text-[#2DB67D] bg-[#2DB67D]/12 px-1.5 py-0.2 rounded font-semibold">
                  ACTIVE
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#7f857b] font-mono">
              {activeOrder ? `Courier dispatch for ${activeOrder.displayId}` : 'Create an order to initiate dispatch'}
            </div>
          </div>
        </div>

        {/* Route Details Pill */}
        {activeOrder && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-[4px] bg-[#fbfaf7] border border-[rgba(20,26,22,0.10)] text-[11px] font-mono text-[#7f857b]">
            <MapPin size={11} className="text-[#2f5640]" />
            <span>{activeOrder.pickupAddress} → {activeOrder.deliveryAddress}</span>
          </div>
        )}
      </header>

      {/* SCROLLABLE MESSAGE STREAM */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3.5 max-w-4xl w-full mx-auto">
        {orderMessages.map((msg) => {
          if (msg.senderRole === 'system') {
            return (
              <div key={msg.id} className="relative flex items-center justify-center my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[rgba(20,26,22,0.10)]" />
                </div>
                <span className="relative bg-[#e5e4da] px-3 font-mono text-[10.5px] text-[#7f857b] uppercase tracking-wider">
                  {msg.content}
                </span>
              </div>
            )
          }

          const isCustomer = msg.senderRole === 'customer'

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-[8px] px-4 py-2.5 text-[13.5px] leading-relaxed shadow-xs ${
                  isCustomer
                    ? 'bg-[#2f5640] text-white shadow-sm'
                    : 'bg-[#fbfaf7] text-[#141a16] border border-[rgba(20,26,22,0.12)] shadow-sm'
                }`}
              >
                {msg.content}
              </div>
              <div className="flex items-center gap-1 mt-1 px-1">
                <span className="font-mono text-[10px] text-[#7f857b]">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {isCustomer && <CheckCheck size={12} className="text-[#2f5640]" />}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* QUICK SUGGESTION CHIPS */}
      <div className="px-6 py-2 bg-[#dddcd2]/60 border-t border-[rgba(20,26,22,0.06)] flex items-center gap-2 overflow-x-auto">
        {quickReplies.map((reply) => (
          <button
            key={reply}
            type="button"
            onClick={() => {
              sendMessage(activeOrder?.id || 'ord_101', reply)
            }}
            className="px-2.5 py-1 rounded-[4px] bg-[#fbfaf7] hover:bg-[#f5f4ef] border border-[rgba(20,26,22,0.10)] text-[11px] text-[#141a16] whitespace-nowrap cursor-pointer transition-colors shadow-2xs"
          >
            {reply}
          </button>
        ))}
      </div>

      {/* FIXED INPUT BAR */}
      <div className="h-[60px] bg-[#dddcd2] border-t border-[rgba(20,26,22,0.10)] px-6 flex items-center gap-3 flex-shrink-0">
        <form onSubmit={handleSend} className="flex-1 flex items-center gap-2.5 max-w-4xl mx-auto w-full">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message to the courier..."
            className="flex-1 h-[42px] rounded-[5px] bg-[#fbfaf7] border border-[rgba(20,26,22,0.14)] px-3.5 text-[13.5px] text-[#141a16] placeholder-[#7f857b] outline-none focus:border-[#2f5640] focus:ring-2 focus:ring-[#2f5640]/15 transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="mfl-btn mfl-btn--brand h-[42px] px-4 cursor-pointer disabled:opacity-50 transition-all shadow-sm flex items-center gap-1.5"
          >
            <Send size={14} />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  )
}
export default UserChat
