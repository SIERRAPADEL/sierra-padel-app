export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'sp-green': '#84C200',
        'sp-green-dark': '#6AA000',
        'sp-green-light': '#EDF7D6',
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
