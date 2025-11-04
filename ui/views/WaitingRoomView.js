export function WaitingRoom({ position, queue, pseudo, code }) {
  return {
    tag: "div",
    attrs: {
      style: `
        width: 100vw;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: 'Press Start 2P', monospace;
        background: none;
      `,
    },
    children: [
      {
        tag: "div",
        attrs: {
          style: `
            background: linear-gradient(135deg,rgba(22,34,20,0.97) 85%,rgba(48,255,180,0.18) 100%);
            border-radius: 32px;
            box-shadow: 0 8px 32px 0 #34ffcc55, 0 0 0 8px #3be6aa77 inset, 0 0 32px 8px #7affc677;
            border: 5px solid #3be6aa;
            min-width: 400px;
            max-width: 98vw;
            padding: 62px 34px 42px 34px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 26px;
            backdrop-filter: blur(7px);
          `,
        },
        children: [
          {
            tag: "div",
            attrs: {
              style: `
                color:#ffe854;
                font-size:32px;
                font-weight:bold;
                text-align:center;
                margin-bottom:18px;
                letter-spacing:2px;
              `,
            },
            children: ["Lobby Plein"],
          },
          {
            tag: "div",
            attrs: {
              style: `
                color:#afffd9;
                font-size:21px;
                margin-bottom:8px;
                text-align:center;
              `,
            },
            children: [
              `Code du lobby : ${code}`,
              `Votre position dans la file d'attente : ${position}`,
            ],
          },
          {
            tag: "div",
            attrs: {
              style: `
                color:#45ffc0;
                font-size:15px;
                text-align:center;
              `,
            },
            children: [
              "En attente d'une place dans le lobby...",
              queue && queue.length
                ? "\n" + queue.map((p, i) => `${i + 1}. ${p}`).join("  ")
                : "",
            ],
          },
        ].filter(Boolean),
      },
    ],
  };
}
