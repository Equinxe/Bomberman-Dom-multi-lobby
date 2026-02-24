import { PlayerPreview } from "./PlayerPreview.js";
import { ColorSelector } from "./ColorSelector.js";
import { TeamSelector } from "./TeamSelector.js";
import {
  PLAYER_COLORS,
  TEAM_INFO,
  GAME_MODES,
} from "./../helpers/constants.js";

// Preview zoom used in both PlayerPreview and this card's container
const PREVIEW_ZOOM = 4;

// Art dimensions within each sprite cell (cropped from 24x32 cell)
const ART_WIDTH = 20;
const ART_HEIGHT = 19;

// Render a single player card (empty state OR filled). Uses event names expected
// by main.js (e.g. "handleReady"). Keep presentation only — behavior wired by events map.
export function PlayerCard({
  player,
  index,
  isMe,
  myIndex,
  takenColors,
  nickname,
  gameMode,
  teamCounts,
}) {
  const colorToUse = player.color;
  const uniquePreviewId = `${index}_${colorToUse}_${player.id || ""}`;

  // Preview display dimensions at lobby zoom (cropped to art region)
  const previewW = ART_WIDTH * PREVIEW_ZOOM; // 100px
  const previewH = ART_HEIGHT * PREVIEW_ZOOM; // 95px

  // Player color for accent
  const playerColor = PLAYER_COLORS[colorToUse]
    ? PLAYER_COLORS[colorToUse].hex
    : "#45ffc0";

  const borderColor = player.empty
    ? "rgba(59,230,170,0.18)"
    : player.ready
      ? "rgba(59,230,170,0.85)"
      : "rgba(59,230,170,0.4)";

  const cardGlow = player.ready
    ? "0 0 24px rgba(69,255,192,0.18), 0 0 0 1px rgba(69,255,192,0.3) inset"
    : "0 2px 16px rgba(0,0,0,0.25), 0 0 0 1px rgba(69,255,192,0.08) inset";

  return {
    tag: "div",
    attrs: {
      style: `
        background: linear-gradient(170deg, rgba(18,36,26,0.92) 0%, rgba(24,44,32,0.88) 100%);
        border-radius: 18px;
        padding: 14px 14px 12px 14px;
        width: 250px;
        min-height: 0;
        box-shadow: ${cardGlow};
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        gap: 4px;
        border: 2px solid ${borderColor};
        position: relative;
        overflow: hidden;
        transition: box-shadow 0.35s ease, border-color 0.35s ease;
      `,
      class: "lobby-player-block player-card",
    },
    children: [
      // Player slot label
      {
        tag: "div",
        attrs: {
          style: `
            font-size: 11px;
            color: rgba(69,255,192,0.6);
            letter-spacing: 3px;
            text-transform: uppercase;
          `,
        },
        children: [`J${index + 1}`],
      },
      // Player name
      {
        tag: "div",
        attrs: {
          style: `
            font-size: 13px;
            color: ${player.ready ? "#45ffc0" : "#ddfff0"};
            font-weight: bold;
            letter-spacing: 1.5px;
            margin-bottom: 1px;
            text-align: center;
            max-width: 220px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            transition: color 0.3s;
            ${player.ready ? "text-shadow: 0 0 14px rgba(69,255,192,0.55);" : ""}
          `,
        },
        children: [player.pseudo || "En attente..."],
      },
      // ✅ Team badge (shows team assignment for all non-empty players)
      !player.empty && (player.team || 0) !== 0
        ? {
            tag: "div",
            attrs: {
              style: `
                font-size: 8px;
                padding: 2px 10px;
                border-radius: 6px;
                background: ${(TEAM_INFO[player.team] || TEAM_INFO[0]).color}22;
                border: 1px solid ${(TEAM_INFO[player.team] || TEAM_INFO[0]).color}88;
                color: ${(TEAM_INFO[player.team] || TEAM_INFO[0]).color};
                letter-spacing: 1px;
                text-transform: uppercase;
                margin-bottom: 2px;
              `,
            },
            children: [
              `${(TEAM_INFO[player.team] || TEAM_INFO[0]).label} ${(TEAM_INFO[player.team] || TEAM_INFO[0]).name}`,
            ],
          }
        : null,
      // Player content: sprite + color selector
      !player.empty
        ? {
            tag: "div",
            attrs: {
              style: `
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                flex: 1;
                width: 100%;
                gap: 6px;
              `,
            },
            children: [
              // Sprite preview container — centered with subtle glow
              {
                tag: "div",
                attrs: {
                  style: `
                    width: ${previewW + 8}px;
                    height: ${previewH + 8}px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 2px auto;
                    background: radial-gradient(ellipse at center, rgba(69,255,192,0.06) 0%, transparent 70%);
                    border-radius: 12px;
                    overflow: hidden;
                  `,
                },
                children: [
                  PlayerPreview({
                    colorIdx: colorToUse,
                    uniqueId: uniquePreviewId,
                    zoom: PREVIEW_ZOOM,
                  }),
                ],
              },
              // Color selector or color dot
              ...(isMe
                ? [
                    {
                      tag: "div",
                      attrs: {
                        class: "player-color-pills",
                        style: `
                          display: flex;
                          justify-content: center;
                          align-items: center;
                          padding: 4px 0;
                        `,
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
                        style: `
                          width: 16px;
                          height: 16px;
                          border-radius: 50%;
                          background: ${playerColor};
                          box-shadow: 0 0 10px ${playerColor}55;
                          margin: 4px auto;
                          border: 2px solid rgba(255,255,255,0.15);
                        `,
                      },
                    },
                  ]),
              // ✅ Team selector (only for local player, only in team mode)
              ...(isMe && gameMode === GAME_MODES.TEAM
                ? [
                    TeamSelector({
                      selectedTeam: player.team || 0,
                      teamCounts: teamCounts || {},
                      disabled: false,
                    }),
                  ]
                : []),
            ],
          }
        : // Empty slot placeholder
          {
            tag: "div",
            attrs: {
              style: `
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0.2;
                font-size: 36px;
              `,
            },
            children: ["👤"],
          },
      // Ready button (only for local player)
      isMe
        ? {
            tag: "div",
            attrs: {
              class: "player-ready-wrap",
              style: "margin-top: 4px;",
            },
            children: [
              {
                tag: "button",
                attrs: {
                  style: `
                    padding: 8px 28px;
                    font-size: 12px;
                    border-radius: 10px;
                    background: ${
                      player.ready
                        ? "linear-gradient(135deg, #ff6b6b 0%, #c0392b 100%)"
                        : "linear-gradient(135deg, #45ffc0 0%, #2a9d6e 100%)"
                    };
                    color: ${player.ready ? "#fff" : "#1a2e22"};
                    border: none;
                    cursor: pointer;
                    font-family: 'Press Start 2P', monospace;
                    transition: transform 0.15s ease, box-shadow 0.25s ease;
                    box-shadow: 0 3px 14px ${
                      player.ready
                        ? "rgba(255,107,107,0.35)"
                        : "rgba(69,255,192,0.35)"
                    };
                    letter-spacing: 1px;
                  `,
                  class:
                    "lobby-ready-btn" + (player && player.ready ? " anim" : ""),
                },
                events: { click: "handleReady" },
                children: [player && player.ready ? "Annuler" : "Prêt"],
              },
            ],
          }
        : null,
    ].filter(Boolean),
  };
}
