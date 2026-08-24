# Comparación — Lite vs Full

> Completa esta comparación **después** de tener las dos versiones funcionando. No se trata de
> decidir cuál es «mejor», sino de nombrar qué cambió y qué costó.

## Tabla de dimensiones

Una fila por dimensión. Describe lo que realmente observaste en cada versión.

| Dimensión       | Request API Lite | Request API Full |
| --------------- | ---------------- | ---------------- |
| Contrato        | Implícito y roto: había que ejecutarlo para descubrir qué cumplía de verdad (`200` con errores, ruta con verbo, sin validación). | Explícito y previo: `docs/http-contract.md` declara métodos, entradas, estados y errores antes del código, y la implementación se le midió. |
| Organización    | Un solo archivo (`server.js`) con datos y rutas mezclados. Corregirlo significaba tocar todo en el mismo lugar. | Cuatro archivos con responsabilidades separadas: arranque (`server.js`), configuración (`app.js`), endpoints (`routes/`) y datos (`data/`). |
| IA              | La fase de análisis exige hacerla sin IA; el uso posterior queda registrado. El análisis salió de ejecutar y observar, no de preguntar. | Prevista desde el diseño: especificación primero, generación después, verificación siempre. Todo el uso quedó anotado en `ai-usage.md`. |
| Lectura         | Corta pero engañosa: 67 líneas que parecen inofensivas hasta que los casos de prueba muestran lo que no dicen. | Requiere visitar varios archivos, pero cada uno dice una sola cosa; el contrato documenta lo que ninguno muestra por sí solo. |
| Modificación    | Cambiar cualquier comportamiento edita el mismo archivo; el riesgo de romper algo vecino es constante. Cada fix fue un cambio local pero sobre un archivo monolítico. | Localizada: agregar validación tocó solo el router; mañana cambiar el origen de datos tocaría solo `data/`. Nada más necesita enterarse. |
| Complejidad     | Mínima cantidad de piezas, máxima concentración: datos, tres rutas y reglas implícitas conviven en un archivo. | Más piezas (4 archivos + contrato), menos carga por pieza: cada archivo se sostiene en la cabeza por separado. |
| Verificación    | Reveladora pero incómoda: los mismos comandos mostraban defectos al inicio y correcciones después. Sin línea base no hay conclusión. | Directa: los casos C1–C7 se definieron junto con el contrato y todos pasaron a la primera tanda completa. |
| Extensibilidad  | Agregar un campo o endpoint significa seguir inflando el único archivo, heredando sus vicios ya corregidos. | Un endpoint nuevo es una entrada más en el router; un campo nuevo toca el router y el contrato; una base de datos futura solo reemplaza `data/`. |

## Preguntas de reflexión

Responde cada una en dos o tres frases. Apóyate en lo que hiciste, no en generalidades.

1. **¿Qué problemas del Lite eran problemas HTTP?**
   Los cuatro núcleos: la ruta con verbo que compite con la ruta natural del recurso, el `200`
   acompañando un cuerpo de error, la creación anunciada como `200` en vez de `201` y la
   ausencia total de validación con estado de error. Todos son violaciones del contrato HTTP
   visible para cualquier cliente, independientemente de cómo esté escrito el código.

2. **¿Qué problemas eran decisiones de organización?**
   Que datos y rutas vivieran juntos en un solo archivo no produjo los defectos anteriores,
   pero sí hizo más difícil verlos: no hay ningún lugar donde leer qué promete la API.
   También encarece el cambio: cada corrección modificaba el mismo bloque donde convivían
   todas las responsabilidades.

3. **¿Qué resolvió la estructura del Full?**
   Separó motivos de cambio distintos y puso el contrato por escrito antes del código:
   quien llega nuevo puede leer qué hace la API sin invertir el código. La verificación
   también cambió de naturaleza: los casos se deducen del contrato, no del ensayo y error.

4. **¿Qué complejidad introdujo?**
   Cuatro archivos donde antes había uno, un router montado con prefijo (donde `'/'` no es
   `/`) y la obligación de mantener coherentes documento e implementación. Ninguna es
   complejidad accidental: cada pieza existe por un motivo declarado.

