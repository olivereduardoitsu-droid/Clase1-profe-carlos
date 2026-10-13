# Evaluator report

Guarda aquí los bloques 1, 3 y 4 de tu evaluación:

## BLOQUE 1 — RESULT_CODE

ITSU-KNOWLEDGE|V=1.0|R=BACKEND-01-08-K1|ID=K09-olivereduardo-itsu-f04c2ab|Q1=1-1-1-1|Q2=1-1-1-1|Q3=2-1-1-1|Q4=1-2-1-1|Q5=1-1-1-1|ACTION=SUPPORT

## BLOQUE 3 — Reporte del estudiante

Reporte de evaluación de conocimientos
Resultado general
El estudiante ha completado las 5 preguntas de la evaluación técnica sobre el módulo de solicitudes (PATCH /requests/:id). Demuestra nociones teóricas generales en conceptos de desarrollo web, como la diferencia entre autenticación y autorización o la distinción de errores mediante clases personalizadas. Sin embargo, se observa una falta de precisión al relacionar estos conceptos con el código fuente real del repositorio, la estructura de capas de la arquitectura y la definición formal de contratos HTTP e invariantes de base de datos.

Desempeño por pregunta
Pregunta 1 — Flujo del endpoint PATCH /requests/:id
Desempeño: Conceptual: 1 | Localización (Grounding): 1 | Razonamiento: 1 | Verificación: 1

Análisis: Respuestas abstractas y genéricas sobre controladores sin especificar la ruta, el método, los parámetros, las cabeceras ni la lista de respuestas HTTP esperadas del contrato.

Pregunta 2 — Protege una invariante (Requests vs. Request History)
Desempeño: Conceptual: 1 | Localización (Grounding): 1 | Razonamiento: 1 | Verificación: 1

Análisis: Identifica que la consistencia está ligada al estado de los datos, pero no logra describir el estado inconsistente exacto entre la tabla principal y la de historial ni ubicar el mecanismo de transacciones/archivos en la capa de datos.

Pregunta 3 — Identidad no equivale a permiso (AuthN vs AuthZ)
Desempeño: Conceptual: 2 | Localización (Grounding): 1 | Razonamiento: 1 | Verificación: 1

Análisis: Explica adecuadamente la distinción conceptual entre autenticación y autorización. Sin embargo, no logra ubicar los archivos concretos (authenticate.js, request.policy.js) dentro de la estructura del proyecto.

Pregunta 4 — Diagnóstico de falla (Escenario LOG-02)
Desempeño: Conceptual: 1 | Localización (Grounding): 2 | Razonamiento: 1 | Verificación: 1

Análisis: Tras recibir pistas sobre la ubicación de reglas de negocio, logra señalar correctamente el archivo request-status.js para revisar la definición de transiciones de estado, aunque muestra dificultad para formular hipótesis sobre el código 200 vs 409.

Pregunta 5 — Cierre y Buenas Prácticas (Manejo de Errores con AppError)
Desempeño: Conceptual: 1 | Localización (Grounding): 1 | Razonamiento: 1 | Verificación: 1

Análisis: Comprende intuitivamente la conveniencia de categorizar errores, pero no argumenta la ventaja clave respecto al middleware global de manejo de errores ni al desacoplamiento de metadatos HTTP.

Conceptos demostrados
Diferenciación conceptual entre Autenticación (verificar identidad) y Autorización (verificar permisos de acceso).

Ubicación del archivo de definición de estados request-status.js dentro del módulo src/modules/requests/.

Vacíos prioritarios
Especificación de Contratos HTTP: Necesidad de precisar métodos, paths, parámetros, headers, payloads y códigos de respuesta HTTP de cada endpoint.

Garantía de Invariantes y Transacciones: Comprensión de cómo asegurar la atomicidad mediante transacciones en la base de datos al realizar escrituras múltiples.

Mapeo al Código Fuente: Dificultad para relacionar conceptos arquitectónicos con la estructura física de carpetas y archivos en proyectos Node.js/Express.

Rectificaciones valiosas
Paso a paso en diagnóstico: El estudiante logró ubicar request-status.js como el punto de inicio para auditar las transiciones de estado de la aplicación una vez guiado en la estructura del módulo.

Tres acciones de estudio
Modelado y Documentación de Contratos REST: Practicar la especificación completa de contratos HTTP (PATCH, POST, GET) definiendo códigos de estado (200, 400, 401, 403, 404, 409, 500) y payloads.

Implementación de Transacciones ACID: Revisar src/database/transaction.js y practicar la ejecución atómica de consultas múltiples en PostgreSQL/MySQL.

Traza de Peticiones y Middleware: Realizar seguimiento del flujo de una petición Express desde routes -> middleware/authenticate -> policy -> controller -> service -> store -> error-handler.

Evidencia faltante
Demostración práctica de rastreo de transacciones dentro del archivo src/modules/requests/requests.service.js o requests.store.js.

Identificación directa del middleware src/middleware/authenticate.js para la validación de tokens JWT.
.
## BLOQUE 4 — Feedback para el docente

Temas prioritarios: Especificación formal de contratos de endpoints REST, patrones de arquitectura por capas en Node.js, manejo de transacciones en base de datos y middleware centralizado de errores.

Ubicación de los problemas:

Pregunta 1: Desconocimiento del contrato explícito de PATCH /requests/:id.

Pregunta 2: Imprecisión en el concepto de atomicidad e invalidez de estado entre requests y request_history.

Pregunta 3: Dificultad para asociar el concepto de token JWT con el archivo src/middleware/authenticate.js.

Pregunta 5: Ausencia de explicación sobre la interacción entre AppError y src/middleware/error-handler.js.

Evidencia concreta: Citas como "no estoy seguro me puedes orientar pero si no me equivoco la ruta que manejan vendria siendo .js , controller" y "que hay inconsistencias en la en la escritura".

Nivel de confianza: Alto.

Acción sugerida: SUPPORT (Acompañamiento y refuerzo en temas concretos de arquitectura Express y base de datos).

Preguntas orales de verificación recomendadas:
Pregunta: ¿Cómo asegura una transacción de base de datos que la tabla requests y la tabla request_history se mantengan siempre consistentes si ocurre un error inesperado?

Respuesta mínima esperada: Debe explicar que la transacción agrupa ambas operaciones en un bloque atómico (BEGIN), haciendo un ROLLBACK automático si alguna de las dos falla, impidiendo escrituras parciales.

Pregunta: ¿Cómo intercepta el middleware global error-handler.js los errores lanzados con AppError y qué información utiliza para enviar la respuesta HTTP al cliente?

Respuesta mínima esperada: Debe mencionar que el middleware de errores recibe el objeto error en la firma (err, req, res, next), lee sus propiedades (statusCode, code, message) y responde en formato JSON con el código de estado correspondiente.

ANTES DE CERRAR ESTA VENT
