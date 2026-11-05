# Procedimiento seguro para migraciones D1

Este portal no ejecuta cambios de estructura durante las solicitudes web. Las
migraciones se aplican de forma supervisada antes de publicar código que dependa
de ellas.

## Orden obligatorio

1. Crear y revisar la migración SQL en `drizzle/`.
2. Crear un marcador de **Viajes en el tiempo** en Cloudflare D1.
3. Ejecutar primero consultas `PRAGMA table_info(...)` de solo lectura.
4. Aplicar únicamente la migración pendiente en la consola D1.
5. Volver a ejecutar los `PRAGMA` y confirmar tablas, columnas e índices.
6. Publicar el código en `main`.
7. Probar `/`, `/portal`, `/admin` y las API principales.

## Diagnóstico de la versión actual

```sql
PRAGMA table_info(documents);
PRAGMA table_info(organizations);
PRAGMA table_info(messages);
```

La API autenticada `GET /api/admin/schema-health` realiza esta comprobación sin
modificar la base. El panel la consulta antes de cargar empresas, clientes,
documentos o periodos. Si detecta una incompatibilidad, muestra los nombres
exactos que faltan y detiene la carga del panel.

## Reglas de seguridad

- No ejecutar `ALTER`, `DROP`, `CREATE` o migradores desde el `fetch` del Worker.
- No publicar código que consulte columnas nuevas antes de migrar D1.
- No incluir eliminaciones o renombrados en una migración aditiva.
- Las migraciones destructivas requieren respaldo, ventana de mantenimiento y
  validación independiente.
- Conservar el SQL ejecutado y la evidencia del resultado en el expediente de
  despliegue.
