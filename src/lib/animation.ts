import { create } from "zustand";
import { useDoc } from "@/state/document";

/**
 * Animated GIF, WebP, PNG (APNG) and AVIF files.
 *
 * The canvas only ever draws the first frame of an <img>, so frames come from
 * the browser's ImageDecoder (WebCodecs), which decodes any frame of the
 * file on request. Frames are decoded when needed and kept in a cache
 * limited by size, so a short GIF ends up fully in memory while one of
 * thousands of frames still plays (seeking costs a few tens of ms).
 *
 * An animation belongs to an image address (ImageInfo.src). Edits that
 * change the pixels (crop, resize, straighten) make a new animation whose
 * frames are the previous one's, edited as they're needed. Undo / redo
 * bring the matching frames back by themselves. Everything else
 * (rotation, flips, adjustments, annotations) is drawn over whichever frame
 * is current. Browsers without ImageDecoder show the first frame.
 */

const ANIMATABLE_TYPES = new Set(["image/gif", "image/webp", "image/png", "image/apng", "image/avif"]);

/** Decoded frames kept per animation (≈192 MB)… */
const CACHE_PIXELS = 48_000_000;
/** …but never fewer than this many. */
const MIN_CACHED_FRAMES = 8;
/** Frames decoded ahead while playing. */
const PREFETCH = 3;
/** Frames dropped from the cache are freed this long after (a draw may still be using them). */
const RETIRE_DELAY = 3000;

/** Browsers show frames of 10 ms or less for 100 ms, so animations run at the same speed. */
const frameDelay = (durationUs: number | null) => {
  const ms = (durationUs ?? 0) / 1000;
  return ms <= 10 ? 100 : ms;
};

const retire = (bitmap: ImageBitmap) => window.setTimeout(() => bitmap.close(), RETIRE_DELAY);

const closedError = () => new Error("The animation was closed.");

/** A new bitmap of `source` (a frame given back as is gets copied, so each owner frees its own). */
async function ownBitmap(source: CanvasImageSource, original?: ImageBitmap): Promise<ImageBitmap> {
  return source instanceof ImageBitmap && source !== original ? source : createImageBitmap(source);
}

/** Where an animation's frames come from. */
interface FrameSource {
  /** A new bitmap of frame `i` (the cache owns it), with its delay (ms). */
  make(i: number): Promise<{ bitmap: ImageBitmap; delay: number }>;
  /** Every frame's delay (ms), without keeping the frames. */
  delays(): Promise<number[]>;
  close(): void;
}

/** The opened file itself. */
function decoderSource(decoder: ImageDecoder, count: number, width: number, height: number): FrameSource {
  return {
    async delays() {
      const out: number[] = [];
      for (let i = 0; i < count; i++) {
        const { image } = await decoder.decode({ frameIndex: i });
        out.push(frameDelay(image.duration));
        image.close();
      }
      return out;
    },
    async make(i) {
      const { image } = await decoder.decode({ frameIndex: i });
      try {
        return { bitmap: await createImageBitmap(image, 0, 0, width, height), delay: frameDelay(image.duration) };
      } finally {
        image.close();
      }
    },
    close: () => decoder.close(),
  };
}

/** Another animation's frames, edited by `map` as they're needed. */
function derivedSource(
  parent: Animation,
  map: (frame: ImageBitmap, index: number) => Promise<CanvasImageSource> | CanvasImageSource
): FrameSource {
  return {
    async make(i) {
      const frame = await parent.load(i);
      return { bitmap: await ownBitmap(await map(frame, i), frame), delay: parent.delays[i] };
    },
    delays: () => parent.allDelays(),
    close() {},
  };
}

/** The frames of one animation (see the top of this file). */
export class Animation {
  /** How long each frame shows (ms); known once the frame has been decoded. */
  readonly delays: number[];
  /** The frame on screen: never dropped from the cache. */
  pinned = 0;
  /** Decoded frames, least recently used first. */
  private readonly cache = new Map<number, ImageBitmap>();
  private readonly making = new Map<number, Promise<ImageBitmap>>();
  private readonly cacheSize: number;
  private closed = false;
  private allDelaysJob: Promise<number[]> | null = null;

