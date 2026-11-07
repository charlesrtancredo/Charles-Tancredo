import { useCallback, useEffect, useRef, useState } from 'react';
import { BootSequence } from './components/BootSequence';
import { CoreOverlay } from './components/CoreOverlay';
import { Dock } from './components/Dock';
import { HoloCanvas } from './components/HoloCanvas';
import { ModuleSheet, type SheetView } from './components/ModuleSheet';
import { TopBar } from './components/TopBar';
import { Transcript } from './components/Transcript';
import { AgendaWidget, CompactCards, FinanceWidget, StrategyWidget, SystemWidget, TasksWidget } from './components/Widgets';
import { pingServer, type ServerInfo } from './lib/api';
import { useSettings } from './lib/settings';
import { resolveEngine, useAssistant } from './state/useAssistant';
import type { AssistantState, ModuleId } from './state/types';

export default function App() {
  const coreRef = useRef<HTMLElement>(null);
  const [booted, setBooted] = useState(false);
  const [sheet, setSheet] = useState<SheetView>(null);
  const [fps, setFps] = useState(0);
  const [server, setServer] = useState<ServerInfo | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const settings = useSettings();

  const openModule = useCallback((m: ModuleId) => setSheet(m), []);
  const closeSheet = useCallback(() => setSheet(null), []);
  const assistant = useAssistant({ onOpenModule: openModule, onCloseModule: closeSheet, server });
  const { state } = assistant;
  const engine = assistant.activeEngine ?? resolveEngine(settings, server);

  // Estado do backend (latência real + serviços configurados).
  useEffect(() => {
    let alive = true;
    const run = async () => {
      const info = await pingServer();
      if (alive) setServer(info);
    };
    run();
    const id = window.setInterval(run, 15_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [settings.serverUrl]);

  // Atalhos de teclado (desktop): 1-4 alternam estados, espaço ativa a escuta.
  const assistantRef = useRef(assistant);
  assistantRef.current = assistant;
  useEffect(() => {
    const map: Record<string, AssistantState> = { '1': 'idle', '2': 'listening', '3': 'thinking', '4': 'speaking' };
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const a = assistantRef.current;
      if (map[e.key]) a.forceState(map[e.key]);
      if (e.code === 'Space' && !sheet) {
        e.preventDefault();
        a.toggleListening();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet]);

  const onBootDone = useCallback(() => {
    setBooted(true);
    assistantRef.current.boot();
  }, []);

  return (
    <div className={`app s-${state} ${booted ? 'booted' : ''}`}>
      {!webglFailed ? (
        <HoloCanvas
          state={state}
          focusRef={coreRef}
          onCoreTap={assistant.tapCore}
          onFps={setFps}
          onError={() => setWebglFailed(true)}
          getLevel={assistant.getLevel}
        />
      ) : (
        <div className="holo-fallback" />
      )}
      <div className="fx-scanlines" aria-hidden />
      <div className="fx-vignette" aria-hidden />

      <TopBar state={state} engine={engine} conn={assistant.conn} onSettings={() => setSheet('settings')} />

      <main className="stage">
        <aside className="side side--left">
          <SystemWidget state={state} fps={fps} latency={server?.latency ?? null} />
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
        <Transcript
          state={state}
          live={assistant.live}
          interim={assistant.interim}
          notice={assistant.notice}
          inSession={assistant.conn === 'on'}
          messages={assistant.messages}
        />
        <CompactCards onOpen={openModule} fps={fps} state={state} />
        <Dock
          state={state}
          conn={assistant.conn}
          onSend={assistant.send}
          onMic={assistant.toggleListening}
          onModules={() => setSheet('menu')}
        />
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
        engine={engine}
        conn={assistant.conn}
        server={server}
        onServerChange={setServer}
      />

      {!booted && <BootSequence onDone={onBootDone} />}
    </div>
  );
}
