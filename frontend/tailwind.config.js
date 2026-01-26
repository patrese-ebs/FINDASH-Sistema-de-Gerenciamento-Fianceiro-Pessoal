/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{html,ts}",
    ],
    theme: {
        extend: {
            colors: {
                'dark-bg': '#0f172a',
                'dark-card': '#1e293b',
                'dark-border': '#334155',
                'accent-purple': '#818cf8',
                'accent-blue': '#3b82f6',
                'accent-gold': '#f59e0b',
                'text-primary': '#f8fafc',
                'text-secondary': '#94a3b8'
            }
        },
    },
    plugins: [],
}
