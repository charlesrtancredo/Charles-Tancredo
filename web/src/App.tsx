import { useCallback, useEffect, useRef, useState } from 'react';
import { BootSequence } from './components/BootSequence';
import { CoreOverlay } from './components/CoreOverlay';
import { Dock } from './components/Dock';
import { HoloCanvas } from './components/HoloCanvas';
import { ModuleSheet, type SheetView } from './components/ModuleSheet';
import { TopBar } from './components/TopBar';
import { Transcript } from './components/Transcript';
import { AgendaWidget, CompactCards, FinanceWidget, StrategyWidget, SystemWidget, TasksWidget } from './components/Widgets';
import { pingServer } from './lib/api';
import { useAssistant } from './state/useAssistant';
import type { AssistantState, ModuleId } from './state/types';

export default function App() {
  const coreRef = useRef<HTMLElement>(null);
  const [booted, setBooted] = useState(false);
  const [sheet, setSheet] = useState<SheetView>(null);
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState<number | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  const openModule = useCallback((m: ModuleId) => setSheet(m), []);
  const assistant = useAssistant({ onOpenModule: openModule });
  const { state } = assistant;

  // Latência real até o backend (quando estiver rodando).
  useEffect(() => {
    let alive = true;
    const run = async () => {
      const ms = await pingServer();
      if (alive) setLatency(ms);
    };
    run();
    const id = window.setInterval(run, 15_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  // Atalhos de teclado (desktop): 1-4 alternam estados, espaço ativa a escuta.
  useEffect(() => {
    const map: Record<string, AssistantState> = { '1': 'idle', '2': 'listening', '3': 'thinking', '4': 'speaking' };
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (map[e.key]) assistant.forceState(map[e.key]);
      if (e.code === 'Space' && !sheet) {
        e.preventDefault();
        assistant.toggleListening();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [assistant, sheet]);

  const onBootDone = useCallback(() => {
    setBooted(true);
    assistant.boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeSheet = useCallback(() => setSheet(null), []);

  return (
    <div className={`app s-${state} ${booted ? 'booted' : ''}`}>
      {!webglFailed ? (
        <HoloCanvas
          state={state}
          focusRef={coreRef}
          onCoreTap={assistant.toggleListening}
          onFps={setFps}
          onError={() => setWebglFailed(true)}
        />
      ) : (
        <div className="holo-fallback" />
      )}
      <div className="fx-scanlines" aria-hidden />
      <div className="fx-vignette" aria-hidden />

      <TopBar state={state} />

      <main className="stage">
        <aside className="side side--left">
          <SystemWidget state={state} fps={fps} latency={latency} />
          <StrategyWidget onOpen={openModule} />
        </aside>
        <section className="core-zone" ref={coreRef}>
          <CoreOverlay state={state} />
        </section>
        <aside className="side side--right">
          <AgendaWidget onOpen={openModule} />
          <TasksWidget onOpen={openModule} />
          <FinanceWidget onOpen={openModule} />
        </aside>
      </main>

      <div className="bottom">
        <Transcript state={state} live={assistant.live} interim={assistant.interim} messages={assistant.messages} />
        <CompactCards onOpen={openModule} fps={fps} state={state} />
        <Dock state={state} onSend={assistant.send} onMic={assistant.toggleListening} onModules={() => setSheet('menu')} />
      </div>

      <ModuleSheet
        view={sheet}
        onClose={closeSheet}
        onNavigate={setSheet}
        onCommand={(t) => {
          setSheet(null);
          assistant.send(t);
        }}
        onForceState={assistant.forceState}
        state={state}
      />

      {!booted && <BootSequence onDone={onBootDone} />}
    </div>
  );
}
