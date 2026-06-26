export interface WizardTestQverisResult {
  ok: boolean
  message?: string
}

const REQUEST_TIMEOUT_MS = 15_000
const QVERIS_SEARCH_URL = 'https://qveris.ai/api/v1/search'

function resolveQverisErrorMessage(status: number): string {
  if (status === 401 || status === 403) {
    return 'QVeris API key is invalid or not authorized'
  }
  if (status === 429) {
    return 'QVeris rate limit reached. Try again later'
  }
  return `QVeris request failed (HTTP ${status})`
}

export async function testQverisConnection(
  apiKey: string,
): Promise<WizardTestQverisResult> {
  const trimmedKey = apiKey.trim()
  if (!trimmedKey) {
    return { ok: false, message: 'Enter QVeris API Key' }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(QVERIS_SEARCH_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${trimmedKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: 'weather forecast API',
        limit: 1,
      }),
      signal: controller.signal,
    })

    if (response.ok) {
      return { ok: true, message: 'Connection succeeded' }
    }

    return {
      ok: false,
      message: resolveQverisErrorMessage(response.status),
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, message: 'Connection timed out. Check network or proxy settings' }
    }
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('fetch failed') || message.includes('ENOTFOUND')) {
      return { ok: false, message: 'Network error. Check connectivity' }
    }
    return { ok: false, message: `Connection failed: ${message}` }
  } finally {
    clearTimeout(timeoutId)
  }
}
