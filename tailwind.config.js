/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./client/index.html",
    "./client/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        frame:  '#2f4436',   // sidebar bg
        paper:  '#e5e4da',   // main content
        ink:    '#141a16',   // primary text
        muted:  '#7f857b',   // secondary text
        brand:  '#2f5640',   // CTA / active
        night:  '#121d17',   // dark sections
        card:   '#1c2c22',   // dark cards
        cream:  '#ecebe1',   // light on dark
        glow:   '#ffd98a',   // amber highlight
        status: {
          success:  '#2DB67D',
          transit:  '#C97A3A',
          warning:  '#D4920A',
          critical: '#C94040',
          pending:  '#7f857b',
        },
      },
      fontFamily: {
        sans:  ['"Inter Tight"', 'Inter', 'Geist', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono:  ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        card:  '6px',
        btn:   '3px',
        badge: '3px',
        input: '5px',
        nav:   '8px',
      },
      boxShadow: {
        card:  '0 30px 50px -28px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.06)',
        stat:  '0 24px 50px -20px rgba(0,0,0,.6), 0 0 0 1px rgba(0,0,0,.04)',
      },
    },
  },
  plugins: [],
}
