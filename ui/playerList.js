import { PLAYER_COLORS } from "./constants.js";
// import Sprite - adjust path depending on where your sprite.js is located.
// If sprite.js is in project root, use "../sprite.js", if in Core use "../Core/sprite.js"
import { Sprite } from "../sprite.js";
import { ColorSelector } from "./colorselector.js";
import { getState } from "../Core/state.js";

// Player card layout: avatar (24x24) with padding 5px top/left, color pills under avatar (for local player), then bouton Prêt
export function PlayerList({ players = [], onColorChange = null }) {
  const me = getState().nickname;
  const takenColors = players
    .map((p) => (typeof p.color === "number" ? p.color : -1))
    .filter((c) => c >= 0);

  return {
    tag: "div",
    attrs: {
      class: "lobby-player-list",
      style:
        "padding:5px 0 0 5px; display:flex; gap:18px; align-items:flex-start; flex-wrap:wrap;",
    },
    children: players.slice(0, 4).map((player, idx) => {
      const isMe = player.pseudo === me;
      const colorIdx = typeof player.color === "number" ? player.color : 0;
      const colorObj = PLAYER_COLORS[colorIdx] || {};
      const bg = colorObj.hex || colorObj.bg || colorObj.color || "#ff69b4";

      return {
        tag: "div",
        attrs: {
          class: "player-card",
          style:
            "display:flex;flex-direction:column;align-items:center;justify-content:flex-start;min-width:120px;gap:8px;padding:14px;border-radius:10px;background:rgba(0,0,0,0.12);",
        },
        children: [
          {
            tag: "div",
            attrs: {
              style:
                "font-size:12px;color:#7fffd3;font-family:'Press Start 2P',monospace;",
            },
            children: [player.pseudo || `J${idx + 1}`],
          },

          // preview container 24x24 + padding 5px
          {
            tag: "div",
            attrs: {
              style: `width:34px;height:34px;padding:5px;box-sizing:border-box;background:${bg};border-radius:8px;display:flex;align-items:center;justify-content:center;`,
            },
            children: [
              // Sprite with 3 frames (0,1,2), size=24, framesCount=3
              Sprite({
                frame: 0,
                row: 0,
                size: 24,
                zoom: 3,
                id: `preview_${player.id || idx}`,
                framesCount: 3,
                duration: 0.6,
              }),
            ],
          },

          // Color selector shown only for the local player under the avatar
          ...(isMe
            ? [
                {
                  tag: "div",
                  attrs: { style: "margin-top:4px;" },
                  children: [
                    ColorSelector({
                      selected: colorIdx,
                      takenColors,
                      showLabels: false,
                    }),
                  ],
                },
              ]
            : [
                // for remote players show a small color pill under preview
                {
                  tag: "div",
                  attrs: {
                    style:
                      "width:12px;height:12px;border-radius:50%;background:" +
                      bg +
                      ";box-shadow:0 0 6px rgba(0,0,0,0.25);",
                  },
                },
              ]),

          // Ready button (per-card; if you use a global ready button, remove this block)
          {
            tag: "div",
            attrs: { style: "margin-top:6px; z-index:2;" },
            children: [
              {
                tag: "button",
                attrs: {
                  style:
                    "padding:10px 18px;border-radius:8px;border:none;background:linear-gradient(90deg,#2fe9bf,#0fb28f);color:#003;cursor:pointer;font-weight:700;",
                },
                children: [player.ready ? "Annuler prêt" : "Prêt"],
              },
            ],
          },
        ],
      };
    }),
  };
}
