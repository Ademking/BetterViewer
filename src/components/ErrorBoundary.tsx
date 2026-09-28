import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface State {
  error: Error | null;
}

/** Last-resort error state so a component failure never leaves a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("BetterViewer crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="font-semibold text-lg">Something went wrong</div>
        <p className="max-w-md text-muted-foreground text-sm">{this.state.error.message}</p>
        <div className="flex gap-2">
          <Button onClick={() => this.setState({ error: null })} variant="outline">
            Try again
          </Button>
          <Button onClick={() => location.reload()}>Reload</Button>
        </div>
      </div>
    );
  }
}
