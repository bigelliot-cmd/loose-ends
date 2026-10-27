// Loose Ends · Web animations — the colours. Every colour picker offers
// only these: the Loose Ends tokens (/assets/tokens.css), by name.
export const PALETTE = {
  "Loose Ends": [
    ["#f86916", "Orange"],
    ["#df5607", "Orange, hover"],
    ["#3fbdac", "Teal"],
    ["#cfe5e6", "Mist"],
    ["#12263f", "Navy"],
    ["#111111", "Ink"],
    ["#525252", "Text grey"],
    ["#999999", "Soft grey"],
    ["#e6e6e6", "Line grey"],
    ["#ffffff", "White"],
  ],
};

/** Multi-ring gradients: an even blend between two tokens (no new swatches, just the steps between). */
export const RAMPS = {
  "Teal to navy": ["#3fbdac", "#12263f"],
  "Orange to navy": ["#f86916", "#12263f"],
  "Mist to navy": ["#cfe5e6", "#12263f"],
  "Orange to teal": ["#f86916", "#3fbdac"],
  "Ink to line grey": ["#111111", "#e6e6e6"],
};

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (rgb) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

/** `count` colours from the first token to the second. */
export function ramp(name, count) {
  const [a, b] = (RAMPS[name] ?? Object.values(RAMPS)[0]).map(hex);
  return Array.from({ length: count }, (_, i) => {
    const t = count > 1 ? i / (count - 1) : 0;
    return toHex(a.map((v, k) => v + (b[k] - v) * t));
  });
}
