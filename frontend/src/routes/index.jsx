import { createSignal, onMount, onCleanup, For } from "solid-js";
import mqtt from "mqtt";

const DEVICE_ID = "esp32-01";
const BROKER_URL = "ws://broker.emqx.io:8083/mqtt"; // example broker with websockets

// --- ADDED: DEFINE YOUR PRESETS HERE ---
// Assuming your LEDs are [LED_1, LED_2, LED_3]
// If they are Red, Green, Blue, you can name them like "Red", "Blue", etc.
const presets = [
  { name: "All Off", levels: [0, 0, 0] },
  { name: "All On", levels: [255, 255, 255] },
  { name: "Reading", levels: [200, 200, 100] },
  { name: "Movie", levels: [20, 20, 150] },
  { name: "Warm", levels: [255, 180, 50] },
];
// --- END ADDED ---

export default function App() {
  const [levels, setLevels] = createSignal([0, 0, 0]);
  const [pir, setPir] = createSignal("unknown");

  let client = null;

  const topicCmd = `home/esp32/${DEVICE_ID}/led/set`;
  const topicState = `home/esp32/${DEVICE_ID}/led/state`;
  const topicPir = `home/esp32/${DEVICE_ID}/sensor/pir`;

  function publishSet(led, level) {
    if (!client) return;
    const payload = JSON.stringify({ led, level: Number(level) });
    client.publish(topicCmd, payload);
  }

  // --- ADDED: PRESET HANDLER FUNCTION ---
  function applyPreset(presetLevels) {
    if (!client) return;

    // 1. Optimistic UI update: Set the sliders instantly
    // This makes the app feel fast.
    setLevels(presetLevels);

    // 2. Send the commands to the ESP32
    // The ESP32 will send back `led/state` messages,
    // which will just confirm the state we've already set.
    presetLevels.forEach((level, index) => {
      publishSet(index, level);
    });
  }
  // --- END ADDED ---

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
              // Only update if the state is actually different
              // This prevents sliders from jumping if you're dragging one
              // while another is being updated by a preset.
              if (prev[led] === level) return prev;

              const copy = [...prev];
              copy[led] = level;
              return copy;
            });
          }
        } else if (topic === topicPir) {
          setPir(String(msg.pir));
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

        {/* lime accent divider */}
        <div
          class="w-12 h-1 mb-6 bg-lime-500 rounded-full"
          aria-label="accent divider"
        />

        {/* --- ADDED: PRESET BUTTONS --- */}
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
        {/* --- END ADDED --- */}

        {/* --- ADDED: Title for manual controls --- */}
        <h4 class="text-lg font-semibold mb-3 text-gray-800">Manual Control</h4>
        {/* --- END ADDED --- */}

        <For each={[0, 1, 2]}>
          {(i) => {
            const idx = i;
            return (
              <div class="flex items-center gap-4 bg-white border rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-shadow duration-150 border-lime-200">
                <div class="flex-1">
                  <label class="text-sm font-medium mb-1 text-gray-700 flex items-center gap-2">
                    {/* You could make this dynamic, e.g., ["Red", "Green", "Blue"][idx] */}
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

        <div class="flex items-center gap-2 pt-2 text-gray-700">
          <span class="font-semibold">PIR:</span>
          <span class="opacity-90">{pir()}</span>
        </div>
      </div>
    </div>
  );
}
