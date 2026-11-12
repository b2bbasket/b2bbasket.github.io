#!/usr/bin/env bash
# Vigilante de datos: mantiene al día el calendario en directo, los resultados y la clasificación
# sin depender de las tareas programadas de GitHub, que a veces se retrasan horas o no se ejecutan.
#
# Cada ejecución dura unas 5 horas y media. Antes de terminar, lanza la siguiente, así que
# funciona en cadena de forma continua. Si la cadena se rompiera, la reinicia cualquiera de las
# tareas programadas de respaldo (vigilante.yml) o el botón «Run workflow».
#
#   · En horas de partido (18:00-09:59, hora de España): calendario en directo cada 10 minutos.
#   · Por la mañana (07:00-13:59): actualización completa (resultados, clasificación, calendario) cada hora.
#   · El resto del día: actualización completa cada 4 horas, por si cambia el calendario.
# Solo guarda y publica cuando algo ha cambiado de verdad.
set -u
DURACION=${DURACION:-19800}          # 5 h 30 min
FIN=$(( $(date +%s) + DURACION ))
ULTIMA_COMPLETA=0

git config user.name "github-actions"
git config user.email "github-actions@users.noreply.github.com"

guardar() { # $1 = mensaje del commit
  if [ -z "$(git status --porcelain src/_data)" ]; then return 0; fi
  git add -A src/_data
  git commit -q -m "$1" || return 0
  if git pull -q --rebase --autostash && git push -q; then
    gh workflow run publicar.yml && echo "  → publicado: $1"
  else
    # Si otra actualización se ha cruzado, se descarta esta y se repite en la siguiente vuelta
    git rebase --abort 2>/dev/null
    git fetch -q origin main && git reset -q --hard origin/main
    echo "  → conflicto al guardar; se reintentará"
  fi
}

while [ "$(date +%s)" -lt "$FIN" ]; do
  git fetch -q origin main && git reset -q --hard origin/main
  HORA=$((10#$(TZ=Europe/Madrid date +%H)))
  AHORA=$(date +%s)
  echo "[$(TZ=Europe/Madrid date '+%d/%m %H:%M')]"

  # Actualización completa
  if { [ "$HORA" -ge 7 ] && [ "$HORA" -le 13 ] && [ $((AHORA - ULTIMA_COMPLETA)) -ge 3300 ]; } \
     || [ $((AHORA - ULTIMA_COMPLETA)) -ge 14400 ]; then
    node scripts/actualizar.mjs && guardar "Actualizar resultados, clasificación y calendario"
    ULTIMA_COMPLETA=$(date +%s)
  fi

  # Calendario en directo
  if [ "$HORA" -ge 18 ] || [ "$HORA" -le 9 ]; then
    node scripts/calendario-directo.mjs && guardar "Calendario: actualizar partidos de hoy"
    ESPERA=600
  else
    ESPERA=1800
  fi

  RESTA=$(( FIN - $(date +%s) ))
  [ "$RESTA" -le 0 ] && break
  sleep $(( ESPERA < RESTA ? ESPERA : RESTA ))
done

echo "Fin de este turno: se lanza el siguiente."
gh workflow run vigilante.yml
