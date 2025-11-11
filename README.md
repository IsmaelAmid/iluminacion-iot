# iliuminacion-iot
Este proyecto consiste en un sistema de iluminación inteligente basado en IoT, desarrollado como trabajo final para la cátedra de Domótica de UNLaR.
El sistema permite controlar de forma remota una lámpara RGB utilizando un ESP32, un sensor PIR y una aplicación web que se comunica mediante el protocolo MQTT a través de un broker en la nube (EMQX Cloud).

El sistema está diseñado para automatizar el encendido, apagado y control de la intensidad del color de una lámpara RGB, conformada por tres LEDs (rojo, verde y azul).
El ESP32 se encarga de procesar los datos del sensor PIR y gestionar los mensajes MQTT, mientras que la aplicación web permite al usuario ajustar la iluminación de manera manual o automática, guardar presets y visualizar el estado en tiempo real.


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

## Componentes del sistema

| Componente     | Descripción                | Pin GPIO |
| -------------- | -------------------------- | -------- |
| 🧠 ESP32       | Microcontrolador principal | —        |
| 🔴 LED Rojo    | Control de canal rojo      | GPIO 25  |
| 🟢 LED Verde   | Control de canal verde     | GPIO 26  |
| 🔵 LED Azul    | Control de canal azul      | GPIO 27  |
| 👁️ Sensor PIR | Detección de movimiento     | GPIO 18  |


## Broker en la nube: EMQX Cloud

Para la comunicación entre dispositivos se utilizó EMQX Cloud, un broker MQTT alojado en la nube que permite la conexión segura y estable entre el ESP32 y la aplicación web.
A través de EMQX, el microcontrolador publica el estado del sensor PIR y los niveles de los LEDs, mientras que la aplicación envía comandos para modificar la iluminación.
Esta arquitectura elimina la necesidad de servidores locales y facilita la escalabilidad y monitoreo del sistema desde cualquier lugar con acceso a Internet.

