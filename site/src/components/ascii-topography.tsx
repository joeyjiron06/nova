"use client";
import { useEffect, useRef } from "react";

// Theme token driving the contour lines. Defined in `src/app.css` and
// overridden under `.dark`, so this follows light/dark automatically.
const PRIMARY_VAR = "--color-fd-primary";

// Used when the var is missing (e.g. the stylesheet hasn't applied yet) or
// when the browser's canvas can't parse its color space.
const FALLBACK_COLOR = "rgb(212, 110, 41)";

export function AsciiTopography() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    // `--color-fd-primary` is an `oklch()` value. Canvas only gained CSS
    // Color 4 support recently, and older engines *silently ignore* an
    // unparseable `fillStyle` assignment — which would leave the text black.
    // Probe with a known sentinel to detect that and fall back.
    const readPrimaryColor = () => {
      const raw = getComputedStyle(canvas).getPropertyValue(PRIMARY_VAR).trim();
      if (!raw) return FALLBACK_COLOR;

      const previous = ctx.fillStyle;
      ctx.fillStyle = "#000000";
      ctx.fillStyle = raw;
      const parsed = ctx.fillStyle !== "#000000";
      ctx.fillStyle = previous;

      return parsed ? raw : FALLBACK_COLOR;
    };

    let primaryColor = readPrimaryColor();

    // Fumadocs toggles the theme by swapping the class on <html>, which the
    // canvas can't observe on its own — re-resolve the token when it changes.
    const themeObserver = new MutationObserver(() => {
      primaryColor = readPrimaryColor();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || 600;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // ASCII characters used for density mapping
    const chars = "01._+/*={}\$#%".split("");
    const cols = Math.floor(canvas.width / 12);
    const rows = Math.floor(canvas.height / 14);

    ctx.font = "10px monospace";

    let time = 0;

    const draw = () => {
      // Clear with transparency so it inherits your site's dark background
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.005;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Generates a multi-layered wave/topography map using mathematical sine noise
          const x = c * 12;
          const y = r * 14;

          const n1 = Math.sin(c * 0.05 + time) * Math.cos(r * 0.05);
          const n2 = Math.sin(c * 0.1 - time * 0.5) * Math.sin(r * 0.08);
          const noise = (n1 + n2 + 2) / 4; // Normalized between 0 and 1

          // Simulate vector topography contour lines
          const contourLine = Math.abs(Math.sin(noise * 12)) < 0.15;

          if (contourLine) {
            const char = chars[Math.floor(noise * (chars.length - 1))];
            if (!char) continue;

            // Opacity rides on `globalAlpha` rather than being baked into the
            // color string, so this stays agnostic to the token's color space.
            ctx.fillStyle = primaryColor;
            ctx.globalAlpha = 0.5 + noise * 0.15;
            ctx.fillText(char, x, y);
          }
        }
      }

      ctx.globalAlpha = 1;

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      themeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        mixBlendMode: "screen",
      }}
    />
  );
}
