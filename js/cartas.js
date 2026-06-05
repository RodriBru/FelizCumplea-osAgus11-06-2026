/*
  ==========================================================
  CONFIGURACIÓN CENTRAL DE CARTAS — VERSIÓN 2
  ==========================================================

  La experiencia tiene 10 lugares reservados:
  - Perla ya está configurada con sello de galleta.
  - Shayna ya está configurada con sello de nota musical.
  - Anage y las cartas pendientes usan corazón hasta definir un sello propio.
  - Las otras 7 cartas quedan genéricas hasta tener nombres reales.
  - La carta física de Rodrigo NO se incluye en esta web.

  Para reemplazar un lugar genérico:
  1. Copiá la imagen escaneada dentro de /assets/img/cartas/
  2. Cambiá persona, subtitulo, imagen y tipoSello.
*/

const CARTAS = [
  {
    id: "perla",
    persona: "Perla",
    subtitulo: "Un mensaje muy dulce",
    imagen: "./assets/img/cartas/perla.svg",
    tipoSello: "cookie",
    disponible: true
  },
  {
    id: "shayna",
    persona: "Shayna",
    subtitulo: "Un mensaje con música propia",
    imagen: "./assets/img/cartas/carta_02.svg",
    tipoSello: "music",
    disponible: true
  },
  {
    id: "anage",
    persona: "Anage",
    subtitulo: "Un mensaje con mucho corazón",
    imagen: "./assets/img/cartas/anage.jpeg",
    tipoSello: "heart",
    disponible: true
  },
  {
    id: "carta-04",
    persona: "Carta sorpresa 04",
    subtitulo: "Nombre por definir",
    imagen: "./assets/img/cartas/carta_04.svg",
    tipoSello: "heart",
    disponible: true
  },
  {
    id: "carta-05",
    persona: "Carta sorpresa 05",
    subtitulo: "Nombre por definir",
    imagen: "./assets/img/cartas/carta_05.svg",
    tipoSello: "heart",
    disponible: true
  },
  {
    id: "carta-06",
    persona: "Carta sorpresa 06",
    subtitulo: "Nombre por definir",
    imagen: "./assets/img/cartas/carta_06.svg",
    tipoSello: "heart",
    disponible: true
  },
  {
    id: "carta-07",
    persona: "Carta sorpresa 07",
    subtitulo: "Nombre por definir",
    imagen: "./assets/img/cartas/carta_07.svg",
    tipoSello: "heart",
    disponible: true
  },
  {
    id: "carta-08",
    persona: "Carta sorpresa 08",
    subtitulo: "Nombre por definir",
    imagen: "./assets/img/cartas/carta_08.svg",
    tipoSello: "heart",
    disponible: true
  },
  {
    id: "carta-09",
    persona: "Carta sorpresa 09",
    subtitulo: "Nombre por definir",
    imagen: "./assets/img/cartas/carta_09.svg",
    tipoSello: "heart",
    disponible: true
  },
  {
    id: "carta-10",
    persona: "Carta sorpresa 10",
    subtitulo: "Nombre por definir",
    imagen: "./assets/img/cartas/carta_10.svg",
    tipoSello: "heart",
    disponible: true
  }
];
