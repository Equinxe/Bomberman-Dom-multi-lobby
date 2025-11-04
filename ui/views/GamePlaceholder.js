export function GamePlaceholder({ players = [], mapSeed = null }) {
  return {
    tag: "div",
    attrs: {
      style: `
        width:100%;
        min-height:100vh;
        display:flex;
        align-items:center;
        justify-content:center;
        background: linear-gradient(180deg, #0f1a14 0%, #0b1810 100%);
        color:#9fffd6;
        padding:20px;
        box-sizing:border-box;
        font-family: 'Inter', Arial, sans-serif;
      `,
    },
    children: [
      {
        tag: "div",
        attrs: {
          style: `
            width:760px;
            max-width:95%;
            background: rgba(0,0,0,0.25);
            border-radius:12px;
            border: 2px solid rgba(32,255,200,0.12);
            padding:24px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.6);
          `,
        },
        children: [
          {
            tag: "h1",
            attrs: {
              style:
                "font-family:'Press Start 2P', monospace; font-size:18px; color:#6fffd3; margin:0 0 12px 0; text-align:center;",
            },
            children: ["Jeu en cours de construction"],
          },
          {
            tag: "p",
            attrs: {
              style:
                "color:#bfffe6; opacity:0.95; margin:0 0 18px 0; text-align:center;",
            },
            children: [
              "Ceci est un écran de test — la partie a démarré. Ici nous construirons l'interface de jeu.",
            ],
          },
          {
            tag: "div",
            attrs: {
              style:
                "display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-bottom:18px;",
            },
            children: players.map((p) => ({
              tag: "div",
              attrs: {
                style:
                  "background:rgba(255,255,255,0.03);padding:10px 14px;border-radius:8px;text-align:center;min-width:140px;",
              },
              children: [
                {
                  tag: "div",
                  attrs: {
                    style: "font-weight:700;color:#7ffecc;margin-bottom:6px;",
                  },
                  children: [p.pseudo || "Joueur"],
                },
                {
                  tag: "div",
                  attrs: { style: "color:#dfffe9;font-size:12px;" },
                  children: [`Couleur: ${p.color ?? 0}`],
                },
                {
                  tag: "div",
                  attrs: { style: "color:#dfffe9;font-size:12px;" },
                  children: [`Ready: ${p.ready ? "oui" : "non"}`],
                },
              ],
            })),
          },
          {
            tag: "div",
            attrs: { style: "display:flex;justify-content:center;gap:12px;" },
            children: [
              {
                tag: "button",
                attrs: {
                  style:
                    "padding:12px 18px;border-radius:8px;border:none;background:linear-gradient(90deg,#2fe9bf,#0fb28f);color:#003;cursor:pointer;font-weight:700;",
                  events: { click: "handleExitGame" },
                },
                children: ["Retour au lobby (tester)"],
              },
              {
                tag: "button",
                attrs: {
                  style:
                    "padding:12px 18px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:transparent;color:#9fffd6;cursor:default;",
                },
                children: [`mapSeed: ${mapSeed ?? "—"}`],
              },
            ],
          },
        ],
      },
    ],
  };
}
