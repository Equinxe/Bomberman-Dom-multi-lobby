import {
  SPRITE_ROWS,
  SPRITE_SIZE,
  SPRITE_ZOOM,
  SHEET_WIDTH,
  SHEET_HEIGHT,
  PLAYER_COLORS,
} from "./constants.js";
import { registerEvent } from "../Core/events.js";
import { ColorSelector } from "./colorselector.js";

export function Lobby({
  code,
  nickname,
  players,
  chat,
  localColor,
  queue,
  waiting,
  queuePosition,
  onReady,
  onSendMessage,
}) {
  const defaultColors = [0, 1, 2, 3, 4, 5];
  const fullPlayers = [...players];
  while (fullPlayers.length < 4)
    fullPlayers.push({
      pseudo: "",
      color: defaultColors[fullPlayers.length],
      ready: false,
      empty: true,
    });
  const myIndex = players.findIndex((p) => p.pseudo === nickname);

  // Barre de progression (waiting)
  function ProgressBar({ percent }) {
    return {
      tag: "div",
      attrs: {
        style: `
          width: 100%;
          height: 11px;
          border-radius: 6px;
          background: #143a2c;
          box-shadow: 0 0 0 1px #45ffc044 inset;
          margin-top: 10px;
          margin-bottom: 4px;
          overflow: hidden;
        `,
      },
      children: [
        {
          tag: "div",
          attrs: {
            style: `
              width: ${percent}%;
              height: 100%;
              border-radius: 6px;
              background: linear-gradient(90deg,#ffe854 0%,#45ffc0 100%);
              transition: width 0.5s cubic-bezier(.68,-0.55,.27,1.55);
            `,
          },
        },
      ],
    };
  }

  // Animation CSS (inject once)
  if (
    typeof document !== "undefined" &&
    !document.getElementById("lobby-anim-style")
  ) {
    const style = document.createElement("style");
    style.id = "lobby-anim-style";
    style.textContent = `
      .lobby-copy-btn:hover { background: #80ffd9; cursor: pointer; }
      .lobby-player-block:hover { box-shadow: 0 0 18px #45ffc099, 0 0 0 4px #45ffc044 inset; background: rgba(48,255,180,0.18); transition: box-shadow .2s, background .2s;}
      .lobby-ready-btn { transition: filter .17s, background .17s, color .18s, transform .18s; }
      .lobby-ready-btn:hover { filter: drop-shadow(0 0 8px #45ffc099) brightness(1.1); transform: scale(1.045); }
      .lobby-ready-btn.anim { animation: readyPulse .5s; }
      @keyframes readyPulse {
        0% { filter: brightness(1.6); }
        80% { filter: brightness(1.3); }
        100% { filter: brightness(1.0); }
      }
      .copied { filter: drop-shadow(0 0 12px #5cff6c); background: #5cff6c !important; color: #222 !important; }

      /* Small helpers to ensure preview area and ready button spacing */
      .player-card { position: relative; z-index: 1; }
      .player-preview-wrap { z-index: 2; }
      .player-color-pills { margin-top: 6px; z-index: 3; }
      .player-ready-wrap { margin-top: 8px; z-index: 2; }
    `;
    document.head.appendChild(style);
  }

  // Barre de progression en attente
  let progressPercent = waiting
    ? Math.min(100, Math.round(Math.random() * 70 + 30))
    : 0;

  // Handle copy code (only on the code span, not the whole line)
  function handleCopyLobbyCode() {
    const codeElem = document.getElementById("lobby-code-value");
    const btn = document.getElementById("copy-lobby-btn");
    if (!codeElem || !btn) return;
    const codeText = codeElem.textContent.trim();
    navigator.clipboard.writeText(codeText);
    btn.classList.add("copied");
    btn.textContent = "Copié !";
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.textContent = "Copier";
    }, 1100);
  }
  registerEvent("handleCopyLobbyCode", handleCopyLobbyCode);

  // helper pour créer la preview animée (frames 0..2)
  // -> pixel-perfect cropping to hide 1px artifact; change adjustPx to -1/0/1 to tune
  function PlayerPreview({ colorIdx, uniqueId }) {
    const margin = 4; // offset initial for frame 0 (source pixels)
    const spacing = 1; // 1px gap between frames in sheet
    const framesCount = 3; // frames 0,1,2
    const frameSize = SPRITE_SIZE; // source frame size (e.g. 24)

    // Display size: crop to 23x23 (so we hide one source pixel border)
    const displayFrameSize = frameSize - 1; // 23
    const previewSize = displayFrameSize * SPRITE_ZOOM;

    // Per-frame tweak: if you still see the artifact, try -1 / 0 / +1
    // -1 shifts frames left on the source, +1 shifts right.
    let adjustPx = 0; // default 0 — change to 1 if you still see left artifact, -1 if right artifact
    // Example testing values: adjustPx = 0; // or 1; // or -1;

    // Speed of discrete frames (ms)
    const tickMs = 260;

    // get row and optional offsetY from SPRITE_ROWS
    const row = SPRITE_ROWS[colorIdx] ? SPRITE_ROWS[colorIdx].row : 0;
    const offsetY = SPRITE_ROWS[colorIdx]
      ? SPRITE_ROWS[colorIdx].offsetY || 0
      : 0;

    // Compute Y in source sheet
    const posY = margin + row * (frameSize + spacing) + offsetY;

    // Compute source X for each frame and apply optional adjustPx for n>0
    const frameXs = [];
    for (let n = 0; n < framesCount; n++) {
      const base = margin + n * (frameSize + spacing);
      // apply tweak only to n>0 frames (common case of 1px artifact between frames)
      const corrected = n > 0 ? base + adjustPx : base;
      frameXs.push(corrected);
    }

    // Now compute the source X cropping offset to avoid exposing neighbor pixels:
    // We want the cropped window to show displayFrameSize pixels from the left side of the frame.
    // So the visible left pixel in source = frameX (no extra centering) -> cropping will hide the rightmost source pixel.
    // If you'd rather crop a different side, modify cropShift (0 or 1).
    const cropShift = 0; // 0 keeps left part, hiding rightmost column; 1 keeps right part, hiding leftmost

    // source-left-to-display-left in source pixels:
    const displayOffsetPerFrame = frameXs.map((frameX) => frameX + cropShift);

    // Convert to CSS background-position negative px with zoom applied
    const posYpx = -posY * SPRITE_ZOOM;
    const framePositionsPx = displayOffsetPerFrame.map(
      (x) => `-${x * SPRITE_ZOOM}px ${posYpx}px`
    );

    // Secure id and bg size
    const safeId = `preview_${String(uniqueId).replace(
      /[^a-z0-9_-]/gi,
      ""
    )}_${Math.random().toString(36).slice(2, 6)}`;
    const bgSizeX = SHEET_WIDTH * SPRITE_ZOOM;
    const bgSizeY = SHEET_HEIGHT * SPRITE_ZOOM;

    // Inline script: discrete swap of background-position to show exact frames
    const scriptContent = `
(function(){
  const el = document.getElementById("${safeId}");
  if (!el) return;
  const frames = ${JSON.stringify(framePositionsPx)};
  let idx = 0;
  el.style.backgroundPosition = frames[0];
  const iv = setInterval(() => {
    idx = (idx + 1) % frames.length;
    el.style.backgroundPosition = frames[idx];
  }, ${tickMs});
  el.__previewInterval = iv;
  const ro = new MutationObserver(() => {
    if (!document.getElementById("${safeId}")) {
      clearInterval(iv);
      ro.disconnect();
    }
  });
  ro.observe(document.body, { childList: true, subtree: true });
})();
`.trim();

    return {
      tag: "div",
      attrs: {
        class: "player-preview-wrap",
        style: `
          width: ${previewSize}px;
          height: ${previewSize}px;
          overflow: hidden;
          display:flex;
          align-items:center;
          justify-content:center;
        `,
      },
      children: [
        {
          // inner window: visible cropped area (displayFrameSize * zoom)
          tag: "div",
          attrs: {
            id: safeId,
            style: `
              width: ${previewSize}px;
              height: ${previewSize}px;
              background-image: url('./assets/images/Players.png');
              background-position: ${framePositionsPx[0]};
              background-size: ${bgSizeX}px ${bgSizeY}px;
              background-repeat: no-repeat;
              image-rendering: pixelated;
              border-radius:6px;
            `,
          },
        },
        { tag: "script", children: [scriptContent] },
      ],
    };
  }

  // taken colors for disabling pastilles (exclude own color to allow re-select)
  const takenColors = players
    .map((p) => (typeof p.color === "number" ? p.color : -1))
    .filter((c) => c >= 0);

  return {
    tag: "div",
    attrs: {
      style: `
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        gap: 88px;
        width: 100vw;
        min-height: 100vh;
        font-family: 'Press Start 2P', monospace;
        box-sizing: border-box;
        position: relative;
      `,
    },
    children: [
      // PANEL LOBBY
      {
        tag: "div",
        attrs: {
          style: `
            background: linear-gradient(135deg,rgba(22,34,20,0.98) 80%,rgba(48,255,180,0.13) 100%);
            border-radius: 32px;
            box-shadow: 0 8px 32px 0 #34ffcc44, 0 0 0 8px #3be6aa55 inset;
            border: 5px solid #3be6aa;
            padding: 50px 48px 34px 48px;
            min-width: 760px;
            max-width: 820px;
            width: 820px;
            min-height: 780px;
            max-height: 800px;
            height: 800px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 32px;
            justify-content: center;
            position: relative;
          `,
        },
        children: [
          // NOMBRE DE JOUEURS
          {
            tag: "div",
            attrs: {
              style: `
                font-size:34px;
                color:#45ffc0;
                letter-spacing:2px;
                text-align:center;
                margin-bottom:10px;
              `,
            },
            children: [`Joueurs (${players.length}/4)`],
          },
          // CODE DU LOBBY COPIABLE
          {
            tag: "div",
            attrs: {
              style: `
                font-size:30px;
                color:#afffd9;
                text-align:center;
                margin-bottom:28px;
                display: flex;
                align-items: center;
                gap: 14px;
                justify-content:center;
              `,
            },
            children: [
              "Code du lobby : ",
              {
                tag: "span",
                attrs: {
                  id: "lobby-code-value",
                  style:
                    "font-weight:bold;color:#fff;font-size:32px;letter-spacing:4px;background:rgba(48,255,180,0.08);padding:2px 16px;border-radius:8px;",
                },
                children: [code],
              },
              {
                tag: "button",
                attrs: {
                  id: "copy-lobby-btn",
                  type: "button",
                  class: "lobby-copy-btn",
                  style: `          
                    margin-left:4px;
                    padding: 3px 12px;
                    font-size:17px;
                    border-radius: 7px;
                    background: #45ffc0;
                    color: #222;
                    border: none;
                    cursor: pointer;
                    font-family:'Press Start 2P', monospace;
                    transition: background 0.15s;
                    display:flex;
                    align-items:center;
                  `,
                },
                events: { click: "handleCopyLobbyCode" },
                children: ["Copier"],
              },
            ],
          },
          // BARRE DE PROGRESSION WAITING
          waiting ? ProgressBar({ percent: progressPercent }) : null,
          // GRID JOUEURS
          {
            tag: "div",
            attrs: {
              style: `
                display: grid;
                grid-template-columns: 1fr 1fr;
                grid-template-rows: 1fr 1fr;
                gap: 60px 80px;
                width: 100%;
                justify-items: center;
                align-items: center;
                min-height: 540px;
                max-height: 540px;
                margin-bottom: 10px;
              `,
            },
            children: [0, 1, 2, 3].map((i) => {
              const isMe = !fullPlayers[i].empty && i === myIndex;
              const colorToUse = fullPlayers[i].color;
              const uniquePreviewId = `${i}_${colorToUse}_${
                fullPlayers[i].id || ""
              }`;

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
                    border: ${
                      fullPlayers[i].empty
                        ? "2px dashed #3be6aa66"
                        : "2px solid #45ffc0"
                    };
                    position: relative;
                    transition: box-shadow .2s, background .2s;
                  `,
                  class: "lobby-player-block player-card",
                },
                children: [
                  {
                    tag: "div",
                    attrs: {
                      style: "font-size:22px;color:#45ffc0;margin-bottom:8px;",
                    },
                    children: [`J${i + 1}`],
                  },
                  {
                    tag: "span",
                    attrs: {
                      style: `
                        font-size:25px;
                        color:${fullPlayers[i].ready ? "#45ffc0" : "#afffd9"};
                        font-weight:bold;
                        letter-spacing:1px;
                        margin-bottom:10px;
                      `,
                    },
                    children: [fullPlayers[i].pseudo || "En attente..."],
                  },

                  // preview + color selector (if player exists)
                  !fullPlayers[i].empty
                    ? {
                        tag: "div",
                        attrs: {
                          style:
                            "display:flex;flex-direction:column;align-items:center;justify-content:center;",
                        },
                        children: [
                          // preview area sized to cropped 23x23 * zoom
                          {
                            tag: "div",
                            attrs: {
                              style: `width:${
                                (SPRITE_SIZE - 1) * SPRITE_ZOOM
                              }px;height:${
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

                          // color selector for the local player only
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
                                      selected: fullPlayers[i].color,
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

                  // Ready button (kept per-card; will be below the colorSelector)
                  isMe
                    ? {
                        tag: "div",
                        attrs: {
                          class: "player-ready-wrap",
                          style: "margin-top:8px;",
                        },
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
                                "lobby-ready-btn" +
                                (fullPlayers[myIndex] &&
                                fullPlayers[myIndex].ready
                                  ? " anim"
                                  : ""),
                            },
                            events: { click: "handleReady" },
                            children: [
                              fullPlayers[myIndex] && fullPlayers[myIndex].ready
                                ? "Annuler prêt"
                                : "Prêt",
                            ],
                          },
                        ],
                      }
                    : null,
                ].filter(Boolean),
              };
            }),
          },
        ].filter(Boolean),
      },
      // PANEL TCHAT : inchangé
      {
        tag: "div",
        attrs: {
          style: `
            background: linear-gradient(135deg,rgba(22,34,20,0.97) 82%,rgba(48,255,180,0.08) 100%);
            border-radius: 32px;
            box-shadow: 0 8px 32px 0 #34ffcc33, 0 0 0 8px #3be6aa44 inset;
            border: 5px solid #3be6aa;
            width: 360px;
            min-width: 360px;
            max-width: 360px;
            height: 760px;
            min-height: 760px;
            max-height: 760px;
            padding: 38px 24px 18px 24px;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 14px;
            margin-left: 0;
          `,
        },
        children: [
          {
            tag: "div",
            attrs: {
              style:
                "color:#45ffc0;font-size:22px;margin-bottom:6px;font-weight:bold;",
            },
            children: ["Tchat"],
          },
          {
            tag: "div",
            attrs: {
              style: `
                flex: 1;
                width: 100%;
                height: 550px;
                min-height: 550px;
                max-height: 550px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin-bottom: 7px;
                padding-right: 6px;
                scrollbar-color: #45ffc0 #163013;
                scrollbar-width: thin;
              `,
              "data-chat-list": "true",
            },
            children: chat.map((msg) => ({
              tag: "div",
              attrs: {
                style: `
                  font-size:14px;
                  color: ${
                    msg.system
                      ? "#f9e56e"
                      : msg.author === nickname
                      ? "#45ffc0"
                      : "#afffd9"
                  };
                  font-weight: ${msg.system ? "bold" : "normal"};
                  background: ${msg.system ? "rgba(240,212,80,0.08)" : "none"};
                  border-radius: 6px;
                  padding: ${msg.system ? "5px 12px" : "0"};
                `,
              },
              children: [
                msg.system
                  ? `[${msg.time}] ${msg.text}`
                  : `[${msg.time}] ${msg.author}: ${msg.text}`,
              ],
            })),
          },
          {
            tag: "form",
            attrs: {
              style: `
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 6px;
                margin-bottom: 0;
                padding-bottom: 4px;
                position: relative;
              `,
            },
            events: { submit: "handleSendMessage" },
            children: [
              {
                tag: "input",
                attrs: {
                  name: "message",
                  type: "text",
                  placeholder: "Votre message...",
                  style: `
                    width: 100%;
                    padding: 6px 8px;
                    font-size: 14px;
                    border-radius: 8px;
                    border: 2px solid #45ffc0;
                    background: rgba(35,54,29,0.97);
                    color: #d2ffe6;
                    font-family: 'Press Start 2P', monospace;
                  `,
                },
              },
              {
                tag: "button",
                attrs: {
                  type: "submit",
                  style: `
                    align-self: flex-end;
                    margin-top: 2px;
                    padding: 6px 18px;
                    font-size: 14px;
                    background: linear-gradient(90deg, #45ffc0 0%, #267c5c 100%);
                    color: #1d2820;
                    border-radius: 8px;
                    border: none;
                    cursor: pointer;
                    font-family: 'Press Start 2P', monospace;
                    box-sizing: border-box;
                  `,
                },
                children: ["Envoyer"],
              },
            ],
          },
        ].filter(Boolean),
      },
    ].filter(Boolean),
  };
}
