export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Los tres verdes de la marca salen de variables (index.css) para que el tema de
        // temporada los cambie en TODA la app sin tocar las pantallas. `<alpha-value>`
        // conserva los modificadores de opacidad (bg-sp-green/20).
        'sp-green': 'rgb(var(--sp-green-rgb) / <alpha-value>)',
        'sp-green-dark': 'rgb(var(--sp-green-dark-rgb) / <alpha-value>)',
        'sp-green-light': 'rgb(var(--sp-green-light-rgb) / <alpha-value>)',
        'sp-gray': '#575757',
        'sp-gray-light': '#F2F2F2',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      screens: {
        xs: '375px',
      },
    },
  },
  plugins: [],
};
