# Plan de Diseño UX/UI: QuizDinamico AI

## 1. Sistema de Diseño (Design System)

### Estilo Visual: Modern Dark Glassmorphism
Este estilo transmite modernidad, tecnología (acorde al uso de IA en tiempo real) y concentración. Utiliza fondos oscuros con "manchas de luz" ambientales (ambient light blobs) y tarjetas esmeriladas (frosted glass).

*   **Paleta de Colores (Tokens Semánticos):**
    *   **Fondo Base (`--bg-base`):** `#050506` (Casi negro, evita el `#000000` puro para no cansar la vista).
    *   **Fondo Elevado (`--bg-elevated`):** `#0a0a0c` (Para tarjetas de preguntas).
    *   **Acento Principal (`--accent-primary`):** `#5E6AD2` (Índigo profesional, usado para el progreso y acciones primarias).
    *   **Éxito (`--success`):** `#10B981` (Verde esmeralda vibrante para respuestas correctas).
    *   **Error (`--danger`):** `#EF4444` (Rojo vibrante con leve brillo para respuestas incorrectas).
    *   **Superficie Esmerilada (`--surface-glass`):** `rgba(255, 255, 255, 0.05)` con `backdrop-blur(12px)`.

### Tipografía
Emparejamiento profesional, legible en pantallas y con un toque amigable pero estructurado:
*   **Encabezados (Headings):** `Poppins` (Pesos: 500, 600, 700). Da una estructura geométrica moderna a los títulos de los temas y resultados.
*   **Cuerpo (Body) y Preguntas:** `Inter` o `Open Sans` (Pesos: 400, 500). Altamente legible para la lectura de opciones múltiples y explicaciones, minimizando la carga cognitiva.
*   **Puntuación/Números:** `JetBrains Mono` (Tabular nums) para que el contador de puntos y rachas (*streak*) no salte visualmente al cambiar de dígitos.

---

## 2. Experiencia de Usuario (UX) y Patrones de Interacción

Dado que es un entorno impulsado por Streaming (SSE) y motor adaptativo, la latencia percibida y el feedback deben ser perfectos.

### A. Feedback Táctil y Micro-interacciones (Gamificación)
*   **Respuestas Rápidas (< 100ms):** Al hacer clic en una opción, la tarjeta debe hundirse levemente (`scale: 0.97`, transición `150ms cubic-bezier(0.16, 1, 0.3, 1)`).
*   **Revelación de Resultados:** Al confirmar respuesta, la tarjeta seleccionada transiciona a Verde (Correcto) o Rojo (Incorrecto) con un sutil efecto de "Glow" (sombra exterior difuminada).
*   **Contador de Racha (Streak):** Animación en la esquina superior cuando aumenta. Si se llega a 3 seguidas, un leve destello o ícono de fuego (🔥) aparece con animación de resorte (*spring physics*).

### B. Manejo del Tiempo a Primera Pregunta (TTFQ <= 3s)
*   **Progressive Loading:** Mientras el estado de la sesión es `GENERATING`, mostrar un esqueleto (*skeleton loader*) con animación de pulso sutil (opacidad 0.1 a 0.3) que simule la estructura de una pregunta. Esto reduce la percepción de espera.
*   **Transiciones SSE:** A medida que los eventos SSE llegan, las opciones de la pregunta deben aparecer en cascada (*staggered entrance*: `30ms` de retraso entre cada opción), sintiéndose fluido en vez de brusco.

### C. Dificultad Dinámica Visual
*   Indicadores sutiles de dificultad en la UI para que el usuario entienda el ajuste del motor. Un pequeño tag tipo "píldora" (`Medium`, `Hard`) con un ícono que cambia de color.

---

## 3. Arquitectura de Información y Flujos Clave

### Flujo 1: Configuración de Ronda (Fricción Cero)
*   **UI:** Un input central de gran tamaño tipo "Buscador" con sugerencias o *chips* debajo ("Ej: Historia Romana", "Ej: React Hooks").
*   **Acción:** Selector rápido de 5 / 10 / 15 preguntas mediante botones segmentados grandes. Botón "Generar Quiz" con un spinner en el mismo botón.

### Flujo 2: La Pantalla de Juego (Core MVP)
*   **Layout:** Centrado, ancho máximo de `800px` (optimizado para escritorio y móvil).
*   **Cabecera:** Barra de progreso superior (`Progress bar`), Puntuación Global (`+450 pts`) a la derecha, y Racha actual en el centro.
*   **Cuerpo:**
    *   Texto de la pregunta grande y claro.
    *   Grid de opciones (1 columna en móvil, 2 columnas en escritorio para lectura rápida).
*   **Pie (Solo visible al fallar):** Un panel que se desliza desde abajo (`Slide in up`) explicando el error. Botón de "Siguiente Pregunta".

### Flujo 3: Fin de Ronda y Retención
*   **UI de Resultados:** Tarjeta central destacando la Precisión (Ej: 80%) y Tiempo Medio (`avgResponseTimeSec`).
*   **Call to Action Principal:** "Siguiente Nivel de Dificultad" (recomendado por el motor).
*   **Call to Action Secundario:** "Cambiar Tema" o "Repasar Errores".

---

## 4. Reglas Críticas (Do's & Don'ts de Diseño)

| Categoría | Hacer (Do) | Evitar (Don't) |
| :--- | :--- | :--- |
| **Estados de Espera** | Usar *Skeleton screens* o mensajes de IA ("Analizando tu nivel...") | Pantallas en blanco o un simple spinner eterno. |
| **Interacción** | Validar instantáneamente (feedback local) mientras el backend procesa el intento. | Bloquear la interfaz bruscamente sin feedback de carga. |
| **Accesibilidad** | Contraste de texto mínimo de `4.5:1` sobre los fondos esmerilados. Uso de teclado para seleccionar opciones (Ej: `A`, `B`, `C`, `D`). | Textos grises oscuros sobre el fondo negro profundo. |
| **Animaciones** | Usar transiciones por CSS (`transform` y `opacity`) para evitar *Layout Shifts*. | Animar márgenes (`margin`, `padding`) que rompan el DOM. |
| **Formularios** | Manejar errores cerca del campo (ej. login fallido o reconexión SSE perdida). | Alertas nativas del navegador (`alert()`). |

---

## 5. Accesibilidad y Estándares Móviles

A pesar de ser web, debe sentirse como una app nativa:
*   **Touch Targets:** Ningún botón de respuesta debe tener menos de `48x48px` de área cliqueable. Distancia de 8px a 16px entre opciones de la grilla.
*   **No Selección Textual Accidental:** Aplicar `user-select: none;` en las tarjetas de respuestas para evitar que el usuario resalte el texto accidentalmente al tocar dos veces rápido.
*   **Aviso de Desconexión:** Si el `Last-Event-ID` del SSE falla, mostrar un discreto toast superior (ej: *"Reconectando al flujo..."*) en vez de un modal bloqueante que interrumpa el test.
