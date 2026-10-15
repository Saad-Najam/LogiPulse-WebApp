import React, { useState } from 'react'
import { Users, Bike, MapPin } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export const PeopleManagement: React.FC = () => {
  const { usersList, ridersList } = useApp()
  const [activeTab, setActiveTab] = useState<'customers' | 'riders'>('customers')

  return (
    <div className="flex-1 flex flex-col bg-[#e5e4da] overflow-hidden select-none">
      {/* HERO SUBHEADER */}
      <section className="px-6 md:px-10 py-5 border-b border-[rgba(20,26,22,0.08)] bg-gradient-to-b from-[#e0dfd4] to-[#e5e4da] flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="mfl-backer mb-2">
              <span className="mfl-backer-mark">✓</span>
              <b>Directory Registry</b>
              <span className="text-[#7f857b]">· {usersList.length} Customers · {ridersList.length} Couriers</span>
            </div>

            <h1 className="text-[26px] sm:text-[34px] font-normal tracking-[-0.04em] text-[#141a16] leading-tight">
              <span className="text-[#7f857b]">Fleet & User Management · </span>
              <span>Platform Roster</span>
            </h1>
          </div>

          {/* Tab Selector Pills */}
          <div className="flex items-center gap-1.5 bg-[#eeede6] p-1 rounded-[6px] border border-[rgba(20,26,22,0.08)]">
            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className={`px-3.5 py-1.5 rounded-[4px] text-[12px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-[#2f5640] text-white font-bold shadow-xs'
                  : 'text-[#7f857b] hover:text-[#141a16]'
              }`}
            >
              <Users size={13} />
              <span>Customers ({usersList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('riders')}
              className={`px-3.5 py-1.5 rounded-[4px] text-[12px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'riders'
                  ? 'bg-[#2f5640] text-white font-bold shadow-xs'
                  : 'text-[#7f857b] hover:text-[#141a16]'
              }`}
            >
              <Bike size={13} />
              <span>Couriers ({ridersList.length})</span>
            </button>
          </div>
        </div>
      </section>

      {/* DIRECTORY TABLE WORKSPACE */}
      <div className="flex-1 overflow-x-auto overflow-y-auto px-6 md:px-10 py-6">
        <div className="bg-[#fbfaf7] border border-[rgba(20,26,22,0.10)] rounded-[8px] overflow-hidden shadow-sm">
          {activeTab === 'customers' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="h-[36px] bg-[#eeede6] border-b border-[rgba(20,26,22,0.08)] text-[10.5px] font-mono uppercase text-[#7f857b]">
                  <th className="pl-5 w-[200px]">Customer Name</th>
                  <th className="pl-3 w-[220px]">Email Address</th>
                  <th className="pl-3 w-[120px]">Orders Placed</th>
                  <th className="pl-3 w-[140px]">Account Since</th>
                  <th className="pr-5 w-[110px] text-right">Account Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(20,26,22,0.06)] text-[13px]">
                {usersList.map((user) => (
                  <tr key={user.id} className="h-[50px] hover:bg-[#f5f4ef] transition-colors">
                    <td className="pl-5 font-semibold text-[#141a16] flex items-center gap-2.5 pt-3">
                      <div className="w-7 h-7 rounded-full bg-[#2f5640]/10 text-[#2f5640] flex items-center justify-center font-bold text-[11px]">
                        {user.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{user.name}</span>
                    </td>
                    <td className="pl-3 text-[#7f857b] font-mono text-[12px]">{user.email}</td>
                    <td className="pl-3 font-mono font-bold text-[#141a16]">{user.totalOrders || 4}</td>
                    <td className="pl-3 text-[#7f857b] font-mono text-[11.5px]">Oct 2026</td>
                    <td className="pr-5 text-right">
                      <span className="px-2 py-0.5 rounded-[3px] bg-[#2DB67D]/12 text-[#2DB67D] font-mono text-[10.5px] font-bold">
                        VERIFIED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="h-[36px] bg-[#eeede6] border-b border-[rgba(20,26,22,0.08)] text-[10.5px] font-mono uppercase text-[#7f857b]">
                  <th className="pl-5 w-[200px]">Courier Name</th>
                  <th className="pl-3 w-[150px]">Status</th>
                  <th className="pl-3 w-[220px]">Assigned Station / GPS</th>
                  <th className="pl-3 w-[120px]">Completed Deliveries</th>
                  <th className="pr-5 w-[110px] text-right">Driver Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(20,26,22,0.06)] text-[13px]">
                {ridersList.map((rider) => (
                  <tr key={rider.id} className="h-[50px] hover:bg-[#f5f4ef] transition-colors">
                    <td className="pl-5 font-semibold text-[#141a16] flex items-center gap-2.5 pt-3">
                      <div className="w-7 h-7 rounded-full bg-[#2DB67D]/15 text-[#2DB67D] flex items-center justify-center font-bold text-[11px]">
                        {rider.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{rider.name}</span>
                    </td>
                    <td className="pl-3">
                      <span
                        className={`px-2 py-0.5 rounded-[3px] font-mono text-[10.5px] font-bold flex items-center gap-1.5 w-max ${
                          rider.isOnline
                            ? 'bg-[#2DB67D]/15 text-[#2DB67D]'
                            : 'bg-[#eeede6] text-[#7f857b]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            rider.isOnline ? 'bg-[#2DB67D]' : 'bg-[#7f857b]'
                          }`}
                        />
                        <span>{rider.isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                      </span>
                    </td>
                    <td className="pl-3 text-[#141a16] font-medium flex items-center gap-1 pt-3.5">
                      <MapPin size={12} className="text-[#2DB67D]" />
                      <span>{rider.currentZone || 'Karachi South'}</span>
                    </td>
                    <td className="pl-3 font-mono font-bold text-[#141a16]">{rider.todayEarnings > 0 ? 14 : 8}</td>
                    <td className="pr-5 text-right font-mono font-bold text-[#D4920A]">
                      ★ {rider.rating || '4.9'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
export default PeopleManagement
