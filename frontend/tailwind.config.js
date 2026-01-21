/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx,html}",
    ],
    theme: {
        extend: {
            colors: {
                'dark-bg': '#0f0f1a',
                'dark-card': '#1a1a2e',
                'dark-border': '#2a2a3e',
                'accent-purple': '#8b5cf6',
                'accent-blue': '#3b82f6',
                'accent-gold': '#fbbf24',
                'text-primary': '#ffffff',
                'text-secondary': '#a0a0a0',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [],
}
