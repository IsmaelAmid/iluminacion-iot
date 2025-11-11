/*
 * ESP32 MQTT LED (PWM) and PIR Controller
 *
 * This code matches the Solid.js web application by:
 * - Connecting to "broker.emqx.io"
 * - Using the deviceId "esp32-01"
 * - Subscribing to "home/esp32/esp32-01/led/set" for commands
 * - Publishing to "home/esp32/esp32-01/led/state" on change
 * - Publishing to "home/esp32/esp32-01/sensor/pir" on change
 *
 * Requires Libraries (Install via Library Manager):
 * - PubSubClient
 * - ArduinoJson
 */

// === LIBRARIES ===
#include <WiFi.h> 
#include <PubSubClient.h>
#include <ArduinoJson.h>

// === CONFIGURATION ===
#define WIFI_SSID "Wokwi-GUEST"
#define WIFI_PASSWORD ""

// --- Hardware Pins ---
const int PIN_LED_1 = 25; // GPIO pin for LED 0
const int PIN_LED_2 = 26; // GPIO pin for LED 1
const int PIN_LED_3 = 27; // GPIO pin for LED 2
const int PIN_PIR = 18;    // GPIO pin for PIR sensor

// --- MQTT Configuration ---
const char* MQTT_BROKER = "broker.emqx.io";
const int MQTT_PORT = 1883; 
const char* DEVICE_ID = "esp32-01"; 

// --- ESP32 PWM (ledc) Configuration ---
const int PWM_FREQ = 5000;   // 5 kHz frequency for PWM
const int PWM_RESOLUTION = 8; // 8-bit resolution (0-255)

// PWM Channels (one for each LED)
const int PWM_CHANNEL_1 = 0;
const int PWM_CHANNEL_2 = 1;
const int PWM_CHANNEL_3 = 2;
// ===================================


WiFiClient espClient;
PubSubClient client(espClient);

char topicCmd[100];
char topicState[100];
char topicPir[100];

const int ledPins[] = {PIN_LED_1, PIN_LED_2, PIN_LED_3};
const int pwmChannels[] = {PWM_CHANNEL_1, PWM_CHANNEL_2, PWM_CHANNEL_3};
int ledLevels[] = {0, 0, 0};
int lastPirState = -1; // Use -1 to force initial publish
unsigned long lastReconnectAttempt = 0;


/**
 * @brief Sets up Wi-Fi connection
 */
void setupWifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

/**
 * @brief Sets an LED's brightness using ESP32's ledc
 * @param ledIndex The index of the LED (0-2)
 * @param level The brightness level (0-255)
 */
void setLedLevel(int ledIndex, int level) {
  if (ledIndex < 0 || ledIndex > 2) return;

  level = constrain(level, 0, 255);
  ledcWrite(ledPins[ledIndex], level);
  ledLevels[ledIndex] = level;

  Serial.printf("Set LED %d to %d\n", ledIndex, level);
}

/**
 * @brief Publishes the current state of an LED to the broker
 * @param ledIndex The index of the LED (0-2)
 * @param level The brightness level (0-255)
 */
void publishLedState(int ledIndex, int level) {
  StaticJsonDocument<128> doc;
  doc["led"] = ledIndex;
  doc["level"] = level;

  char buffer[128];
  size_t n = serializeJson(doc, buffer);
  client.publish(topicState, buffer, n);
}

/**
 * @brief Publishes the PIR sensor state to the broker
 * @param state "detected" or "clear"
 */
void publishPirState(const char* state) {
  StaticJsonDocument<64> doc;
  doc["pir"] = state;

  char buffer[64];
  size_t n = serializeJson(doc, buffer);
  client.publish(topicPir, buffer, n);

  Serial.printf("PIR state published: %s\n", state);
}


/**
 * @brief Callback function for incoming MQTT messages
 */
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");

  char message[length + 1];
  memcpy(message, payload, length);
  message[length] = '\0';
  Serial.println(message);

  if (strcmp(topic, topicCmd) == 0) {
    StaticJsonDocument<128> doc;
    DeserializationError error = deserializeJson(doc, message);

    if (error) {
      Serial.print("deserializeJson() failed: ");
      Serial.println(error.c_str());
      return;
    }

    if (doc.containsKey("led") && doc.containsKey("level")) {
      int ledIndex = doc["led"];
      int ledLevel = doc["level"];

      setLedLevel(ledIndex, ledLevel);
      publishLedState(ledIndex, ledLevels[ledIndex]);

    } else {
      Serial.println("Invalid JSON: missing 'led' or 'level'");
    }
  }
}

/**
 * @brief Reconnects to the MQTT broker
 */
void reconnectMqtt() {
  // Loop until we're reconnected
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    String clientId = "esp32-client-";
    clientId += String(random(0xffff), HEX);

    if (client.connect(clientId.c_str())) {
      Serial.println("connected");

      client.subscribe(topicCmd);
      Serial.print("Subscribed to: ");
      Serial.println(topicCmd);

    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      // Wait 5 seconds before retrying
      delay(5000);
    }
  }
}

/**
 * @brief Checks the PIR sensor and publishes any change
 */
void checkPirSensor() {
  int pirState = digitalRead(PIN_PIR);

  if (pirState != lastPirState) {
    if (pirState == HIGH) {
      publishPirState("detected");
    } else {
      publishPirState("clear");
    }
    lastPirState = pirState;
  }
}


// === MAIN SETUP ===
void setup() {
  Serial.begin(115200);
  while (!Serial); // Wait for serial
  delay(1000);

  // --- Setup Hardware ---
  pinMode(PIN_PIR, INPUT);

  // Configure LED PWM channels
  for (int i = 0; i < 3; i++) {
    ledcAttachChannel(ledPins[i], PWM_FREQ, PWM_RESOLUTION, pwmChannels[i]);
    setLedLevel(i, 0); // Start with LEDs off
  }
  Serial.println("Hardware initialized.");

  // --- Setup Network ---
  setupWifi();

  // --- Setup MQTT ---
  snprintf(topicCmd, 100, "home/esp32/%s/led/set", DEVICE_ID);
  snprintf(topicState, 100, "home/esp32/%s/led/state", DEVICE_ID);
  snprintf(topicPir, 100, "home/esp32/%s/sensor/pir", DEVICE_ID);

  Serial.println("--- Topics ---");
  Serial.print("CMD:   "); Serial.println(topicCmd);
  Serial.print("STATE: "); Serial.println(topicState);
  Serial.print("PIR:   "); Serial.println(topicPir);
  Serial.println("--------------");

  client.setServer(MQTT_BROKER, MQTT_PORT);
  client.setCallback(mqttCallback);

  lastReconnectAttempt = 0;
}


// === MAIN LOOP ===
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    setupWifi();
  }
  
  if (!client.connected()) {
    long now = millis();
    // Try to reconnect every 5 seconds
    if (now - lastReconnectAttempt > 5000) {
      lastReconnectAttempt = now;
      reconnectMqtt();
    }
  } else {
    client.loop();
  }

  checkPirSensor();
}
