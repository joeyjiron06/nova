// Declares `*.svg?react` as a React component (vite-plugin-svgr).
/// <reference types="vite-plugin-svgr/client" />

// Vite resolves image imports to a hashed URL string at build time.
// `vite/client` would declare these for us, but it also re-declares `*.css`
// and would collide with src/css.d.ts — so we declare only what we use.
declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.webp" {
  const src: string;
  export default src;
}
