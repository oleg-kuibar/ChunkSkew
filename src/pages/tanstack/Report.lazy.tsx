import { createLazyRoute } from "@tanstack/react-router";
import { ChunkFailureFallback } from "../../components/UpdateSurfaces";
import { TanStackRetainedFile } from "./TanStackRetainedFile";

export const RetainedFileRoute = createLazyRoute("/retained-file")({
  component: TanStackRetainedFile,
  errorComponent: ({ error }) => (
    <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="event" routeId="tanstack-retained-file-route" />
  )
});
