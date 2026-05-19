/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          primary:   '#FFFFFF',
          secondary: '#F8FAFC',
          tertiary:  '#F1F5F9',
          border:    '#E2E8F0',
        },
        accent: {
          green:       '#10B981',
          'green-hover': '#059669',
          blue:        '#3B82F6',
          'blue-hover':  '#2563EB',
        },
        text: {
          secondary: '#64748B',
          muted:     '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
      },
    },
  },
  plugins: [],
}
