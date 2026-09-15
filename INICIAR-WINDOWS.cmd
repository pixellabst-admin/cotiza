@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Cotiza - Inicio local

echo.
echo   COTIZA - Tu negocio, en tu computadora
echo.
where node >nul 2>&1
if errorlevel 1 goto falta_node
where npm >nul 2>&1
if errorlevel 1 goto falta_node
where docker >nul 2>&1
if errorlevel 1 goto falta_docker
docker info >nul 2>&1
if errorlevel 1 goto falta_docker

echo [1/5] Preparando la configuracion local...
node scripts/setup-local.mjs
if errorlevel 1 goto error

echo [2/5] Revisando las dependencias...
if exist "node_modules\next\package.json" goto base_datos
call npm install
if errorlevel 1 goto error

:base_datos
echo [3/5] Iniciando la base de datos...
docker compose --env-file .env.local up -d --wait
if errorlevel 1 goto error

echo [4/5] Preparando las tablas de Cotiza...
call npx drizzle-kit push
if errorlevel 1 goto error

echo [5/5] Iniciando la aplicacion...
echo.
echo Cuando aparezca Ready, abre http://localhost:3000 en tu navegador.
echo Si el puerto esta ocupado, usa la direccion que aparezca a continuacion.
echo Deja esta ventana abierta mientras uses Cotiza. Para cerrar, pulsa Ctrl+C.
echo.
call npm run dev -- --hostname 127.0.0.1
if errorlevel 1 goto error
goto fin

:falta_node
echo Instala Node.js 22 o superior desde https://nodejs.org/.
echo Despues vuelve a abrir este archivo.
goto error

:falta_docker
echo Instala Docker Desktop desde https://www.docker.com/products/docker-desktop/.
echo Abre Docker Desktop, espera a que inicie y vuelve a abrir este archivo.
goto error

:error
echo.
echo No se pudo completar el inicio. Revisa el mensaje anterior y README.md.
echo Si ya tienes tu propio PostgreSQL, sigue la opcion manual de README.md.
pause
exit /b 1

:fin
endlocal
