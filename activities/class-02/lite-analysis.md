# Análisis del proyecto Lite

> **Completa este documento ANTES de usar cualquier herramienta de IA y ANTES de corregir el
> código.** Es la evidencia de tu análisis independiente. Guárdalo con el tag
> `class-02-lite-analysis`.
>
> El método es siempre el mismo: **ejecutar, observar, registrar**. Usa `curl -i` (o la
> pestaña Network del navegador) para ver la línea de estado, no solo el cuerpo. Ninguna
> conclusión vale sin la respuesta que la respalda.

## 1. Cómo ejecuté la API

Anota el comando que usaste y lo que apareció en la terminal.

```bash
cd lite-api
npm install
node server.js
```

```txt
Request API Lite is running on http://localhost:3000
```

El servidor queda escuchando en el puerto 3000. Cada caso se probó con `curl -i`
para obtener la línea de estado y las cabeceras, no solo el cuerpo.

## 2. Tabla de análisis

Una fila por cada comportamiento que observaste. Si un mismo endpoint se comporta distinto
según la entrada (por ejemplo, un `id` que existe y uno que no), usa una fila para cada caso.

| Endpoint | Intención | Entrada | Respuesta actual | Problema | Propuesta |
| -------- | --------- | ------- | ---------------- | -------- | --------- |
| `GET /getRequests` | Listar todas las solicitudes | Ninguna | `200` + arreglo JSON con 3 solicitudes | La ruta lleva un verbo (`get`) en el nombre; nombra una acción, no el recurso. Además `GET /requests` (la ruta natural del recurso) no existe: responde `404` HTML | `GET /requests` → `200` + arreglo JSON |
| `GET /requests/1` | Consultar una solicitud por id | Path param `id=1` | `200` + objeto JSON de la solicitud 1 | Correcto en este caso | Mantener `GET /requests/:id` → `200` |
| `GET /requests/999` | Consultar una solicitud inexistente | Path param `id=999` | **`200`** + `{"error":"Request not found"}` | El estado afirma éxito y el cuerpo describe un fallo: se contradicen. Un cliente automático que decide por el estado trataría el error como éxito | `404` + `{"error":"Request not found"}` |
| `POST /requests` | Crear una solicitud válida | Body JSON con `title`, `description`, `priority` | **`200`** + objeto creado (id 4, `status:"open"`) | Una creación produce un recurso nuevo: el estado debe ser `201 Created`. `200` dice "procesado", no "creado" | `201` + objeto creado |
| `POST /requests` sin `title` | Crear una solicitud incompleta | Body JSON solo con `description` y `priority` | **`200`** + `{"id":5,"description":"No title at all","status":"open","priority":"low"}` | Acepta una petición inválida como si fuera válida: guarda un registro sin título y ni siquiera incluye la clave `title` en el JSON (`undefined` se descarta al serializar). El estado debería ser de error del cliente y nada debería guardarse | `400` + `{"error":"Title is required"}`, sin modificar los datos |
| `GET /getRequests` después de A4/A5 | Verificar el estado final de los datos | Ninguna | `200` + arreglo con 5 elementos: incluye el válido (id 4) **y también el inválido sin título (id 5)** | Confirma que la petición inválida contaminó la colección: el defecto anterior no es solo cosmético, altera los datos | Con validación, la lista seguiría teniendo 4 elementos |

Cómo llenar cada columna:

* **Endpoint** — método y ruta exactamente como los expone el código.
* **Intención** — qué se supone que hace, en una frase.
* **Entrada** — parámetros de ruta, query o body que enviaste.
* **Respuesta actual** — código de estado **y** cuerpo, copiados de lo que observaste.
* **Problema** — qué contradice el contrato. Si no hay problema, escribe «Correcto».
* **Propuesta** — el comportamiento que debería tener, con su código de estado.

## 3. Evidencia

Pega aquí las peticiones y respuestas que sostienen la tabla. Incluye la línea de estado.

```txt
===== A1b | GET /requests =====
HTTP/1.1 404 Not Found
Content-Type: text/html; charset=utf-8

<!DOCTYPE html>
<html lang="en"> ... <pre>Cannot GET /requests</pre> </html>

===== A3 | GET /requests/999 =====
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"error":"Request not found"}

===== A4 | POST /requests (válido) =====
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"id":4,"title":"Leaking faucet","description":"The faucet in the third floor bathroom leaks.","status":"open","priority":"medium"}

===== A5 | POST /requests (sin title) =====
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"id":5,"description":"No title at all","status":"open","priority":"low"}

===== A6 | GET /getRequests después de A4 y A5 (extracto) =====
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

[... {"id":4,"title":"Leaking faucet",...}, {"id":5,"description":"No title at all","status":"open","priority":"low"}]
```

