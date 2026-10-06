# Class 08 evidence — para el checkpoint de la PRÓXIMA clase

El tema 8 NO se evalúa hoy: primero se aprende y se practica. Al comenzar
la próxima clase ejecutarás un checkpoint breve SOLO del tema 8. Este
archivo reúne desde ya la evidencia que ese checkpoint pedirá.

## Evidencia mínima del tema 8

* Baseline anterior al refactor: revisión `0034532f71a9f554f3372b33744af24d433d9adf`; no se creó el commit nombrado `class-08-baseline`.
* Commits separados `class-08-refactor` y `class-08-feature`: pendientes; no se crearon commits en esta sesión.
* `responsibility-map.md` completo: sí.
* Separación route/service/store/policy: `requests.routes.js` valida HTTP; `requests.service.js` coordina y abre la transacción; `requests.store.js` ejecuta SQL; `request.policy.js` decide permisos/reglas puras; `request.mapper.js` construye representaciones.
* Migración 005: ya estaba aplicada; `npm run db:migrate` informó 001-005 SKIPPED y `No pending migrations`.
* Endpoint claim: las pruebas de `test/requests-claim.test.js` verifican 200, identidad del agente, `in_progress`, `updatedAt`, y errores 401/403/404/409/400.
* Historial/transacción: `request_claimed` registra `open → in_progress`; actualización de asignación y evento comparten el cliente transaccional y solo se confirman juntos.
* Policy/API: `test/request-policy.test.js` 5/5 y `test/requests-claim.test.js` 8/8; suite completa 55/55.
* Validador: `FINAL RESULT: PASSED` (12/12), salida completa en `validation-evidence.txt`.

## Explicación integradora (bórrala de memoria: escríbela con el proyecto abierto)

> Explica qué parte de tu trabajo fue refactor y cuál fue nueva
> funcionalidad. Ubica una regla en policy, una coordinación en service,
> una operación SQL en store y explica cómo las pruebas demostraron que el
> comportamiento anterior se conservó.

El refactor fue mover el historial de la ruta a las responsabilidades que ya existían.
La ruta valida el id y entrega actor e id al servicio; no contiene SQL.
El servicio carga la solicitud, llama `canViewHistory` y devuelve eventos.
La policy es una función pura; una solicitud ajena conserva el mismo 404 que una inexistente.
El store ejecuta consultas parametrizadas y ordena eventos por fecha e id.
El mapper expone solo los campos públicos de cada tipo de evento.
La suite de historial pasó antes de continuar con la funcionalidad nueva.
FEATURE-801 añade `POST /requests/:id/claim`, y el agente se obtiene del token.
El servicio bloquea la fila y actualiza asignación/estado junto al evento en una transacción.
Las pruebas de policy y API cubren las denegaciones, la repetición y el historial.
El validador terminó PASSED con 12 de 12 verificaciones.
