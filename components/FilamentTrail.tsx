"use client";

import { useEffect, useRef } from "react";

type Point = { x: number; y: number };

const COLOR_MAIN = "#FBB000";
const COLOR_HALO = "#FB6D1B";
const COLOR_CORE_HOT = "#FFF7E6";
const SAMPLE_COUNT = 400;

/**
 * Reads every [data-filament="N"] element on the page, sorts by N, and
 * returns their centers relative to `reference`'s current bounding rect.
 * Positions stay valid while the page scrolls because both the reference
 * element and the spans move together in normal document flow.
 */
function getFilamentPoints(reference: Element): Point[] {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>("[data-filament]")
  ).sort((a, b) => Number(a.dataset.filament) - Number(b.dataset.filament));

  const refRect = reference.getBoundingClientRect();

  return nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - refRect.left,
      y: rect.top + rect.height / 2 - refRect.top,
    };
  });
}

/** Catmull-Rom through `points`, converted to a cubic-Bézier SVG path `d`. */
function catmullRomToBezierPath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  let d = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }

  return d;
}

export default function FilamentTrail() {
  const svgRef = useRef<SVGSVGElement>(null);
  const guideRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGPathElement>(null);
  const mainRef = useRef<SVGPathElement>(null);
  const hotPointRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const guide = guideRef.current;
    const glow = glowRef.current;
    const main = mainRef.current;
    const hotPoint = hotPointRef.current;
    if (!svg || !guide || !glow || !main || !hotPoint) return;

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    let scrollRafId: number | null = null;
    let layoutRafId: number | null = null;
    let totalLength = 0;
    let samples: { len: number; y: number }[] = [];
    // Document-relative Y of the SVG's own top. Invariant under scroll
    // (rect.top decreases exactly as window.scrollY increases), so it's
    // only recomputed on rebuild, not on every scroll frame.
    let refDocumentTop = 0;

    function positionHotPoint(len: number) {
      const pt = main!.getPointAtLength(len);
      hotPoint!.setAttribute("transform", `translate(${pt.x}, ${pt.y})`);
    }

    // Binary search the sampled {length, y} table for the length whose
    // point sits closest to targetY (in the SVG's local coordinate space).
    function lengthForY(targetY: number): number {
      if (samples.length === 0) return 0;
      if (targetY <= samples[0].y) return 0;
      if (targetY >= samples[samples.length - 1].y) return totalLength;

      let lo = 0;
      let hi = samples.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (samples[mid].y <= targetY) lo = mid;
        else hi = mid;
      }

      const prev = samples[lo];
      const curr = samples[hi];
      const span = curr.y - prev.y;
      const t = span === 0 ? 0 : (targetY - prev.y) / span;
      return prev.len + (curr.len - prev.len) * t;
    }

    function update() {
      if (reducedMotionQuery.matches || totalLength === 0) return;

      const targetYDocument = window.scrollY + window.innerHeight * 0.55;
      const targetYLocal = targetYDocument - refDocumentTop;

      const len = lengthForY(targetYLocal);
      const offset = totalLength - len;

      main!.style.strokeDashoffset = `${offset}`;
      glow!.style.strokeDashoffset = `${offset}`;
      positionHotPoint(len);
    }

    function rebuild() {
      const points = getFilamentPoints(svg!);
      const d = catmullRomToBezierPath(points);

      guide!.setAttribute("d", d);
      glow!.setAttribute("d", d);
      main!.setAttribute("d", d);

      if (points.length < 2) {
        totalLength = 0;
        samples = [];
        return;
      }

      totalLength = main!.getTotalLength();

      samples = [];
      for (let i = 0; i <= SAMPLE_COUNT; i++) {
        const len = (totalLength * i) / SAMPLE_COUNT;
        samples.push({ len, y: main!.getPointAtLength(len).y });
      }

      const rect = svg!.getBoundingClientRect();
      refDocumentTop = rect.top + window.scrollY;

      if (reducedMotionQuery.matches) {
        main!.style.strokeDasharray = "none";
        glow!.style.strokeDasharray = "none";
        main!.style.strokeDashoffset = "0";
        glow!.style.strokeDashoffset = "0";
        positionHotPoint(totalLength);
      } else {
        main!.style.strokeDasharray = `${totalLength}`;
        glow!.style.strokeDasharray = `${totalLength}`;
        update();
      }
    }

    function onScroll() {
      if (scrollRafId != null) return;
      scrollRafId = requestAnimationFrame(() => {
        scrollRafId = null;
        update();
      });
    }

    function onLayoutChange() {
      if (layoutRafId != null) return;
      layoutRafId = requestAnimationFrame(() => {
        layoutRafId = null;
        rebuild();
      });
    }

    rebuild();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onLayoutChange, { passive: true });

    const resizeObserver = new ResizeObserver(onLayoutChange);
    resizeObserver.observe(document.body);

    document.fonts?.ready?.then(onLayoutChange).catch(() => {});

    reducedMotionQuery.addEventListener("change", onLayoutChange);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onLayoutChange);
      resizeObserver.disconnect();
      reducedMotionQuery.removeEventListener("change", onLayoutChange);
      if (scrollRafId != null) cancelAnimationFrame(scrollRafId);
      if (layoutRafId != null) cancelAnimationFrame(layoutRafId);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 5,
        overflow: "visible",
      }}
    >
      {/* Static guide dotted line — always faintly visible along the full path */}
      <path
        ref={guideRef}
        fill="none"
        stroke={COLOR_MAIN}
        strokeWidth={2}
        strokeDasharray="1 14"
        strokeLinecap="round"
        opacity={0.14}
      />

      {/* Blurred glow behind the main stroke */}
      <path
        ref={glowRef}
        fill="none"
        stroke={COLOR_MAIN}
        strokeWidth={15}
        strokeLinecap="round"
        opacity={0.16}
        style={{ filter: "blur(3px)" }}
      />

      {/* Main filament stroke */}
      <path
        ref={mainRef}
        fill="none"
        stroke={COLOR_MAIN}
        strokeWidth={5}
        strokeLinecap="round"
      />

      {/* Molten tip */}
      <g ref={hotPointRef}>
        <circle r={14} fill={COLOR_HALO} opacity={0.35} />
        <circle r={7} fill={COLOR_MAIN} />
        <circle r={2.5} fill={COLOR_CORE_HOT} />
      </g>
    </svg>
  );
}
