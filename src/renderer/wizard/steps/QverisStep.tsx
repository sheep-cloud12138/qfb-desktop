import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWizardStore } from '@/stores/wizard-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
} from 'lucide-react'

type TestStatus = 'idle' | 'testing' | 'success' | 'error'

interface TestState {
  status: TestStatus
  message: string
}

export function QverisStep() {
  const { t } = useTranslation()
  const { qverisConfig, setQverisConfig } = useWizardStore()
  const [showApiKey, setShowApiKey] = useState(false)
  const [testState, setTestState] = useState<TestState>({
    status: 'idle',
    message: '',
  })

  const handleTestConnection = useCallback(async () => {
    setTestState({ status: 'testing', message: '' })
    try {
      const result = await window.electronAPI.wizardTestQveris(qverisConfig.apiKey)
      if (result.ok) {
        setTestState({ status: 'success', message: t('wizard.qveris.connectionSuccess') })
      } else {
        setTestState({
          status: 'error',
          message: result.message ?? t('wizard.qveris.connectionFailed'),
        })
      }
    } catch {
      setTestState({
        status: 'error',
        message: t('wizard.qveris.networkError'),
      })
    }
  }, [qverisConfig.apiKey, t])

  const canTest = qverisConfig.apiKey.trim().length > 0

  return (
    <div className="space-y-5 sm:space-y-6 max-w-2xl mx-auto">
      <header>
        <div className="flex items-center gap-2">
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight">{t('wizard.qveris.title')}</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {t('wizard.qveris.optionalBadge')}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t('wizard.qveris.subtitle')}</p>
      </header>

      <fieldset className="space-y-1.5">
        <label htmlFor="qveris-api-key-input" className="text-sm font-medium">
          {t('wizard.qveris.apiKey')}
        </label>
        <div className="relative">
          <Input
            id="qveris-api-key-input"
            type={showApiKey ? 'text' : 'password'}
            value={qverisConfig.apiKey}
            onChange={(e) => {
              setQverisConfig({ apiKey: e.target.value })
              setTestState({ status: 'idle', message: '' })
            }}
            placeholder={t('wizard.qveris.placeholder')}
            autoComplete="off"
            className="pr-10 font-mono"
          />
          <button
            type="button"
            onClick={() => setShowApiKey((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showApiKey ? t('wizard.qveris.hideApiKey') : t('wizard.qveris.showApiKey')}
          >
            {showApiKey ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('wizard.qveris.apiKeyStored')}
        </p>
      </fieldset>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleTestConnection()}
            disabled={!canTest || testState.status === 'testing'}
          >
            {testState.status === 'testing' ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Sparkles />
            )}
            {testState.status === 'testing' ? t('wizard.qveris.testing') : t('wizard.qveris.testConnection')}
          </Button>

          {testState.status === 'success' && (
            <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              {testState.message}
            </span>
          )}

          {testState.status === 'error' && (
            <span className="inline-flex items-center gap-1.5 text-sm text-destructive">
              <XCircle className="w-4 h-4" />
              {testState.message}
            </span>
          )}
        </div>

        {testState.status === 'idle' && (
          <p className="text-xs text-muted-foreground">
            {t('wizard.qveris.skipHint')}
          </p>
        )}
      </div>
    </div>
  )
}