  constructor(
    /** Number of frames. */
    readonly count: number,
    readonly width: number,
    readonly height: number,
    /** Times the animation repeats after the first play (Infinity = forever). */
    readonly loops: number,
    private readonly source: FrameSource,
    delays?: number[]
  ) {
    this.delays = delays ?? new Array(count).fill(100);
    this.cacheSize = Math.max(MIN_CACHED_FRAMES, Math.floor(CACHE_PIXELS / (width * height)));
  }

  get isClosed() {
    return this.closed;
  }

  /** Frame `i` if it can be drawn right now, else null. */
  get(i: number): ImageBitmap | null {
    if (this.closed) return null;
    return this.cache.get(i) ?? null;
  }

  /** Every frame's delay (ms); frames not shown yet are read from the file for it. */
  allDelays(): Promise<number[]> {
    this.allDelaysJob ??= this.source.delays().then((delays) => {
      delays.forEach((d, i) => {
        this.delays[i] = d;
      });
      return delays;
    });
    return this.allDelaysJob;
  }

  /** Frame `i`, decoded. Use it right away: it may be freed a few seconds later. */
  load(i: number): Promise<ImageBitmap> {
    if (this.closed) return Promise.reject(closedError());
    const hit = this.cache.get(i);
    if (hit) {
      // Most recently used goes last.
      this.cache.delete(i);
      this.cache.set(i, hit);
      return Promise.resolve(hit);
    }
    let job = this.making.get(i);
    if (!job) {
      job = this.source.make(i).then(
        ({ bitmap, delay }) => {
          this.making.delete(i);
          if (this.closed) {
            bitmap.close();
            throw closedError();
          }
          this.delays[i] = delay;
          this.cache.set(i, bitmap);
          this.evict();
          return bitmap;
        },
        (err) => {
          this.making.delete(i);
          throw err;
        }
      );
      this.making.set(i, job);
    }
    return job;
  }

  /** Start decoding the frames from `i` on, for smooth playback. */
  prefetch(i: number) {
    for (let k = 0; k < PREFETCH; k++) void this.load((i + k) % this.count).catch(() => {});
  }

  /** A small copy of frame `i`, `height` px high. */
  async thumbnail(i: number, height: number): Promise<ImageBitmap> {
    const frame = await this.load(i);
    return createImageBitmap(frame, { resizeHeight: height, resizeQuality: "medium" });
  }

  private evict() {
    for (const [i, bitmap] of this.cache) {
      if (this.cache.size <= this.cacheSize) break;
      if (i === this.pinned) continue;
      this.cache.delete(i);
      retire(bitmap);
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    for (const bitmap of this.cache.values()) retire(bitmap);
    this.cache.clear();
    this.source.close();
  }
}

const animations = new Map<string, Animation>();
/** Animations on their way (reading the file, or being made by an edit), by image address. */
const pending = new Map<string, Promise<Animation | null>>();

/* ------------------------------------------------------------------ player state */

interface PlayerState {
  /** Frames of the open image; null for a still image. */
  animation: Animation | null;
  /** Frame on screen. */
  index: number;
  playing: boolean;
  /** Frame asked for (frames bar, keys) while it's being decoded. */
  seeking: number | null;
  /** Playback speed (1 = as the file says); for viewing only, saved files keep their timing. */
  speed: number;
}

export const usePlayer = create<PlayerState>()(() => ({
  animation: null,
  index: 0,
  playing: false,
  seeking: null,
  speed: 1,
}));

/** Playback speeds on offer. */
export const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 4];

export const setSpeed = (speed: number) => usePlayer.setState({ speed });

/** Frame drawn instead of the one on screen while `drawWithFrame` runs. */
let drawOverride: ImageBitmap | null = null;

/** The frame to draw (on screen, or the one an export is rendering), or null for a still image. Read at draw time. */
export const currentFrame = (): ImageBitmap | null => {
  if (drawOverride) return drawOverride;
  const { animation, index } = usePlayer.getState();
  return animation?.get(index) ?? null;
};

/**
 * Run `render` (a synchronous render of the board, like an export) with
 * `frame` as the current frame, without moving the player: nothing on
 * screen re-renders.
 */
