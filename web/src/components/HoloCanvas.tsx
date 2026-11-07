import { useEffect, useRef, type RefObject } from 'react';
import { HoloEngine } from '../hologram/HoloEngine';
import type { AssistantState } from '../state/types';

interface Props {
  state: AssistantState;
  /** Elemento que define a região onde o núcleo é centralizado. */
  focusRef: RefObject<HTMLElement | null>;
  onCoreTap?: () => void;
  onFps?: (fps: number) => void;
  onError?: () => void;
  getLevel?: () => number | null;
}

export function HoloCanvas({ state, focusRef, onCoreTap, onFps, onError, getLevel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<HoloEngine | null>(null);
  const cbs = useRef({ onCoreTap, onFps, getLevel });
  cbs.current = { onCoreTap, onFps, getLevel };

  useEffect(() => {
    const canvas = canvasRef.current!;
    let engine: HoloEngine;
    try {
      engine = new HoloEngine(canvas, {
        onCoreTap: () => cbs.current.onCoreTap?.(),
        onFps: (f) => cbs.current.onFps?.(f),
        getLevel: () => cbs.current.getLevel?.() ?? null,
      });
    } catch (err) {
      console.error('WebGL indisponível', err);
      onError?.();
      return;
    }
    engineRef.current = engine;

    const measure = () => {
      engine.resize(window.innerWidth, window.innerHeight);
      const el = focusRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        engine.setFocus({ x: r.left, y: r.top, w: r.width, h: r.height });
      } else {
        engine.setFocus({ x: 0, y: 0, w: window.innerWidth, h: window.innerHeight });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (focusRef.current) ro.observe(focusRef.current);
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setState(state);
  }, [state]);

  return <canvas ref={canvasRef} className="holo-canvas" aria-label="Núcleo holográfico do JARVIS" />;
}
