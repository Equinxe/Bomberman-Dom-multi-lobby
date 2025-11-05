import { setState } from "../../Core/state.js";
import { registerEvent } from "../../Core/events.js";

export function Nickname({ onSubmit }) {
  function handleInputLobbyCode(e) {
    const value = e.target.value.trim();
    const btn = document.getElementById("join-lobby-btn");
    if (btn) {
      btn.disabled = value === "";
      btn.style.opacity = value === "" ? 0.5 : 1;
      btn.style.cursor = value === "" ? "not-allowed" : "pointer";
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const pseudoInput = document.getElementById("nickname");
    const lobbyCodeInput = document.getElementById("lobbyCode");
    const pseudo = pseudoInput ? pseudoInput.value.trim() : "";
    const lobbyCode = lobbyCodeInput
      ? lobbyCodeInput.value.trim().toUpperCase()
      : "";
    if (!pseudo || !lobbyCode) return;
    setState({ nickname: pseudo, lobbyCode });
    if (typeof onSubmit === "function") onSubmit(e, { create: false });
  }

  function handleCreateLobby(e) {
    e.preventDefault();
    const pseudoInput = document.getElementById("nickname");
    const pseudo = pseudoInput ? pseudoInput.value.trim() : "";
    if (!pseudo) return;
    setState({ nickname: pseudo, lobbyCode: "" });
    if (typeof onSubmit === "function") onSubmit(e, { create: true });
  }

  registerEvent("handleInputLobbyCode", handleInputLobbyCode);
  registerEvent("handleSubmit", handleSubmit);
  registerEvent("handleCreateLobby", handleCreateLobby);

  return {
    tag: "div",
    attrs: {
      style: `
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100vw;
        min-height: 100vh;
        justify-content: flex-start;
        position: relative;
        background: none;
      `,
    },
    children: [
      {
        tag: "img",
        attrs: {
          src: "./assets/logo/bomberman-logo.png",
          alt: "Bomberman Logo",
          style: `
            width: clamp(380px, 44vw, 620px);
            max-width: 92vw;
            margin-top: 10px;
            margin-bottom: 10px;
            image-rendering: pixelated;
            display: block;
            filter: drop-shadow(0 16px 48px #94ffd3cc)
                    drop-shadow(0 2px 0px #184a);
            animation: logoEntrance 1.2s cubic-bezier(.68,-0.55,.27,1.55),
                       logoGlow 2.2s infinite alternate cubic-bezier(.68,-0.55,.27,1.55);
            user-select: none;
            z-index: 2;
          `,
        },
      },
      {
        tag: "div",
        attrs: {
          style: `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 70vh;
            width: 100vw;
            margin-top: 0;
            padding-bottom: 50px;
          `,
        },
        children: [
          {
            tag: "div",
            attrs: {
              style: `
                background: linear-gradient(135deg,rgba(22,34,20,0.97) 85%,rgba(48,255,180,0.16) 100%);
                border-radius: 30px;
                box-shadow: 0 12px 44px 0 #34ffcc55,
                            0 0 0 10px #3be6aa77 inset,
                            0 0 42px 12px #7affc677;
                padding: 50px 64px 36px 64px;
                min-width: 500px;
                min-height: 340px;
                max-width: 96vw;
                border: 5px solid #3be6aa;
                backdrop-filter: blur(8px);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 38px;
                animation: panelPop 1.1s cubic-bezier(.68,-0.55,.27,1.55);
                position: relative;
                z-index: 1;
              `,
            },
            children: [
              {
                tag: "div",
                attrs: {
                  style: `
                    font-size: 22px;
                    color: #afffd9;
                    margin-bottom: 16px;
                    font-family: 'Inter', Arial, sans-serif;
                    text-align: center;
                    letter-spacing: 1px;
                  `,
                },
                children: ["Choisissez votre pseudo et un lobby"],
              },
              {
                tag: "form",
                attrs: {
                  style:
                    "display: flex; flex-direction: column; gap: 34px; width: 100%; align-items: center;",
                },
                events: { submit: "handleSubmit" },
                children: [
                  {
                    tag: "input",
                    attrs: {
                      type: "text",
                      id: "nickname",
                      name: "nickname",
                      placeholder: "Entrez votre pseudo...",
                      required: true,
                      maxlength: 16,
                      autofocus: true,
                      style: `
                        padding: 23px 38px;
                        font-size: 23px;
                        border-radius: 16px;
                        border: 3px solid #45ffc0;
                        background: rgba(35,54,29,0.97);
                        color: #d2ffe6;
                        font-family: 'Inter', Arial, sans-serif;
                        box-shadow: 0 0 0 3px #45ffc044 inset, 0 0 24px #45ffc088;
                        outline: none;
                        font-weight: 600;
                        letter-spacing: 2px;
                        text-align: center;
                        transition: border .18s, box-shadow .18s, filter .2s;
                        filter: drop-shadow(0 2px 18px #1bff9080);
                        animation: inputPop 1.2s cubic-bezier(.68,-0.55,.27,1.55);
                      `,
                    },
                  },
                  {
                    tag: "input",
                    attrs: {
                      type: "text",
                      id: "lobbyCode",
                      name: "lobbyCode",
                      placeholder: "Code du lobby (obligatoire pour rejoindre)",
                      maxlength: 10,
                      style: `
                        padding: 18px 38px;
                        font-size: 20px;
                        border-radius: 14px;
                        border: 2px solid #45ffc0;
                        background: rgba(35,54,29,0.97);
                        color: #d2ffe6;
                        font-family: 'Inter', Arial, sans-serif;
                        box-shadow: 0 0 0 2px #45ffc044 inset, 0 0 14px #45ffc088;
                        outline: none;
                        font-weight: 500;
                        letter-spacing: 2px;
                        text-align: center;
                        margin-bottom: 8px;
                        transition: border .18s, box-shadow .18s, filter .2s;
                        filter: drop-shadow(0 2px 12px #1bff9040);
                      `,
                    },
                    events: { input: "handleInputLobbyCode" }, // <-- le bon event !
                  },
                  {
                    tag: "button",
                    attrs: {
                      id: "join-lobby-btn",
                      type: "submit",
                      disabled: true,
                      style: `
                        padding: 23px 48px;
                        font-size: 28px;
                        background: linear-gradient(90deg, #45ffc0 0%, #267c5c 100%);
                        color: #1d2820;
                        border-radius: 16px;
                        border: none;
                        cursor: not-allowed;
                        font-family: 'Press Start 2P', monospace;
                        box-shadow: 0 8px 32px #1bff9044, 0 0 18px #45ffc088;
                        font-weight: bold;
                        letter-spacing: 3px;
                        text-shadow: 0 2px 0 #fff8;
                        transition: filter .2s, transform .08s;
                        animation: buttonShine 2.2s infinite linear;
                        margin-bottom: 12px;
                        opacity: 0.5;
                      `,
                    },
                    children: ["Rejoindre le lobby"],
                  },
                  {
                    tag: "button",
                    attrs: {
                      type: "button",
                      style: `
                        padding: 23px 48px;
                        font-size: 24px;
                        background: linear-gradient(90deg, #ffe854 0%, #45ffc0 100%);
                        color: #1d2820;
                        border-radius: 16px;
                        border: none;
                        cursor: pointer;
                        font-family: 'Press Start 2P', monospace;
                        box-shadow: 0 6px 18px #ffe85444, 0 0 14px #45ffc088;
                        font-weight: bold;
                        letter-spacing: 2px;
                        text-shadow: 0 2px 0 #fff8;
                        margin-top: 0;
                        margin-bottom: 8px;
                        transition: filter .2s, transform .08s;
                        animation: buttonShine 2s infinite linear;
                      `,
                    },
                    events: { click: "handleCreateLobby" },
                    children: ["Créer un nouveau lobby"],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}
