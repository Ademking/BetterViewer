import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { useDoc } from "@/state/document";

// Dev-only handle for inspecting the document from the browser console.
if (import.meta.env.DEV) (window as unknown as { __doc: typeof useDoc }).__doc = useDoc;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
