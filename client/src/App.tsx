import React, { useState } from 'react'
import { useApp, AppProvider } from './context/AppContext'
import { LoginPage } from './components/LoginPage'
import { InspoLanding } from './components/landing/InspoLanding'
import { AppConsoleShell } from './components/layout/AppConsoleShell'

// Customer screens
import { UserDashboard } from './components/customer/UserDashboard'
import { NewOrderForm } from './components/customer/NewOrderForm'
import { OrderTracking } from './components/customer/OrderTracking'
import { UserChat } from './components/customer/UserChat'

// Rider screens
import { RiderDashboard } from './components/rider/RiderDashboard'
import { NearbyPickups } from './components/rider/NearbyPickups'
import { ActiveDelivery } from './components/rider/ActiveDelivery'
import { RiderChat } from './components/rider/RiderChat'

// Admin screens
import { AdminOverview } from './components/admin/AdminOverview'
import { OrdersTable } from './components/admin/OrdersTable'
import { PeopleManagement } from './components/admin/PeopleManagement'
import { PriorityAnalytics } from './components/admin/PriorityAnalytics'

const CustomerApp: React.FC<{ onGoToLanding: () => void }> = ({ onGoToLanding }) => {
  const { customerView } = useApp()

  return (
    <AppConsoleShell onGoToLanding={onGoToLanding}>
      {customerView === 'dashboard' && <UserDashboard />}
      {customerView === 'new-order' && <NewOrderForm />}
      {customerView === 'tracking' && <OrderTracking />}
      {customerView === 'chat' && <UserChat />}
    </AppConsoleShell>
  )
}

const RiderApp: React.FC<{ onGoToLanding: () => void }> = ({ onGoToLanding }) => {
  const { riderView } = useApp()

  if (riderView === 'active') {
    return (
      <AppConsoleShell onGoToLanding={onGoToLanding}>
        <ActiveDelivery />
      </AppConsoleShell>
    )
  }

  return (
    <AppConsoleShell onGoToLanding={onGoToLanding}>
      {riderView === 'dashboard' && <RiderDashboard />}
      {riderView === 'nearby' && <NearbyPickups />}
      {riderView === 'chat' && <RiderChat />}
    </AppConsoleShell>
  )
}

const AdminApp: React.FC<{ onGoToLanding: () => void }> = ({ onGoToLanding }) => {
  const { adminView } = useApp()

  return (
    <AppConsoleShell onGoToLanding={onGoToLanding}>
      {adminView === 'overview' && <AdminOverview />}
      {adminView === 'orders' && <OrdersTable />}
      {adminView === 'people' && <PeopleManagement />}
      {adminView === 'priority' && <PriorityAnalytics />}
    </AppConsoleShell>
  )
}

const MainAppRouter: React.FC = () => {
  const { currentUser } = useApp()
  const [authView, setAuthView] = useState<'signin' | 'register' | null>(null)

  if (!currentUser) {
    if (authView) {
      return (
        <div className="relative">
          <button
            onClick={() => setAuthView(null)}
            className="fixed top-4 left-4 z-50 text-[12px] font-mono text-[#7f857b] hover:text-[#141a16] bg-[#fbfaf7] border border-[rgba(20,26,22,0.14)] px-3 py-1.5 rounded-[5px] cursor-pointer shadow-sm"
          >
            ← Back to Home
          </button>
          <LoginPage initialMode={authView} />
        </div>
      )
    }

    return (
      <div className="relative">
        <InspoLanding
          onEnterApp={() => {}}
          onOpenAuth={(mode) => setAuthView(mode)}
        />
      </div>
    )
  }

  const handleGoToLanding = () => {
    setAuthView(null)
  }

  switch (currentUser.role) {
    case 'customer':
      return <CustomerApp onGoToLanding={handleGoToLanding} />
    case 'rider':
      return <RiderApp onGoToLanding={handleGoToLanding} />
    case 'admin':
      return <AdminApp onGoToLanding={handleGoToLanding} />
    default:
      return <InspoLanding onEnterApp={() => {}} />
  }
}

export const App: React.FC = () => {
  return (
    <AppProvider>
      <MainAppRouter />
    </AppProvider>
  )
}

export default App
