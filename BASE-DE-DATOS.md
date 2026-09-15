# Cómo ver la base de datos y las tablas de Cotiza

Cotiza guarda la información en **PostgreSQL**, no en un archivo Excel ni dentro del navegador. La forma más sencilla de consultar los registros es **Drizzle Studio**, incluido con las dependencias del proyecto.

## Opción recomendada: Drizzle Studio

Estos pasos se realizan **en tu computadora**, dentro del proyecto descomprimido. No necesitas descargar de nuevo la aplicación si ya la tienes instalada: Drizzle Studio ya está incluido.

### 1. Comprueba que la instalación local esté preparada

Debes haber completado el inicio local de `LEEME-PRIMERO.txt` o `README.md` al menos una vez: dependencias instaladas, conexión configurada y tablas creadas.

Abre **Docker Desktop** y espera a que inicie. No necesitas mantener Next.js ejecutándose para consultar una base que ya está preparada, pero PostgreSQL sí debe estar en funcionamiento.

### 2. Abre otra terminal dentro de la carpeta del proyecto

La carpeta correcta es la que contiene `package.json` y `drizzle.config.ts`.

- **Windows:** abre esa carpeta en el Explorador de archivos, haz clic en la barra donde aparece su ruta, escribe `cmd` y pulsa Enter. Así se abre Símbolo del sistema en la carpeta correcta. Si Cotiza ya está funcionando, no cierres su ventana: usa esta segunda terminal.
- **macOS:** abre Terminal, escribe `cd` seguido de un espacio, arrastra la carpeta `cotiza` desde Finder y pulsa Enter.
- **Linux:** usa «Abrir en terminal» sobre la carpeta del proyecto.
- **VS Code, cualquier sistema:** abre la carpeta y selecciona **Terminal → Nueva terminal**.

### 3. Asegúrate de que PostgreSQL esté funcionando

Si usas la configuración Docker incluida, ejecuta:

```sh
docker compose --env-file .env.local up -d --wait
```

Este comando conserva los datos existentes. Si ya tienes PostgreSQL instalado por tu cuenta, omite Docker y comprueba que tu servicio esté iniciado.

### 4. Inicia el visor de tablas

En esa misma terminal ejecuta:

```sh
npx drizzle-kit studio --host=127.0.0.1 --port=4983
```

Espera a que la terminal indique que Drizzle Studio está disponible. **Mantén la terminal abierta** mientras consultas los datos. No necesitas escribir ni compartir la contraseña: la configuración del proyecto lee `DATABASE_URL` de `.env.local` o, en su defecto, de `.env`.

Si exportaste manualmente `DATABASE_URL` en tu terminal, ese valor tiene prioridad. Confirma que apunta a la base local correcta antes de iniciar Studio; una conexión de otro entorno mostraría datos de otro entorno.

### 5. Abre el panel visual

En Chrome o Edge abre:

