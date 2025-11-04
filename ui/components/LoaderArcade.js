export * from "../LoaderArcade.js";

export function LoaderArcade() {
  return {
    tag: "div",
    attrs: {
      style: "display:flex;gap:8px;justify-content:center;margin:22px 0;",
    },
    children: Array.from({ length: 4 }).map((_, i) => ({
      tag: "div",
      attrs: {
        style: `
          width:16px;height:16px;background:#45ffc0;
          border-radius:4px;box-shadow:0 0 12px #45ffc088;
          animation:pixelBlink 1s infinite alternate;
          animation-delay:${i * 0.22}s;
        `,
      },
    })),
  };
}
