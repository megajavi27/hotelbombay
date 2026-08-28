/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#04162e',
        'primary-container': '#1a2b44',
        'on-primary': '#ffffff',
        'on-primary-container': '#8292b0',
        'secondary': '#755a34',
        'secondary-container': '#fdd7a7',
        'surface': '#fbf9f8',
        'surface-container': '#efeded',
        'surface-container-low': '#f5f3f3',
        'surface-container-high': '#eae8e7',
        'on-surface': '#1b1c1c',
        'on-surface-variant': '#44474d',
        'outline': '#75777e',
        'outline-variant': '#c5c6ce',
        'error': '#ba1a1a',
        'error-container': '#ffdad6',
      },
      fontFamily: {
        'display': ['Playfair Display', 'serif'],
        'body': ['Montserrat', 'sans-serif'],
        'stat': ['Space Grotesk', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
        'full': '9999px',
      },
      boxShadow: {
        'premium': '0 10px 30px -10px rgba(4, 22, 46, 0.1)',
        'premium-hover': '0 20px 40px -15px rgba(4, 22, 46, 0.15)',
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #04162e 0%, #1a2b44 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #755a34 0%, #fdd7a7 100%)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(15px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        }
      }
    }
  },
  plugins: [],
}
