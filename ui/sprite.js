export function Sprite({
  frame = 0,
  row = 0,
  size = 24,
  className = "",
  offsetY = 0,
  zoom = 3,
  sheetWidth = 303,
  sheetHeight = 687,
  id = "",
}) {
  const margin = 4;
  const spacing = 1;
  const x = margin + frame * (size + spacing);
  const y = margin + row * (size + spacing) + offsetY;
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
        "border-radius:12px",
        "box-shadow:0 0 10px #45ffc077",
        "border:2px solid #45ffc0",
        "margin:auto",
        "overflow:hidden",
      ].join(";"),
    },
  };
}
