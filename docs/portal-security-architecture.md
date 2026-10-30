# Arquitectura del Portal Vision Advisors

## Objetivo

El portal separa estrictamente la información de cada empresa y permite publicar análisis mensuales, impuestos, ingresos, deducciones, observaciones y documentos privados.

## Identidad recomendada

- Acceso mediante correo autorizado y código de un solo uso de Cloudflare Access.
- El RFC forma parte del expediente, pero no funciona como contraseña.
- Los administradores deben utilizar MFA.
- Toda alta, suspensión o cambio de rol requiere registro de auditoría.

## Dominios

- Sitio público: `www.visionadvisorslatam.com`.
- Portal: `portal.visionadvisorslatam.com`.
- Administración: `admin.visionadvisorslatam.com`.

## Separación de clientes

La autorización se realiza en el servidor. Cada consulta debe resolver primero el usuario autenticado, después su membresía y finalmente limitar la consulta por `organization_id`. Ninguna ruta acepta un identificador de organización del navegador como fuente de autoridad.

## Almacenamiento

- Cloudflare D1: usuarios, empresas, periodos, indicadores, impuestos, observaciones y auditoría.
- Cloudflare R2: PDF, XLSX y archivos. Los objetos permanecen privados.
- Las descargas se entregan a través del Worker después de volver a verificar membresía y permiso.
- El RFC se cifra antes de almacenarse y nunca se utiliza como identificador público de URL.
- Los importes se almacenan en centavos enteros para evitar errores de punto flotante.

## Roles

- `client/viewer`: consulta periodos publicados y descarga documentos autorizados.
- `client/manager`: consulta información de su empresa y administra contactos permitidos.
- `advisor`: prepara periodos de las empresas asignadas.
- `admin`: administra empresas, usuarios, publicación y auditoría.

## Flujo mensual

1. El asesor crea un periodo en estado `draft`.
2. Captura o importa indicadores e impuestos.
3. Adjunta documentos privados.
4. Un responsable revisa el periodo en estado `review`.
5. Al publicar, el sistema registra usuario y fecha.
6. El cliente sólo puede consultar periodos `published` o `locked`.

## Controles obligatorios antes de producción

- Cloudflare Access configurado sobre portal y administración.
- MFA obligatorio para administradores.
- Políticas explícitas por correo o grupo.
- D1 y R2 productivos con respaldos y retención definida.
- Cifrado del RFC mediante secreto administrado, nunca incluido en el repositorio.
- Rate limiting, cabeceras de seguridad y registro de eventos.
- Pruebas de aislamiento entre empresas.
- Aviso de privacidad y términos revisados.
- Procedimiento de alta, baja, recuperación y respuesta ante incidentes.

## Datos que no deben almacenarse

- Contraseña del SAT.
- Clave privada de e.firma.
- Contraseñas de clientes en texto o cifrado reversible.
- Archivos públicos con URL permanente.
