import { LocaleProvider } from "@ark-ui/react/locale";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ImageViewer } from "@/components/viewer/ImageViewer";
import { TitleBar } from "@/components/viewer/TitleBar";
import { isDesktop } from "@/lib/platform";
import { useLanguage } from "@/lib/i18n";

export default function App() {
  // Ark UI components take their text direction (right to left for Arabic) from this.
  const language = useLanguage((s) => s.code);
  return (
    <LocaleProvider locale={language}>
      <div className="flex h-svh flex-col">
        {/* Outside the error boundary: the window can always be closed. */}
        {isDesktop && <TitleBar />}
        <div className="relative min-h-0 flex-1">
          <ErrorBoundary>
            <ImageViewer />
          </ErrorBoundary>
        </div>
      </div>
    </LocaleProvider>
  );
}