**[https://local.drizzle.studio](https://local.drizzle.studio)**

Esta dirección es la interfaz de Studio y se conecta al servicio que acabas de iniciar en tu computadora. **No es `localhost:3000`**, que corresponde a la aplicación Cotiza. La interfaz de Studio requiere acceso a Internet; PostgreSQL permanece local.

En la lista lateral busca el esquema **public**, si aparece, y selecciona una tabla. Podrás ver sus columnas, recorrer sus filas y filtrar los registros.

### 6. Cierra el visor cuando termines

Pulsa **Ctrl + C** en la terminal de Studio. Esto detiene el visor, no elimina los datos ni detiene el contenedor PostgreSQL.

## Las tres tablas de la aplicación

| Tabla | Qué contiene | Campos destacados |
| --- | --- | --- |
| `customers` | Clientes y sus datos de contacto. | `id`, `name`, `contact`, `email`, `phone`, `color`, `created_at`. |
| `quotes` | Cotizaciones, conceptos, importes, fechas, estados y enlaces compartidos. | `id`, `number`, `title`, `customer_id`, `issue_date`, `valid_until`, `status`, `items`, `total_cents`, `currency`, `share_token`. |
| `business_settings` | Nombre y datos de tu negocio, moneda, impuesto predeterminado y condiciones. | `id`, `name`, `owner_name`, `email`, `phone`, `address`, `currency`, `tax_rate`, `terms`. |

### Cómo interpretar los datos

- **Relación entre tablas:** `quotes.customer_id` apunta a `customers.id`. Así se identifica a qué cliente pertenece cada cotización.
- **Productos y servicios:** se guardan como una lista JSON en `quotes.items`; no hay una tabla de productos independiente. Cada concepto contiene `description`, `quantity` y `unitPrice`.
- **Importes:** `subtotal_cents`, `tax_cents` y `total_cents` están expresados en centavos. Por ejemplo, `365400` significa **3,654.00** en la moneda de `currency`. Dentro de `items`, `unitPrice` está expresado en unidades de moneda, no en centavos.
- **Estados guardados:** `draft` = borrador, `sent` = enviada, `accepted` = aceptada, `expired` = vencida.
- **Vencimientos:** la interfaz también calcula si una cotización enviada ya venció a partir de `valid_until`; por eso puede mostrar «Vencida» aunque el valor almacenado de `status` todavía sea `sent`.
- **Canales:** `shared_via` registra los canales abiertos para compartir, no confirma por sí solo que se haya entregado un mensaje.
- **Enlaces:** `share_token` permite acceder a la propuesta pública. No publiques listados completos de tokens ni los compartas con personas ajenas a esas cotizaciones.
- **Un negocio:** esta versión utiliza un único registro de configuración en `business_settings`, con `id = 1`.
- **Estructura en el código:** puedes consultar las definiciones de tablas y columnas en `src/db/schema.ts`.

## Alternativa: pgAdmin o DBeaver en tu computadora

Puedes usar un programa de escritorio compatible con PostgreSQL. Si utilizaste el asistente y Docker incluidos **sin cambiar sus valores**, configura la conexión así:

| Campo | Valor |
| --- | --- |
| Tipo de base | PostgreSQL |
| Host / servidor | `127.0.0.1` |
| Puerto | `5433` |
| Base de datos | `cotiza_local` |
| Usuario | `cotiza` |
| Contraseña | El valor de `POSTGRES_PASSWORD` en tu archivo privado `.env.local`. |

No hay una contraseña fija: el asistente genera una aleatoria. Puedes abrir `.env.local` con tu editor para copiarla en el programa de escritorio. **No compartas ese archivo ni publiques capturas donde aparezca la contraseña.** Si modificaste la conexión, utiliza tus valores actuales, no los predeterminados de esta tabla.

Estos datos corresponden a un cliente de escritorio instalado directamente en tu computadora. Si pgAdmin está dentro de otro contenedor Docker, su dirección `127.0.0.1` es la de ese contenedor y requiere una configuración de red diferente.

En pgAdmin, registra la conexión y busca **Databases → cotiza_local → Schemas → public → Tables**. Haz clic derecho en una tabla y usa **View/Edit Data → First 100 Rows** para consultar una muestra de registros.

La instalación local y la vista previa de esta plataforma son bases separadas. No esperes ver automáticamente los cambios de la vista previa dentro de `cotiza_local`.

## Si no aparecen las tablas o los datos

- **Studio no abre:** confirma que su terminal siga ejecutándose y que no haya errores de conexión. Prueba Chrome o Edge. No desactives la seguridad del navegador ni expongas Studio con `--host=0.0.0.0` para resolverlo.
- **El puerto 4983 está ocupado:** cierra la otra instancia de Studio. Si necesitas otra, inicia con `--port=4984` y abre `https://local.drizzle.studio?port=4984`.
- **PowerShell bloquea `npx.ps1`:** utiliza Símbolo del sistema o ejecuta `npx.cmd` en lugar de `npx`. No necesitas cambiar la política de seguridad del sistema.
- **PostgreSQL no responde:** abre Docker Desktop y revisa `docker compose --env-file .env.local ps`. La base debe figurar como iniciada y saludable.
- **No hay tablas:** verifica que estés conectado a la base local de Cotiza y completa la instalación inicial de `README.md`. El paso `npx drizzle-kit push` crea o modifica el esquema: no lo ejecutes contra bases de otros proyectos ni como un paso rutinario para solo consultar datos.
- **Hay tablas pero están vacías:** en una base nueva, los datos de demostración se crean al abrir Cotiza por primera vez. Arranca la aplicación y visita `http://localhost:3000`; después actualiza las tablas de Studio.

## Seguridad al consultar

**Drizzle Studio, pgAdmin y DBeaver no son visores de solo lectura por defecto.** Con el usuario de la aplicación también puedes modificar o borrar registros. Si solo quieres verlos, no guardes cambios ni uses las opciones de eliminación. Es preferible editar cotizaciones desde Cotiza, que valida las fechas y recalcula los importes.

No expongas el puerto de Studio ni PostgreSQL a Internet. Para tener acceso de solo lectura garantizado, configura un usuario PostgreSQL separado con permisos únicamente de consulta y utiliza ese usuario en tu herramienta de administración.

Documentación oficial de Studio: https://orm.drizzle.team/docs/drizzle-kit-studio
