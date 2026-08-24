# Casos de prueba manuales

> Verificación manual de las dos APIs. Ambas escuchan en `http://localhost:3000`, así que
> **no puedes tenerlas corriendo a la vez**: prueba una, detén el servidor con `Ctrl + C` y
> prueba la otra.
>
> La columna **Resultado esperado** siempre describe lo que exige el contrato HTTP, no lo que
> hace el código. Por eso, en la API Lite original, las diferencias entre lo esperado y lo
> observado son exactamente los defectos que debes encontrar. En la Lite corregida y en la
> Full, todas las filas coinciden.
>
> Usa siempre `curl -i` para ver la línea de estado.

---

## Parte A — Request API Lite (original)

Arranque:

```bash
cd lite-api
npm install
node server.js
```

### Comandos ejecutados

```bash
# A1 · Listar solicitudes (ruta que expone el código de partida)
curl -i http://localhost:3000/getRequests

# A1b · Listar solicitudes por la ruta del recurso
curl -i http://localhost:3000/requests

# A2 · Consultar una solicitud existente
curl -i http://localhost:3000/requests/1

# A3 · Consultar una solicitud inexistente
curl -i http://localhost:3000/requests/999

# A4 · Crear una solicitud válida
curl -i -X POST http://localhost:3000/requests \
  -H "Content-Type: application/json" \
  -d '{"title":"Leaking faucet","description":"The faucet in the third floor bathroom leaks.","priority":"medium"}'

# A5 · Crear una solicitud sin título
curl -i -X POST http://localhost:3000/requests \
  -H "Content-Type: application/json" \
  -d '{"description":"No title at all","priority":"low"}'

# A6 · Comprobar el efecto de A4 y A5 sobre los datos
curl -i http://localhost:3000/getRequests
```

### Registro

| # | Petición | Resultado esperado (estado + cuerpo) | Resultado observado |
| - | -------- | ------------------------------------ | ------------------- |
| A1 | `GET /getRequests` | `200` + arreglo JSON con las solicitudes | ✅ `200 OK` + arreglo con ids 1, 2, 3 (`application/json`) |
| A1b | `GET /requests` | `200` + arreglo JSON con las solicitudes | ❌ `404 Not Found` + HTML de Express: `Cannot GET /requests`. La ruta del recurso no existe; solo existe la variante con verbo |
| A2 | `GET /requests/1` | `200` + objeto de la solicitud 1 | ✅ `200 OK` + `{"id":1,"title":"Projector does not turn on",...}` |
| A3 | `GET /requests/999` | `404` + `{"error":"Request not found"}` | ❌ `200 OK` + `{"error":"Request not found"}`. Estado de éxito con cuerpo de error |
| A4 | `POST /requests` con `title`, `description` y `priority` | `201` + objeto creado con `id` y `status: "open"` | ❌ `200 OK` + `{"id":4,...,"status":"open",...}`. Crea correctamente pero anuncia `200`, no `201` |
| A5 | `POST /requests` sin `title` | `400` + `{"error":"Title is required"}` y ningún dato nuevo guardado | ❌ `200 OK` + `{"id":5,"description":"No title at all","status":"open","priority":"low"}`. Acepta la petición inválida, crea id 5 sin clave `title` y lo guarda |
| A6 | `GET` de la colección después de A4 y A5 | `200` + la lista contiene la solicitud de A4 y **no** la de A5 | ❌ `200 OK` + lista de **5** elementos: incluye id 4 (válido) **y también id 5 (sin título)** |

### Diferencias encontradas

Cada fila donde lo observado no coincidió con lo esperado, y qué defecto revela:

1. **A1b — Ruta nombrada con verbo.** El listado solo responde en `/getRequests`; la ruta
   natural del recurso (`GET /requests`) da `404`. Defecto: la ruta nombra una acción en
   lugar del recurso.
2. **A3 — Estado que contradice su cuerpo.** Un `id` inexistente devuelve `200` con un
   cuerpo de error. Defecto: el cliente automático no puede distinguir éxito de fallo sin
   interpretar cuerpos específicos.
3. **A4 — Creación anunciada como `200`.** El recurso nuevo se produce igual, pero el estado
   no comunica creación. Defecto: se pierde la distinción entre "procesado" y "creado".
4. **A5/A6 — Petición inválida aceptada y persistida.** Sin validación de `title`, el
   servidor responde `200`, genera `id` y guarda un registro incompleto. Defecto: datos
   inválidos permanentes (hasta reiniciar) presentados como éxito.

---

## Parte B — Request API Lite corregida

Mismos casos sobre la versión corregida (`lite-api/server.js` corregido), servidor reiniciado.

