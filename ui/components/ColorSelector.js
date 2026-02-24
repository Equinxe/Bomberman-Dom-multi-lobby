import { PLAYER_COLORS } from "../../shared/constants.js";

export function ColorSelector({
  selected = 0,
  takenColors = [],
  showLabels = false,
}) {
  return {
    tag: "div",
    attrs: {
      class: "color-selector",
      style:
        "display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;pointer-events:auto;",
    },
    children: PLAYER_COLORS.map((c, idx) => {
      const isTaken = takenColors.includes(idx) && idx !== selected;
      const isSelected = selected === idx;
      return {
        tag: "div",
        attrs: {
          style: `display:flex;flex-direction:column;align-items:center;justify-content:center;`,
        },
        children: [
          {
            tag: "button",
            attrs: {
              "data-idx": String(idx),
              title: c.name,
              style: `
                width:26px;height:26px;border-radius:50%;
                border: ${
                  isSelected
                    ? "3px solid rgba(69,255,192,0.95)"
                    : "2px solid rgba(255,255,255,0.12)"
                };
                background: radial-gradient(circle at 35% 35%, ${lighten(c.hex, 30)}, ${c.hex});
                cursor:${isTaken ? "not-allowed" : "pointer"};
                box-shadow: ${
                  isTaken
                    ? "inset 0 0 0 3px rgba(0,0,0,0.4)"
                    : isSelected
                      ? `0 0 12px ${c.hex}88, 0 0 4px ${c.hex}44`
                      : "0 2px 6px rgba(0,0,0,0.2)"
                };
                opacity:${isTaken ? "0.25" : "1"};
                outline:none;
                padding: 0;
                transition: transform 0.15s ease, box-shadow 0.2s ease, border 0.2s ease;
                ${isSelected ? "transform: scale(1.15);" : ""}
              `,
            },
          },
          ...(showLabels
            ? [
                {
                  tag: "span",
                  attrs: {
                    style: "font-size:10px;color:#bfffe6;margin-top:5px;",
                  },
                  children: [c.name],
                },
              ]
            : []),
        ],
      };
    }),
  };
}

// Simple color lightening helper for radial gradient highlight
function lighten(hex, amount) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
