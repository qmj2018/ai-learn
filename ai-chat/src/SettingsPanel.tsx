interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  apiUrl: string
  onApiUrlChange: (url: string) => void
  apiKey: string
  onApiKeyChange: (key: string) => void
  model: string
  onModelChange: (model: string) => void
  systemPrompt: string
  onSystemPromptChange: (prompt: string) => void
}

export default function SettingsPanel({
  isOpen,
  onClose,
  apiUrl,
  onApiUrlChange,
  apiKey,
  onApiKeyChange,
  model,
  onModelChange,
  systemPrompt,
  onSystemPromptChange,
}: SettingsPanelProps) {
  return (
    <>
      {/* 遮罩层 */}
      {isOpen && (
        <div className="settings-overlay" onClick={onClose} />
      )}

      {/* 设置面板抽屉 */}
      <section className={`settings-panel ${isOpen ? 'open' : ''}`}>
        <div className="settings-header">
          <h2>对话参数</h2>
          <button
            className="close-btn"
            onClick={onClose}
            aria-label="关闭设置"
          >
            ×
          </button>
        </div>
        <div className="settings-content">
          <label className="field">
            <span>API 接口地址</span>
            <input
              type="text"
              value={apiUrl}
              onChange={(event) => onApiUrlChange(event.target.value)}
              placeholder="https://api.openai.com/v1/chat/completions"
            />
          </label>

          <label className="field">
            <span>OpenAI API Key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => onApiKeyChange(event.target.value)}
              placeholder="sk-..."
            />
          </label>

          <label className="field">
            <span>模型选择</span>
            <select
              value={model}
              onChange={(event) => onModelChange(event.target.value)}
              className="model-select"
            >
              <option value="deepseek">DeepSeek</option>
              <option value="qwen3">Qwen-3</option>
            </select>
          </label>

          <label className="field">
            <span>系统提示词</span>
            <textarea
              value={systemPrompt}
              onChange={(event) => onSystemPromptChange(event.target.value)}
              rows={5}
            />
          </label>
          <p className="tip">
            API Key 仅保存在本地浏览器的 localStorage 中，不会上传到服务器。
          </p>
        </div>
      </section>
    </>
  )
}