| # | Petición | Resultado esperado (estado + cuerpo) | Resultado observado |
| - | -------- | ------------------------------------ | ------------------- |
| B1 | `GET /requests` | `200` + arreglo JSON con las solicitudes | ✅ `200 OK` + arreglo con ids 1, 2, 3 |
| B2 | `GET /requests/1` | `200` + objeto de la solicitud 1 | ✅ `200 OK` + objeto completo |
| B3 | `GET /requests/999` | `404` + `{"error":"Request not found"}` | ✅ `404 Not Found` + `{"error":"Request not found"}` |
| B4 | `POST /requests` con `title` válido | `201` + objeto creado | ✅ `201 Created` + `{"id":4,...,"status":"open",...}` |
| B5 | `POST /requests` sin `title` | `400` + `{"error":"Title is required"}` | ✅ `400 Bad Request` + `{"error":"Title is required"}` |
| B6 | `GET /getRequests` | `404` (la ruta con verbo ya no existe) | ✅ `404 Not Found` (HTML por defecto de Express) |
| Extra | `GET /requests` tras B4/B5 | La lista contiene la válida y ninguna inválida | ✅ 4 elementos: ids 1–4, todos con `title` |

Cada corrección rastrea a una fila del análisis: B1 ↔ defecto de ruta con verbo,
B3 ↔ contradicción estado/cuerpo, B4 ↔ estado de creación, B5/Extra ↔ validación ausente.

---

## Parte C — Request API Full

Arranque:

```bash
cd project
npm install
node src/server.js
```

### Comandos ejecutados

```bash
# C1 · Listar solicitudes
curl -i http://localhost:3000/requests

# C2 · Consultar una solicitud existente
curl -i http://localhost:3000/requests/2

# C3 · Consultar una solicitud inexistente
curl -i http://localhost:3000/requests/999

# C4 · Crear una solicitud válida
curl -i -X POST http://localhost:3000/requests \
  -H "Content-Type: application/json" \
  -d '{"title":"Air conditioning is noisy","description":"Room 110 makes noise all morning.","priority":"low"}'

# C5 · Crear una solicitud sin título
curl -i -X POST http://localhost:3000/requests -H "Content-Type: application/json" -d '{}'

# C6 · Crear una solicitud con título en blanco
curl -i -X POST http://localhost:3000/requests -H "Content-Type: application/json" -d '{"title":"   "}'

# C7 · Comprobar el efecto de C4, C5 y C6 sobre los datos
curl -i http://localhost:3000/requests
```

### Registro

| # | Petición | Resultado esperado (estado + cuerpo) | Resultado observado |
| - | -------- | ------------------------------------ | ------------------- |
| C1 | `GET /requests` | `200` + arreglo JSON con las solicitudes | ✅ `200 OK` + arreglo con ids 1, 2, 3 |
| C2 | `GET /requests/2` | `200` + objeto de la solicitud 2 | ✅ `200 OK` + `{"id":2,...,"status":"in-progress",...}` |
| C3 | `GET /requests/999` | `404` + `{"error":"Request not found"}` | ✅ `404 Not Found` + `{"error":"Request not found"}` |
| C4 | `POST /requests` con `title` válido | `201` + objeto creado con `id` nuevo y `status: "open"` | ✅ `201 Created` + `{"id":4,"title":"Air conditioning is noisy",...,"status":"open","priority":"low"}` |
| C5 | `POST /requests` con body `{}` | `400` + `{"error":"Title is required"}` | ✅ `400 Bad Request` + `{"error":"Title is required"}` |
| C6 | `POST /requests` con `title` en blanco | `400` + `{"error":"Title is required"}` | ✅ `400 Bad Request` + `{"error":"Title is required"}` |
| C7 | `GET /requests` después de C4, C5 y C6 | `200` + la lista contiene solo la solicitud de C4 | ✅ 4 elementos: ids 1–4; los intentos de C5 y C6 no alteraron los datos |

### Verificaciones adicionales al contrato

| Caso | Petición | Esperado según contrato | Observado |
| ---- | -------- | ----------------------- | --------- |
| E1 | `GET /requests?status=open` | `200` + solo solicitudes `"open"` (ids 1 y 3) | ✅ `200 OK` + ids 1 y 3 |
| E2 | `GET /requests/abc` | `404` + error (no convierte a número válido) | ✅ `404 Not Found` + `{"error":"Request not found"}` |
| E3 | `GET /requests/99/subruta` | `404` JSON uniforme de subrutas desconocidas | ✅ `404 Not Found` + `{"error":"Not found"}` |

### Estado de la verificación

* ¿Quedó alguna respuesta en `501`? No. Los tres endpoints responden según el contrato;
  ningún manejador conserva el `501 Not Implemented` del andamiaje.
* ¿Alguna respuesta devolvió un estado distinto al esperado? No. Los siete casos y las tres
  verificaciones adicionales coinciden con `docs/http-contract.md`.
