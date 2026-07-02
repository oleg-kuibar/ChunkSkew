import type { RouterMode } from "./types";

export function routerQueryValue(routerMode: RouterMode) {
  return routerMode === "tanstack-router" ? "tanstack" : "react";
}

export function debugRouteHref(path: string, routerMode: RouterMode, scenarioId?: string) {
  const [pathAndSearch, hash = ""] = path.split("#", 2);
  const [pathname, search = ""] = pathAndSearch.split("?", 2);
  const params = new URLSearchParams(search);
  params.set("debug", "1");
  params.set("router", routerQueryValue(routerMode));
  if (scenarioId) {
    params.set("scenario", scenarioId);
  }
  return `${pathname}?${params.toString()}${hash ? `#${hash}` : ""}`;
}
