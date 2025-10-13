import { PLAYER_COLORS } from "./colorselector.js";
const GO_X = 0,
  GO_Y = 120; // À ajuster selon ton asset

function playerAvatar(colorIdx, isReady) {
  if (isReady) {
    return {
      tag: "div",
      attrs: {
        style: `
          width:32px;height:32px;
          background:url('./assets/images/player_sprite.png') -${GO_X}px -${GO_Y}px;
          background-size:480px auto;
          margin-bottom:6px;
        `,
      },
    };
  }
  const color = PLAYER_COLORS[colorIdx];
  return {
    tag: "div",
    attrs: {
      style: `
        width:24px;height:24px;
        background:url('./assets/images/player_sprite.png') -${color.frames[0]}px -${color.y}px;
        background-size:480px auto;
        animation:playerSelectAnim 0.35s steps(3) infinite;
        margin-bottom:6px;
      `,
    },
  };
}

export function PlayerList({ players }) {
  return {
    tag: "div",
    attrs: { class: "lobby-player-list" },
    children: players.slice(0, 4).map((player, idx) => ({
      tag: "div",
      attrs: {
        style:
          "display:flex;flex-direction:column;align-items:center;justify-content:center;",
      },
      children: [
        playerAvatar(player.color, player.ready),
        {
          tag: "span",
          attrs: {
            style:
              "font-size:18px;color:#afffd9;font-family:'Inter',Arial,sans-serif;margin-top:6px;text-shadow:0 1px 0 #222;",
          },
          children: [player.pseudo || `J${idx + 1}`],
        },
      ],
    })),
  };
}
// Note: le code de l'animation "playerSelectAnim" est dans styles.css
