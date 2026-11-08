import { useEffect, useRef, useState, type ReactNode } from "react";

// Keep hotspots and sprites in image coordinates while the camera fills any viewport.
export default function SceneStage({ src, width, height, alt, focusX = 50, children }: {
  src: string; width: number; height: number; alt: string; focusX?: number; children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setBounds({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const scale = Math.max(bounds.width / width, bounds.height / height);
  const x = Math.max(bounds.width - width * scale, Math.min(0, bounds.width / 2 - width * scale * focusX / 100));
  const y = (bounds.height - height * scale) / 2;
  return <div className="scene-stage" ref={ref}>
    <div className="scene-canvas" style={{ width, height, transform: `translate(${x}px, ${y}px) scale(${scale})` }}>
      <img className="scene-art" src={src} width={width} height={height} alt={alt} fetchPriority="high" />
      {children}
    </div>
  </div>;
}
