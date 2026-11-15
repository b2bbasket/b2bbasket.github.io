// /juego/jugadores.json: los jugadores del juego repartidos por dificultad (ver _data/juegoNiveles.js)
export default class {
  data() {
    return { permalink: "/juego/jugadores.json", eleventyExcludeFromCollections: true };
  }
  render(data) {
    const j = data.juegoNiveles || { niveles: [], grupos: {} };
    return JSON.stringify({ niveles: j.niveles, grupos: j.grupos });
  }
}
