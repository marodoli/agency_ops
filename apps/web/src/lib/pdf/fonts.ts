import { Font } from "@react-pdf/renderer";

let registered = false;

export function registerFonts() {
  if (registered) return;
  registered = true;

  Font.register({
    family: "Poppins",
    fonts: [
      {
        src: "https://fonts.gstatic.com/s/poppins/v21/pxiEyp8kv8JHgFVrFJA.ttf",
        fontWeight: 400,
      },
      {
        src: "https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLGT9V1s.ttf",
        fontWeight: 500,
      },
      {
        src: "https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLEj6V1s.ttf",
        fontWeight: 600,
      },
    ],
  });

  Font.register({
    family: "JetBrains Mono",
    fonts: [
      {
        src: "https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPVmUsaaDhw.ttf",
        fontWeight: 400,
      },
    ],
  });

  Font.registerHyphenationCallback((word) => [word]);
}
