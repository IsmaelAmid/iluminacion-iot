import { createSignal, onMount, onCleanup, For, createEffect } from "solid-js";
import mqtt from "mqtt";

const DEVICE_ID = "esp32-01";
const BROKER_URL = "ws://broker.emqx.io:8083/mqtt";

const presets = [
  { name: "All Off", levels: [0, 0, 0] },
  { name: "All On", levels: [255, 255, 255] },
  { name: "Reading", levels: [200, 200, 100] },
  { name: "Movie", levels: [20, 20, 150] },
  { name: "Warm", levels: [255, 180, 50] },
];

const pirOnPreset = presets[2]; // Use "Reading" preset when motion is detected
const pirOffPreset = presets[0]; // Use "All Off" preset when motion is clear

export default function App() {
  const [levels, setLevels] = createSignal([0, 0, 0]);
  const [pir, setPir] = createSignal("unknown");

  const [isPirAutomationOn, setIsPirAutomationOn] = createSignal(false);

  let client = null;

  const topicCmd = `home/esp32/${DEVICE_ID}/led/set`;
  const topicState = `home/esp32/${DEVICE_ID}/led/state`;
  const topicPir = `home/esp32/${DEVICE_ID}/sensor/pir`;

  function publishSet(led, level) {
    if (!client) return;
    const payload = JSON.stringify({ led, level: Number(level) });
    client.publish(topicCmd, payload);
  }

  function applyPreset(presetLevels) {
    if (!client) return;
    setLevels(presetLevels);
    presetLevels.forEach((level, index) => {
      publishSet(index, level);
    });
  }

  createEffect(() => {
    const currentPirState = pir();

    if (!isPirAutomationOn()) {
      return; // Do nothing
    }

    if (currentPirState === "detected") {
      console.log("PIR Automation: Motion DETECTED! Sending 'On' preset.");
      applyPreset(pirOnPreset);
    } else if (currentPirState === "clear") {
      console.log("PIR Automation: Motion CLEAR. Sending 'Off' preset.");
      applyPreset(pirOffPreset);
    }
  });

  onMount(() => {
    client = mqtt.connect(BROKER_URL);

    client.on("connect", () => {
      console.log("connected to broker");
      client.subscribe(topicState);
      client.subscribe(topicPir);
    });

    client.on("message", (topic, payload) => {
      try {
        const msg = JSON.parse(payload.toString());
        if (topic === topicState) {
          const led = Number(msg.led);
          const level = Number(msg.level);
          if (!Number.isNaN(led) && led >= 0 && led < 3) {
            setLevels((prev) => {
              if (prev[led] === level) return prev;
              const copy = [...prev];
              copy[led] = level;
              return copy;
            });
          }
        } else if (topic === topicPir) {
          const newPirState = String(msg.pir);
          if (newPirState !== pir()) {
            setPir(newPirState);
          }
        }
      } catch (e) {
        console.error("Invalid JSON in MQTT message", e);
      }
    });

    client.on("error", (err) => {
      console.error("MQTT error", err);
    });

    onCleanup(() => {
      if (client) {
        try {
          client.end(true);
        } catch (e) {
          console.warn("Error closing mqtt client", e);
        }
      }
    });
  });

  return (
    <div class="min-h-screen bg-linear-to-br from-white to-gray-50 text-gray-800 font-sans p-6">
      <div class="max-w-2xl mx-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-2xl font-semibold tracking-wide">
            ESP32 LEDs (via MQTT)
          </h3>
        </div>

        <div
          class="w-12 h-1 mb-6 bg-lime-500 rounded-full"
          aria-label="accent divider"
        />

        <div class="flex items-center justify-between bg-white border rounded-lg p-4 mb-6 shadow-sm border-lime-200">
          <div>
            <h4 classs="text-lg font-semibold text-gray-800">
              Modo Automatico PIR
            </h4>
            <p class="text-sm text-gray-600">
              Prende/Apaga las luces según el sensor.
            </p>
          </div>
          <div class="flex items-center">
            <span
              class={`mr-3 text-sm font-medium ${isPirAutomationOn() ? "text-lime-600" : "text-gray-900"}`}
            >
              {isPirAutomationOn() ? "Enabled" : "Disabled"}
            </span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPirAutomationOn()}
                onChange={(e) => setIsPirAutomationOn(e.currentTarget.checked)}
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-lime-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-600"></div>
            </label>
          </div>
        </div>

        <fieldset
          disabled={isPirAutomationOn()}
          class={`transition-opacity duration-300 ${
            isPirAutomationOn()
              ? "opacity-50 pointer-events-none"
              : "opacity-100"
          }`}
        >
          <div class="mb-8">
            <h4 class="text-lg font-semibold mb-3 text-gray-800">Presets</h4>
            <div class="flex flex-wrap gap-2">
              <For each={presets}>
                {(preset) => (
                  <button
                    onClick={() => applyPreset(preset.levels)}
                    class="px-4 py-2 bg-lime-500 text-white font-medium rounded-lg shadow-sm hover:bg-lime-600 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-opacity-75"
                  >
                    {preset.name}
                  </button>
                )}
              </For>
            </div>
          </div>

          <h4 class="text-lg font-semibold mb-3 text-gray-800">
            Control Manual
          </h4>

          <For each={[0, 1, 2]}>
            {(i) => {
              const idx = i;
              return (
                <div class="flex items-center gap-4 bg-white border rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-shadow duration-150 border-lime-200">
                  <div class="flex-1">
                    <label class="text-sm font-medium mb-1 text-gray-700 flex items-center gap-2">
                      <span class="truncate">LED {idx}:</span>
                    </label>
                    <div class="flex items-center">
                      <input
                        type="range"
                        min="0"
                        max="255"
                        value={levels()[idx]}
                        onInput={(e) => {
                          const v = Number(e.currentTarget.value);
                          setLevels((prev) => {
                            const copy = [...prev];
                            copy[idx] = v;
                            return copy;
                          });
                          publishSet(idx, v);
                        }}
                        class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span class="ml-3 min-w-10 text-right text-gray-700">
                        {levels()[idx]}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
          </For>
        </fieldset>

        <div class="flex items-center gap-2 pt-2 text-gray-800">
          <span class="font-semibold">PIR:</span>
          <span class="opacity-90">{pir()}</span>
        </div>
      </div>
    </div>
  );
}
