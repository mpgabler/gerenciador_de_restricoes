/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
      },
      colors: {
        banestes: {
          navy: '#081c30',       // Azul escuro profundo (Menu lateral e fundos escuros)
          dark: '#002855',       // Azul marinho corporativo
          primary: '#004b87',    // Azul Banestes Clássico (Ações primárias, botões)
          hover: '#003a6b',      // Azul primário hover
          vibrant: '#0066b3',    // Azul intermediário
          cyan: '#009ee3',       // Ciano / Seta Ascendente (Destaque e pontos de foco)
          light: '#e8f3fa',      // Fundo suave de badges e seleções
          green: '#00874c',      // Verde institucional para status regularizado
        }
      }
    },
  },
  plugins: [],
}