import { PLAYER_COLORS } from "./constants.js";

// Event delegation, pas de callback direct !
export function ColorSelector({ selected, lockedColors }) {
  return {
    tag: "div",
    attrs: {
      id: "color-selector",
      style: `
        display: flex;
        gap: 18px;
        justify-content: center;
        align-items: center;
        margin: 18px 0 32px 0;
      `,
    },
    children: PLAYER_COLORS.map((color, idx) => ({
      tag: "button",
      attrs: {
        type: "button",
        "data-idx": idx,
        disabled: lockedColors.includes(idx),
        style: `
          width: 32px;
          height: 32px;
          border-radius: 7px;
          border: 3px solid ${
            selected === idx
              ? "#45ffc0"
              : lockedColors.includes(idx)
              ? "#444"
              : "#222"
          };
          background: ${color.code};
          cursor: ${lockedColors.includes(idx) ? "not-allowed" : "pointer"};
          opacity: ${lockedColors.includes(idx) ? 0.4 : 1};
          transition: border .15s;
          ${selected === idx ? "box-shadow:0 0 8px #45ffc0;" : ""}
        `,
        title: color.name,
      },
      children: [],
    })).filter(Boolean),
  };
}
