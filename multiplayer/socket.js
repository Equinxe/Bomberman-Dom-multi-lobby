export function createSocket(onLobbyUpdate) {
  let socket;
  return {
    connect(pseudo, lobbyCode = "") {
      socket = new WebSocket("ws://localhost:9001");
      socket.addEventListener("open", () => {
        socket.send(
          JSON.stringify({
            type: "join",
            pseudo,
            lobbyCode: lobbyCode,
            create: lobbyCode === "", // Si pas de code, crée un nouveau lobby
          })
        );
      });
      socket.addEventListener("message", (e) => {
        const data = JSON.parse(e.data);
        if (data.type === "lobby" || data.type === "waiting") {
          onLobbyUpdate(data.players, data.chat, data.queue, data, data.code);
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
