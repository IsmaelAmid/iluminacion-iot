import { createSignal, onMount, onCleanup, For, createEffect } from "solid-js";
import mqtt from "mqtt";

const DEVICE_ID = "esp32-01";
const BROKER_URL = import.meta.env.VITE_BROKER_URL;
const API_URL = import.meta.env.VITE_API_URL;

const pirOnPreset = [200, 200, 100];
const pirOffPreset = [0, 0, 0];

export default function App() {
  const [levels, setLevels] = createSignal([0, 0, 0]);
  const [pir, setPir] = createSignal("unknown");
  const [isPirAutomationOn, setIsPirAutomationOn] = createSignal(false);

  const [presets, setPresets] = createSignal([]);
  const [newPresetName, setNewPresetName] = createSignal("");

  let client = null;

  const topicCmd = `home/esp32/${DEVICE_ID}/led/set`;
  const topicState = `home/esp32/${DEVICE_ID}/led/state`;
  const topicPir = `home/esp32/${DEVICE_ID}/sensor/pir`;

  async function logPirEvent(event, details) {
    if (!isPirAutomationOn()) return;

    try {
      await fetch(`${API_URL}/logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ event, details }),
      });
      console.log("Logged PIR event:", event);
    } catch (err) {
      console.error("Error logging PIR event:", err);
    }
  }

  async function fetchPresets() {
    try {
      const response = await fetch(`${API_URL}/presets`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const dbPresets = await response.json();
      setPresets(dbPresets); // Set the presets from the database
      console.log("Successfully fetched presets:", dbPresets);
    } catch (err) {
      console.error("Error fetching presets:", err);
      setPresets([{ name: "API Failed", levels: [255, 0, 0] }]);
    }
  }

  async function handleSavePreset() {
    const name = newPresetName();
    const currentLevels = levels();
    if (!name.trim()) {
      alert("Ingrese un nombre para el preset.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/presets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: name, levels: currentLevels }),
      });

      if (!response.ok) {
        throw new Error("Failed to save preset");
      }

      const savedData = await response.json();
      const newItem = savedData.newItem;

      setPresets((prev) => [
        ...prev,
        { id: newItem.SK, name: newItem.name, levels: newItem.levels },
      ]);

      setNewPresetName(""); // Clear the input field
      console.log("Saved preset:", newItem);
    } catch (err) {
      console.error("Error saving preset:", err);
      alert("Error saving preset: " + err.message);
    }
  }

  async function handleDeletePreset(presetId, e) {
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this preset?")) {
      return;
    }

    const originalPresets = presets();
    setPresets((prev) => prev.filter((p) => p.id !== presetId));

    console.log(presetId);
    try {
      const encodedId = encodeURIComponent(presetId);
      const response = await fetch(`${API_URL}/presets?id=${encodedId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setPresets(originalPresets);
        throw new Error(`Failed to delete preset (status: ${response.status})`);
      }

      console.log("Deleted preset:", presetId);
    } catch (err) {
      setPresets(originalPresets);
      console.error("Error deleting preset:", err);
      alert("Error deleting preset: " + err.message);
    }
  }

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
      return;
    }
    if (currentPirState === "detected") {
      const details = `Motion detected, set to [${pirOnPreset.join(", ")}]`;
      console.log("PIR Automation: Motion DETECTED! Sending 'On' preset.");
      applyPreset(pirOnPreset);
      logPirEvent("PIR_ON", details);
    } else if (currentPirState === "clear") {
      const details = `Motion clear, set to [${pirOffPreset.join(", ")}]`;
      console.log("PIR Automation: Motion CLEAR. Sending 'Off' preset.");
      applyPreset(pirOffPreset);
      logPirEvent("PIR_OFF", details);
    }
  });

  onMount(async () => {
    await fetchPresets();
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
    <div class="min-h-screen bg-stone-100 text-stone-800 font-sans p-6">
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
              {isPirAutomationOn() ? "Encendido" : "Apagado"}
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
          <div class="mb-4">
            <h4 class="text-lg font-semibold mb-3 text-gray-800">Presets</h4>
            <div class="flex flex-wrap gap-2">
              <For each={presets()}>
                {(preset) => (
                  <div class="relative flex shadow-sm rounded-lg">
                    <button
                      onClick={() => applyPreset(preset.levels)}
                      class="px-4 py-2 bg-lime-300 text-stone-800 font-medium rounded-l-lg hover:bg-lime-400/70 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-opacity-75"
                    >
                      {preset.name}
                    </button>
                    <button
                      onClick={(e) => handleDeletePreset(preset.id, e)}
                      class="px-2 py-2 bg-lime-500/70 text-stone-50 font-bold rounded-r-lg hover:bg-red-600/70 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-400"
                      aria-label={`Borrar preset ${preset.name}`}
                    >
                      &times;
                    </button>
                  </div>
                )}
              </For>
            </div>
          </div>
          <div class="flex gap-2  mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <input
              type="text"
              value={newPresetName()}
              onInput={(e) => setNewPresetName(e.currentTarget.value)}
              placeholder="Nombre del nuevo preset"
              class="flex-grow px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
            <button
              onClick={handleSavePreset}
              class="px-4 py-2 bg-lime-300 text-stone-800 font-medium rounded-lg shadow-sm hover:bg-lime-400/70 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-lime-400"
            >
              Guardar Preset
            </button>
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
