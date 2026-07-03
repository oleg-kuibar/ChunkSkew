import type { RouterMode } from "./types";

export function appBasePath() {
  const base = import.meta.env.BASE_URL ?? "/";
  return base === "/" ? "" : base.replace(/\/$/, "");
}

export function withAppBase(path: string) {
  return `${appBasePath()}${path.startsWith("/") ? path : `/${path}`}` || "/";
}

export function stripAppBasePath(pathname: string) {
  const base = appBasePath();
  return base && pathname.startsWith(base) ? pathname.slice(base.length) || "/" : pathname;
}

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
  return `${withAppBase(pathname)}?${params.toString()}${hash ? `#${hash}` : ""}`;
}
