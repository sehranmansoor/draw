export type RGB = [number, number, number]; // [r, g, b] each 0-255

export const createColorPicker = (options: {
  initialColor?: RGB;
  position?: { x: number; y: number };
  onColorChange?: (color: RGB) => void;
  onClose?: () => void;
}) => {
  // Create container
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.background = "#2d2d2d";
  container.style.borderRadius = "8px";
  container.style.padding = "15px";
  container.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
  container.style.zIndex = "10000";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "10px";

  // Position the picker
  if (options.position) {
    container.style.left = `${options.position.x}px`;
    container.style.top = `${options.position.y}px`;
  }

  // Create color preview
  const preview = document.createElement("div");
  preview.style.width = "100%";
  preview.style.height = "60px";
  preview.style.borderRadius = "4px";
  preview.style.border = "1px solid #555";

  // Create RGB sliders
  const sliders = {
    r: createSlider("R", 0, 255),
    g: createSlider("G", 0, 255),
    b: createSlider("B", 0, 255),
  };

  // Set initial values
  const currentColor: RGB = options.initialColor || [255, 255, 255];
  sliders.r.slider.value = currentColor[0].toString();
  sliders.r.number.value = currentColor[0].toString();
  sliders.g.slider.value = currentColor[1].toString();
  sliders.g.number.value = currentColor[1].toString();
  sliders.b.slider.value = currentColor[2].toString();
  sliders.b.number.value = currentColor[2].toString();
  updatePreview(currentColor);

  // Append elements
  container.appendChild(preview);
  container.appendChild(sliders.r.container);
  container.appendChild(sliders.g.container);
  container.appendChild(sliders.b.container);
  document.body.appendChild(container);

  // Update functions
  function updateColor() {
    currentColor[0] = parseInt(sliders.r.slider.value);
    currentColor[1] = parseInt(sliders.g.slider.value);
    currentColor[2] = parseInt(sliders.b.slider.value);

    updatePreview(currentColor);
    if (options.onColorChange) options.onColorChange([...currentColor]);
  }

  function updatePreview(color: RGB) {
    preview.style.backgroundColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  }

  function close() {
    document.body.removeChild(container);
    document.removeEventListener("click", outsideClickHandler);
    if (options.onClose) options.onClose();
  }

  // Event handlers
  const handleInput = (channel: keyof typeof sliders) => {
    sliders[channel].number.value = sliders[channel].slider.value;
    updateColor();
  };

  const handleNumberChange = (channel: keyof typeof sliders) => {
    let value = parseInt(sliders[channel].number.value);
    if (isNaN(value)) value = 0;
    value = Math.max(0, Math.min(255, value));

    sliders[channel].slider.value = value.toString();
    sliders[channel].number.value = value.toString();
    updateColor();
  };

  const outsideClickHandler = (e: MouseEvent) => {
    if (!container.contains(e.target as Node)) {
      close();
    }
  };

  // Setup event listeners
  sliders.r.slider.addEventListener("input", () => handleInput("r"));
  sliders.g.slider.addEventListener("input", () => handleInput("g"));
  sliders.b.slider.addEventListener("input", () => handleInput("b"));

  sliders.r.number.addEventListener("change", () => handleNumberChange("r"));
  sliders.g.number.addEventListener("change", () => handleNumberChange("g"));
  sliders.b.number.addEventListener("change", () => handleNumberChange("b"));

  // Close on outside click
  setTimeout(() => {
    document.addEventListener("click", outsideClickHandler);
  }, 0);

  return { close };
};

// Helper function to create slider with number input
function createSlider(label: string, min: number, max: number) {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.gap = "10px";

  const labelEl = document.createElement("span");
  labelEl.textContent = label;
  labelEl.style.color = "#eee";
  labelEl.style.width = "20px";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = min.toString();
  slider.max = max.toString();
  slider.style.flex = "1";

  const number = document.createElement("input");
  number.type = "number";
  number.min = min.toString();
  number.max = max.toString();
  number.style.width = "60px";
  number.style.padding = "5px";
  number.style.borderRadius = "4px";
  number.style.border = "1px solid #555";
  number.style.background = "#1e1e1e";
  number.style.color = "#fff";

  container.appendChild(labelEl);
  container.appendChild(slider);
  container.appendChild(number);

  return { container, slider, number };
}
