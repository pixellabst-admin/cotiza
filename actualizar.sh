#!/usr/bin/env bash
# Envía tus cambios a GitHub. Vercel publica la nueva versión automáticamente.
set -uo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

printf '\n  COTIZA · SUBIR TUS CAMBIOS\n  ==========================\n\n'

if ! command -v git >/dev/null 2>&1; then
  printf '  No encuentro Git. Instálalo desde https://git-scm.com/downloads\n\n' >&2
  exit 1
fi

if [[ ! -d .git ]]; then
  printf '  Esta carpeta todavía no está conectada con GitHub.\n  Sigue la PARTE 1 de SUBIR-A-INTERNET.txt.\n\n' >&2
  exit 1
fi

printf '  [1/5] Revisando que no subas contraseñas...\n\n'
if ! node scripts/revisar-antes-de-subir.mjs; then
  printf '\n  Corrige lo anterior antes de subir.\n\n' >&2
  exit 1
fi

printf '\n  [2/5] Estos son tus cambios:\n\n'
git status --short

if [[ -z "$(git status --porcelain)" ]]; then
  printf '\n  No hay cambios nuevos que subir. Todo está actualizado.\n\n'
  exit 0
fi

printf '\n  [3/5] Describe brevemente el cambio.\n  Ejemplo: Actualicé los datos de mi negocio\n\n'
read -r -p "  Descripción: " mensaje
[[ -z "${mensaje}" ]] && mensaje="Actualización de Cotiza"

printf '\n  [4/5] Guardando los cambios...\n'
git add -A || exit 1
git commit -m "${mensaje}" || exit 1

printf '\n  [5/5] Enviando a GitHub...\n'
if ! git push; then
  printf '\n  No se pudo enviar a GitHub.\n'
  printf '  Si pide contraseña, usa un token de https://github.com/settings/tokens\n'
  printf '  Si hay cambios remotos, ejecuta: git pull\n'
  printf '  Tus cambios quedaron guardados localmente; puedes reintentar.\n\n' >&2
  exit 1
fi

printf '\n  ==========================================================\n'
printf '  LISTO. Tus cambios ya están en GitHub.\n\n'
printf '  Vercel publica la nueva versión en unos minutos.\n'
printf '  Sigue el avance en https://vercel.com/dashboard\n'
printf '  ==========================================================\n\n'
