import {
  Axis3dIcon,
  MirrorRectangularIcon,
  RotateCcwIcon,
  RotateCwIcon,
  RotateCwSquareIcon,
  ScalingIcon,
} from "lucide-react";
import { Menu, MenuContent, MenuGroup, MenuItem, MenuSeparator, MenuShortcut, MenuTrigger } from "@/components/ui/menu";
import { ALT, MOD, ToolButton } from "@/components/tools/ToolButton";
import { flipHorizontal, flipVertical, rotate } from "@/lib/actions";
import { startStraighten } from "@/lib/straighten";
import { normRotation, useDoc } from "@/state/document";
import { useUi } from "@/state/ui";

export function TransformTools() {
  const rotation = useDoc((s) => normRotation(s.doc?.rotation ?? 0));
  const flipX = useDoc((s) => s.doc?.flipX ?? false);
  const flipY = useDoc((s) => s.doc?.flipY ?? false);
  const modified = rotation !== 0 || flipX || flipY;

  return (
    <Menu positioning={{ placement: "top", gutter: 14 }}>
      <MenuTrigger asChild>
        <ToolButton active={false} label="Rotate, flip & resize" shortcut="R">
          <RotateCwSquareIcon />
          {modified && (
            <span className="absolute top-1 right-1 size-1.5 rounded-full bg-brand" />
          )}
        </ToolButton>
      </MenuTrigger>
      <MenuContent className="w-56">
        <MenuGroup heading={`Transform · ${rotation}°`}>
          <MenuItem closeOnSelect={false} onSelect={() => rotate(-1)} value="rotate-left">
            <RotateCcwIcon /> Rotate left
            <MenuShortcut>Shift R</MenuShortcut>
          </MenuItem>
          <MenuItem closeOnSelect={false} onSelect={() => rotate(1)} value="rotate-right">
            <RotateCwIcon /> Rotate right
            <MenuShortcut>R</MenuShortcut>
          </MenuItem>
          <MenuItem closeOnSelect={false} onSelect={flipHorizontal} value="flip-h">
            <MirrorRectangularIcon /> Flip horizontal
            <MenuShortcut>Shift H</MenuShortcut>
          </MenuItem>
          <MenuItem closeOnSelect={false} onSelect={flipVertical} value="flip-v">
            <MirrorRectangularIcon className="rotate-90" /> Flip vertical
            <MenuShortcut>Shift V</MenuShortcut>
          </MenuItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuItem onSelect={startStraighten} value="straighten">
          <Axis3dIcon /> Straighten…
        </MenuItem>
        <MenuItem onSelect={() => useUi.getState().togglePanel("resize", true)} value="resize">
          <ScalingIcon /> Resize image…
          <MenuShortcut>{MOD} {ALT} I</MenuShortcut>
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
