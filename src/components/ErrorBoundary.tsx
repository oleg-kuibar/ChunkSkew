import { Component, type ErrorInfo, type ReactNode } from "react";
import { ChunkFailureFallback } from "./UpdateSurfaces";
import { classifyChunkError } from "../shared/chunkErrorClassifier";
import { handleChunkFailure } from "../shared/chunkRecoveryController";
import type { RouterMode, WorkflowType } from "../shared/types";

interface Props {
  children: ReactNode;
  routerMode: RouterMode;
  workflowType?: WorkflowType;
  routeId?: string;
}

interface State {
  error?: unknown;
  hasError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown) {
    return { error, hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("App boundary caught error", error, info.componentStack);
    const classification = classifyChunkError(error);
    if (classification.isChunkLoadError) {
      void handleChunkFailure(error, {
        routeId: this.props.routeId ?? "app-boundary",
        routerMode: this.props.routerMode,
        workflowType: this.props.workflowType ?? "none",
        currentPath: window.location.pathname
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <ChunkFailureFallback
          error={this.state.error}
          routerMode={this.props.routerMode}
          workflowType={this.props.workflowType ?? "none"}
          routeId={this.props.routeId ?? "app-boundary"}
          onRetry={() => this.setState({ error: undefined, hasError: false })}
        />
      );
    }
    return this.props.children;
  }
}
