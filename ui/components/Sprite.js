export * from "../sprite.js";

export function Sprite({
  frame = 0,
  row = 0,
  size = 24,
  className = "",
  offsetX = 5, // offset initial X demandé
  offsetY = 5, // offset initial Y demandé
  zoom = 3,
  sheetWidth = 303,
  sheetHeight = 687,
  id = "",
  framesCount = 1, // nombre d'images à animer (par ex. 3 -> frames 0,1,2)
  duration = 0.6, // durée de l'animation en secondes
}) {
  // NOTE: margin et spacing alignés avec votre description : 5px / 1px
  const margin = 5;
  const spacing = 1;
  const x = margin + frame * (size + spacing) + offsetX;
  const y = margin + row * (size + spacing) + offsetY;

  // Si on a plusieurs frames, on anime background-position horizontalement
  // Calcul du début et de la fin (en px) pour background-position
  const startX = margin + 0 * (size + spacing) + offsetX;
  const endX =
    margin + Math.max(0, framesCount - 1) * (size + spacing) + offsetX;
  const startY = margin + row * (size + spacing) + offsetY;

  // animation unique par id pour éviter collision
  const animName = `sprite_anim_${
    id || Math.random().toString(36).slice(2, 8)
  }`;

  // Si framesCount > 1, on génère un bloc <style> avec keyframes qui déplace background-position
  if (framesCount > 1) {
    const keyframes = `
@keyframes ${animName} {
  0% { background-position: -${startX * zoom}px -${startY * zoom}px; }
  100% { background-position: -${endX * zoom}px -${startY * zoom}px; }
}
`;
    return {
      tag: "div",
      attrs: {
        class: `sprite-wrap ${className}`,
        style: [
          `width:${size * zoom}px`,
          `height:${size * zoom}px`,
          "display:inline-block",
          "overflow:hidden",
          "box-sizing:border-box",
        ].join(";"),
      },
      children: [
        { tag: "style", children: [keyframes] },
        {
          tag: "div",
          attrs: {
            id,
            class: `sprite-sheet ${className}`,
            style: [
              `width:${size * zoom}px`,
              `height:${size * zoom}px`,
              `background-image:url('./assets/images/Players.png')`,
              `background-position:-${startX * zoom}px -${startY * zoom}px`,
              `background-size:${sheetWidth * zoom}px ${sheetHeight * zoom}px`,
              "background-repeat:no-repeat",
              "image-rendering:pixelated",
              "border-radius:6px",
              "box-shadow:0 0 10px #45ffc077",
              "border:2px solid #45ffc0",
              `animation: ${animName} ${duration}s steps(${framesCount}) infinite`,
            ].join(";"),
          },
        },
      ],
    };
  }

  // Sinon rendu statique classique
  return {
    tag: "div",
    attrs: {
      id,
      class: `sprite-sheet ${className}`,
      style: [
        `width:${size * zoom}px`,
        `height:${size * zoom}px`,
        `background-image:url('./assets/images/Players.png')`,
        `background-position:-${x * zoom}px -${y * zoom}px`,
        `background-size:${sheetWidth * zoom}px ${sheetHeight * zoom}px`,
        "background-repeat:no-repeat",
        "image-rendering:pixelated",
        "border-radius:6px",
        "box-shadow:0 0 10px #45ffc077",
        "border:2px solid #45ffc0",
        "margin:auto",
        "overflow:hidden",
      ].join(";"),
    },
  };
}
