# Clase 02 — HTTP como contrato

Entrega de la clase 2: **Request API Lite** (análisis y corrección de una API ajena) y
**Request API Full** (construcción de una API propia, especificación primero). Ambas
administran *solicitudes de mantenimiento* y guardan los datos en memoria.

## Organización de la carpeta

```txt
activities/class-02/
├── README.md               ← este archivo
├── .gitignore
├── lite-api/               ← API Lite (original + correcciones)
│   ├── package.json
│   └── server.js
├── lite-analysis.md        ← análisis independiente de la API Lite original
├── casos-de-prueba.md      ← verificación manual: Partes A (original), B (corregida) y C (Full)
├── comparison.md           ← comparación Lite vs Full: 8 dimensiones + 14 preguntas
├── ai-usage.md             ← registro del uso de IA
└── project/                ← Request API Full
    ├── README.md
    ├── package.json
    ├── docs/
    │   └── http-contract.md
    └── src/
        ├── app.js          ← configuración de la aplicación (monta el router)
        ├── server.js       ← arranque del proceso (puerto 3000)
        ├── data/
        │   └── requests.js ← datos en memoria + generateId()
        └── routes/
            └── requests.routes.js
```

Requisito común: Node.js 18+ (`node --version`). Ninguno de los dos proyectos necesita
más dependencias que Express.

## Cómo instalar y ejecutar

### API Lite

```bash
cd lite-api
npm install
node server.js
# Request API Lite is running on http://localhost:3000
```

### API Full

```bash
cd project
npm install
npm start          # equivale a: node src/server.js
# Request API Full is running on http://localhost:3000
```

Ambas escuchan en el puerto 3000: no levantar las dos a la vez. Verificación con
`curl -i http://localhost:3000/requests`.

## Defectos encontrados en el Lite y corrección aplicada

El análisis completo, con la evidencia que sostiene cada fila, está en `lite-analysis.md`;
la re-verificación tras corregir, en `casos-de-prueba.md` (Parte B).

| # | Defecto observado | Corrección aplicada |
| - | ----------------- | ------------------- |
| 1 | El listado solo existía en `GET /getRequests`: la ruta nombra una acción, no el recurso; `GET /requests` devolvía `404` | Ruta renombrada a `GET /requests`; la variante con verbo ya no existe (`404`) |
| 2 | `GET /requests/:id` con id inexistente respondía `200` con `{"error":"Request not found"}`: el estado afirmaba éxito mientras el cuerpo describía un fallo | Mismo caso responde `404 Not Found` con el mismo cuerpo JSON |
| 3 | `POST /requests` creaba el recurso y respondía `200`, sin comunicar creación | Responde `201 Created` con el objeto creado |
| 4 | `POST /requests` aceptaba peticiones sin `title`: respondía `200`, generaba id y persistía un registro sin título | Valida el título (recorta espacios); ausente o en blanco → `400 {"error":"Title is required"}` sin generar id ni modificar datos |

## Decisiones tomadas en el Full y por qué

1. **Contrato antes que código.** `docs/http-contract.md` se escribió antes de tocar el
   router: define recurso, campos, tres endpoints, reglas transversales y decisiones. La
   implementación se verificó contra ese documento (Parte C completa en verde).

2. **El filtro por estado es query parameter, no ruta.** `GET /requests?status=open`
   presenta distinto el mismo recurso colección; una ruta tipo `/requests/open` declararía
   un recurso que no existe. Un valor sin coincidencias devuelve `200 []`: filtrar sin
   resultado no es una petición malformada.

3. **`400` también para título en blanco.** `"   "` es tan inválido como la ausencia:
   recortar y comprobar vacío aplica una sola regla coherente.

4. **`id` y `status` son exclusivos del servidor.** Si el cliente los manda en el body se
   ignoran: el `id` lo genera `generateId()` y toda solicitud nace `"open"`.

5. **`priority` no se valida contra vocabulario cerrado.** Los casos de prueba no lo exigen
   y añadir validación no pedida ampliaría el contrato sin necesidad; quedó anotado como
   candidato para el próximo incremento, junto con las transiciones de estado.

6. **Subrutas desconocidas de `/requests` responden `404` JSON uniforme**, manteniendo la
   forma de error `{ "error": "..." }` dentro del único recurso de la API. Rutas fuera del
   router conservan el `404` por defecto de Express.

7. **Exclusiones respetadas.** Sin base de datos, sin TypeScript, sin autenticación, sin
   capas de controladores/servicios/repositorios, sin `PUT`/`PATCH`/`DELETE`, sin
   dependencias además de Express, sin frontend.

## Historial esperado

Los commits documentan el recorrido: análisis → corrección → contrato → implementación →
verificación → documentación, con los tags `class-02-lite-analysis` (antes de usar IA en el
Lite) y `class-02-submission` al cierre.
