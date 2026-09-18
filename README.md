# Sierra Padel — App (PWA)

## 🔑 La app vive en `app/`. La raíz de este repo está vacía a propósito.

Vercel construye este proyecto con **Root Directory = `app/`**. Todo lo que se edita
—`app/src/`, `app/public/`, `app/index.html`, `app/package.json`— está ahí dentro.

### Por qué está escrito esto

Hasta el 18-sep-2026 el repo tenía el **árbol duplicado**: una copia en `app/` y otra en la
raíz. Sólo se publicaba la de `app/`; la de la raíz llevaba **8 días congelada** y no tenía ni
la pantalla de la tarjeta de liga. Era una trampa silenciosa: quien editara `src/` en la raíz
veía su commit subir, veía el deploy en verde, y su cambio **no salía en ningún lado**.

Además arrastraba `app.js`, un bundle compilado de 378 KB que nadie cargaba, subido por error
y copiado a las dos carpetas en cada despliegue.

Se borró la copia de la raíz. **No la vuelvas a crear**: si algún día hace falta mover la app
a la raíz, se cambia el *Root Directory* en Vercel y se mueve, pero nunca las dos a la vez.

### Desplegar

`DEPLOY.bat` (en la carpeta del proyecto) copia la carpeta local `app/` **sólo** dentro de
`app/` de este repo y empuja a `main`. Vercel publica solo.

⚠️ Vercel únicamente publica commits cuyo **autor** sea `sierramva@gmail.com`. Con otro correo
el push entra a GitHub y Vercel lo ignora, sirviendo la versión vieja desde caché.
