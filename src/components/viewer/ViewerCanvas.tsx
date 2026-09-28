import type Konva from "konva";
import { memo, useCallback, useLayoutEffect, useRef } from "react";
import { Group, Layer, Stage } from "react-konva";
import { CropShapes, CropTransformer } from "@/components/tools/CropTool";
import { QrHighlights } from "@/components/tools/QrScanner";
import { AnnotationNode } from "@/components/viewer/AnnotationNode";
import { DocGroup } from "@/components/viewer/DocGroup";
import { ImageNode } from "@/components/viewer/ImageNode";
import { SelectedLineHandles, SelectionTransformer } from "@/components/viewer/SelectionTransformer";
import { SpotlightOverlay } from "@/components/viewer/SpotlightNode";
import { MeasureOverlay } from "@/components/viewer/MeasureOverlay";
import { StraightenOverlay } from "@/components/tools/StraightenTool";
import { Rulers } from "@/components/viewer/Rulers";
import { TextEditorOverlay } from "@/components/viewer/TextEditorOverlay";
import { useCanvasInteractions } from "@/hooks/useCanvasInteractions";
import { useElementSize } from "@/hooks/useElementSize";
import { stageRegistry } from "@/lib/stageRegistry";
import { viewport } from "@/lib/viewport";
import { cn } from "@/lib/utils";
import { displaySize, useDoc } from "@/state/document";
import { useDraft } from "@/state/draft";
import { useUi } from "@/state/ui";

const Annotations = memo(function Annotations() {
  const annotations = useDoc((s) => s.doc?.annotations);
  const tool = useUi((s) => s.tool);
  const spaceHeld = useUi((s) => s.spaceHeld);
  const editingTextId = useUi((s) => s.editingTextId);
  const docUnit = useUi((s) => s.docUnit);
  const draggable = tool === "select" && !spaceHeld;
  const hitWidth = 12 * docUnit;
  if (tool === "straighten") return null;
  return (
    <>
      {annotations?.map((a) => (
        <AnnotationNode
          a={a}
          draggable={draggable}
          hidden={a.id === editingTextId || !!a.hidden}
          hitWidth={hitWidth}
          key={a.id}
        />
      ))}
    </>
  );
});

const DraftNode = memo(function DraftNode() {
  const draft = useDraft((s) => s.draft);
  if (!draft) return null;
  return <AnnotationNode a={draft} draggable={false} hidden={false} hitWidth={0} />;
});

const cursorFor = (tool: string, panning: boolean, space: boolean) => {
  if (panning) return "cursor-grabbing";
  if (space) return "cursor-grab";
  switch (tool) {
    case "pan":
      return "cursor-grab";
    case "draw":
    case "shape":
    case "eyedropper":
    case "redact":
    case "spotlight":
    case "measure":
    case "straighten":
      return "cursor-crosshair";
    case "text":
      return "cursor-text";
    default:
      return "cursor-default data-[hover=annotation]:cursor-move";
  }
};

export function ViewerCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const imageLayerRef = useRef<Konva.Layer>(null);
  const annotationLayerRef = useRef<Konva.Layer>(null);
  const size = useElementSize(containerRef);
  const session = useDoc((s) => s.session);
  const doc = useDoc((s) => s.doc);
  const tool = useUi((s) => s.tool);
  const isPanning = useUi((s) => s.isPanning);
  const spaceHeld = useUi((s) => s.spaceHeld);

  useCanvasInteractions(containerRef);

  useLayoutEffect(() => {
    stageRegistry.stage = stageRef.current;
    stageRegistry.imageLayer = imageLayerRef.current;
    stageRegistry.annotationLayer = annotationLayerRef.current;
    viewport.attach(stageRef.current);
    return () => {
      viewport.attach(null);
      stageRegistry.stage = null;
    };
  }, []);

  useLayoutEffect(() => {
    if (size.width && size.height) viewport.setSize(size.width, size.height);
  }, [size.width, size.height]);

  // Keep the viewport informed about the displayed document size.
  const dispW = doc ? displaySize(doc).width : 0;
  const dispH = doc ? displaySize(doc).height : 0;
  const lastSession = useRef(-1);
  useLayoutEffect(() => {
    if (!dispW || !dispH || !size.width) return;
    if (lastSession.current !== session) {
      lastSession.current = session;
      viewport.setContent(dispW, dispH, false);
      viewport.initial();
    } else {
      viewport.setContent(dispW, dispH);
    }
  }, [dispW, dispH, session, size.width]);

  const onImageGroup = useCallback((n: Konva.Group | null) => {
    stageRegistry.imageGroup = n;
  }, []);
  const onAnnotationGroup = useCallback((n: Konva.Group | null) => {
    stageRegistry.annotationGroup = n;
  }, []);

  return (
    <div
      className={cn(
        "absolute inset-0 isolate touch-none select-none outline-none",
        cursorFor(tool, isPanning, spaceHeld)
      )}
      ref={containerRef}
    >
      <Stage height={size.height || 1} ref={stageRef} width={size.width || 1}>
        <Layer listening={false} ref={imageLayerRef}>
          {doc && (
            <DocGroup key={session} onNode={onImageGroup}>
              <ImageNode />
            </DocGroup>
          )}
        </Layer>
        <Layer ref={annotationLayerRef}>
          {doc && (
            <DocGroup key={session} onNode={onAnnotationGroup}>
              {/* Annotations are clipped to the image, as in the export. */}
              <Group
                clipHeight={doc.image.height}
                clipWidth={doc.image.width}
                clipX={0}
                clipY={0}
              >
                {tool !== "straighten" && <SpotlightOverlay />}
                <Annotations />
                <DraftNode />
              </Group>
              <SelectedLineHandles />
              <CropShapes />
              <QrHighlights />
            </DocGroup>
          )}
          <SelectionTransformer />
          <CropTransformer />
        </Layer>
      </Stage>
      <TextEditorOverlay />
      <MeasureOverlay />
      <StraightenOverlay />
      <Rulers />
    </div>
  );
}