export function drawWithFrame<T>(frame: ImageBitmap, render: () => T): T {
  drawOverride = frame;
  try {
    return render();
  } finally {
    drawOverride = null;
  }
}

/** Re-renders the caller on every new frame; returns that frame (null for a still image). */
export const useCurrentFrame = () => usePlayer((s) => s.animation?.get(s.index) ?? null);

/** True while the open image is an animation. */
export const useIsAnimated = () => usePlayer((s) => !!s.animation);

/* ------------------------------------------------------------------ registry */

/** Show `src`'s frames when it is the open image. */
function syncWithDoc() {
  const src = useDoc.getState().doc?.image.src;
  const animation = (src && animations.get(src)) || null;
  const player = usePlayer.getState();
  if (animation === player.animation) return;
  seekTarget = null;
  if (!animation) {
    usePlayer.setState({ animation: null, index: 0, playing: false, seeking: null });
    return;
  }
  // Same animation, edited (crop, undo…): stay on the same frame. A new one starts playing.
  const continuing = !!player.animation && player.animation.count === animation.count;
  usePlayer.setState({
    animation,
    index: continuing ? player.index : 0,
    playing: continuing ? player.playing : true,
    seeking: null,
  });
  restartLoopCount();
}

/** Frames of `src` (waits while they're on their way); null for a still image. */
export async function animationFor(src: string): Promise<Animation | null> {
  return animations.get(src) ?? (await pending.get(src)) ?? null;
}

/** Read the frames of a newly opened file (in the background; the image is already on screen). */
export function loadAnimation(blob: Blob, src: string) {
  const type = blob.type;
  if (!ANIMATABLE_TYPES.has(type) || typeof ImageDecoder === "undefined") return;
  const session = useDoc.getState().session;
  const job = (async () => {
    if (!(await ImageDecoder.isTypeSupported(type))) return null;
    const decoder = new ImageDecoder({ data: await blob.arrayBuffer(), type });
    let anim: Animation | null = null;
    try {
      await decoder.tracks.ready;
      await decoder.completed;
      const track = decoder.tracks.selectedTrack;
      if (!track?.animated || track.frameCount < 2) return null;
      // The first frame gives the size.
      const { image } = await decoder.decode({ frameIndex: 0 });
      const width = image.displayWidth;
      const height = image.displayHeight;
      image.close();
      anim = new Animation(
        track.frameCount,
        width,
        height,
        track.repetitionCount,
        decoderSource(decoder, track.frameCount, width, height)
      );
      await anim.load(0);
      // Another image was opened meanwhile.
      if (useDoc.getState().session !== session) return null;
      animations.set(src, anim);
      syncWithDoc();
      return anim;
    } finally {
      if (anim) {
        if (animations.get(src) !== anim) anim.close();
      } else decoder.close();
    }
  })()
    .catch(() => null)
    .finally(() => pending.delete(src));
  pending.set(src, job);
}

/**
 * Frames for an edited copy of `from` (at `to`): `map` turns a frame into
 * its edited version (it may return the frame itself). It runs on each frame
 * when that frame is needed, so it must be quick and give the same result
 * every time (crop, resize, straighten). Call before the document switches
 * to `to`; does nothing for a still image.
 */
export async function deriveAnimation(
  from: string,
  to: string,
  map: (frame: ImageBitmap, index: number) => Promise<CanvasImageSource> | CanvasImageSource
) {
  const source = await animationFor(from);
  if (!source) return;
  const session = useDoc.getState().session;
  const job = (async () => {
    // The first frame is made now: it gives the size.
    const frame = await source.load(0);
    const first = await ownBitmap(await map(frame, 0), frame);
    const derived = new Animation(source.count, first.width, first.height, source.loops, derivedSource(source, map), [
      ...source.delays,
    ]);
    first.close();
    // Another image was opened meanwhile.
    if (useDoc.getState().session !== session) {
      derived.close();
      throw closedError();
    }
    animations.set(to, derived);
    return derived;
  })();
  pending.set(
    to,
    job.catch(() => null)
  );
  try {
    await job;
  } finally {
    pending.delete(to);
  }
}

