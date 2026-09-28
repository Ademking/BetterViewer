import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ImageViewer } from "@/components/viewer/ImageViewer";

export default function App() {
  return (
    <ErrorBoundary>
      <ImageViewer />
    </ErrorBoundary>
  );
}
