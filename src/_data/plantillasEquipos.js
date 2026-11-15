// Los 30 equipos en orden alfabético (para las páginas de Plantillas)
import fs from "node:fs";
export default function () {
  const e = JSON.parse(fs.readFileSync("src/_data/equipos.json", "utf8"));
  return Object.values(e).flatMap((divs) => Object.values(divs).flat()).sort((a, b) => a.localeCompare(b));
}
