# Publicar Cotiza en Internet: qué necesitas y cómo hacerlo

**Recomendación: Vercel + Neon + un repositorio privado en GitHub.** Vercel ejecuta la aplicación Next.js, Neon guarda la base PostgreSQL y GitHub conserva el código. Puedes entrar desde un navegador sin mantener tu computadora ni Docker encendidos.

Esta guía no crea cuentas, contrata servicios, compra un dominio ni publica la aplicación automáticamente. La URL de vista previa de esta plataforma sirve para probar el proyecto; no sustituye a un despliegue propio con mantenimiento, seguridad y respaldos.

## Antes de empezar: elige cómo permitir el acceso

### A. Usarla tú o tu equipo de forma privada

Puedes desplegar esta versión detrás de **Vercel Authentication con alcance All Deployments**, siempre que esté disponible y correctamente configurado en tu cuenta. Debe proteger todos los dominios, incluida producción, los despliegues anteriores y las peticiones a la API.

Solo los usuarios autorizados de tu proyecto en Vercel podrán acceder. No uses enlaces de omisión de protección como si fueran enlaces de cotización: permitirían saltarse la protección de un despliegue, no únicamente consultar una propuesta.

**Limitación:** esa protección también bloquea las páginas públicas de cotizaciones. Mientras la utilices así, comparte el PDF con tus clientes; ellos no podrán abrir y aceptar propuestas por enlace si no tienen acceso al despliegue.

### B. Permitir que tus clientes abran y acepten sus cotizaciones

**Esta versión todavía NO incorpora inicio de sesión ni permisos para el administrador.** Sin una protección externa, cualquier persona con la dirección puede entrar al panel y utilizar `/api/workspace` para consultar o modificar los datos. Un repositorio privado, HTTPS o un dominio difícil de adivinar no corrigen esto.

Antes de abrir el acceso público hay que implementar y probar:

- Inicio de sesión para las personas autorizadas del negocio, con sesiones seguras y cierre de sesión.
- Autorización en el servidor para las páginas administrativas, sus consultas y **todas** las operaciones de `/api/workspace`, no solo ocultar botones.
- Protección frente a abuso, intentos de acceso repetidos y solicitudes de modificación no autorizadas.
- Excepciones públicas únicamente para lo necesario: la consulta de una cotización mediante `/cotizacion/[token]` y su confirmación mediante `/api/public/[token]`, manteniendo la validación del token y de su estado.
- Pruebas con un navegador sin sesión: debe poder ver una propuesta concreta si posee su enlace, pero no listar clientes ni cotizaciones, entrar al panel o modificar otras propuestas.

No desactives la protección de todo el despliegue para que funcionen los enlaces de clientes mientras falte esta autenticación. Esta versión también es de **un solo negocio**: agregar varias empresas requiere aislamiento de sus datos, no solamente varios usuarios.

## Qué necesitas

