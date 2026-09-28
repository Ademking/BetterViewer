import { TypeIcon } from "lucide-react";
import { ToolButton } from "@/components/tools/ToolButton";
import { useUi } from "@/state/ui";

export function TextToolButton() {
  const tool = useUi((s) => s.tool);
  const setTool = useUi((s) => s.setTool);
  return (
    <ToolButton active={tool === "text"} label="Text" onClick={() => setTool("text")} shortcut="T">
      <TypeIcon />
    </ToolButton>
  );
}
