/*
  Configuracion central de Cartas para Agustina.

  Para activar una carta pendiente:
  1. Copia la imagen escaneada en assets/img/cartas/ con el nombre indicado en archivo.
  2. Cambia disponible a true.
  3. Si hace falta, cambia sello por: neutro, cookie, flor, sol o nota-musical.
*/

const VIDEO_SORPRESA = "./video/video-sorpresa.mp4";

const CARTAS = [
  {
    id: 1,
    nombre: "Antonella",
    archivo: "./assets/img/cartas/carta-antonella.jpg",
    disponible: false,
    sello: "neutro"
  },
  {
    id: 2,
    nombre: "Alejandro",
    archivo: "./assets/img/cartas/carta-alejandro.jpg",
    disponible: false,
    sello: "neutro"
  },
  {
    id: 3,
    nombre: "Anage",
    archivo: "./assets/img/cartas/carta-anage.jpg",
    disponible: true,
    sello: "sol"
  },
  {
    id: 4,
    nombre: "Andrea Marín",
    archivo: "./assets/img/cartas/carta-andrea-marin.jpg",
    disponible: false,
    sello: "neutro"
  },
  {
    id: 5,
    nombre: "Michele",
    archivo: "./assets/img/cartas/carta-michele.jpg",
    disponible: false,
    sello: "neutro"
  },
  {
    id: 6,
    nombre: "Nurinel",
    archivo: "./assets/img/cartas/carta-nurinel.jpg",
    disponible: false,
    sello: "neutro"
  },
  {
    id: 7,
    nombre: "Rachell",
    archivo: "./assets/img/cartas/carta-rachell.jpg",
    disponible: false,
    sello: "neutro"
  },
  {
    id: 8,
    nombre: "Reyina",
    archivo: "./assets/img/cartas/carta-reyina.jpg",
    disponible: false,
    sello: "flor"
  },
  {
    id: 9,
    nombre: "Shayna",
    archivo: "./assets/img/cartas/carta-shayna.jpg",
    disponible: false,
    sello: "nota-musical"
  },
  {
    id: 10,
    nombre: "Perla",
    archivo: "./assets/img/cartas/carta-perla.jpg",
    disponible: false,
    sello: "cookie"
  }
];
