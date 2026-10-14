import React, { useState } from 'react'
import { Package, Bike, Shield, ChevronRight, type LucideIcon, UserPlus, LogIn, AlertCircle } from 'lucide-react'
import { Role } from '../types'
import { useApp } from '../context/AppContext'

interface RoleOption {
  id: Role
  title: string
  description: string
  color: string
  bgColorTint: string
  defaultEmail: string
  icon: LucideIcon
}

const ROLES: RoleOption[] = [
  {
    id: 'customer',
    title: 'Customer',
    description: 'Request deliveries & track packages live',
    color: '#2f5640', // Forest brand
    bgColorTint: 'rgba(47, 86, 64, 0.05)',
    defaultEmail: 'user@logipulse.com',
    icon: Package,
  },
  {
    id: 'rider',
    title: 'Rider',
    description: 'Accept nearby deliveries & update transit status',
    color: '#2DB67D', // Muted emerald
    bgColorTint: 'rgba(45, 182, 125, 0.05)',
    defaultEmail: 'rider@logipulse.com',
    icon: Bike,
  },
  {
    id: 'admin',
    title: 'Admin',
    description: 'Operations monitoring, fleet & priority analytics',
    color: '#D4920A', // Amber glow
    bgColorTint: 'rgba(212, 146, 10, 0.06)',
    defaultEmail: 'admin@logipulse.com',
    icon: Shield,
  },
]

