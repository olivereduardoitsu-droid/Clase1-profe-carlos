# Responsibility map — Clase 08

Mapa de responsabilidades del handler cargado ANTES de refactorizar.
Complétalo mientras lees `GET /:id/history` en `requests.routes.js`.

## El handler analizado

Ruta/operación: `GET /requests/:id/history`

## Clasificación de bloques

Para cada bloque del handler, anota a qué categoría pertenece y qué líneas
lo forman (aprox.):

| Categoría | ¿Qué hace ese bloque aquí? | ¿A qué archivo debería moverse? |
| --- | --- | --- |
| HTTP (leer params/identidad) | [COMPLETAR] | |
| HTTP (leer params/identidad) | Lee y valida `id`, toma `req.auth` y responde 200 con eventos. | `requests.routes.js` + `parse-id.js` |
| Aplicación (coordinar el caso) | Busca solicitud, autoriza la visibilidad y después carga historial; ajena e inexistente comparten 404. | `requests.service.js` (`getHistory`) |
| Negocio (¿puede verse?) | Agente puede ver cualquiera; requester solo la propia. | `request.policy.js` (`canViewHistory`) |
| Persistencia (SQL) | Lee solicitud y eventos con consultas parametrizadas; ordena por `created_at, id`. | `requests.store.js` (`findById`, `findHistory`) |
| Presentación (construir respuesta) | Convierte filas snake_case a eventos camelCase y omite datos internos. | `request.mapper.js` (`mapHistoryEventRow`) |
| Observabilidad (errores/requestId) | Asigna request id, registra petición terminada y convierte errores a la respuesta pública común. | `middleware/request-id.js`, `request-logger.js`, `error-handler.js` |

## Las preguntas del análisis

* ¿Cuántas RAZONES distintas tiene esta función para cambiar?

  Se distinguen al menos seis responsabilidades: HTTP, coordinación de aplicación,
  autorización, SQL, mapeo de salida y observabilidad. Cada una cambia por motivos
  distintos, así que la ruta original tenía varias razones independientes para cambiar.

* ¿Qué piezas ya existentes del proyecto duplica? (pista: mira store, mapper y policy)

  Repetía la consulta de solicitud de `findById`, la autorización de `canViewHistory`,
  la consulta ordenada de `findHistory` y el formato de `mapHistoryEventRow`.

* ¿Qué NO se puede probar de forma aislada mientras todo viva junto?

  No se podía probar la regla de visibilidad con objetos planos ni comprobar el SQL,
  el mapeo o la coordinación por separado: cada caso requería pasar por HTTP y
  PostgreSQL. Tras extraerlo, policy es pura y store/mapper tienen límites explícitos.
