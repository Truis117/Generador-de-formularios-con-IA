## Fase 1: Base de Datos y Autenticación (Backend)
1. **Configuración de Infraestructura Local:**
   - Crear `docker-compose.yml` para levantar PostgreSQL (y Redis opcionalmente para rate limits).
   - Generar el cliente de Prisma (`pnpm prisma:generate`) y aplicar migraciones iniciales (`pnpm prisma:migrate`).
2. **Setup de Express y Middleware:**
   - Configurar `app.ts` e `index.ts` con CORS, Helmet y parseo de JSON.
   - Crear middleware de manejo de errores global (capturando errores de Zod y Prisma).
   - Crear middleware de Autenticación (`requireAuth`) que verifique el JWT Access Token.
3. **Servicio y Controladores de Autenticación:**
   - Implementar `auth.service.ts`: Hasheo de contraseñas con `argon2`, generación de JWTs (Access y Refresh).
   - Implementar `auth.controller.ts` y `auth.routes.ts`:
     - `POST /auth/register`
     - `POST /auth/login`
     - `POST /auth/refresh` (rotación de token)
     - `POST /auth/logout` (revocación de refresh token)
## Fase 2: Motor de Generación y Streaming LLM (Backend)
4. **Servicio LLM (OpenRouter):**
   - Implementar `llm.service.ts` usando `fetch` (o SDK) hacia la API de OpenRouter.
   - Definir los *System Prompts* para forzar la salida en JSON validable.
   - Implementar el parseo del stream (NDJSON o fragmentos) para detectar objetos JSON de preguntas completas de forma progresiva.
5. **Servidor SSE (Server-Sent Events):**
   - Implementar utilidad para enviar respuestas HTTP como flujo SSE.
   - Crear emisor de eventos tipados (`quiz_started`, `question`, `round_done`, `error`) usando los esquemas de `@quiz/contracts`.
## Fase 3: Lógica Core del Quiz (Backend)
6. **Gestión de Sesiones:**
   - Crear rutas y controladores para `QuizSession`:
     - `POST /sessions` (Crear nueva sesión).
     - `GET /sessions` (Listar historial por usuario).
7. **Orquestación de Rondas y Flujo:**
   - Implementar `POST /sessions/:id/rounds` (Inicia la generación de una ronda nueva).
   - Vincular la creación de la ronda con la llamada a `llm.service.ts` y el envío de datos mediante SSE al cliente.
   - Guardar métricas de tokens en el modelo `LlmTrace`.
8. **Recepción y Validación de Respuestas:**
   - Implementar `POST /questions/:id/attempt`.
   - Lógica de Idempotencia: Verificar si el `attemptId` ya existe para no duplicar puntaje.
   - Actualizar el `globalScore` del usuario (+1 correcta, -1 incorrecta) y persistir el intento.
9. **Motor Adaptativo de Dificultad:**
   - Implementar servicio que, al finalizar una ronda, analice los últimos intentos.
   - Lógica: Calcular precisión y tiempo de respuesta para sugerir la dificultad del siguiente bloque (basado en las reglas de `plan.md`).
## Fase 4: Lógica de Consumo (Frontend)
10. **Servicios Base (API Client):**
    - Implementar cliente HTTP base (wrapper de fetch) que intercepte 401s e intente renovar el token usando `/auth/refresh`.
11. **Estado de Autenticación:**
    - Crear `AuthContext` (React Context) para manejar el estado global del usuario (token, ID, score global).
12. **Hook de Streaming (`useQuizStream`):**
    - Implementar un custom hook para manejar la conexión nativa a SSE (`EventSource` o fetch progresivo).
    - Máquina de estados: Deserializar eventos NDJSON y actualizar la lista de preguntas en tiempo real.
    - Manejo de desconexiones: Implementar `Last-Event-ID` para reanudar el stream si se corta.
13. **Vistas Lógicas (Sin diseño):**
    - **Login/Register Component:** Formularios enlazados al API Client.
    - **Dashboard Component:** Lista plana de sesiones previas.
    - **Quiz Runner Component:** 
      - Vista que renderiza el stream de preguntas.
      - Botones A,B,C,D que envíen el request a `/attempt`.
      - Componente intermedio que aparece al final de la ronda para elegir la cantidad de preguntas del próximo bloque.