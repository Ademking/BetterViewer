import { LocaleProvider } from "@ark-ui/react/locale";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ImageViewer } from "@/components/viewer/ImageViewer";
import { useLanguage } from "@/lib/i18n";

export default function App() {
  // Ark UI components take their text direction (right to left for Arabic) from this.
  const language = useLanguage((s) => s.code);
  return (
    <LocaleProvider locale={language}>
      <ErrorBoundary>
        <ImageViewer />
      </ErrorBoundary>
    </LocaleProvider>
  );
}