Las respuestas completas, con todas las cabeceras, están registradas en
`casos-de-prueba.md` (Parte A).

## 4. Preguntas guía

Responde con lo que observaste, no con lo que supones.

1. **¿Qué recurso representa esta API y cómo se nombra en cada una de sus rutas?**
   Representa *solicitudes de mantenimiento*. En `/getRequests` el nombre es una acción
   ("obtener solicitudes"), no el recurso; en `/requests` y `/requests/:id` sí aparece el
   recurso con su nombre en plural. El mismo recurso se nombra de dos maneras distintas
   según la ruta, y eso hace impredecible la interfaz.

2. **¿Qué método HTTP corresponde a cada intención, y coincide con el que usa el código?**
   Listar y consultar son lecturas → `GET`; crear → `POST`. Los tres métodos coinciden con
   las intenciones del código. El problema del listado no es el método sino la ruta.

3. **¿Qué código de estado devuelve cada respuesta y qué afirma exactamente ese código?**
   Todas las respuestas salen con `200`: "la petición se procesó correctamente". Pero en A3,
   A4 y A5 esa afirmación convive con cuerpos que cuentan otra historia (un error, una
   creación, una petición incompleta aceptada). `200` solo describe el transporte exitoso de
   una respuesta, no que el resultado sea el esperado.

4. **¿Hay alguna respuesta cuyo estado contradiga su propio cuerpo? ¿Cuál y por qué?**
   Sí, dos: `GET /requests/999` devuelve `200` con `{"error":"Request not found"}`, y
   `POST /requests` sin título devuelve `200` con un registro inválido guardado. En ambos
   casos la primera línea declara éxito mientras el contenido describe un fallo o una
   situación anómala. Quien consume la API no puede confiar en ninguna de las dos señales
   por separado.

5. **¿Qué entradas acepta el servidor sin comprobarlas, y qué consecuencia tiene aceptarlas?**
   El body del `POST` se usa tal cual: si falta `title`, el servidor igual crea el registro
   (con la clave ausente) y lo agrega a la colección. La consecuencia es doble: datos
   inválidos permanentes en memoria hasta reiniciar, y respuestas de éxito ante peticiones
   malformadas, que es justo lo que un contrato debería impedir.

6. **¿Cómo distinguiría un cliente automático un éxito de un error sin leer el cuerpo?**
   No podría. Con todo respondiendo `200`, la única señal de protocolo disponible es
   inútil: tendría que interpretar cuerpos específicos de esta API en particular
   (`{"error":...}`, campos faltantes), algo que ningún cliente genérico puede hacer.
   Los códigos de estado existen precisamente para que esa distinción no requiera leer el cuerpo.

7. **¿Qué parte del comportamiento observado no podía deducirse leyendo solo las rutas?**
   Que un `id` inexistente devolviera `200`; que un `POST` sin título se guardara igual;
   que el registro sin título perdiera la clave `title` en el JSON serializado. Las rutas
   declaran qué existe, no qué estados ni qué validaciones hay detrás.

8. **Si otra persona consumiera esta API sin ver el código, ¿qué supuesto la haría fallar?**
   Supondría que `GET /requests` existe (es la ruta natural del recurso) y recibiría un 404;
   supondría que un estado distinto de 2xx significa error y nunca detectaría el fallo de
   `GET /requests/999`; y construiría registros confiando en que `title` siempre está presente,
   cuando la API permite guardar solicitudes sin él.

## 5. Conclusión

En un párrafo: ¿cuál de los problemas encontrados es el más grave para quien consume la API, y
por qué ese y no otro?

El más grave es la contradicción entre estado y cuerpo (el `200` de `GET /requests/999` y del
`POST` inválido), porque corrompe la única señal común que tiene todo cliente HTTP para
actuar sin conocer la implementación. Los otros defectos —la ruta con verbo, el `200` en vez
de `201`— son inconsistencias que molestan y delatan falta de diseño, pero un consumidor
puede descubrirlos una vez y adaptarse. La contradicción estado/cuerpo, en cambio, no tiene
adaptación posible: obliga a leer e interpretar el cuerpo de cada respuesta, rompe el manejo
de errores automático de cualquier librería HTTP y convierte cada consumo en un caso
particular. Es la diferencia entre una interfaz rara y una interfaz en la que no se puede
confiar.
