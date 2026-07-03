export function isStaticDemoHost() {
  return import.meta.env.VITE_STATIC_DEMO === "1";
}
