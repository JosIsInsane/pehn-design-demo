# Cómo sale a vivo cada parte

El sitio y el backend (Apps Script) se publican por separado.

## Sitio (Cloudflare Pages)

- **Unir a `main` = sale en vivo** en unos minutos. No hay paso de build.
- **Cada rama y cada pull request tiene su vista previa**: Cloudflare pone un enlace `https://<rama>.<proyecto>.pages.dev` en el PR. Pruébala ahí antes de unir.
- Las cabeceras de seguridad (`_headers`) y los redirects (`_redirects`) viajan con el sitio.

## Backend (Google Apps Script)

- **No sale solo al unir a `main`.** Hay que subirlo a mano con clasp (detalle en `apps-script/README.md`, sección "Subir con un comando"):
  1. `npx @google/clasp@3.4.1 push`
  2. `npx @google/clasp@3.4.1 deploy --deploymentId EL_ID -d "qué cambió"`
- Usar siempre el mismo `deploymentId`: así la URL de la app web no cambia y no hay que tocar `datos.js`.
- Si el cambio agrega hojas o ajustes nuevos, correr luego **Pehn › Configurar hojas** y **Pehn › Revisar que todo funcione**.

## Antes de unir un PR (lista)

- [ ] El CI (GitHub Actions, "Pruebas") está en verde.
- [ ] Abrí la vista previa en el **teléfono** y probé lo que cambió (menú, carrito, un pedido de prueba).
- [ ] Si cambió algo en `apps-script/`: hice `push` y la **nueva versión** de la implementación, y probé un pedido y el CRM.
- [ ] Si cambió `datos.js` o la URL/token del backend: confirmé que apuntan a la implementación correcta.

## Cómo revertir

**Sitio:** en GitHub abre el PR ya unido y pulsa **Revert**. Crea un PR nuevo que deshace el cambio; únelo y Cloudflare vuelve a publicar la versión anterior. (Alternativa más rápida: en Cloudflare Pages › Deployments, "Rollback" a un despliegue anterior; después haz el revert en GitHub para que `main` coincida.)

**Apps Script:** Implementar › Gestionar implementaciones › Editar (lápiz) de la app web › en *Versión* elige la versión anterior › Implementar. La URL no cambia. También se puede con clasp: `deploy --deploymentId EL_ID -V NUMERO_DE_VERSION`. Si además quieres el código viejo en el editor, haz `git checkout` del commit bueno y un `push`.

## Si algo sale mal

Revierte primero, investiga después. Los pedidos ya guardados en la hoja no se pierden con ninguno de los dos reverts. Hay respaldo semanal en Drive (*Pehn › Respaldar la hoja ahora*).
