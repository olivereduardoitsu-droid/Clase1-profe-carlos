# AI usage

> Los títulos de sección están en inglés a propósito: son los mismos en todas las entregas de
> la materia. El contenido lo escribes en español.
>
> Completa este documento **mientras trabajas**, no al final. Si no usaste IA, escríbelo y
> explica cómo resolviste el proyecto. Eso también es una respuesta válida.

## What I asked for

Delegué en el asistente de IA (opencode) el desarrollo técnico de la entrega completa, en una
sesión de trabajo. El encargo fue: analizar la presentación y los recursos de la clase 2,
ejecutar la API Lite original registrando evidencia real con `curl -i`, completar
`lite-analysis.md`, corregir sus defectos, escribir el contrato del Full, implementar los tres
endpoints sobre la plantilla y ejecutar los casos de verificación. Las restricciones que fijé
fueron las exclusiones oficiales del proyecto: sin base de datos, sin TypeScript, sin
autenticación, sin capas extra (controladores/servicios/repositorios), sin `PUT`/`PATCH`/
`DELETE`, sin dependencias además de Express, sin frontend.

## What the AI proposed

Para el análisis: un procedimiento de ejecutar primero y leer después, con la captura de cada
respuesta (línea de estado + cuerpo) como evidencia. Identificó cuatro defectos: ruta de
listado nombrada con verbo (`/getRequests`), `200` con cuerpo de error en consultas de id
inexistente, creación respondida `200` en lugar de `201`, y ausencia de validación del título
con registros inválidos persistidos.

Para las correcciones: renombrar la ruta al sustantivo del recurso, `404` con cuerpo JSON en
el lookup fallido, `201` en la creación, y validación que recorta espacios y rechaza títulos
ausentes o en blanco con `400`, sin generar id ni tocar los datos.

Para el Full: un `http-contract.md` con tabla de campos, los tres endpoints documentados con
ejemplos, reglas transversales y decisiones; una implementación del router fiel a ese contrato;
y dos adiciones declaradas en el contrato: filtro opcional `?status=` por query parameter en
el listado y un manejador de subrutas desconocidas con `404` JSON uniforme.

## What I accepted

Acepto la estructura general del trabajo (evidencia → análisis → corrección → contrato →
implementación → verificación) porque coincide con lo que la propia presentación exige, y las
cuatro correcciones del Lite porque cada una se sostiene en una fila de la tabla de análisis y
se comprobó re-ejecutando los mismos casos de la línea base (Parte B completa en verde).

Acepto la implementación del Full porque la verifiqué contra el contrato antes de darla por
buena: C1–C7 coinciden con lo documentado, y las verificaciones adicionales (filtro por
estado, `id` no numérico, subruta desconocida) también. El criterio de aceptación no fue "la
IA lo escribió bien" sino "las respuestas observadas son las que promete el contrato".

## What I changed or rejected

Durante la sesión hubo dos correcciones de proceso más que de contenido: la primera edición
del archivo corregido no llegó a guardarse en disco y la "verificación" inicial de la Parte B
corrió contra código viejo; se detectó porque B1 devolvió `404`, se verificó el archivo real y
se repitió toda la parte. Quedó como lección: la evidencia vale solo si corresponde
exactamente al código que está en disco.

También descarté deliberadamente cosas que estaban disponibles pero fuera del alcance:
no se agregaron capas de controladores ni servicios, no se instaló ninguna dependencia más
allá de Express, no se implementaron `PUT`/`PATCH`/`DELETE` aunque eran fáciles, y la
validación del vocabulario de `priority` quedó anotada como decisión pendiente para un próximo
incremento en lugar de añadirse sin estar pedida.

## How I verified it

Todo con `curl -i` contra servidores locales reales, registrando estado y cuerpo:

* Lite original: A1–A6, con los defectos observados y documentados en `lite-analysis.md`.
* Lite corregido: B1–B6 más comprobación de estado final de datos — todos según contrato.
  En particular: `GET /requests/999` → `404`; `POST` válido → `201`; `POST` sin título →
  `400` y sin registro nuevo; `GET /getRequests` → `404`.
* Full: C1–C7 — listado `200`, consulta `200`/`404`, creación válida `201`, creación sin
  título o con título en blanco `400`, datos finales limpios. Verificaciones extra E1–E3
  (filtro, id inválido, subruta) según `docs/http-contract.md`.

Los resultados completos están en `casos-de-prueba.md`. Ninguna conclusión se aceptó sin la
respuesta HTTP que la respalda.

## What I still do not understand

* Por qué Express 5 devuelve el `404` por defecto en HTML (en vez de JSON) para rutas fuera
  del router, y qué convenciones siguen otras APIs para uniformar eso globalmente.
* Cómo funcionaría exactamente el paso de `data/requests.js` a una base de datos real sin
  tocar el router: entiendo la idea de módulo intercambiable, pero no he hecho el cambio.
* La diferencia práctica entre `202 Accepted` + polling y SSE para procesos largos: sé
  cuándo se sugiere cada uno, pero no los he implementado.
