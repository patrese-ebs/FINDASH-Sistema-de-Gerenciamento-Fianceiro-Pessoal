/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{html,ts}",
    ],
    theme: {
        extend: {
            colors: {
                'dark-bg': '#080d1a',
                'dark-surface': '#0d1526',
                'dark-card': '#111827',
                'dark-card-hover': '#161f30',
                'dark-border': '#1e2d45',
                'dark-border-light': '#243552',
                // Brand: Emerald + Gold (NO PURPLE)
                'accent-emerald': '#10b981',
                'accent-emerald-dim': '#059669',
                'accent-gold': '#f59e0b',
                'accent-gold-dim': '#d97706',
                'accent-red': '#ef4444',
                'accent-blue': '#3b82f6',
                'accent-cyan': '#06b6d4',
                // Text
                'text-primary': '#f1f5f9',
                'text-secondary': '#64748b',
                'text-muted': '#334155',
            },
            fontFamily: {
                'sans': ['Inter', 'system-ui', 'sans-serif'],
                'mono': ['JetBrains Mono', 'monospace'],
            },
            animation: {
                'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'slide-in-left': 'slideInLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'fade-in': 'fadeIn 0.3s ease-out forwards',
                'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
            },
            keyframes: {
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideInLeft: {
                    '0%': { opacity: '0', transform: 'translateX(-20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                glow: {
                    '0%': { boxShadow: '0 0 5px rgba(16, 185, 129, 0.3)' },
                    '100%': { boxShadow: '0 0 20px rgba(16, 185, 129, 0.6)' },
                },
            },
            boxShadow: {
                'emerald': '0 0 20px rgba(16, 185, 129, 0.15)',
                'gold': '0 0 20px rgba(245, 158, 11, 0.15)',
                'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
                'card-hover': '0 8px 32px rgba(0, 0, 0, 0.6)',
                'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.05)',
            },
        },
    },
    plugins: [],
}
