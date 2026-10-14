import React, { useState, useEffect, useRef, useId, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { Role } from '../../types'

const PALETTES = {
  forest: {
    frame: '#2f4436',
    paper: '#e5e4da',
    ink: '#141a16',
    muted: '#7f857b',
    brand: '#2f5640',
    night: '#121d17',
    card: '#1c2c22',
    cream: '#ecebe1',
    device: '#c9b79a',
    glow: '#ffd98a',
    satin: ['#0d1712', '#4f6b4f', '#e6e4c8'],
  },
}

const CIRCUIT_PATHS = [
  'M0 236H96M156 236H232Q252 236 252 256V336Q252 356 272 356H430Q450 356 450 376V560Q450 580 470 580H600',
  'M0 470H118M178 470H300Q320 470 320 490V640Q320 660 340 660H612',
  'M84 0V122Q84 142 104 142H170',
  'M0 640H96M156 640H200Q220 640 220 660V760Q220 780 240 780H560',
  'M0 356H24M84 356H160',
  'M330 0V140Q330 160 350 160H380',
]

const CHIPS = [
  { x: 126, y: 236, glyph: '$' },
  { x: 148, y: 470, glyph: '%' },
  { x: 54, y: 356, glyph: '≡' },
  { x: 126, y: 640, glyph: '↗' },
  { x: 200, y: 142, glyph: '··' },
  { x: 410, y: 160, glyph: '◦' },
]

const PETAL_PATH = 'M12 12C9.2 9.6 9.3 4 12 2.6C14.7 4 14.8 9.6 12 12Z'

const FlowerGlyph: React.FC<{ size?: number; color?: string; className?: string }> = ({
  size = 16,
  color = 'currentColor',
  className = '',
}) => {
  return (
    <svg
      className={`mfl-svg ${className}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <g fill={color} stroke={color} strokeWidth="1.6" strokeLinejoin="round">
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <path key={deg} d={PETAL_PATH} transform={`rotate(${deg} 12 12)`} />
        ))}
      </g>
    </svg>
  )
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const InspoLanding: React.FC<{
  onEnterApp?: (role?: Role) => void
  onOpenAuth?: (mode: 'signin' | 'register') => void
}> = ({ onEnterApp, onOpenAuth }) => {
  const { login } = useApp()
  const uid = useId().replace(/:/g, '')
  const colors = PALETTES.forest

  // Navigation & dropdown state
  const [menuOpen, setMenuOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  // Modal tab state removed (modal only has roles section)

  // Interactive 3D Device state
  const [pulseCount, setPulseCount] = useState(0)
  const [rotStep, setRotStep] = useState(0)
  const [hoveredChip, setHoveredChip] = useState(-1)
  const heroRef = useRef<HTMLElement>(null)
  const deviceRef = useRef<HTMLDivElement>(null)
  const circuitWrapRef = useRef<HTMLDivElement>(null)

  // Interactive Heatmap state
  const [heatHover, setHeatHover] = useState<{ m: number; w: number } | null>(null)
  const [walletIdx, setWalletIdx] = useState(0)

  // Stat Card 1 state
  const [cardPeriod, setCardPeriod] = useState(0)
  const [donutHover, setDonutHover] = useState(-1)

  // Scroll statement illumination
  const statementRef = useRef<HTMLParagraphElement>(null)
  const [litWordCount, setLitWordCount] = useState(0)

  // Handle 3D device tilt on mousemove
  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return
    const device = deviceRef.current
    const hero = heroRef.current
    if (device && hero) {
      const rect = hero.getBoundingClientRect()
      const xRatio = (e.clientX - rect.left) / rect.width - 0.5
      const yRatio = (e.clientY - rect.top) / rect.height - 0.5
      device.style.setProperty('--mfl-rx', `${(-yRatio * 18).toFixed(2)}deg`)
      device.style.setProperty('--mfl-ry', `${(xRatio * 24).toFixed(2)}deg`)
    }
  }

  const handlePointerLeave = () => {
    setHoveredChip(-1)
    if (deviceRef.current) {
      deviceRef.current.style.setProperty('--mfl-rx', '0deg')
      deviceRef.current.style.setProperty('--mfl-ry', '0deg')
    }
  }

  const triggerDeviceSignal = () => {
    setPulseCount((prev) => prev + 1)
    setRotStep((prev) => prev + 1)
  }

  // Word illumination on scroll
  useEffect(() => {
    const onScroll = () => {
      if (!statementRef.current) return
      const rect = statementRef.current.getBoundingClientRect()
      const winH = window.innerHeight || 800
      const start = winH * 0.85
      const end = winH * 0.45
      const progress = Math.max(0, Math.min(1, (start - rect.top) / (start - end + rect.height)))
      setLitWordCount(Math.round(progress * 26))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const statementWords = useMemo(
    () => [
      'LogiPulse',
      '{mark}',
      'gives',
      'operations',
      'teams',
      'their',
      'clarity',
      'back:',
      'algorithmic',
      'Haversine',
      'nearby',
      'dispatch,',
      'live',
      'order',
      'tracking',
      'and',
      'unified',
      'dashboards',
      'your',
      'team',
      'will',
      'actually',
      'love',
      'using.',
    ],
    []
  )

  const handleRoleSelect = (role: Role) => {
    setModalOpen(false)
    if (role === 'customer') {
      login('customer', 'customer@logipulse.com')
    } else if (role === 'rider') {
      login('rider', 'rider@logipulse.com')
    } else {
      login('admin', 'admin@logipulse.com')
    }
    onEnterApp?.(role)
  }

  return (
    <div
      className="mfl-root"
      style={
        {
          '--mfl-frame': colors.frame,
          '--mfl-paper': colors.paper,
          '--mfl-ink': colors.ink,
          '--mfl-muted': colors.muted,
          '--mfl-brand': colors.brand,
          '--mfl-night': colors.night,
          '--mfl-card': colors.card,
          '--mfl-cream': colors.cream,
          '--mfl-device': colors.device,
          '--mfl-glow': colors.glow,
          '--mfl-sat-dark': colors.satin[0],
          '--mfl-sat-mid': colors.satin[1],
          '--mfl-sat-light': colors.satin[2],
        } as React.CSSProperties
      }
    >
      {/* STICKY NAV PILL */}
      <nav className="mfl-nav" aria-label="Main">
        <div className="mfl-nav-l">
          <div className="mfl-logo-pill">
            <a
              href="#"
              className="mfl-logo"
              onClick={(e) => {
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              <span className="mfl-logo-mark" aria-hidden="true">
                <FlowerGlyph size={13} color={colors.cream} />
              </span>
              <span>
                logipulse<span className="mfl-dot">.</span>
              </span>
            </a>

            <button
              type="button"
              className={`mfl-burger ${menuOpen ? 'is-open' : ''}`}
              aria-label="Toggle menu"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <i />
              <i />
            </button>
          </div>

          {/* DROPDOWN MENU */}
          {menuOpen && (
            <div className="mfl-dropdown" id={`${uid}-menu`}>
              <ul>
                {[
                  { n: '01', label: 'Customer Portal', action: () => handleRoleSelect('customer') },
                  { n: '02', label: 'Rider Console', action: () => handleRoleSelect('rider') },
                  { n: '03', label: 'Admin Operations', action: () => handleRoleSelect('admin') },
                  { n: '04', label: 'Priority Analytics', action: () => handleRoleSelect('admin') },
                ].map((item, idx) => (
                  <li key={item.label} style={{ animationDelay: `${idx * 40}ms` }}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setMenuOpen(false)
                        item.action()
                      }}
                    >
                      <span className="mfl-dd-n">{item.n}</span>
                      {item.label}
                      <svg
                        className="mfl-svg"
                        viewBox="0 0 12 12"
                        width="12"
                        height="12"
                        aria-hidden="true"
                      >
                        <path
                          d="M3 9L9 3M4 3H9V8"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                        />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mfl-dd-foot">
                <span className="mfl-live" />
                All 3 dashboards active & synced
              </div>
            </div>
          )}
        </div>

        {/* TOP RIGHT NAV BUTTONS */}
        <div className="mfl-nav-r">
          <button
            type="button"
            className="mfl-btn mfl-btn--brand mfl-btn--sm"
            onClick={() => (onOpenAuth ? onOpenAuth('register') : setModalOpen(true))}
          >
            Create Account
          </button>
          <button
            type="button"
            className="mfl-btn mfl-btn--white mfl-btn--sm"
            onClick={() => (onOpenAuth ? onOpenAuth('signin') : setModalOpen(true))}
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header
        ref={heroRef}
        className="mfl-hero"
        style={{ minHeight: 'max(700px, calc(100svh - 14px))' }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {/* CIRCUIT BACKGROUND SVG WITH ANIMATED GLOW PULSES & CHIPS */}
        <div className="mfl-circuit-wrap" ref={circuitWrapRef}>
          <svg
            className="mfl-svg mfl-circuit"
            viewBox="0 0 1440 900"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={`${uid}-pulse`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="var(--mfl-brand)" stopOpacity="0" />
                <stop offset=".7" stopColor="var(--mfl-brand)" stopOpacity=".55" />
                <stop offset="1" stopColor="var(--mfl-glow)" stopOpacity=".9" />
              </linearGradient>
            </defs>

            {/* Left side traces */}
            <g>
              {CIRCUIT_PATHS.map((d, i) => (
                <path key={`trace-l-${i}`} d={d} className="mfl-trace" />
              ))}
              {CIRCUIT_PATHS.map((d, i) => (
                <path
                  key={`pulse-l-${i}`}
                  d={d}
                  pathLength={1000}
                  className="mfl-pulse"
                  stroke={`url(#${uid}-pulse)`}
                  style={{
                    animationDelay: `${-((i * 1.7) % 6)}s`,
                    animationDuration: `${5 + (i % 3)}s`,
                  }}
                />
              ))}
              {CHIPS.map((chip, i) => (
                <g
                  key={`chip-l-${i}`}
                  className={`mfl-chip ${hoveredChip === i ? 'is-hot' : ''}`}
                  transform={`translate(${chip.x} ${chip.y})`}
                >
                  <rect x="-28" y="-16" width="56" height="32" rx="8" />
                  <text x="0" y="4.5" textAnchor="middle">
                    {chip.glyph}
                  </text>
                </g>
              ))}
            </g>

            {/* Right side mirrored traces */}
            <g transform="translate(1440 0) scale(-1 1)">
              {CIRCUIT_PATHS.map((d, i) => (
                <path key={`trace-r-${i}`} d={d} className="mfl-trace" />
              ))}
              {CIRCUIT_PATHS.map((d, i) => (
                <path
                  key={`pulse-r-${i}`}
                  d={d}
                  pathLength={1000}
                  className="mfl-pulse"
                  stroke={`url(#${uid}-pulse)`}
                  style={{
                    animationDelay: `${-((i * 1.7 + 2.3) % 6)}s`,
                    animationDuration: `${5 + ((i + 1) % 3)}s`,
                  }}
                />
              ))}
              {CHIPS.map((chip, i) => (
                <g
                  key={`chip-r-${i}`}
                  className={`mfl-chip ${hoveredChip === i + 6 ? 'is-hot' : ''}`}
                  transform={`translate(${chip.x} ${chip.y})`}
                >
                  <rect x="-28" y="-16" width="56" height="32" rx="8" />
                  <text x="0" y="4.5" textAnchor="middle" transform="scale(-1 1)">
                    {chip.glyph}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </div>

        {/* Floating Rotating Icon Button */}
        <button
          type="button"
          className="mfl-float-tile"
          aria-label="Send signal"
          onClick={triggerDeviceSignal}
        >
          <span style={{ transform: `rotate(${rotStep * 60}deg)` }}>
            <FlowerGlyph size={20} color={colors.ink} />
          </span>
        </button>

        {/* HERO HEADER */}
        <div className="mfl-hero-head">
          <p className="mfl-backer mfl-in" style={{ animationDelay: '60ms' }}>
            Powered by<span className="mfl-backer-mark" aria-hidden="true">✓</span>
            <b>SENTEC Web Forces 2026</b>
          </p>

          <h1 className="mfl-h1">
            <span className="mfl-line mfl-in">
              <span>Deliver anything</span>
            </span>
            <span className="mfl-line mfl-in">
              <span className="mfl-mute">in a single</span>
              <span> afternoon</span>
            </span>
          </h1>

          <p className="mfl-sub mfl-in" style={{ animationDelay: '260ms' }}>
            Customer, Rider & Operations control from one calm workspace.
          </p>

          <div className="mfl-cta-row mfl-in" style={{ animationDelay: '340ms' }}>
            <button
              type="button"
              className="mfl-btn mfl-btn--brand"
              onClick={() => (onOpenAuth ? onOpenAuth('register') : setModalOpen(true))}
            >
              Create Account
            </button>
            <button
              type="button"
              className="mfl-btn mfl-btn--white"
              onClick={() => (onOpenAuth ? onOpenAuth('signin') : setModalOpen(true))}
            >
              Sign In
            </button>
            <button
              type="button"
              className="mfl-btn mfl-btn--white"
              onClick={() => setModalOpen(true)}
            >
              Role Demos ▾
            </button>
          </div>
        </div>

        {/* STAGE: 3D FLOATING DEVICE & HERO STAT CARDS */}
        <div className="mfl-stage">
          {/* Concentric Pulse Rings */}
          <div className="mfl-rings" aria-hidden="true" key={pulseCount}>
            <i />
            <i />
            <i />
          </div>

          {/* 3D FLOATING DEVICE */}
          <div className="mfl-device" ref={deviceRef} style={{ '--mfl-rx': '0deg', '--mfl-ry': '0deg' } as any}>
            <button
              type="button"
              className="mfl-device-btn"
              aria-label="Press the console"
              onClick={triggerDeviceSignal}
            >
              <span className="mfl-device-float">
                <svg
                  className="mfl-svg mfl-device-svg"
                  viewBox="0 0 320 320"
                  width="320"
                  height="320"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id={`${uid}-dev-face`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#fff" stopOpacity=".28" />
                      <stop offset=".45" stopColor="#fff" stopOpacity=".04" />
                      <stop offset="1" stopColor="#000" stopOpacity=".22" />
                    </linearGradient>
                    <radialGradient id={`${uid}-dev-sheen`} cx=".28" cy=".22" r=".7">
                      <stop offset="0" stopColor="#fff" stopOpacity=".55" />
                      <stop offset=".5" stopColor="#fff" stopOpacity=".08" />
                      <stop offset="1" stopColor="#fff" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id={`${uid}-dev-side`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#000" stopOpacity=".05" />
                      <stop offset="1" stopColor="#000" stopOpacity=".45" />
                    </linearGradient>
                    <linearGradient id={`${uid}-dev-led`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="var(--mfl-glow)" stopOpacity="0" />
                      <stop offset=".55" stopColor="var(--mfl-glow)" stopOpacity=".95" />
                      <stop offset=".8" stopColor="#fff6e0" stopOpacity="1" />
                      <stop offset="1" stopColor="var(--mfl-glow)" stopOpacity=".2" />
                    </linearGradient>
                    <filter id={`${uid}-dev-blur`} x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="9" />
                    </filter>
                  </defs>

                  <g transform="rotate(-14 160 160)">
                    {/* Bevel Base */}
                    <rect x="46" y="58" width="228" height="228" rx="76" fill="var(--mfl-device)" />
                    <rect x="46" y="58" width="228" height="228" rx="76" fill={`url(#${uid}-dev-side)`} />

                    {/* Glowing LED Arc */}
                    <g className="mfl-led" key={pulseCount}>
                      <path
                        d="M270 150Q276 262 168 280"
                        fill="none"
                        stroke={`url(#${uid}-dev-led)`}
                        strokeWidth="14"
                        strokeLinecap="round"
                        filter={`url(#${uid}-dev-blur)`}
                      />
                      <path
                        d="M268 160Q270 258 172 276"
                        fill="none"
                        stroke={`url(#${uid}-dev-led)`}
                        strokeWidth="3.4"
                        strokeLinecap="round"
                      />
                    </g>

                    {/* Top Surface */}
                    <rect x="46" y="44" width="228" height="228" rx="76" fill="var(--mfl-device)" />
                    <rect x="46" y="44" width="228" height="228" rx="76" fill={`url(#${uid}-dev-face)`} />
                    <rect x="46" y="44" width="228" height="228" rx="76" fill={`url(#${uid}-dev-sheen)`} />
                    <rect
                      x="47"
                      y="45"
                      width="226"
                      height="226"
                      rx="75"
                      fill="none"
                      stroke="#fff"
                      strokeOpacity=".35"
                      strokeWidth="1.4"
                    />

                    {/* Central Brand Emblem */}
                    <g transform="translate(160 158) scale(2.1) translate(-12 -12)" fill="#000" fillOpacity=".42">
                      {[0, 60, 120, 180, 240, 300].map((deg) => (
                        <path key={deg} d={PETAL_PATH} transform={`rotate(${deg} 12 12)`} />
                      ))}
                    </g>
                  </g>
                </svg>
              </span>
            </button>

            <span className="mfl-device-shadow" aria-hidden="true" />
            <span className="mfl-callout" aria-hidden="true">
              <span className="mfl-live" />
              {pulseCount ? 'Dispatched now' : 'Haversine · live'}
            </span>
          </div>

          {/* HERO FOOT: INFO CALLOUT & STAT CARDS */}
          <div className="mfl-hero-foot">
            <div className="mfl-info mfl-in" style={{ animationDelay: '480ms' }}>
              <p className="mfl-info-k">
                <FlowerGlyph size={10} color="currentColor" /> /why/
              </p>
              <p className="mfl-info-t">
                <span className="mfl-line">
                  <span>LogiPulse pairs every request with the closest courier, </span>
                  <span className="mfl-mute">
                    computes exact geodesic distance and live-syncs cross-dashboard status instantly.
                  </span>
                </span>
              </p>
            </div>

            {/* TWO STAT CARDS */}
            <div className="mfl-cards mfl-in" style={{ animationDelay: '560ms' }}>
              {/* Card 1: Deliveries Handled */}
              <article className="mfl-stat">
                <header className="mfl-stat-top">
                  <div>
                    <h3 className="mfl-stat-t">Courier Flow</h3>
                    <p className="mfl-stat-d">Karachi Central · Oct 2026</p>
                  </div>
                  <div className="mfl-stat-tools">
                    <span className="mfl-ico" aria-hidden="true">
                      <svg className="mfl-svg" viewBox="0 0 12 12" width="10" height="10">
                        <rect x="1.5" y="2.5" width="9" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.1" />
                        <path d="M1.5 5H10.5M4 1.5V3.5M8 1.5V3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                      </svg>
                    </span>
                    <div className="mfl-menu mfl-menu--dark">
                      <button
                        type="button"
                        className="mfl-menu-btn"
                        onClick={() => setCardPeriod((p) => (p + 1) % 3)}
                      >
                        {cardPeriod === 0 ? 'Today' : cardPeriod === 1 ? 'Week' : 'Month'}
                      </button>
                    </div>
                  </div>
                </header>

                <div className="mfl-stat-amt">
                  {cardPeriod === 0 ? '42 Parcels' : cardPeriod === 1 ? '318 Parcels' : '1,420 Parcels'}
                </div>

                <div className="mfl-stat-chg">
                  <span className="mfl-chg">
                    <svg className="mfl-svg" viewBox="0 0 10 10" width="8" height="8" aria-hidden="true">
                      <path d="M5 1.5L8.6 7.5H1.4Z" fill="currentColor" />
                    </svg>
                    14.2%
                  </span>
                  <span>from baseline</span>
                </div>

                {/* SVG Donut */}
                <div className="mfl-stat-split">
                  <svg
                    className="mfl-svg mfl-donut"
                    viewBox="0 0 64 64"
                    width="64"
                    height="64"
                    role="img"
                    aria-label="Zone distribution"
                  >
                    <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="9" />
                    <circle
                      cx="32"
                      cy="32"
                      r="24"
                      fill="none"
                      pathLength="100"
                      stroke="#efe9df"
                      strokeWidth={donutHover === 0 ? 11 : 9}
                      strokeDasharray="48 52"
                      strokeDashoffset="-1.5"
                      transform="rotate(-90 32 32)"
                      className="mfl-arc"
                      onMouseEnter={() => setDonutHover(0)}
                      onMouseLeave={() => setDonutHover(-1)}
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="24"
                      fill="none"
                      pathLength="100"
                      stroke="#b8a99a"
                      strokeWidth={donutHover === 1 ? 11 : 9}
                      strokeDasharray="26 74"
                      strokeDashoffset="-51.5"
                      transform="rotate(-90 32 32)"
                      className="mfl-arc"
                      onMouseEnter={() => setDonutHover(1)}
                      onMouseLeave={() => setDonutHover(-1)}
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="24"
                      fill="none"
                      pathLength="100"
                      stroke="#c4673f"
                      strokeWidth={donutHover === 2 ? 11 : 9}
                      strokeDasharray="18 82"
                      strokeDashoffset="-79.5"
                      transform="rotate(-90 32 32)"
                      className="mfl-arc"
                      onMouseEnter={() => setDonutHover(2)}
                      onMouseLeave={() => setDonutHover(-1)}
                    />
                    <text x="32" y="35.5" textAnchor="middle" className="mfl-donut-t">
                      {donutHover === 0 ? 'Gulshan' : donutHover === 1 ? 'Clifton' : donutHover === 2 ? 'PECHS' : ''}
                    </text>
                  </svg>

                  <div className="mfl-legend">
                    <p className="mfl-legend-h">Karachi Hubs</p>
                    <ul>
                      <li>
                        <i style={{ background: '#efe9df' }} />
                        <span>Gulshan</span>
                        <b>48%</b>
                      </li>
                      <li>
                        <i style={{ background: '#b8a99a' }} />
                        <span>Clifton</span>
                        <b>26%</b>
                      </li>
                      <li>
                        <i style={{ background: '#c4673f' }} />
                        <span>PECHS</span>
                        <b>18%</b>
                      </li>
                      <li>
                        <i style={{ background: '#7b6a5f' }} />
                        <span>DHA</span>
                        <b>8%</b>
                      </li>
                    </ul>
                  </div>
                </div>
              </article>

              {/* Card 2: Transit Velocity */}
              <article className="mfl-stat">
                <header className="mfl-stat-top">
                  <div>
                    <h3 className="mfl-stat-t">Avg Dispatch Time</h3>
                    <p className="mfl-stat-d">Haversine Proximity Match</p>
                  </div>
                  <div className="mfl-stat-tools">
                    <span className="mfl-ico" aria-hidden="true">
                      <svg className="mfl-svg" viewBox="0 0 12 12" width="10" height="10">
                        <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.1" />
                        <path d="M6 3.5V6L7.5 7.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                      </svg>
                    </span>
                  </div>
                </header>

                <div className="mfl-stat-amt">11.4 min</div>

                <div className="mfl-stat-chg">
                  <span className="mfl-chg">
                    <svg className="mfl-svg" viewBox="0 0 10 10" width="8" height="8" aria-hidden="true">
                      <path d="M5 1.5L8.6 7.5H1.4Z" fill="currentColor" />
                    </svg>
                    2.8x
                  </span>
                  <span>faster acceptance</span>
                </div>

                <div className="mfl-stat-split">
                  <div className="flex-1 space-y-2 text-[11px] font-mono text-[#ecebe1]/80">
                    <div className="flex justify-between">
                      <span>Nearest Match:</span>
                      <span className="text-[#ffd98a]">0.8 km</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Fleet:</span>
                      <span className="text-[#2DB67D]">Online</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Priority Peak:</span>
                      <span className="text-[#c4673f]">Active</span>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </header>

      {/* NIGHT SECTION: ILLUMINATING STATEMENT & COUNTERS */}
      <main className="mfl-night">
        <section className="mfl-about" data-sec="about" aria-labelledby={`${uid}-about`}>
          <p className="mfl-badge mfl-rise" id={`${uid}-about`}>
            <FlowerGlyph size={10} color="currentColor" /> Architecture
          </p>

          <p className="mfl-statement" ref={statementRef}>
            {statementWords.map((word, idx) => {
              const isLit = idx < litWordCount
              if (word === '{mark}') {
                return (
                  <span key={idx} className={`mfl-trio ${isLit ? 'is-on' : ''}`} aria-hidden="true">
                    <i>
                      <FlowerGlyph size={14} color="#efe9df" />
                    </i>
                    <i>
                      <FlowerGlyph size={14} color="#2a1411" />
                    </i>
                    <i>
                      <FlowerGlyph size={14} color="#2a1411" />
                    </i>{' '}
                  </span>
                )
              }
              return (
                <span key={idx} className={`mfl-w ${isLit ? 'is-on' : ''}`}>
                  {word}{' '}
                </span>
              )
            })}
          </p>

          <div className="mfl-stats">
            <div className="mfl-statnum mfl-rise">
              <p className="mfl-statnum-v">3 Roles</p>
              <p className="mfl-statnum-l">Customer · Rider · Admin</p>
            </div>
            <div className="mfl-statnum mfl-rise">
              <p className="mfl-statnum-v">100%</p>
              <p className="mfl-statnum-l">Real Haversine formula calculation</p>
            </div>
            <div className="mfl-statnum mfl-rise">
              <p className="mfl-statnum-v">0s</p>
              <p className="mfl-statnum-l">Multi-tab live sync latency</p>
            </div>
          </div>
        </section>

        {/* SATIN FEATURES SECTION */}
        <section className="mfl-feat" data-sec="features" aria-labelledby={`${uid}-feat`}>
          <div className="mfl-feat-bg" aria-hidden="true">
            {/* Satin Waves SVG */}
            <svg
              className="mfl-svg mfl-satin"
              viewBox="0 0 1200 700"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
            >
              <defs>
                <radialGradient id={`${uid}-sun`} cx="0.9" cy="0.08" r="0.55">
                  <stop offset="0" style={{ stopColor: 'var(--mfl-sat-light)', stopOpacity: 1 }} />
                  <stop offset=".35" style={{ stopColor: 'var(--mfl-sat-mid)', stopOpacity: 0.6 }} />
                  <stop offset="1" style={{ stopColor: 'var(--mfl-sat-dark)', stopOpacity: 0 }} />
                </radialGradient>
                <linearGradient id={`${uid}-band`} x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0" style={{ stopColor: 'var(--mfl-sat-dark)', stopOpacity: 0 }} />
                  <stop offset=".3" style={{ stopColor: 'var(--mfl-sat-mid)', stopOpacity: 0.7 }} />
                  <stop offset=".55" style={{ stopColor: 'var(--mfl-sat-light)', stopOpacity: 0.95 }} />
                  <stop offset=".75" style={{ stopColor: 'var(--mfl-sat-mid)', stopOpacity: 0.6 }} />
                  <stop offset="1" style={{ stopColor: 'var(--mfl-sat-dark)', stopOpacity: 0 }} />
                </linearGradient>
              </defs>
              <rect width="1200" height="700" style={{ fill: 'var(--mfl-sat-dark)' }} />
              <rect width="1200" height="700" fill={`url(#${uid}-sun)`} />
              <g className="mfl-satin-a">
                <path
                  d="M-120 620C160 520 360 420 620 250S1020 20 1320 -60L1320 110C1040 170 820 330 600 470S160 720 -120 800Z"
                  fill={`url(#${uid}-band)`}
                />
              </g>
            </svg>
            <span className="mfl-feat-light" />
          </div>

          <div className="mfl-feat-in">
            <p className="mfl-badge mfl-rise">
              <FlowerGlyph size={10} color="currentColor" /> Inside the platform
            </p>
            <h2 className="mfl-h2 mfl-rise" id={`${uid}-feat`}>
              <span className="mfl-line">
                <span>Every </span>
                <span className="mfl-mute">delivery,</span>
              </span>
              <span className="mfl-line">
                <span className="mfl-mute">one</span>
                <span> system</span>
              </span>
            </h2>
            <p className="mfl-feat-sub mfl-rise">
              Couriers, locations and priority analytics side by side in real-time.
            </p>

            {/* FEATURE CARDS: WALLETS & HEATMAP */}
            <div className="mfl-fcards">
              {/* Feature 1: Multi-Hub Dispatch Console */}
              <article className="mfl-fcard mfl-rise">
                <div className="mfl-fmedia">
                  <span className="mfl-flare" aria-hidden="true" />
                  <div className="mfl-panel mfl-wallet">
                    <div className="mfl-panel-row">
                      <div>
                        <p className="mfl-panel-k">Total Dispatched</p>
                        <p className="mfl-wallet-total">Rs 142,800.00</p>
                        <p className="mfl-wallet-g">+18.4% · Today</p>
                      </div>
                      <div className="mfl-menu mfl-menu--light">
                        <button type="button" className="mfl-menu-btn">
                          Karachi Central
                        </button>
                      </div>
                    </div>

                    <div className="mfl-panel-row mfl-wallet-h">
                      <p>Active Zones</p>
                    </div>

                    <div className="mfl-wallet-grid">
                      {[
                        { zone: 'Gulshan', count: '14 Orders', active: true },
                        { zone: 'Clifton', count: '8 Orders', active: true },
                        { zone: 'PECHS', count: '11 Orders', active: true },
                        { zone: 'DHA', count: '6 Orders', active: true },
                      ].map((hub, idx) => (
                        <button
                          key={hub.zone}
                          type="button"
                          className={`mfl-wtile ${idx === walletIdx ? 'is-sel' : ''}`}
                          onClick={() => setWalletIdx(idx)}
                        >
                          <span className="mfl-cur font-mono">📍 {hub.zone}</span>
                          <b>{hub.count}</b>
                          <em>Active</em>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <h3>Zone Coverage & Proximity</h3>
                <p>Click any hub to inspect live courier availability and orders.</p>
              </article>

              {/* Feature 2: Weekly Delivery Heatmap */}
              <article className="mfl-fcard mfl-rise">
                <div className="mfl-fmedia">
                  <span className="mfl-flare mfl-flare--r" aria-hidden="true" />
                  <div className="mfl-panel mfl-spend">
                    <div className="mfl-panel-row">
                      <p className="mfl-panel-k">Order Velocity Heatmap</p>
                      <div className="mfl-menu mfl-menu--light">
                        <button type="button" className="mfl-menu-btn">
                          2026 Peak
                        </button>
                      </div>
                    </div>

                    <div className="mfl-panel-row mfl-spend-sum">
                      <p>
                        <b>1,842 Deliveries</b>
                        <span> of 2,000 target</span>
                      </p>
                      <div className="mfl-spend-legend" aria-hidden="true">
                        <span>
                          <i className="lv2" />
                          &gt;30
                        </span>
                        <span>
                          <i className="lv4" />
                          &gt;60
                        </span>
                      </div>
                    </div>

                    <div className="mfl-meter" role="meter">
                      <i style={{ width: '92%' }} />
                    </div>

                    {/* Heatmap Grid */}
                    <div className="mfl-heat" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
                      {MONTHS.map((m, mIdx) => (
                        <div key={m} className="mfl-heat-col">
                          {[0, 1, 2, 3, 4].map((w) => {
                            const lv = (mIdx * 3 + w * 2) % 5
                            const isHovered = heatHover?.m === mIdx && heatHover?.w === w
                            return (
                              <button
                                key={w}
                                type="button"
                                className={`mfl-cell lv${lv} ${isHovered ? 'is-on' : ''}`}
                                onMouseEnter={() => setHeatHover({ m: mIdx, w })}
                                onMouseLeave={() => setHeatHover(null)}
                              />
                            )
                          })}
                          <span className="mfl-heat-m">{m}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mfl-heat-tip">
                      {heatHover
                        ? `${MONTHS[heatHover.m]} week ${heatHover.w + 1}: ${42 + heatHover.m * 4} parcels completed`
                        : 'Hover a week to inspect courier volume.'}
                    </p>
                  </div>
                </div>
                <h3>Delivery Heatmap</h3>
                <p>Week by week peak delivery density across all coverage zones.</p>
              </article>
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="mfl-cta" data-sec="contact" aria-labelledby={`${uid}-cta`}>
          <div className="mfl-cta-mark mfl-rise" aria-hidden="true">
            <FlowerGlyph size={28} color={colors.cream} />
          </div>

          <h2 className="mfl-h2 mfl-rise" id={`${uid}-cta`}>
            <span className="mfl-line">
              <span>Your complete courier workflow, </span>
              <span className="mfl-mute">in one live demo.</span>
            </span>
          </h2>

          <p className="mfl-feat-sub mfl-rise">
            Test the standard 9-step evaluation sequence in real-time.
          </p>

          <div className="mfl-cta-row mfl-rise">
            <button
              type="button"
              className="mfl-btn mfl-btn--cream"
              onClick={() => setModalOpen(true)}
            >
              Select Role & Launch
            </button>
            <button
              type="button"
              className="mfl-btn mfl-btn--ghost"
              onClick={() => handleRoleSelect('rider')}
            >
              Rider Haversine Console
            </button>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mfl-foot">
          <div className="mfl-foot-top">
            <div className="mfl-foot-brand">
              <span className="mfl-logo">
                <span className="mfl-logo-mark" aria-hidden="true">
                  <FlowerGlyph size={13} color={colors.cream} />
                </span>
                <span>
                  logipulse<span className="mfl-dot">.</span>
                </span>
              </span>
              <p>Built for SENTEC Web Forces 2026. Haversine & Reactive State.</p>
            </div>

            <div className="mfl-foot-col">
              <p>Dashboards</p>
              <ul>
                <li>
                  <a href="#" onClick={(e) => { e.preventDefault(); handleRoleSelect('customer'); }}>
                    Customer View
                  </a>
                </li>
                <li>
                  <a href="#" onClick={(e) => { e.preventDefault(); handleRoleSelect('rider'); }}>
                    Rider Console
                  </a>
                </li>
                <li>
                  <a href="#" onClick={(e) => { e.preventDefault(); handleRoleSelect('admin'); }}>
                    Admin Operations
                  </a>
                </li>
              </ul>
            </div>

            <div className="mfl-foot-col">
              <p>Technical</p>
              <ul>
                <li>
                  <a href="#" onClick={(e) => { e.preventDefault(); handleRoleSelect('rider'); }}>
                    Haversine Formula
                  </a>
                </li>
                <li>
                  <a href="#" onClick={(e) => { e.preventDefault(); handleRoleSelect('admin'); }}>
                    Priority Analytics
                  </a>
                </li>
                <li>
                  <a href="#" onClick={(e) => { e.preventDefault(); handleRoleSelect('customer'); }}>
                    Live Chat Thread
                  </a>
                </li>
              </ul>
            </div>

            <div className="mfl-foot-col">
              <p>Event</p>
              <ul>
                <li><span>NED University</span></li>
                <li><span>The Web Forces</span></li>
                <li><span>Module: Danish</span></li>
              </ul>
            </div>
          </div>

          <p className="mfl-wordmark" aria-hidden="true">
            logipulse<span>.</span>
          </p>

          <div className="mfl-foot-bot">
            <span>© 2026 LogiPulse. Built for SENTEC Web Forces Hackathon.</span>
            <span className="mfl-foot-soc">
              <a href="#">X</a>
              <a href="#">LinkedIn</a>
              <a href="#">GitHub</a>
            </span>
          </div>
        </footer>
      </main>

      {/* MODAL DIALOG (.mfl-modal, .mfl-dialog) */}
      {modalOpen && (
        <div className="mfl-modal" onClick={() => setModalOpen(false)}>
          <div className="mfl-dialog" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="mfl-x"
              aria-label="Close"
              onClick={() => setModalOpen(false)}
            >
              <svg className="mfl-svg" viewBox="0 0 12 12" width="12" height="12">
                <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            <p className="mfl-badge mfl-badge--light">
              <FlowerGlyph size={10} color="currentColor" /> Select Demo Role
            </p>

            <h2 id="mfl-dialog-h">Choose your dashboard.</h2>
            <p className="mfl-dialog-sub">
              All 3 roles read and write to the same live synchronized data layer.
            </p>

            <div className="flex flex-col gap-2.5 mt-4">
              {/* Role 1: Customer */}
              <button
                type="button"
                onClick={() => handleRoleSelect('customer')}
                className="w-full text-left p-3.5 rounded-[6px] border border-[rgba(20,26,22,0.12)] bg-[#fbfaf7] hover:border-[#2f5640] hover:shadow-md transition-all flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <div className="text-[14px] font-semibold text-[#141a16] group-hover:text-[#2f5640]">
                    Customer (User Dashboard)
                  </div>
                  <div className="text-[12px] text-[#7f857b] mt-0.5">
                    Create new deliveries, pick locations, and track active orders
                  </div>
                </div>
                <span className="font-mono text-[11px] text-[#2f5640] font-medium group-hover:translate-x-1 transition-transform">
                  Enter →
                </span>
              </button>

              {/* Role 2: Rider */}
              <button
                type="button"
                onClick={() => handleRoleSelect('rider')}
                className="w-full text-left p-3.5 rounded-[6px] border border-[rgba(20,26,22,0.12)] bg-[#fbfaf7] hover:border-[#2f5640] hover:shadow-md transition-all flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <div className="text-[14px] font-semibold text-[#141a16] group-hover:text-[#2f5640]">
                    Rider (Courier Console)
                  </div>
                  <div className="text-[12px] text-[#7f857b] mt-0.5">
                    Haversine nearby pickups, radar view, 3-step delivery milestones
                  </div>
                </div>
                <span className="font-mono text-[11px] text-[#2f5640] font-medium group-hover:translate-x-1 transition-transform">
                  Enter →
                </span>
              </button>

              {/* Role 3: Admin */}
              <button
                type="button"
                onClick={() => handleRoleSelect('admin')}
                className="w-full text-left p-3.5 rounded-[6px] border border-[rgba(20,26,22,0.12)] bg-[#fbfaf7] hover:border-[#2f5640] hover:shadow-md transition-all flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <div className="text-[14px] font-semibold text-[#141a16] group-hover:text-[#2f5640]">
                    Admin (Operations & Priority Center)
                  </div>
                  <div className="text-[12px] text-[#7f857b] mt-0.5">
                    Operations overview, searchable orders table, Day 2 Priority Center
                  </div>
                </div>
                <span className="font-mono text-[11px] text-[#2f5640] font-medium group-hover:translate-x-1 transition-transform">
                  Enter →
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
