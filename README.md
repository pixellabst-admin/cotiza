# Cotiza · Tu negocio, en tu computadora

Crea cotizaciones, administra clientes, descarga documentos PDF y prepara mensajes para WhatsApp o correo electrónico.

La aplicación usa **Next.js, Node.js y PostgreSQL con Drizzle ORM**. No es un archivo HTML que se pueda abrir con doble clic: necesita un servidor local y una base de datos.

## Inicio fácil: abrir Cotiza en tu computadora

**¿Es tu primera vez?** Abre **`LEEME-PRIMERO.txt`** con doble clic. Incluye los pasos para descomprimir la descarga, instalar las herramientas y ejecutar el archivo correcto en Windows, macOS o Linux, sin necesitar conocimientos de programación. **La dirección `localhost:3000` solo funciona después de iniciar la aplicación.**

La aplicación incluye una guía visual en **`/instalar`**, accesible desde **Centro de ayuda → ¿Cómo abro Cotiza en mi computadora?**. En la vista previa puedes descargar el proyecto como `cotiza-local.zip` desde esa página.

1. Descarga el ZIP y **extrae todo su contenido**. Entra en la carpeta `cotiza` que contiene `package.json`.
2. Instala **Node.js 22 o superior** y **Docker Desktop** con los enlaces del apartado siguiente. Abre Docker Desktop y espera a que inicie.
3. **Windows:** haz doble clic en **`INICIAR-WINDOWS.cmd`** dentro de la carpeta extraída.
4. **macOS o Linux:** abre una terminal en la carpeta del proyecto y ejecuta **`bash iniciar-local.sh`**. En VS Code puedes abrir la carpeta y usar **Terminal → Nueva terminal**.
5. Espera a que la terminal muestre **Ready** y entra a **http://localhost:3000** desde tu navegador. Si el puerto 3000 está ocupado, usa la dirección que indique la terminal.

Los archivos de inicio crean la configuración privada si no existe, instalan las dependencias si faltan, inician PostgreSQL, aplican las tablas con Drizzle y arrancan Cotiza. **Deja abierta la ventana mientras uses la aplicación.** Para cerrar, pulsa Ctrl + C.

Para volver a abrirla otro día, abre Docker Desktop y ejecuta el mismo archivo de inicio. Si actualizas el código, ejecuta `npm install` para actualizar también las dependencias. Si ya utilizas tu propio PostgreSQL, omite estos archivos de inicio y sigue la opción manual del apartado 6.

El ZIP contiene el código de la aplicación, los archivos de inicio y esta guía. **No contiene contraseñas, archivos `.env`, bases de datos ni datos guardados en la vista previa.** Tu copia local empieza con los datos de demostración.

---

## 1. Instala lo necesario

