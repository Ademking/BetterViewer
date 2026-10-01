import { Fragment, type ReactNode } from "react";

/**
 * Put elements into a translated sentence: `slots({text}, { key: <Kbd>K</Kbd> })`
 * replaces each `{key}` in the text (already passed through t) with its element.
 */
export function withSlots(text: string, slots: Record<string, ReactNode>): ReactNode {
  return text.split(/(\{\w+\})/).map((part, i) => {
    const m = part.match(/^\{(\w+)\}$/);
    return <Fragment key={i}>{m && m[1] in slots ? slots[m[1]] : part}</Fragment>;
  });
}