// A new image: drop the frames of the previous one. Edits and undo / redo:
// show the frames that belong to the image now on screen.
useDoc.subscribe((s, prev) => {
  if (s.session !== prev.session || !s.doc) {
    const keep = s.doc?.image.src;
    for (const [src, anim] of animations) {
      if (src === keep) continue;
      anim.close();
      animations.delete(src);
    }
  }
  if (s.doc?.image.src !== prev.doc?.image.src || s.session !== prev.session) syncWithDoc();
});

/* ------------------------------------------------------------------ playback */

let timer = 0;
/** Changes whenever playback is rescheduled, so a late frame doesn't land after it. */
let tick = 0;
/** Full plays since the animation started (or play was pressed). */
let loopsDone = 0;
/** When the frame playback just moved to was due: the next one is due its delay after that, however long decoding took. */
let shownDue: number | null = null;

const restartLoopCount = () => {
  loopsDone = 0;
};

function schedule() {
  window.clearTimeout(timer);
  const token = ++tick;
  const { animation, index, playing, speed } = usePlayer.getState();
  if (!animation || !playing) return;
  const wraps = index + 1 >= animation.count;
  const next = wraps ? 0 : index + 1;
  animation.prefetch(next);
  const now = performance.now();
  // Far behind (a background tab): carry on from now.
  const base = shownDue !== null && now - shownDue < 1000 ? shownDue : now;
  shownDue = null;
  const due = base + (animation.delays[index] ?? 100) / speed;
  timer = window.setTimeout(async () => {
    if (wraps) {
      loopsDone++;
      // Like browsers: after the last repeat, stay on the last frame.
      if (loopsDone > animation.loops) {
        usePlayer.setState({ playing: false });
        return;
      }
    }
    try {
      await animation.load(next);
    } catch {
      return; // frame unavailable (image closed)
    }
    if (token !== tick) return;
    shownDue = due;
    usePlayer.setState({ index: next });
  }, Math.max(0, due - now));
}

usePlayer.subscribe((s, prev) => {
  const { animation, index } = s;
  if (animation) {
    animation.pinned = index;
    // A frame that isn't decoded (any more): show it once it is.
    if (!animation.get(index)) {
      void animation.load(index).then(
        () => {
          const now = usePlayer.getState();
          if (now.animation === animation && now.index === index) usePlayer.setState({ index });
        },
        () => {}
      );
    }
  }
  if (index !== prev.index || s.playing !== prev.playing || animation !== prev.animation || s.speed !== prev.speed)
    schedule();
});

/** Play on from the frame on screen. */
export function play() {
  if (!usePlayer.getState().animation) return;
  restartLoopCount();
  usePlayer.setState({ playing: true });
}

export const pause = () => usePlayer.setState({ playing: false });

export const togglePlay = () => (usePlayer.getState().playing ? pause() : play());

/** Frame asked for; only the latest is shown (dragging the scrubber asks for many). */
let seekTarget: number | null = null;
let seekBusy = false;

/** Show one frame (and stop there); shown once it's decoded. */
export function showFrame(index: number) {
  const { animation } = usePlayer.getState();
  if (!animation) return;
  const count = animation.count;
  seekTarget = ((index % count) + count) % count;
  usePlayer.setState({ playing: false, seeking: seekTarget });
  if (!seekBusy) void seek();
}

/**
 * Decode the frame asked for, then the newest one asked for meanwhile, and
 * so on. (Another image or edit clears the request: see syncWithDoc.)
 */
async function seek() {
  seekBusy = true;
  try {
    while (seekTarget !== null) {
      const animation = usePlayer.getState().animation;
      const n = seekTarget;
      let ok = !!animation;
      if (animation) {
        try {
          await animation.load(n);
        } catch {
          ok = false;
        }
      }
      // Asked for another frame meanwhile: go there instead.
      if (seekTarget !== n) continue;
      seekTarget = null;
      if (ok && usePlayer.getState().animation === animation) usePlayer.setState({ index: n, seeking: null });
      else usePlayer.setState({ seeking: null });
    }
  } finally {
    seekBusy = false;
  }
}

/** One frame back or forward from the one on screen (or on its way). */
export function stepFrame(dir: 1 | -1) {
  const { index, seeking } = usePlayer.getState();
  showFrame((seeking ?? index) + dir);
}
