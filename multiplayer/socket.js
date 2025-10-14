import { PopupError } from "../ui/popup.js";
import { createElement } from "../Core/dom.js"; // ton utilitaire pour générer un vrai Node

export function createSocket(onLobbyUpdate) {
  let socket;
  return {
    connect(pseudo, lobbyCode = "", create = false) {
      socket = new WebSocket("ws://localhost:9001");
      socket.addEventListener("open", () => {
        socket.send(
          JSON.stringify({
            type: "join",
            pseudo,
            lobbyCode: lobbyCode,
            create: create,
          })
        );
      });
      socket.addEventListener("message", (e) => {
        const data = JSON.parse(e.data);
        if (data.type === "lobby" || data.type === "waiting") {
          onLobbyUpdate(data.players, data.chat, data.queue, data, data.code);
        }
        if (data.type === "error") {
          // Ajoute le pop-up devant le form, sans remplacer le form !
          const app = document.getElementById("app");
          if (app && !document.getElementById("popup-error")) {
            const popupVNode = PopupError({ message: data.message });
            const popupElem = createElement(popupVNode);
            app.appendChild(popupElem);
            setTimeout(() => {
              if (app.contains(popupElem)) app.removeChild(popupElem);
            }, 3000);
          }
        }
      });
    },
    send(type, payload) {
      if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify({ type, ...payload }));
      }
    },
  };
}
