# Matriz de acceso — Request API v5

Dos roles exactos: `requester` y `agent`. Sin `admin`.

Completa cada celda con `Sí`, `No`, `Propias` o `Propia y abierta`.
La matriz puede discutirse, pero la implementación converge en la baseline
del taller (lámina «Contrato fijo»).

| Operación | Anónimo | Requester | Agent |
| --------- | ------: | --------: | ----: |
| `POST /auth/register` | ??? | ??? | ??? |
| `POST /auth/login` | ??? | ??? | ??? |
| `GET /auth/me` | ??? | ??? | ??? |
| `GET /requests` | ??? | ??? | ??? |
| `GET /requests/:id` | ??? | ??? | ??? |
| `GET /requests/:id/history` | ??? | ??? | ??? |
| `POST /requests` | ??? | ??? | ??? |
| Editar título/descripción | ??? | ??? | ??? |
| Cambiar prioridad | ??? | ??? | ??? |
| Cambiar estado | ??? | ??? | ??? |

## Campos controlados por el servidor

Lista aquí los campos que el cliente JAMÁS puede enviar, en el registro y en
las solicitudes, y qué respuesta exacta produce intentarlo.

## Solicitudes heredadas

¿Quién ve las solicitudes sin propietario (`created_by IS NULL`)? ¿Por qué?