export const LoginPage: React.FC<{ initialMode?: 'signin' | 'register' }> = ({ initialMode = 'signin' }) => {
  const { login, register } = useApp()
  const [authMode, setAuthMode] = useState<'signin' | 'register'>(initialMode)
  const [selectedRole, setSelectedRole] = useState<Role | null>('customer')

  // Fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState(initialMode === 'register' ? '' : 'user@logipulse.com')
  const [password, setPassword] = useState(initialMode === 'register' ? '' : 'password123')

  // UI state
  const [nameFocused, setNameFocused] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Roles available for registration (Admin is system-only)
  const availableRoles = authMode === 'register' ? ROLES.filter((r) => r.id !== 'admin') : ROLES

  // Auto-fill demo credentials when a role is selected in Sign In mode
  const handleSelectRole = (role: Role) => {
    setSelectedRole(role)
    setErrorMessage(null)
    if (authMode === 'signin') {
      const roleConfig = ROLES.find((r) => r.id === role)
      if (roleConfig) {
        setEmail(roleConfig.defaultEmail)
        setPassword('password123')
      }
    }
  }

  const handleSwitchMode = (mode: 'signin' | 'register') => {
    setAuthMode(mode)
    setErrorMessage(null)
    if (mode === 'register') {
      if (selectedRole === 'admin') setSelectedRole('customer')
      setEmail('')
      setPassword('')
      setName('')
    } else {
      setSelectedRole('customer')
      setEmail('user@logipulse.com')
      setPassword('password123')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole) return
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      if (authMode === 'register') {
        if (!name.trim() || name.trim().length < 2) {
          setErrorMessage('Please enter your full name (minimum 2 characters).')
          setIsSubmitting(false)
          return
        }
        if (!password || password.length < 8) {
          setErrorMessage('Password must be at least 8 characters.')
          setIsSubmitting(false)
          return
        }

        const res = await register(selectedRole, name, email, password)
        if (!res.success) {
          setErrorMessage(res.error || 'Registration failed. Email may already be in use.')
        }
      } else {
        await login(selectedRole, email, password)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check credentials.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="mfl-root min-h-screen w-full flex flex-col justify-center items-center px-4 py-8 select-none"
      style={{
        background: '#2f4436',
      }}
    >
      <div className="w-full max-w-[460px] bg-[#e5e4da] rounded-[10px] p-7 md:p-8 border border-[rgba(255,255,255,0.12)] shadow-2xl flex flex-col items-center">
        {/* Brand header pill */}
        <div className="mfl-backer mb-3">
          <span className="mfl-backer-mark">✓</span>
          <b>LogiPulse Dispatch Network</b>
        </div>

        {/* Logo Mark & Wordmark */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-[5px] bg-[#141a16] flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg
              className="mfl-svg"
              viewBox="0 0 24 24"
              width={14}
              height={14}
              aria-hidden="true"
            >
              <g fill="#ecebe1" stroke="#ecebe1" strokeWidth="1.6" strokeLinejoin="round">
                {[0, 60, 120, 180, 240, 300].map((deg) => (
                  <path
                    key={deg}
                    d="M12 12C9.2 9.6 9.3 4 12 2.6C14.7 4 14.8 9.6 12 12Z"
                    transform={`rotate(${deg} 12 12)`}
                  />
                ))}
              </g>
            </svg>
          </div>
          <span className="text-[20px] font-semibold text-[#141a16] tracking-tight">
            logipulse<span className="mfl-dot">.</span>
          </span>
        </div>

        {/* MODE SWITCHER TABS: [ Sign In ] vs [ Create Account ] */}
        <div className="w-full grid grid-cols-2 p-1 bg-[#dcdbd0] rounded-[6px] border border-[rgba(20,26,22,0.10)] mb-5">
          <button
            type="button"
            onClick={() => handleSwitchMode('signin')}
            className={`h-[34px] rounded-[4px] text-[12.5px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'signin'
                ? 'bg-[#2f5640] text-white shadow-sm font-semibold'
                : 'text-[#141a16]/70 hover:text-[#141a16]'
            }`}
          >
            <LogIn size={13} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('register')}
            className={`h-[34px] rounded-[4px] text-[12.5px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'register'
                ? 'bg-[#2f5640] text-white shadow-sm font-semibold'
                : 'text-[#141a16]/70 hover:text-[#141a16]'
            }`}
          >
            <UserPlus size={13} />
            <span>Create Account</span>
          </button>
        </div>

        <p className="text-[12.5px] text-[#7f857b] text-center mb-4">
          {authMode === 'register'
            ? 'Register a new customer or courier account on the Supabase network.'
            : 'Select an authorized role or sign in with your credentials.'}
        </p>

        {/* Error notification banner */}
        {errorMessage && (
          <div className="w-full p-2.5 mb-4 rounded-[6px] bg-[#C94040]/10 border border-[#C94040]/25 flex items-center gap-2 text-[#C94040] text-[12px]">
            <AlertCircle size={15} className="flex-shrink-0" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Role Selection */}
        <div className="w-full flex flex-col gap-2">
          {availableRoles.map((role) => {
            const isSelected = selectedRole === role.id
            const Icon = role.icon

            return (
              <div
                key={role.id}
                onClick={() => handleSelectRole(role.id)}
                style={{
                  backgroundColor: isSelected ? role.bgColorTint : '#fbfaf7',
                  borderLeftColor: isSelected ? role.color : undefined,
                  borderLeftWidth: isSelected ? '3px' : '1px',
                }}
                className={`w-full h-[62px] rounded-[6px] border transition-all duration-150 cursor-pointer flex items-center px-3.5 shadow-2xs ${
                  isSelected
                    ? 'border-t-[rgba(20,26,22,0.14)] border-r-[rgba(20,26,22,0.14)] border-b-[rgba(20,26,22,0.14)]'
                    : 'border-[rgba(20,26,22,0.10)] hover:bg-[#f5f4ef]'
                }`}
              >
                {/* icon container */}
                <div className="w-[32px] h-[32px] rounded-[5px] bg-[#eeede6] flex items-center justify-center flex-shrink-0 mr-3">
                  <Icon size={16} color={role.color} />
                </div>

                {/* Role details */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="text-[13.5px] font-bold text-[#141a16] leading-tight">
                    {role.title}
                  </div>
                  <div className="text-[11px] text-[#7f857b] truncate mt-0.5">
                    {role.description}
                  </div>
                </div>

                <ChevronRight size={14} className="text-[#7f857b] flex-shrink-0" />
              </div>
            )
          })}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3 mt-4">
          {/* Full Name Field (Register Mode Only) */}
          {authMode === 'register' && (
            <div
              className={`relative h-[44px] w-full rounded-[5px] bg-[#fbfaf7] border transition-colors duration-150 flex items-center px-3.5 ${
                nameFocused ? 'border-[#2f5640] ring-2 ring-[#2f5640]/15' : 'border-[rgba(20,26,22,0.14)]'
              }`}
            >
              <label
                htmlFor="register-name"
                className={`absolute left-3.5 transition-all duration-150 pointer-events-none ${
                  nameFocused || name.length > 0
                    ? 'top-1.5 text-[9.5px] ' + (nameFocused ? 'text-[#2f5640] font-bold' : 'text-[#7f857b]')
                    : 'top-3 text-[12.5px] text-[#7f857b]'
                }`}
              >
                Full Name
              </label>
              <input
                id="register-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                required
                placeholder=""
                className={`w-full bg-transparent text-[#141a16] text-[13px] outline-none font-sans ${
                  nameFocused || name.length > 0 ? 'pt-3' : 'pt-0'
                }`}
              />
            </div>
          )}

          {/* Email Field with Floating Label */}
          <div
            className={`relative h-[44px] w-full rounded-[5px] bg-[#fbfaf7] border transition-colors duration-150 flex items-center px-3.5 ${
              emailFocused ? 'border-[#2f5640] ring-2 ring-[#2f5640]/15' : 'border-[rgba(20,26,22,0.14)]'
            }`}
          >
            <label
              htmlFor="login-email"
              className={`absolute left-3.5 transition-all duration-150 pointer-events-none ${
                emailFocused || email.length > 0
                  ? 'top-1.5 text-[9.5px] ' + (emailFocused ? 'text-[#2f5640] font-bold' : 'text-[#7f857b]')
                  : 'top-3 text-[12.5px] text-[#7f857b]'
              }`}
            >
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              required
              className={`w-full bg-transparent text-[#141a16] text-[13px] outline-none font-sans ${
                emailFocused || email.length > 0 ? 'pt-3' : 'pt-0'
              }`}
            />
          </div>

          {/* Password Field with Floating Label */}
          <div
            className={`relative h-[44px] w-full rounded-[5px] bg-[#fbfaf7] border transition-colors duration-150 flex items-center px-3.5 ${
              passwordFocused ? 'border-[#2f5640] ring-2 ring-[#2f5640]/15' : 'border-[rgba(20,26,22,0.14)]'
            }`}
          >
            <label
              htmlFor="login-password"
              className={`absolute left-3.5 transition-all duration-150 pointer-events-none ${
                passwordFocused || password.length > 0
                  ? 'top-1.5 text-[9.5px] ' + (passwordFocused ? 'text-[#2f5640] font-bold' : 'text-[#7f857b]')
                  : 'top-3 text-[12.5px] text-[#7f857b]'
              }`}
            >
              Password {authMode === 'register' && '(min 8 chars)'}
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              required
              className={`w-full bg-transparent text-[#141a16] text-[13px] outline-none font-sans ${
                passwordFocused || password.length > 0 ? 'pt-3' : 'pt-0'
              }`}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mfl-btn mfl-btn--brand mfl-btn--wide mt-1 shadow-sm cursor-pointer"
          >
            {isSubmitting
              ? authMode === 'register'
                ? 'Creating Account...'
                : 'Authenticating...'
              : authMode === 'register'
              ? 'Create Account & Launch'
              : 'Sign In & Launch'}
          </button>

          {/* Mode toggle link */}
          <div className="text-center pt-2">
            {authMode === 'signin' ? (
              <span
                onClick={() => handleSwitchMode('register')}
                className="text-[12px] text-[#7f857b] hover:text-[#141a16] hover:underline cursor-pointer"
              >
                Don't have an account? <b className="text-[#2f5640]">Create Account</b>
              </span>
            ) : (
              <span
                onClick={() => handleSwitchMode('signin')}
                className="text-[12px] text-[#7f857b] hover:text-[#141a16] hover:underline cursor-pointer"
              >
                Already have an account? <b className="text-[#2f5640]">Sign In</b>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
