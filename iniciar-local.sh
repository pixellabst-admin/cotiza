#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

trap 'code=$?; printf "\nNo se pudo completar el inicio. Revisa el mensaje anterior y README.md.\n" >&2; exit "$code"' ERR

printf '\n  COTIZA · Tu negocio, en tu computadora\n\n'
for program in node npm docker; do
  if ! command -v "$program" >/dev/null 2>&1; then
    printf 'Falta %s. Instala Node.js 22 o superior y Docker Desktop. Consulta README.md.\n' "$program" >&2
    exit 1
  fi
done

if ! docker info >/dev/null 2>&1; then
  printf 'Abre Docker Desktop y espera a que inicie. Después vuelve a ejecutar este archivo.\n' >&2
  exit 1
fi

printf '\n[1/5] Preparando la configuración local...\n'
node scripts/setup-local.mjs

printf '\n[2/5] Revisando las dependencias...\n'
if [[ ! -f node_modules/next/package.json ]]; then
  npm install
fi

printf '\n[3/5] Iniciando la base de datos...\n'
docker compose --env-file .env.local up -d --wait

printf '\n[4/5] Preparando las tablas de Cotiza...\n'
npx drizzle-kit push

printf '\n[5/5] Iniciando la aplicación...\n'
printf '\nCuando aparezca Ready, abre http://localhost:3000 en tu navegador.\n'
printf 'Si el puerto está ocupado, usa la dirección que aparezca a continuación.\n'
printf 'Deja esta terminal abierta mientras uses Cotiza. Para cerrar, pulsa Ctrl+C.\n\n'
npm run dev -- --hostname 127.0.0.1
