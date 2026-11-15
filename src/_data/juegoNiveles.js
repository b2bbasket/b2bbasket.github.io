// Reparte los jugadores de «Adivina el jugador» (src/_data/juego.json) en cuatro dificultades.
// No se escribe ningún dato a mano: el reparto sale de las propias pistas (selecciones All-Star
// y año de la última), más una pequeña lista de ajustes por notoriedad para el público español.
//
// Notoriedad = número de selecciones All-Star + bonus por época reciente
//   (última selección en 2010 o después: +3 · 1995-2009: +2 · 1980-1994: 0 · antes de 1980: -2).
// Se ordenan de más a menos conocidos y se cortan en cuatro grupos.
import fs from "node:fs";

const NIVELES = [
  { clave: "facil", nombre: "Fácil", puntos: 10, color: "#17A673", descripcion: "Estrellas que conoce cualquier aficionado" },
  { clave: "normal", nombre: "Normal", puntos: 20, color: "#2B59FF", descripcion: "Jugadores conocidos que exigen algo más" },
  { clave: "dificil", nombre: "Difícil", puntos: 30, color: "#FF8A1F", descripcion: "Trayectorias menos evidentes" },
  { clave: "experto", nombre: "Experto", puntos: 50, color: "#D7263D", descripcion: "Para auténticos especialistas" },
];
// Tamaño de cada grupo, de más a menos conocidos (el último se queda con el resto)
const CORTES = [60, 100, 140];

// Ajustes por notoriedad: jugadores mucho más (o menos) reconocibles de lo que dicen sus All-Star
const AJUSTES = {
  "Pau Gasol": "facil", "Luka Dončić": "facil", "Nikola Jokić": "facil", "Victor Wembanyama": "facil",
  "Marc Gasol": "normal", "Dennis Rodman": "normal", "Pete Maravich": "normal", "Manu Ginóbili": "normal",
  "Steve Nash": "facil", "Yao Ming": "normal", "Vlade Divac": "dificil", "Shai Gilgeous-Alexander": "facil",
  "Ja Morant": "normal", "Zion Williamson": "normal", "Walt Frazier": "normal", "Bill Walton": "normal",
  "Dolph Schayes": "dificil", "Elvin Hayes": "normal", "Joe Johnson": "normal", "LaMarcus Aldridge": "normal",
  "Bob Cousy": "normal", "John Havlicek": "normal", "Dikembe Mutombo": "normal", "Amar'e Stoudemire": "normal",
};

function notoriedad(p) {
  const t = p.pistas[1] || "";
  const m = t.match(/All-Star (una vez|(\d+) veces)/);
  const veces = m ? (m[1] === "una vez" ? 1 : Number(m[2])) : 1;
  const anos = (t.match(/\b(19|20)\d\d\b/g) || []).map(Number);
  const ultima = anos.length ? Math.max(...anos) : 1970;
  const bonus = ultima >= 2010 ? 3 : ultima >= 1995 ? 2 : ultima >= 1980 ? 0 : -2;
  return veces + bonus;
}

export default function () {
  let juego = { jugadores: [] };
  try { juego = JSON.parse(fs.readFileSync("src/_data/juego.json", "utf8")); } catch (e) {}
  const ordenados = juego.jugadores.slice().sort((a, b) => notoriedad(b) - notoriedad(a) || a.nombre.localeCompare(b.nombre, "en"));
  const grupos = { facil: [], normal: [], dificil: [], experto: [] };
  const claves = NIVELES.map((n) => n.clave);
  let i = 0;
  ordenados.forEach((p, pos) => {
    while (i < CORTES.length && pos >= CORTES.slice(0, i + 1).reduce((s, x) => s + x, 0)) i++;
    const nivel = AJUSTES[p.nombre] || claves[i];
    grupos[nivel].push({ nombre: p.nombre, pistas: p.pistas, fuente: p.fuente });
  });
  return {
    generado: juego.generado || "",
    total: juego.jugadores.length,
    niveles: NIVELES.map((n) => ({ ...n, cuantos: grupos[n.clave].length })),
    grupos,
  };
}
