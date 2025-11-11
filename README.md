# iliuminacion-iot

Este proyecto consiste en un sistema de iluminación inteligente basado en IoT, desarrollado como trabajo final para la cátedra de Domótica.
El sistema permite controlar de forma remota una lámpara RGB utilizando un ESP32, un sensor PIR y una aplicación web que se comunica mediante el protocolo MQTT a través de un broker en la nube (EMQX Cloud).

El sistema está diseñado para automatizar el encendido, apagado y control de la intensidad del color de una lámpara RGB, conformada por tres LEDs (rojo, verde y azul).
El ESP32 se encarga de procesar los datos del sensor PIR y gestionar los mensajes MQTT, mientras que la aplicación web permite al usuario ajustar la iluminación de manera manual o automática, guardar presets y visualizar el estado en tiempo real.

* Componentes del sistema

| Componente     | Descripción                | Pin GPIO |
| -------------- | -------------------------- | -------- |
| 🧠 ESP32       | Microcontrolador principal | —        |
| 🔴 LED Rojo    | Control de canal rojo      | GPIO 25  |
| 🟢 LED Verde   | Control de canal verde     | GPIO 26  |
| 🔵 LED Azul    | Control de canal azul      | GPIO 27  |
| 👁️ Sensor PIR | Detección de movimiento     | GPIO 18  |




* Broker en la nube: EMQX Cloud

Para la comunicación entre dispositivos se utilizó EMQX Cloud, un broker MQTT alojado en la nube que permite la conexión segura y estable entre el ESP32 y la aplicación web.
A través de EMQX, el microcontrolador publica el estado del sensor PIR y los niveles de los LEDs, mientras que la aplicación envía comandos para modificar la iluminación.
Esta arquitectura elimina la necesidad de servidores locales y facilita la escalabilidad y monitoreo del sistema desde cualquier lugar con acceso a Internet.

* Tecnologías utilizadas
 * Hardware y Firmware
- ESP32 (programado con Arduino IDE)
- Protocolo MQTT para comunicación IoT
- Broker en la nube: EMQX Cloud

Librerías:
- WiFi.h --> conexión a red inalámbrica
- PubSubClient.h --> comunicación MQTT
- ArduinoJson.h --> manejo de mensajes JSON

* Aplicación Web

- Desarrollada con SolidJS, un framework ligero y reactivo que permite construir interfaces rápidas y eficientes, controlando la intensidad y el color de los LEDs en tiempo real.

* Características principales del frontend:

- Toggle para activar o desactivar el modo automático mediante el sensor PIR.
- Control manual de la intensidad de los LEDs RGB.
- Presets para guardar configuraciones de iluminación personalizadas.
- Actualización instantánea del estado del sensor y los LEDs.

* Backend en AWS
 * Se utilizaron servicios de AWS para el almacenamiento y la lógica del sistema:
- DynamoDB: base de datos NoSQL para almacenar presets y logs del sensor.
- AWS Lambda: funciones que gestionan las operaciones (crear, eliminar o consultar presets y logs).
- API Gateway: expone los endpoints /presets para que la app se comunique con las funciones Lambda.
- Métodos disponibles: GET, POST, DELETE.

Funcionalidades principales

- Conexión Wi-Fi automática y reconexión al broker MQTT.
- Publicación del estado del sensor PIR (detección de movimiento).
- Recepción de comandos para modificar el brillo y color de los tres LEDs.
- Control de iluminación mediante PWM (modulación por ancho de pulso).
- Comunicación bidireccional entre el ESP32 y la aplicación web.

* Funcionamiento general

- El ESP32 se conecta a la red Wi-Fi y al broker MQTT EMQX Cloud.
- Cuando el sensor PIR detecta movimiento, el estado se publica en el tópico correspondiente.
- Desde la aplicación web, un usuario puede enviar comandos MQTT para cambiar la intensidad o el color de los LEDs.
- El ESP32 recibe estos mensajes, actualiza los valores de los pines PWM y responde con el nuevo estado.
- Toda la información se refleja en tiempo real en la interfaz web


* Conclusión

El proyecto Iluminación IoT integra hardware, software y servicios en la nube para ofrecer un sistema de control de iluminación inteligente, escalable y de bajo costo.
Demuestra cómo el uso de tecnologías como ESP32, MQTT, EMQX Cloud, SolidJS y AWS puede combinarse para crear una solución de domótica moderna, eficiente y adaptable a distintos entornos.