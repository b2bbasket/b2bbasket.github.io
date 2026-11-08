// Publica el calendario como /datos/calendario.json para que lo lea la página Calendario NBA
export default class {
  data() {
    return { permalink: "/datos/calendario.json", eleventyExcludeFromCollections: true };
  }
  render(data) {
    return JSON.stringify(data.calendario || { temporada: null, actualizado: null, partidos: [] });
  }
}