| Elemento | Para qué sirve | Recomendación |
| --- | --- | --- |
| Alojamiento de la aplicación | Ejecuta Next.js y sus rutas de servidor. | [Vercel](https://vercel.com/), con un plan que permita tu uso. |
| PostgreSQL administrado | Guarda clientes, cotizaciones y configuración. | [Neon](https://neon.com/). |
| Repositorio del código | Permite subir cambios y desplegar nuevas versiones. | [GitHub](https://github.com/), repositorio privado. |
| Control de acceso | Evita que otros administren tus datos. | Protección de todos los despliegues para uso privado; login propio para compartir páginas de clientes públicamente. |
| Dirección web | Permite acceder desde computadora o celular. | Subdominio `vercel.app` incluido; dominio propio opcional. |
| HTTPS | Cifra la conexión del navegador. | Configuración automática de Vercel, una vez validado el dominio y su DNS. |
| Respaldos y mantenimiento | Permiten recuperar datos y atender fallos. | Configurar en Neon, revisar los límites del plan y probar una restauración. |

Un alojamiento solo para páginas estáticas o PHP/MySQL **no es suficiente** para esta aplicación. No se puede publicar como una carpeta HTML en GitHub Pages. El proveedor debe ejecutar Next.js/Node.js y poder conectarse a PostgreSQL.

No necesitas instalar Docker en Vercel, exponer los puertos de tu computadora ni cambiar MySQL por PostgreSQL en un hosting incompatible. `compose.yaml`, `INICIAR-WINDOWS.cmd` e `iniciar-local.sh` son para desarrollo local.

## Paso 1. Prepara un repositorio privado

1. Entra a GitHub y crea un repositorio **privado** para Cotiza.
2. Sube el proyecto desde la carpeta que contiene `package.json`. Puedes utilizar GitHub Desktop si prefieres una interfaz visual.
3. Conserva `.gitignore`. **No subas `.env`, `.env.local`, `.env.web.local`, contraseñas, copias de la base ni datos personales.** Un archivo previamente registrado por Git no queda protegido solo por añadirlo a `.gitignore`; revisa los archivos que realmente vas a enviar.
4. No necesitas subir `node_modules`, `.next`, `artifacts` ni los resultados de pruebas.
5. Si no deseas ofrecer el código como descarga en tu sitio, excluye o retira `public/descargas/cotiza-local.zip` del repositorio de producción. Todo archivo en `public` se puede descargar desde el sitio si no está protegido. El ZIP suministrado excluye archivos `.env`, pero sigue siendo una copia del código.
6. Si tienes datos reales localmente, haz una copia completa de la base antes de cualquier migración. El CSV de cotizaciones no es un respaldo completo de PostgreSQL.

## Paso 2. Crea una base PostgreSQL en Neon

1. Crea tu cuenta y un proyecto en Neon.
2. Elige una región próxima a la región donde se ejecutarán las funciones de Vercel para reducir la latencia.
3. Reserva una base o rama para producción y otra separada para pruebas. **Las pruebas no deben utilizar la base real de clientes.**
4. En **Connect**, selecciona tu base y rol de PostgreSQL. Obtén las dos conexiones que vayas a necesitar:
   - **Pooled connection**: para `DATABASE_URL` en la aplicación desplegada. Su hostname suele incluir `-pooler`.
   - **Direct connection / sin pool**: para preparar las tablas de forma controlada con Drizzle.
5. Conserva los parámetros de seguridad proporcionados por Neon, como `sslmode=require`. No elimines la protección TLS ni uses `rejectUnauthorized: false` para evitar errores.

Las conexiones contienen una contraseña. Guárdalas en las variables privadas del servicio, nunca en el código ni en una variable que empiece por `NEXT_PUBLIC_`.

**No uses `localhost`, `127.0.0.1` ni el puerto de tu Docker como conexión en Vercel:** allí esas direcciones apuntan al entorno del proveedor, no a tu computadora.

## Paso 3. Prepara las tablas en la base web nueva

Este paso es para una **base vacía, dedicada a Cotiza**, antes de introducir información real. No modifica la conexión que usas localmente.

1. En la raíz del proyecto crea un archivo privado llamado **`.env.web.local`**.
2. Añade una variable llamada **`WEB_DATABASE_URL`** cuyo valor sea la conexión **directa** de Neon. El formato es `WEB_DATABASE_URL=` seguido de la conexión completa; no escribas literalmente un ejemplo ni compartas el valor.
3. En una terminal dentro del proyecto ejecuta:

   ```sh
   npm install
   npx drizzle-kit push --config=drizzle.web.config.ts
   ```

4. Revisa que Drizzle esté conectándose a la base web nueva y comprueba los cambios que proponga. Deben crearse `customers`, `quotes` y `business_settings`.
5. Si aparecen propuestas para borrar tablas existentes que no esperabas, **detente** y verifica la base elegida; no aceptes esas operaciones.

`drizzle.web.config.ts` solo carga `.env.web.local` y `WEB_DATABASE_URL`; no utiliza `.env.local` ni la conexión de Docker como alternativa. Además, rechaza direcciones de loopback. Una variable `WEB_DATABASE_URL` exportada en la terminal tiene prioridad sobre el archivo: verifica cuál estás utilizando.

La configuración separada reduce confusiones, **no hace que todos los cambios sean seguros**: nunca ejecutes `push` a ciegas contra una base con información importante. Para futuras actualizaciones en producción prepara migraciones versionadas, revisadas y probadas, con un respaldo y un plan de recuperación. No pongas `drizzle-kit push` en el comando de compilación de Vercel.

`WEB_DATABASE_URL` es únicamente para esta preparación local. El nombre que usa la aplicación en ejecución sigue siendo **`DATABASE_URL`**.

## Paso 4. Importa el proyecto en Vercel con acceso protegido

Antes del primer despliegue con conexión a datos, configura una protección que incluya **todos** los despliegues y dominios de producción. Si no puedes garantizarla, usa solamente datos ficticios en un entorno privado y no conectes una base con clientes reales.

1. Crea una cuenta o equipo en Vercel y conéctalo a GitHub.
2. Configura, si corresponde, el valor predeterminado de protección de nuevos proyectos del equipo. Selecciona **Vercel Authentication → All Deployments** para la modalidad privada de esta guía.
3. Crea un proyecto e importa el repositorio privado de Cotiza.
4. Comprueba estos valores:

   | Ajuste | Valor |
   | --- | --- |
   | Framework Preset | Next.js |
   | Root Directory | La carpeta que contiene `package.json`; la raíz si allí subiste el proyecto. |
   | Node.js | Una versión compatible 22 o superior disponible en el proveedor. |
   | Install Command | Predeterminado de Vercel para npm. |
   | Build Command | `npm run build` |
   | Output Directory | Predeterminado de Next.js; no lo cambies a `out`. |

5. En las variables de entorno del proyecto añade **`DATABASE_URL`** con la conexión **pooled** de Neon. Selecciona el entorno **Production** y guárdala como secreto cuando la interfaz lo permita.
6. Si despliegas ramas de prueba, usa una conexión distinta para **Preview**. La integración Neon–Vercel también puede crear ramas y configurar variables automáticamente; no mezcles una integración automática y variables manuales contradictorias.
7. Añade los secretos del proveedor de autenticación si ya implementaste un login. Esta versión no los utiliza todavía; no inventes variables esperando que activen un login que no existe.
8. Pulsa **Deploy**. Vercel compila y ejecuta la aplicación; no ejecutes `npm run dev` ni Docker allí.
9. Revisa en **Settings → Deployment Protection** que el alcance efectivo incluya producción. **Standard Protection no protege los dominios de producción.** Comprueba cada URL desde una ventana privada sin sesión autorizada antes de cargar datos reales.

Si cambias una variable de entorno, realiza un nuevo despliegue para que los cambios se apliquen. Las variables nuevas no actualizan una versión anterior que ya esté ejecutándose.

## Paso 5. Comprueba que funciona

Accede como usuario autorizado al despliegue protegido y verifica:

- El panel carga sin errores de base de datos.
- Puedes crear un cliente y una cotización de prueba, recargar la página y seguir viéndolos.
- El PDF se descarga correctamente.
- El negocio tiene tu nombre, moneda y datos de contacto correctos.
- Una solicitud autorizada a `/api/health` devuelve el indicador de funcionamiento correcto; si todo el despliegue está protegido, una comprobación sin autenticación puede ser bloqueada antes de llegar a esa ruta.
- Las rutas administrativas y `/api/workspace` no son accesibles desde una ventana sin sesión.

La aplicación crea datos de demostración al abrir por primera vez una base vacía. Reemplaza los datos del negocio y elimina los ejemplos antes de emitir propuestas reales.

**Si ya tienes clientes y cotizaciones en tu computadora**, subir el código no mueve esa información. Migra una copia completa de PostgreSQL a una base vacía, incluyendo las relaciones y secuencias, y verifica los registros antes de ponerla en uso. Evita abrir primero la base vacía si vas a restaurar datos después, para no mezclar ejemplos con el respaldo. Usa las herramientas de respaldo de PostgreSQL y del proveedor con un plan de restauración probado.

No ejecutes `tests/smoke.mjs` contra la base de producción: esas pruebas crean, modifican y eliminan registros y cambian temporalmente la configuración del negocio.

## Paso 6. Elige la dirección web

Vercel asigna una dirección de proyecto bajo `vercel.app`, sin necesidad de comprar un dominio propio. El nombre exacto depende de la disponibilidad y de tu proyecto.

Opcionalmente compra un dominio o utiliza uno que ya tengas. En **Settings → Domains**, añádelo y configura en tu proveedor los registros DNS que Vercel indique. Espera a que el dominio esté verificado y HTTPS activo. No copies valores DNS de ejemplos de terceros: utiliza los que correspondan a tu proyecto.

Verifica también la protección del dominio nuevo. Un nombre propio y HTTPS no sustituyen el control de acceso.

## Paso 7. Compartir con clientes desde Internet

- **Modalidad privada con All Deployments:** comparte el archivo PDF. El cliente no podrá abrir la propuesta web sin acceso al despliegue.
- **Modalidad con login propio ya implementado y probado:** permite acceso público únicamente a las rutas de cotización por token y mantén protegido el panel y sus APIs. Después prueba la propuesta en una ventana sin sesión y confirma que el cliente puede consultar, descargar y aceptar sin ver datos ajenos.
- Abre Cotiza desde el dominio definitivo cuando prepares el mensaje: los enlaces se construyen con la dirección que estés utilizando en el navegador. Los enlaces creados desde localhost o desde una vista previa no cambian automáticamente; vuelve a compartirlos desde el dominio correcto.

WhatsApp y el correo continúan abriendo sus aplicaciones con el mensaje preparado. **El despliegue no activa envíos automáticos.** No necesitas una API para este comportamiento. Enviar mensajes automáticamente desde el servidor requiere una integración adicional de correo o WhatsApp Business, credenciales privadas, configuración y posibles costes; no está implementado en esta versión.

## Costos y responsabilidades

- Revisa el precio, los límites y los términos vigentes de cada proveedor antes de contratar.
- **Vercel Hobby es para uso personal no comercial.** Para las cotizaciones de un negocio elige un plan que permita uso comercial, como Pro, o un alojamiento alternativo con condiciones adecuadas.
- Neon ofrece distintos niveles de servicio; confirma almacenamiento, conexiones, cómputo, historial de restauración y suspensión por inactividad de tu plan.
- Un dominio propio normalmente tiene renovación periódica y es opcional.
- Configura alertas de consumo, respaldos, monitoreo de errores y actualizaciones de seguridad. Una tarifa o nivel gratuito no implica operación ilimitada ni ausencia de mantenimiento.

## Lo que falta para una publicación comercial abierta

Esta entrega añade documentación y una configuración de Drizzle separada para la nube. **No ha añadido autenticación propia, no ha desplegado en tu cuenta y no ha contratado servicios.** Puedes seguir la modalidad privada con protección externa verificada; para abrir los enlaces a clientes sin esa restricción hay que completar el control de acceso descrito al principio.

## Referencias oficiales

- Next.js en Vercel: https://vercel.com/docs/frameworks/full-stack/nextjs
- Variables de entorno: https://vercel.com/docs/environment-variables
- Protección de despliegues y alcance: https://vercel.com/docs/deployment-protection
- Condiciones del plan Hobby: https://vercel.com/docs/plans/hobby
- Neon con Vercel: https://neon.com/docs/guides/neon-managed-vercel-integration
- Configuración de Drizzle Kit: https://orm.drizzle.team/docs/drizzle-config-file
