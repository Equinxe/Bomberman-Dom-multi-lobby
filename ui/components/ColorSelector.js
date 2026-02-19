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
      const isTaken = takenColors.includes(idx) && idx !== selected; // allow if it's your own selected color
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
                width:28px;height:28px;border-radius:50%;
                border: ${
                  selected === idx
                    ? "3px solid rgba(50,255,200,0.95)"
                    : "2px solid rgba(255,255,255,0.08)"
                };
                background:${c.hex};
                cursor:${isTaken ? "not-allowed" : "pointer"};
                box-shadow: ${
                  isTaken
                    ? "inset 0 0 0 2px rgba(0,0,0,0.25)"
                    : "0 6px 18px rgba(0,0,0,0.08)"
                };
                opacity:${isTaken ? "0.35" : "1"};
                outline:none;
                padding: 0;
              `,
            },
          },
          ...(showLabels
            ? [
                {
                  tag: "span",
                  attrs: {
                    style: "font-size:11px;color:#bfffe6;margin-top:6px;",
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
