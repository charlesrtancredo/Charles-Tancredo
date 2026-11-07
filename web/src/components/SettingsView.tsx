import { useState } from 'react';
import { pingServer, type ServerInfo } from '../lib/api';
import { updateSettings, useSettings, type VoiceMode } from '../lib/settings';
import { resolveEngine } from '../state/useAssistant';
import { localVoiceSupport } from '../voice/localVoice';

const MODES: { id: VoiceMode; label: string; desc: string }[] = [
  { id: 'auto', label: 'Automático', desc: 'Tempo real quando o servidor estiver pronto; senão, voz do dispositivo.' },
  { id: 'realtime', label: 'Tempo real', desc: 'Conversa natural com IA (OpenAI) via servidor.' },
  { id: 'local', label: 'Voz local', desc: 'Reconhecimento e fala do próprio iPhone. Sem servidor.' },
  { id: 'demo', label: 'Demonstração', desc: 'Escuta simulada, apenas visual.' },
];

interface Props {
  server: ServerInfo | null;
  onServerChange: (s: ServerInfo | null) => void;
}

export function SettingsView({ server, onServerChange }: Props) {
  const s = useSettings();
  const [url, setUrl] = useState(s.serverUrl);
  const [code, setCode] = useState(s.accessCode);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState('');

  const engine = resolveEngine(s, server);
  const dirty = url !== s.serverUrl || code !== s.accessCode;

  const save = async () => {
    updateSettings({ serverUrl: url.trim(), accessCode: code.trim() });
    setTesting(true);
    setResult('');
    const info = await pingServer();
    onServerChange(info);
    setTesting(false);
    if (!info) setResult('Servidor inacessível. Verifique o endereço e o CORS (ALLOWED_ORIGINS).');
    else
      setResult(
        `Servidor online · ${info.latency} ms · OpenAI ${info.services.openai ? 'configurada' : 'ausente'} · código de acesso ${
          info.services.accessCode ? 'ativo' : 'não definido'
        }`,
      );
  };

  return (
    <div className="stack">
      <section className="block">
        <h3>Motor de voz</h3>
        <div className="radio-list">
          {MODES.map((m) => (
            <button key={m.id} className={`radio ${s.voiceMode === m.id ? 'on' : ''}`} onClick={() => updateSettings({ voiceMode: m.id })}>
              <span className="radio__dot" />
              <span>
                <b>{m.label}</b>
                <small>{m.desc}</small>
              </span>
            </button>
          ))}
        </div>
        <p className="muted small">
          Em uso no próximo toque: <b className="mono">{engine === 'realtime' ? 'TEMPO REAL' : engine === 'local' ? 'VOZ LOCAL' : 'DEMONSTRAÇÃO'}</b>
          {!localVoiceSupport.recognition() && ' · reconhecimento de voz do navegador indisponível'}
        </p>
        <label className="toggle">
          <input type="checkbox" checked={s.speakReplies} onChange={(e) => updateSettings({ speakReplies: e.target.checked })} />
          <span className="toggle__ui" />
          Falar respostas em voz alta (voz local e demonstração)
        </label>
      </section>

      <section className="block">
        <h3>Servidor JARVIS</h3>
        <label className="field">
          <span>Endereço do backend</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://seu-jarvis.onrender.com (vazio = este site)"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>
        <label className="field">
          <span>Código de acesso pessoal</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            type="password"
            placeholder="ACCESS_CODE definido no servidor"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="current-password"
          />
        </label>
        <button className="primary-btn" onClick={save} disabled={testing}>
          {testing ? 'Testando…' : dirty ? 'Salvar e testar conexão' : 'Testar conexão'}
        </button>
        {result && <p className="muted small">{result}</p>}
        <p className="muted small">
          O código fica salvo apenas neste dispositivo. As chaves da OpenAI e do Supabase permanecem exclusivamente no servidor.
        </p>
      </section>
    </div>
  );
}
