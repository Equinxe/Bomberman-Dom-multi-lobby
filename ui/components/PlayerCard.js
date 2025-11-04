export * from "../PlayerCard.js";

// ui/PlayerCard.js
import { PlayerPreview } from "./PlayerPreview.js";
import { ColorSelector } from "./ColorSelector.js";
import { PLAYER_COLORS, SPRITE_SIZE, SPRITE_ZOOM } from "./constants.js";

// Render a single player card (empty state OR filled). Uses event names expected
// by main.js (e.g. "handleReady"). Keep presentation only — behavior wired by events map.
export function PlayerCard({
  player,
  index,
  isMe,
  myIndex,
  takenColors,
  nickname,
}) {
  const colorToUse = player.color;
  const uniquePreviewId = `${index}_${colorToUse}_${player.id || ""}`;

  return {
    tag: "div",
    attrs: {
      style: `
        background: rgba(48,255,180,0.11);
        border-radius: 22px;
        padding: 24px 18px 18px 18px;
        min-width: 240px;
        max-width: 320px;
        min-height: 180px;
        max-height: 240px;
        box-shadow: 0 0 14px #45ffc033 inset;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        border: ${player.empty ? "2px dashed #3be6aa66" : "2px solid #45ffc0"};
        position: relative;
        transition: box-shadow .2s, background .2s;
      `,
      class: "lobby-player-block player-card",
    },
    children: [
      {
        tag: "div",
        attrs: { style: "font-size:22px;color:#45ffc0;margin-bottom:8px;" },
        children: [`J${index + 1}`],
      },
      {
        tag: "span",
        attrs: {
          style: `
            font-size:25px;
            color:${player.ready ? "#45ffc0" : "#afffd9"};
            font-weight:bold;
            letter-spacing:1px;
            margin-bottom:10px;
          `,
        },
        children: [player.pseudo || "En attente..."],
      },
      !player.empty
        ? {
            tag: "div",
            attrs: {
              style:
                "display:flex;flex-direction:column;align-items:center;justify-content:center;",
            },
            children: [
              {
                tag: "div",
                attrs: {
                  style: `width:${(SPRITE_SIZE - 1) * SPRITE_ZOOM}px;height:${
                    (SPRITE_SIZE - 1) * SPRITE_ZOOM
                  }px;padding:0;box-sizing:border-box;background:transparent;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:6px;overflow:hidden;`,
                },
                children: [
                  PlayerPreview({
                    colorIdx: colorToUse,
                    uniqueId: uniquePreviewId,
                  }),
                ],
              },
              ...(isMe
                ? [
                    {
                      tag: "div",
                      attrs: {
                        class: "player-color-pills",
                        style:
                          "display:flex;justify-content:center;align-items:center;",
                      },
                      children: [
                        ColorSelector({
                          selected: player.color,
                          takenColors,
                          showLabels: false,
                        }),
                      ],
                    },
                  ]
                : [
                    {
                      tag: "div",
                      attrs: {
                        style:
                          "width:12px;height:12px;border-radius:50%;background:" +
                          (PLAYER_COLORS[colorToUse] &&
                          PLAYER_COLORS[colorToUse].hex
                            ? PLAYER_COLORS[colorToUse].hex
                            : "#ff69b4") +
                          ";box-shadow:0 0 6px rgba(0,0,0,0.25);margin-top:6px;",
                      },
                    },
                  ]),
            ],
          }
        : null,
      isMe
        ? {
            tag: "div",
            attrs: { class: "player-ready-wrap", style: "margin-top:8px;" },
            children: [
              {
                tag: "button",
                attrs: {
                  style: `
                    padding:14px 40px;
                    font-size:18px;
                    border-radius:12px;
                    background:linear-gradient(90deg,#45ffc0 0%,#267c5c 100%);
                    color:#1d2820;
                    border:none;
                    cursor:pointer;
                    font-family:'Press Start 2P',monospace;
                  `,
                  class:
                    "lobby-ready-btn" + (player && player.ready ? " anim" : ""),
                },
                events: { click: "handleReady" },
                children: [player && player.ready ? "Annuler prêt" : "Prêt"],
              },
            ],
          }
        : null,
    ].filter(Boolean),
  };
}
