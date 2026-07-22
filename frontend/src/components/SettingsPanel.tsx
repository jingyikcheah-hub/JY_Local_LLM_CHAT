import { Check, Cpu, FolderOpen, RefreshCw, SlidersHorizontal, X } from 'lucide-react'
import type { GenerationSettings, ModelInfo, RuntimeStatus } from '../types'

interface Props {
  open: boolean
  models: ModelInfo[]
  runtime: RuntimeStatus
  loadingModel: string | null
  settings: GenerationSettings
  onClose: () => void
  onRefresh: () => void
  onLoadModel: (id: string) => void
  onSettings: (settings: GenerationSettings) => void
}

export function SettingsPanel({
  open,
  models,
  runtime,
  loadingModel,
  settings,
  onClose,
  onRefresh,
  onLoadModel,
  onSettings,
}: Props) {
  if (!open) return null

  return (
    <div className="modal-layer" role="presentation">
      <button className="modal-backdrop" onClick={onClose} aria-label="Close settings" />
      <section className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header>
          <div>
            <span className="panel-eyebrow">Local workspace</span>
            <h2 id="settings-title">Model & settings</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close settings">
            <X size={20} />
          </button>
        </header>

        <div className="settings-content">
          <section className="settings-section">
            <div className="section-heading">
              <div>
                <Cpu size={18} />
                <div>
                  <h3>Choose a local model</h3>
                  <p>GGUF models are loaded from the project’s models folder.</p>
                </div>
              </div>
              <button className="text-button" onClick={onRefresh}>
                <RefreshCw size={15} /> Refresh
              </button>
            </div>

            {runtime.state === 'offline' ? (
              <div className="model-empty error-state">
                <strong>Local service is offline</strong>
                <p>Start the backend, then refresh this panel.</p>
              </div>
            ) : models.length === 0 ? (
              <div className="model-empty">
                <FolderOpen size={25} />
                <strong>No GGUF models found yet</strong>
                <p>
                  Create a <code>models</code> folder in the project root, add a <code>.gguf</code> model, then
                  choose Refresh.
                </p>
              </div>
            ) : (
              <div className="model-list">
                {models.map((model) => {
                  const selected = runtime.model_id === model.id && runtime.state === 'ready'
                  const loading = loadingModel === model.id
                  return (
                    <button
                      className={`model-option ${selected ? 'selected' : ''}`}
                      key={model.id}
                      onClick={() => !selected && onLoadModel(model.id)}
                      disabled={Boolean(loadingModel)}
                    >
                      <span className="model-icon">GG</span>
                      <span className="model-copy">
                        <strong>{model.name}</strong>
                        <small>{model.size_label} · stored locally</small>
                      </span>
                      <span className="model-action">
                        {selected ? (
                          <>
                            <Check size={15} /> Active
                          </>
                        ) : loading ? (
                          'Loading…'
                        ) : (
                          'Use model'
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <section className="settings-section response-settings">
            <div className="section-heading">
              <div>
                <SlidersHorizontal size={18} />
                <div>
                  <h3>Response preferences</h3>
                  <p>Balanced defaults work well for most local models.</p>
                </div>
              </div>
            </div>

            <label className="range-field">
              <span>
                Creativity <output>{settings.temperature.toFixed(1)}</output>
              </span>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.1"
                value={settings.temperature}
                onChange={(event) => onSettings({ ...settings, temperature: Number(event.target.value) })}
              />
              <small>Lower is more precise; higher is more varied.</small>
            </label>

            <label className="select-field">
              <span>Maximum response length</span>
              <select
                value={settings.maxTokens}
                onChange={(event) => onSettings({ ...settings, maxTokens: Number(event.target.value) })}
              >
                <option value={512}>Short</option>
                <option value={1024}>Balanced</option>
                <option value={2048}>Long</option>
                <option value={4096}>Very long</option>
              </select>
            </label>

            <label className="prompt-field">
              <span>Assistant instructions</span>
              <textarea
                rows={3}
                value={settings.systemPrompt}
                onChange={(event) => onSettings({ ...settings, systemPrompt: event.target.value })}
              />
            </label>
          </section>
        </div>
      </section>
    </div>
  )
}
