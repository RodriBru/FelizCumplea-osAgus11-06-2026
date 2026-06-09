/*
  Configuracion central de Cartas para Agustina.

  Para activar una carta pendiente:
  1. Copia la imagen escaneada en assets/img/cartas/ con el nombre indicado en archivo.
  2. Cambia disponible a true.
  3. Si hace falta, cambia sello por: neutro, doble-corazon, cookie, flor, sol,
     nota-musical, playa, copa-vino o gimnasio.
*/

const VIDEO_SORPRESA = "./video/video-sorpresa.mp4";

const CARTAS = [
  {
    id: 1,
    nombre: "Antonella",
    archivo: "./assets/img/cartas/carta_de_Antonela.jpeg",
    disponible: true,
    sello: "doble-corazon"
  },
  {
    id: 2,
    nombre: "Alejandro",
    archivo: "./assets/img/cartas/carta_de_alejandro.jpeg",
    disponible: true,
    sello: "sol"
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
    archivo: "./assets/img/cartas/carta_de_andrea.jpeg",
    disponible: true,
    sello: "flor"
  },
  {
    id: 5,
    nombre: "Michele",
    archivo: "./assets/img/cartas/Carta_de_michele.jpeg",
    disponible: true,
    sello: "copa-vino"
  },
  {
    id: 6,
    nombre: "Nurinel",
    archivo: "./assets/img/cartas/carta_de_nurinel.jpeg",
    disponible: true,
    sello: "playa"
  },
  {
    id: 7,
    nombre: "Rachell",
    archivo: "./assets/img/cartas/carta_de_rachell.jpeg",
    disponible: true,
    sello: "gimnasio"
  },
  {
    id: 8,
    nombre: "Reyina",
    archivo: "./assets/img/cartas/carta_de_reyina.png",
    disponible: true,
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