5. **¿Qué generó bien la IA?**
   Estructuras repetitivas y verificables: el esqueleto de los manejadores, las
   conversiones de `req.params`, el filtro por query y la forma uniforme de los errores.
   Son piezas donde el contrato ya decía exactamente qué se esperaba, así que generarlas
   era seguro y su corrección era comprobable caso por caso.

6. **¿Qué añadió innecesariamente?**
   En este flujo concreto nada fuera de alcance sobrevivió: la especificación llevaba la
   lista de exclusiones y la revisión la aplicó. El riesgo real estaba documentado —la IA
   tiende a proponer capas, dependencias y persistencia que nadie pidió— y la defensa fue
   contrastar cada archivo generado contra lo acordado.

7. **¿Cuál versión fue más fácil de entender?**
   El Lite se entiende en un minuto y engaña en dos: parece completo porque es corto. El
   Full exige recorrer más archivos, pero lo que se lee coincide con lo que luego ocurre;
   entenderlo cuesta más al principio y menos para siempre.

8. **¿Cuál sería más fácil de extender?**
   El Full, sin competencia: un endpoint nuevo es una función en el router, un cambio de
   almacenamiento reemplaza un módulo aislado y el contrato se actualiza en paralelo. En el
   Lite cada extensión agranda el monolito y arrastra los mismos riesgos que ya corregimos.

9. **¿Qué contrato permanecería igual si cambiáramos Express?**
   Todo lo que está en `http-contract.md`: rutas, método, estados, cuerpos de error,
   semántica del filtro y del path parameter. Express resuelve el *cómo* interno; el
   contrato describe el *qué* observado desde afuera, y ese es independiente del framework.

10. **¿Por qué HTTP es suficiente para este proyecto?**
    Porque toda interacción es puntual: el cliente pregunta o envía, el servidor responde y
    la conversación termina. No hay eventos del servidor hacia el cliente ni estados
    compartidos en vivo, así que request/response cubre todos los casos de uso declarados.

11. **¿Qué cambiaría si necesitáramos actualizaciones en vivo?**
    HTTP puro quedaría corto: habría que sondear con peticiones repetidas o abrir un canal
    persistente (SSE para notificaciones unidireccionales, WebSocket para interacción en
    ambas direcciones). El contrato actual no contempla empujar información sin que se pida.

12. **¿Utilizaríamos SSE o WebSocket para mostrar progreso?**
    Para mostrar progreso de un proceso iniciado por el cliente, SSE alcanza: el flujo es
    unidireccional (servidor → cliente) y basta con texto de evento. WebSocket sería
    justificable solo si el cliente también necesitara hablar durante el proceso.

13. **¿Qué ocurriría si crear una solicitud iniciara un proceso de veinte minutos?**
    El modelo sincrónico se rompe: mantener la conexión veinte minutos para un `201` es
    inviable. La creación debería aceptarse rápido (`202 Accepted`) y el proceso pasaría a
    ejecutarse aparte, con algún mecanismo para consultar su avance.

14. **¿Cuándo sería razonable una cola de mensajes?**
    Cuando haya tareas pesadas o desacopladas del ciclo petición-respuesta: múltiples
    consumidores, reintentos ante fallos, picos de carga que deban amortiguarse. Con tres
    endpoints en memoria sería sobreingeniería; la cola aparece cuando el problema la exige,
    no antes.

## Cierre

Si tuvieras que empezar de nuevo el proyecto Full, ¿qué harías distinto y por qué?

Escribiría el contrato todavía más estricto sobre las formas de error antes de generar
código, porque fue el criterio que más veces usé al revisar lo producido: cada decisión de
estado (`404`, `400`, `201`) y de cuerpo (`{"error": ...}`) tuvo que defenderse contra la
tentación de responder `200` con cualquier cosa, herencia justamente de haber leído primero
una API que respondía así. También probaría cada endpoint contra el contrato apenas se
genera, en lugar de generar los tres y verificar al final: los defectos del Lite demostraron
que "parece correcto" y "cumple el contrato" son juicios distintos, y separarlos temprano
cuesta menos que separarlos tarde.
