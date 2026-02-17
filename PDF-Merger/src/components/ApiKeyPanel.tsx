import { useState, useEffect } from 'react'
import { Key, Eye, EyeOff, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react'
import { setApiKey, hasApiKey } from '../lib/ai'
import { cn } from '../lib/utils'

const STORAGE_KEY = 'pdf-merger-api-key'

interface ApiKeyPanelProps {
  onKeyChange?: () => void
}

export function ApiKeyPanel({ onKeyChange }: ApiKeyPanelProps) {
  const [apiKey, setLocalApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [error, setError] = useState('')

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem(STORAGE_KEY)
    if (savedKey) {
      setLocalApiKey(savedKey)
      setApiKey(savedKey)
      setIsSaved(true)
    }
  }, [])

  const handleSave = () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key')
      return
    }

    if (apiKey.length < 10) {
      setError('API key seems too short')
      return
    }

    localStorage.setItem(STORAGE_KEY, apiKey)
    setApiKey(apiKey)
    setIsSaved(true)
    setError('')
    onKeyChange?.()
  }

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY)
    setLocalApiKey('')
    setApiKey('')
    setIsSaved(false)
    setError('')
    onKeyChange?.()
  }

  const isValid = hasApiKey() || isSaved

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Key className="w-4 h-4 text-gray-600" />
        <h3 className="font-medium text-gray-800">API Key Configuration</h3>
        {isValid ? (
          <span className="flex items-center gap-1 text-xs text-green-600 ml-auto">
            <CheckCircle className="w-3 h-3" />
            Configured
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-amber-600 ml-auto">
            <AlertCircle className="w-3 h-3" />
            Required
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            SiliconFlow API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setLocalApiKey(e.target.value)
                setIsSaved(false)
                setError('')
              }}
              placeholder="sk-..."
              className={cn(
                'w-full px-3 py-2 pr-20 border rounded-lg text-sm',
                error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500',
                'focus:outline-none focus:ring-2'
              )}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!apiKey.trim()}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              isSaved
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300'
            )}
          >
            {isSaved ? 'Saved' : 'Save'}
          </button>

          {isSaved && (
            <button
              onClick={handleClear}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            >
              Clear
            </button>
          )}
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-gray-500">
            Don't have an API key?{' '}
            <a
              href="https://siliconflow.cn"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
            >
              Get free API key
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
