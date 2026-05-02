import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta Achis de Amor — basada en su Instagram (azul polvoriento, crema mantequilla, terracota cálido)
        cream: {
          50: '#FBF6E8',  // mantequilla suave (fondo principal)
          100: '#F5EDD5',
          200: '#EBDFB8',
          300: '#DEC8A1',
          400: '#C9AE82',
          500: '#B8935E',
          600: '#9A7644',
          700: '#7A5C36',
          800: '#5C4528',
          900: '#3D2E1A',
        },
        terracotta: {
          50: '#FAF1EC',
          100: '#F1DCCE',
          200: '#E2B8A0',
          300: '#D29475',
          400: '#BB7655',  // un poco menos saturado (de #C07555)
          500: '#A05D44',  // más empolvado (de #A65A40)
          600: '#864B36',
          700: '#683A2B',
          800: '#4D2B20',
          900: '#321C15',
        },
        // Gris cálido sutil para detalles (texto secundario, bordes, separadores)
        warm: {
          50: '#F8F5F1',
          100: '#EFEAE2',
          200: '#DCD5C8',
          300: '#BFB5A2',
          400: '#9F947E',
          500: '#7F7460',
          600: '#615847',
          700: '#494232',
          800: '#322D22',
          900: '#1F1B14',
        },
        sky: {
          50: '#F1F5F8',
          100: '#DDE7EE',
          200: '#BDCFDB',
          300: '#9FB7C7',  // azul polvoriento típico de Achis (visto en sus posts)
          400: '#7E9EB3',
          500: '#5F839A',
          600: '#4A6A7E',
          700: '#3A5363',
          800: '#293B47',
          900: '#1A262E',
        },
        sage: {
          50: '#F2F4ED',
          100: '#E2E7D5',
          200: '#C7D1AE',
          300: '#A9B987',
          400: '#8AA063',
          500: '#6F864A',
          600: '#576B38',
          700: '#43522B',
          800: '#313B20',
          900: '#202715',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
