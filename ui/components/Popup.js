export function PopupError({ message }) {
  // Ajoute dynamiquement l'animation CSS si besoin
  if (
    typeof document !== "undefined" &&
    !document.getElementById("popup-error-style")
  ) {
    const style = document.createElement("style");
    style.id = "popup-error-style";
    style.textContent = `
      @keyframes popupErrorAppear {
        from { opacity:0; transform:translateY(-18px) scale(0.98);}
        to   { opacity:1; transform:translateY(0) scale(1);}
      }
    `;
    document.head.appendChild(style);
  }
  return {
    tag: "div",
    attrs: {
      id: "popup-error",
      style: `
        position: fixed;
        top: 24px;
        right: 32px;
        min-width: 320px;
        max-width: 440px;
        background: linear-gradient(135deg,rgba(22,34,20,0.98) 80%,rgba(48,255,180,0.18) 100%);
        color: #45ffc0;
        font-size: 21px;
        font-family: 'Press Start 2P', monospace;
        border-radius: 18px;
        box-shadow: 0 8px 32px 0 #34ffcc44, 0 0 0 8px #3be6aa55 inset, 0 0 42px 12px #7affc677;
        border: 3px solid #3be6aa;
        padding: 28px 28px 18px 28px;
        z-index: 9999;
        text-align: left;
        animation: popupErrorAppear 0.45s cubic-bezier(.68,-0.55,.27,1.55);
        letter-spacing: 1px;
        user-select: none;
        pointer-events: none;
      `,
    },
    children: [
      {
        tag: "span",
        attrs: {
          style: "font-weight:bold;letter-spacing:2px;font-size:22px;",
        },
        children: ["Erreur : "],
      },
      message,
    ],
  };
}
