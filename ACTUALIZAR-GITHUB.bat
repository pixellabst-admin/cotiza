@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
cd /d "%~dp0"
title Cotiza - Actualizar en GitHub y Vercel

echo.
echo   COTIZA - SUBIR TUS CAMBIOS
echo   ==========================
echo.
echo   Este archivo envia tus cambios a GitHub.
echo   Vercel detecta el envio y publica la nueva version.
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo   No encuentro Git. Instalalo desde https://git-scm.com/downloads
  echo   Despues cierra esta ventana y vuelve a abrir este archivo.
  goto error
)

if not exist ".git" (
  echo   Esta carpeta todavia no esta conectada con GitHub.
  echo   Sigue la PARTE 1 de SUBIR-A-INTERNET.txt para hacerlo la primera vez.
  goto error
)

echo   [1/5] Revisando que no subas contrasenas...
echo.
call node scripts/revisar-antes-de-subir.mjs
if errorlevel 1 goto error

echo.
echo   [2/5] Estos son tus cambios:
echo.
call git status --short
echo.

for /f %%i in ('git status --porcelain 2^>nul ^| find /c /v ""') do set CAMBIOS=%%i
if "!CAMBIOS!"=="0" (
  echo   No hay cambios nuevos que subir. Todo esta actualizado.
  echo.
  pause
  exit /b 0
)

echo   [3/5] Describe brevemente el cambio.
echo   Ejemplo: Actualice los datos de mi negocio
echo.
set "MENSAJE="
set /p "MENSAJE=   Descripcion: "
if "!MENSAJE!"=="" set "MENSAJE=Actualizacion de Cotiza"

echo.
echo   [4/5] Guardando los cambios...
call git add -A
if errorlevel 1 goto error
call git commit -m "!MENSAJE!"
if errorlevel 1 goto error

echo.
echo   [5/5] Enviando a GitHub...
call git push
if errorlevel 1 goto error_push

echo.
echo   ==========================================================
echo   LISTO. Tus cambios ya estan en GitHub.
echo.
echo   Vercel publica la nueva version en unos minutos.
echo   Puedes seguir el avance en https://vercel.com/dashboard
echo   ==========================================================
echo.
pause
exit /b 0

:error_push
echo.
echo   No se pudo enviar a GitHub.
echo.
echo   Causas frecuentes:
echo     - Falta iniciar sesion. Si pide contrasena, usa un token de
echo       https://github.com/settings/tokens
echo     - Aun no configuraste el repositorio remoto. Revisa la PARTE 1
echo       de SUBIR-A-INTERNET.txt
echo     - Hay cambios en GitHub que no tienes aqui. Ejecuta: git pull
echo.
echo   Tus cambios quedaron guardados localmente; puedes reintentar.
pause
exit /b 1

:error
echo.
echo   No se completo la actualizacion. Revisa el mensaje anterior.
echo   La guia esta en SUBIR-A-INTERNET.txt
echo.
pause
exit /b 1
