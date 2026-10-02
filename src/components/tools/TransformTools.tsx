import {
  Axis3dIcon,
  MirrorRectangularIcon,
  RotateCcwIcon,
  RotateCwIcon,
  RotateCwSquareIcon,
  ScalingIcon,
} from "lucide-react";
import { Menu, MenuContent, MenuGroup, MenuItem, MenuSeparator, MenuShortcut, MenuTrigger } from "@/components/ui/menu";
import { ToolButton } from "@/components/tools/ToolButton";
import { flipHorizontal, flipVertical, rotate } from "@/lib/actions";
import { startStraighten } from "@/lib/straighten";
import { normRotation, useDoc } from "@/state/document";
import { useUi } from "@/state/ui";
import { useShortcutText } from "@/lib/shortcuts";
import { useT } from "@/lib/i18n";

export function TransformTools() {
  const t = useT();
  const keys = useShortcutText();
  const rotation = useDoc((s) => normRotation(s.doc?.rotation ?? 0));
  const flipX = useDoc((s) => s.doc?.flipX ?? false);
  const flipY = useDoc((s) => s.doc?.flipY ?? false);
  const modified = rotation !== 0 || flipX || flipY;

  return (
    <Menu positioning={{ placement: "top", gutter: 14 }}>
      <MenuTrigger asChild>
        <ToolButton active={false} command="rotateRight" label={t("Rotate, flip & resize")}>
          <RotateCwSquareIcon />
          {modified && (
            <span className="absolute top-1 right-1 size-1.5 rounded-full bg-brand" />
          )}
        </ToolButton>
      </MenuTrigger>
      <MenuContent className="w-max min-w-56">
        <MenuGroup heading={`${t("Transform")} · ${rotation}°`}>
          <MenuItem closeOnSelect={false} onSelect={() => rotate(-1)} value="rotate-left">
            <RotateCcwIcon /> {t("Rotate left")}
            <MenuShortcut>{keys("rotateLeft")}</MenuShortcut>
          </MenuItem>
          <MenuItem closeOnSelect={false} onSelect={() => rotate(1)} value="rotate-right">
            <RotateCwIcon /> {t("Rotate right")}
            <MenuShortcut>{keys("rotateRight")}</MenuShortcut>
          </MenuItem>
          <MenuItem closeOnSelect={false} onSelect={flipHorizontal} value="flip-h">
            <MirrorRectangularIcon /> {t("Flip horizontal")}
            <MenuShortcut>{keys("flipHorizontal")}</MenuShortcut>
          </MenuItem>
          <MenuItem closeOnSelect={false} onSelect={flipVertical} value="flip-v">
            <MirrorRectangularIcon className="rotate-90" /> {t("Flip vertical")}
            <MenuShortcut>{keys("flipVertical")}</MenuShortcut>
          </MenuItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuItem onSelect={startStraighten} value="straighten">
          <Axis3dIcon /> {t("Straighten…")}
        </MenuItem>
        <MenuItem onSelect={() => useUi.getState().togglePanel("resize", true)} value="resize">
          <ScalingIcon /> {t("Resize image…")}
          <MenuShortcut>{keys("resize")}</MenuShortcut>
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