- **Node.js 22 o superior**, con npm: [nodejs.org](https://nodejs.org/). Si usas nvm, este proyecto incluye `.nvmrc` con Node.js 22.
- **Docker Desktop**: [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/). Instálalo y déjalo abierto. En Linux también puedes usar Docker Engine con el complemento Docker Compose v2.
- Descarga o exporta el **código completo** de este proyecto y descomprímelo en una carpeta de tu computadora. Descargar la página desde el navegador no equivale a descargar el código del proyecto.

La primera instalación necesita conexión a Internet para descargar dependencias y la imagen de PostgreSQL.

Abre una terminal en la carpeta que contiene `package.json`. En Windows puedes usar Terminal o PowerShell; en macOS o Linux, Terminal. También puedes abrir la carpeta en VS Code y seleccionar **Terminal → Nueva terminal**.

## 2. Primera ejecución

Ejecuta estos comandos **uno por uno**, esperando a que termine cada uno:

```sh
npm install
node scripts/setup-local.mjs
docker compose --env-file .env.local up -d --wait
npx drizzle-kit push
npm run dev -- --hostname 127.0.0.1
```

¿Qué hace cada paso?

1. `npm install`: instala las dependencias de la aplicación.
2. `node scripts/setup-local.mjs`: crea `.env.local` con una contraseña aleatoria para tu base de datos. No imprime la contraseña ni modifica `.env`. Si ya existe `.env.local`, lo conserva sin sobrescribirlo.
3. `docker compose --env-file .env.local up -d --wait`: inicia PostgreSQL en segundo plano y espera a que esté disponible.
4. `npx drizzle-kit push`: crea las tablas usando la conexión de `.env.local`. Ejecuta este comando únicamente contra tu base de Cotiza, no contra una base ajena que contenga otros datos.
5. `npm run dev -- --hostname 127.0.0.1`: inicia Cotiza y mantiene la terminal ocupada. Déjala abierta mientras uses la aplicación. El servidor solo escucha en tu computadora.

Cuando la terminal muestre que el servidor está listo, abre:

**[http://localhost:3000](http://localhost:3000)**

También puedes entrar por [http://127.0.0.1:3000](http://127.0.0.1:3000).

En la primera visita se crean automáticamente los clientes y cotizaciones de demostración. Son datos nuevos en tu base local: los cambios que hiciste en la vista previa de esta plataforma no se transfieren automáticamente.

Entra en **Configuración** y reemplaza los datos de demostración por el nombre, correo y datos de tu negocio antes de enviar propuestas reales.

## 3. Volver a abrir la aplicación otro día

Abre Docker Desktop. En una terminal dentro de la carpeta del proyecto, ejecuta:

```sh
docker compose --env-file .env.local up -d --wait
npm run dev -- --hostname 127.0.0.1
```

Entra de nuevo a **http://localhost:3000**. No necesitas reinstalar dependencias ni volver a crear las tablas en cada inicio.

## 4. Cerrar la aplicación sin perder tus datos

- En la terminal de Next.js, presiona **Ctrl + C**.
- Para detener la base de datos sin eliminarla:

```sh
docker compose --env-file .env.local stop
```

Tus datos permanecen en el volumen de Docker `cotiza-local_cotiza_postgres_data`. Reiniciar el contenedor no los borra.

**No elimines ese volumen ni uses `docker compose down -v`: perderías la base local.** Conserva también `.env.local`, porque contiene las credenciales con las que se creó la base. Regenerar una contraseña no cambia la contraseña de un volumen PostgreSQL ya existente.

## 5. WhatsApp, correo y enlaces al usar localhost

- WhatsApp abre la aplicación o WhatsApp Web con el mensaje preparado. **Debes confirmar el envío allí**; no se envía automáticamente.
- El correo abre el cliente de correo configurado en tu computadora mediante `mailto:`. Si no tienes uno configurado, copia el mensaje y pégalo en Gmail, Outlook o tu servicio habitual.
- Puedes descargar el PDF y adjuntarlo manualmente en WhatsApp o correo. La aplicación no adjunta archivos automáticamente al abrir esos servicios.
- **Un enlace que empieza por `localhost` o `127.0.0.1` solo funciona en tu computadora. Tus clientes no podrán abrirlo desde la suya.** Mientras uses Cotiza localmente, comparte el PDF y evita enviar el enlace local como si fuera público.
- Para que tus clientes consulten y acepten cotizaciones desde un enlace por Internet, necesitas desplegar la aplicación y la base de datos en un servicio accesible públicamente.

### Seguridad antes de publicar

Esta versión es un espacio de trabajo **de un solo negocio, sin inicio de sesión ni control de acceso para el administrador**. Está preparada para usarla localmente. **No expongas el puerto del servidor a Internet ni publiques todo el panel mediante un túnel sin añadir autenticación y autorización.** Los enlaces de cotización tienen tokens no predecibles, pero eso no protege el panel administrativo ni su API.

Los archivos `.env` y `.env.local` son privados y están excluidos de Git. No compartas contraseñas, copias de seguridad ni datos reales de tus clientes.

## 6. Si ya tienes PostgreSQL instalado

Docker es opcional. Si prefieres tu propia instalación:

1. Crea una base PostgreSQL vacía dedicada a Cotiza y un usuario con permisos para crear sus tablas.
2. Crea un archivo `.env.local` en la raíz del proyecto, junto a `package.json`, y define `DATABASE_URL` con tu conexión. Por ejemplo, sustituye todos los marcadores del siguiente formato por tus datos reales:

   ```dotenv
   DATABASE_URL=postgresql://TU_USUARIO:TU_CONTRASENA@127.0.0.1:5432/TU_BASE
   ```

   Si tu contraseña contiene caracteres reservados en una URL, codifícalos antes de incluirla en la conexión. No uses literalmente los marcadores del ejemplo.

3. Ejecuta:

   ```sh
   npm install
   npx drizzle-kit push
   npm run dev -- --hostname 127.0.0.1
   ```

No ejecutes los comandos de Docker de esta guía si usas tu propia base. Next.js y Drizzle leen `.env.local`; si no existe un valor allí, utilizan `.env`. Una variable `DATABASE_URL` ya exportada en la terminal tiene prioridad sobre ambos archivos: revisa que no apunte a otra base de datos.

## 7. Problemas frecuentes

### «npm» o «node» no se reconoce

Instala Node.js 22 o superior. Cierra y vuelve a abrir la terminal después de instalarlo. Puedes comprobar la instalación con `node --version` y `npm --version`.

### PowerShell bloquea `npm.ps1` o `npx.ps1`

Usa una terminal **Símbolo del sistema / Command Prompt**, o escribe `npm.cmd` y `npx.cmd` en lugar de `npm` y `npx`. No necesitas desactivar las restricciones de seguridad del sistema.

### Docker no se conecta o no está disponible

Abre Docker Desktop y espera a que termine de iniciar. Verifica `docker --version` y `docker compose version`. En Windows, completa la configuración de WSL 2 si Docker Desktop la solicita.

### No se reconoce `--wait`

Actualiza Docker Desktop o Docker Compose. Alternativamente, inicia con `docker compose --env-file .env.local up -d` y revisa `docker compose --env-file .env.local ps` hasta que `db` aparezca como `healthy`, antes de ejecutar Drizzle.

### «DATABASE_URL is required» o falta `.env.local`

Ejecuta `node scripts/setup-local.mjs` desde la carpeta del proyecto. Asegúrate de que el nombre sea exactamente `.env.local` y no `.env.local.txt`.

### Error de conexión a PostgreSQL

Comprueba que Docker Desktop esté abierto y ejecuta:

```sh
docker compose --env-file .env.local ps
docker compose --env-file .env.local logs --tail=40 db
```

Revisa que la conexión en `.env.local` use el puerto **5433** para la configuración Docker incluida. No cambies la contraseña después de crear el volumen sin actualizar también la cuenta en PostgreSQL.

### El puerto 5433 está ocupado

En `.env.local`, cambia `POSTGRES_PORT` a un puerto libre, por ejemplo `5434`, y cambia también `:5433` por `:5434` en `DATABASE_URL`. Después repite el comando de Docker y reinicia Next.js.

### El puerto 3000 está ocupado

Inicia en otro puerto:

```sh
npm run dev -- --hostname 127.0.0.1 --port 3001
```

Abre entonces **http://localhost:3001**. Usa el puerto que muestre tu terminal.

### Faltan tablas o aparece «relation does not exist»

Detén Next.js, confirma que estás apuntando a la base local correcta y ejecuta `npx drizzle-kit push`. Después inicia la aplicación de nuevo.

## 8. Ver la base de datos y sus tablas

Con la instalación local ya preparada, abre Docker Desktop y una **segunda terminal** en la carpeta que contiene `package.json`. Ejecuta:

```sh
docker compose --env-file .env.local up -d --wait
npx drizzle-kit studio --host=127.0.0.1 --port=4983
```

Si usas tu propio PostgreSQL, omite el primer comando. Deja Studio ejecutándose y abre **https://local.drizzle.studio** en Chrome o Edge. Selecciona una tabla en el esquema `public`:

- **`customers`**: clientes.
- **`quotes`**: cotizaciones y sus conceptos.
- **`business_settings`**: configuración de tu negocio.

**No necesitas descargar otra herramienta:** Studio está incluido en Drizzle Kit. Esta dirección solo se conecta después de iniciar Studio en tu computadora. Para cerrarlo, pulsa Ctrl + C en su terminal.

Consulta **[BASE-DE-DATOS.md](BASE-DE-DATOS.md)** para ver los pasos detallados, cómo interpretar las columnas y cómo conectar pgAdmin o DBeaver. También tienes la guía en **Centro de ayuda → ¿Cómo veo la base de datos y sus tablas?**.

**Precaución:** Studio permite editar y eliminar; no es de solo lectura. Evita guardar cambios si únicamente quieres consultar y no expongas su puerto a Internet.

## 9. Inicio de sesión del panel

El panel y su API están protegidos con usuario y contraseña.

- **Primer acceso:** al abrir la aplicación por primera vez, `/login` muestra el formulario **Crea tu acceso**. Define tu nombre, correo y una contraseña de al menos 10 caracteres.
- **Después:** `/login` pide correo y contraseña. La sesión dura 12 horas y se cierra desde el botón junto a tu nombre, en la parte inferior del menú lateral.
- **Las contraseñas se guardan cifradas** con scrypt y una sal aleatoria por contraseña. La cookie de sesión es `HttpOnly`, firmada con HMAC-SHA256 y marcada `Secure` en producción.
- **Sigue siendo público**, como debe ser: `/cotizacion/[token]` y `/api/public/[token]`, para que tus clientes consulten y acepten sus propuestas sin cuenta. El panel, `/instalar` y `/api/workspace` exigen sesión.

**Antes de publicar en Internet, define `ADMIN_SETUP_CODE`** en las variables de tu servicio de alojamiento. Con esa variable, el formulario de primer acceso pide ese código y nadie más puede reclamar el panel. Sin ella, la aplicación permite crear el acceso y muestra una advertencia en pantalla.

Variables opcionales:

| Variable | Para qué sirve |
| --- | --- |
| `ADMIN_SETUP_CODE` | Exige un código al crear el primer acceso. Recomendada antes de publicar. |
| `AUTH_SECRET` | Clave para firmar las sesiones, mínimo 32 caracteres. Si no la defines, se genera una y se guarda en la base de datos. |

**Límites conocidos:** no hay recuperación de contraseña por correo, ni verificación en dos pasos, ni registro de varios usuarios con permisos distintos. El freno de intentos de acceso es por instancia del servidor y se reinicia al reiniciarla. Si olvidas la contraseña, elimina la fila de la tabla `admin_users` para volver a crear el acceso.

## 10. Actualizar la versión publicada

Cuando cambies algo en tu computadora y quieras publicarlo:

- **Windows:** haz doble clic en **`ACTUALIZAR-GITHUB.bat`**.
- **macOS o Linux:** ejecuta **`bash actualizar.sh`**.

Revisa que no subas contraseñas, muestra tus cambios, te pide una descripción y los envía a GitHub. Vercel publica la nueva versión automáticamente en unos minutos. Si el envío falla, tus cambios quedan guardados localmente y puedes reintentarlo.

## 11. Publicar Cotiza por Internet

**Recomendación: Vercel para Next.js, Neon para PostgreSQL y GitHub para el código.** No necesitas mantener tu computadora encendida ni instalar Docker en esos servicios. El dominio propio es opcional; Vercel proporciona una dirección de proyecto.

**Paso a paso, clic a clic:** abre **[SUBIR-A-INTERNET.txt](SUBIR-A-INTERNET.txt)**. Contiene los comandos exactos de Git, dónde pulsar en Neon y cómo configurar Vercel, en tres partes numeradas. Antes de subir nada, ejecuta el verificador de seguridad:

```sh
node scripts/revisar-antes-de-subir.mjs
```

Ese verificador solo lee archivos: comprueba que `.env`, `.env.local` y `.env.web.local` queden fuera del envío y te muestra los comandos siguientes. No modifica el repositorio ni sube nada.

Consulta **[PUBLICAR-WEB.md](PUBLICAR-WEB.md)** para conocer los requisitos, costos, configuración de `DATABASE_URL`, creación de tablas con `drizzle.web.config.ts`, dominio y comprobaciones antes de publicar. La guía visual también está en **Centro de ayuda → ¿Qué necesito para usar Cotiza por Internet?**.

**Antes de publicar datos reales:** esta versión no tiene login para el administrador. Para usarla tú o tu equipo en privado, configura y verifica una protección externa que cubra todos los despliegues y dominios de producción, como **Vercel Authentication → All Deployments**. Esa protección también bloqueará los enlaces de cotización para tus clientes: en ese caso comparte el PDF.

Para permitir que clientes externos consulten y acepten sus propuestas sin acceder al panel, primero hay que implementar login y autorización del lado del servidor para el administrador y su API, dejando públicas únicamente las rutas necesarias por token. **No se ha añadido ese login ni realizado un despliegue en tus cuentas.**

## Archivos de configuración local

| Archivo | Función |
| --- | --- |
| `scripts/setup-local.mjs` | Genera la configuración local y no sobrescribe archivos existentes. |
| `.env.local` | Conexión y credenciales privadas de tu computadora; se genera al ejecutar el asistente. |
| `compose.yaml` | PostgreSQL 17 en Docker, puerto local 5433, comprobación de salud y volumen persistente. |
| `drizzle.config.ts` | Usa `DATABASE_URL` para aplicar las tablas. |
| `.nvmrc` | Recomienda Node.js 22. |

## Comprobaciones para desarrollo

Con las dependencias instaladas y la base disponible:

```sh
node --test tests/local-setup.test.mjs
npx next typegen
npx tsc --noEmit
npm run build
```

La prueba del asistente usa carpetas temporales: no modifica tus archivos `.env` ni `.env.local`.

Las pruebas funcionales de `tests/smoke.mjs` necesitan la aplicación en ejecución y Chromium instalado con `npx playwright install chromium`. Crean y eliminan datos de prueba; utilízalas solamente en una base de pruebas, nunca en una base con información real de tus clientes.
