import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { useDoc } from "@/state/document";
import { resolveLanguage, setLanguage } from "@/lib/i18n";
import { useSettings } from "@/state/settings";

// Dev-only handle for inspecting the document from the browser console.
if (import.meta.env.DEV) (window as unknown as { __doc: typeof useDoc }).__doc = useDoc;

useSettings.subscribe((s, prev) => {
  if (s.language !== prev.language) void setLanguage(resolveLanguage(s.language));
});

// The interface language is loaded before the first render.
void setLanguage(resolveLanguage(useSettings.getState().language)).then(() =>
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
);
