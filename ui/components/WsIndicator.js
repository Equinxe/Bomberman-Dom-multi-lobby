export function WSIndicator({ connected, playerCount }) {
  return {
    tag: "div",
    attrs: {
      id: "ws-indicator",
      style: `
        position: fixed;
        bottom: 7px;
        right: 13px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        font-family: 'Press Start 2P', monospace;
        font-size: 10px;
        color: #45ffc0;
        background: none;
        border: none;
        box-shadow: none;
        padding: 0;
        min-width: 0;
        max-width: none;
        opacity: 1;
        user-select: none;
      `,
    },
    children: [
      {
        tag: "span",
        attrs: {
          style: "font-size:10px; font-weight:bold; margin-bottom:2px;",
        },
        children: [`Online : ${playerCount}`],
      },
      {
        tag: "span",
        attrs: {
          style:
            "display:flex;align-items:center;font-size:10px;font-weight:bold;",
        },
        children: [
          {
            tag: "span",
            attrs: {
              style: `
                display:inline-block;
                width:10px;
                height:10px;
                margin-right:5px;
                border-radius:50%;
                background:${connected ? "#45ffc0" : "#ff7878"};
                border:1px solid #fff;
              `,
            },
          },
          connected ? "Connecté" : "Déconnecté",
        ],
      },
    ],
  };
}
