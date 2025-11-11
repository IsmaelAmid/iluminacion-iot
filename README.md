# iliuminacion-iot
Trabajo final de la cátedra de domotica de UNLaR



## Interfaz
La pantalla principal da control total sobre la iluminación y la automatización. Está dividida en tres secciones principales:

1. **Automatización PIR:** Activa o desactiva el control por movimiento.
    
2. **Gestión de Presets:** Guarda, selecciona y elimina tus escenas de luz favoritas.
    
3. **Control Manual:** Controla el brillo de cada LED individualmente.
    

---
## Automatización por Sensor (PIR)
Permite hacer que las luces se enciendan y apaguen solas cuando se detecta movimiento.

- **Desactivado (por defecto):** Control total. Puedes usar los Presets y los Controles Manuales como desees.
    
- **Activado:** La aplicación toma el control.
    
    - Cuando el sensor PIR detecta movimiento (`detected`), las luces se encenderán automáticamente a una escena predefinida (ej. "Luces Encendidas").
        
    - Cuando el sensor deja de detectar movimiento (`clear`), las luces se apagarán.
        
    - **Importante:** Mientras la automatización está activada, los controles de Presets y Manuales se **deshabilitarán** y atenuarán para evitar conflictos.
        

---
## Gestión de Presets (Escenas)

Los presets permiten guardar y reutilizar configuraciones de luz 

### Usar un Preset

Simplemente haz clic en el botón con el nombre del preset (ej. "Lectura", "Cine"). Las luces cambiarán inmediatamente a esa configuración.

### Crear un Nuevo Preset

1. Asegúrate de que la **Automatización PIR** esté **"Desactivada"**.
    
2. Usa la sección de **"Control Manual"** para ajustar los sliders de cada LED hasta obtener la iluminación que te gusta.
    
3. Escribe un nombre para esta nueva escena en el campo que dice **"Nombre del nuevo preset"**.
    
4. Haz clic en el botón **"Guardar Actual"**.
    
5. Tu nuevo preset aparecerá en la lista, listo para ser usado.
    

### Eliminar un Preset

1. Junto al nombre de cada preset, verás un botón con una **"×"**.
    
2. Haz clic en la **"×"** del preset que deseas eliminar.
    
3. Aparecerá un mensaje pidiendo confirmación. Haz clic en "Aceptar".
    
4. El preset se eliminará permanentemente de la lista y de la base de datos.
    

---
## Control Manual

Esta sección te da control preciso sobre cada luz individual, siempre y cuando la **Automatización PIR** esté **"Desactivada"**.

- **LED 0, LED 1, LED 2:** Cada slider controla el brillo de un LED individual. Los LEDs corresponden a los colores Rojo, Verde y Azul respectivamente
    
- **0:** El LED está completamente apagado.
    
- **255:** El LED está a su máximo brillo.
    

Mover el slider enviará el comando de brillo en tiempo real a tu ESP32.

---
## Indicador de Estado

En la parte inferior de la página, verás el estado actual del sensor de movimiento:

- **PIR: unknown:** Estado inicial antes de recibir un mensaje.
    
- **PIR: clear:** No se detecta movimiento.
    
- **PIR: detected:** ¡Movimiento detectado!
