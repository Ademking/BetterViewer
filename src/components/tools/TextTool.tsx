import { TypeIcon } from "lucide-react";
import { ToolButton } from "@/components/tools/ToolButton";
import { useUi } from "@/state/ui";
import { useT } from "@/lib/i18n";

export function TextToolButton() {
  const t = useT();
  const tool = useUi((s) => s.tool);
  const setTool = useUi((s) => s.setTool);
  return (
    <ToolButton active={tool === "text"} label={t("Text")} onClick={() => setTool("text")} shortcut="T">
      <TypeIcon />
    </ToolButton>
  );
}
