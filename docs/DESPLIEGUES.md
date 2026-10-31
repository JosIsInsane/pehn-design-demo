# Registro de despliegues de Apps Script

Implementación de producción (la URL que usan el sitio y el CRM; no cambia):
`AKfycbyZ0Z1nr735rQ9tn2YSaYUtXEyDUL7fBQiMF78JuiRdUnRtzCt6BALCHgane8wpnsO5`

| Fecha | Versión | Commit / etiqueta git | Qué trajo |
|---|---|---|---|
| (antes) | @10 | — (código pegado a mano; respaldo en `Documents\pehn-respaldos\apps-script-antes-2026-10-27` del dueño) | CRM viejo con `Panel.gs` |
| 2026-10-27 | @11 | `5b3af01` · `apps-script-v11` | Catálogo real, correos (1 al cliente + resumen 8 pm), seguridad Cyber Neo, CRM partido por vistas (`AdminPagina.html`) |

## Volver a una versión anterior

**Rápido (sin tocar código):** Apps Script › Implementar › Gestionar implementaciones › ✏️ en la de producción › Versión: elegir la anterior (p. ej. 10) › Implementar.

**Con código:** `git checkout apps-script-v<N> -- apps-script` y luego
`npx @google/clasp@3.4.1 push --force` + `npx @google/clasp@3.4.1 create-deployment --deploymentId <ID de arriba> --description "vuelta a v<N>"`.

Al desplegar: agrega una fila aquí y la etiqueta `git tag apps-script-v<N> <commit>` (`git push origin --tags`).
