/**
 * AI Model Selector Component
 */
import React, { useEffect, useState } from 'react';
import { ChevronDown, Cpu, Check } from 'lucide-react';
import { useAppStore } from '@/services/store';
import apiClient from '@/utils/api';
import { cn } from '@/utils/helpers';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  available: boolean;
  description: string;
}

interface ModelSelectorProps {
  className?: string;
}

export default function ModelSelector({ className }: ModelSelectorProps) {
  const { selectedModel, setSelectedModel, availableModels, setAvailableModels } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load available models on mount
  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setIsLoading(true);
    try {
      const response: any = await apiClient.getAvailableModels();
      setAvailableModels(response.models || []);
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    setIsOpen(false);
  };

  const selectedModelData = availableModels.find((m) => m.id === selectedModel);
  const availableModelsFiltered = availableModels.filter((m) => m.available);

  if (availableModelsFiltered.length === 0 && !isLoading) {
    return null; // Don't show selector if no models available
  }

  return (
    <div className={cn('relative', className)}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary flex items-center gap-2 min-w-[200px] justify-between"
        disabled={isLoading}
      >
        <div className="flex items-center gap-2">
          <Cpu size={18} />
          <div className="flex flex-col items-start">
            <span className="text-xs text-[var(--text-tertiary)]">AI Model</span>
            <span className="text-sm font-medium">
              {isLoading ? 'Loading...' : selectedModelData?.name || 'Select Model'}
            </span>
          </div>
        </div>
        <ChevronDown
          size={18}
          className={cn('transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute top-full left-0 mt-2 w-full min-w-[320px] card p-2 z-50 max-h-[400px] overflow-y-auto">
            <div className="text-xs font-semibold text-[var(--text-tertiary)] px-3 py-2 uppercase">
              Available Models
            </div>

            {availableModelsFiltered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-[var(--text-secondary)] text-center">
                <p>No AI models configured.</p>
                <p className="text-xs mt-1">Please add API keys in backend .env file.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {availableModelsFiltered.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleSelectModel(model.id)}
                    className={cn(
                      'w-full text-left px-3 py-3 rounded-lg transition-colors',
                      'hover:bg-[var(--bg-tertiary)]',
                      selectedModel === model.id && 'bg-primary-50 dark:bg-primary-900/20'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{model.name}</span>
                          {selectedModel === model.id && (
                            <Check size={16} className="text-primary-600" />
                          )}
                        </div>
                        <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                          {model.provider}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          {model.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Unavailable Models */}
            {availableModels.filter((m) => !m.available).length > 0 && (
              <>
                <div className="text-xs font-semibold text-[var(--text-tertiary)] px-3 py-2 mt-3 uppercase">
                  Unavailable (Missing API Key)
                </div>
                <div className="space-y-1 opacity-50">
                  {availableModels
                    .filter((m) => !m.available)
                    .map((model) => (
                      <div
                        key={model.id}
                        className="px-3 py-2 rounded-lg cursor-not-allowed"
                      >
                        <div className="font-medium text-sm">{model.name}</div>
                        <div className="text-xs text-[var(--text-tertiary)]">
                          {model.provider} - API key required
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
