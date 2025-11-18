/**
 * Research Assistant component for AI-powered research and explanations
 */
import React, { useState } from 'react';
import { Search, BookOpen, Loader2, Download, Copy, Check, History, X, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import apiClient from '@/utils/api';
import { copyToClipboard, downloadFile } from '@/utils/helpers';
import { cn } from '@/utils/helpers';
import { useAppStore } from '@/services/store';
import VoiceControls from './VoiceControls';

interface ResearchAssistantProps {
  className?: string;
}

type TabType = 'research' | 'explain' | 'history';

interface ResearchResult {
  topic: string;
  overview: string;
  key_findings: string[];
  connections?: string;
  further_reading: Array<{ title: string; author?: string; url: string }>;
}

interface ExplanationResult {
  topic: string;
  introduction: string;
  steps: Array<{ title: string; content: string }>;
  analogies: string[];
  references: Array<{ title: string; url: string }>;
  latex_equations?: string[];
}

export default function ResearchAssistant({ className }: ResearchAssistantProps) {
  const { 
    selectedModel, 
    researchResult, 
    setResearchResult, 
    explanationResult, 
    setExplanationResult,
    addToHistory,
    researchHistory 
  } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabType>('research');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Research state (form inputs - not persisted)
  const [researchTopic, setResearchTopic] = useState('');
  const [researchContext, setResearchContext] = useState('');
  const [includeArxiv, setIncludeArxiv] = useState(true);

  // Explanation state (form inputs - not persisted)
  const [explainTopic, setExplainTopic] = useState('');
  const [prerequisite, setPrerequisite] = useState('');
  const [relatedField, setRelatedField] = useState('');
  const [complexityLevel, setComplexityLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');

  const handleFetchResearch = async () => {
    if (!researchTopic.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiClient.fetchResearch({
        topic: researchTopic,
        context: researchContext || undefined,
        max_papers: 5,
        include_arxiv: includeArxiv,
      }, selectedModel);

      const researchData = result as ResearchResult;
      setResearchResult(researchData);
      addToHistory('research', researchTopic, researchData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch research. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExplainTopic = async () => {
    if (!explainTopic.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiClient.explainTopic({
        topic: explainTopic,
        prerequisite: prerequisite || undefined,
        related_field: relatedField || undefined,
        complexity_level: complexityLevel,
      }, selectedModel);

      const explanationData = result as ExplanationResult;
      
      // Log raw content to debug
      console.log('[Raw API Response]', explanationData);
      
      setExplanationResult(explanationData);
      addToHistory('explain', explainTopic, explanationData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to explain topic. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (content: string) => {
    const success = await copyToClipboard(content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = (content: string, filename: string) => {
    downloadFile(content, filename, 'text/markdown');
  };

  const handleClearResult = () => {
    if (activeTab === 'research') {
      setResearchResult(null);
      setResearchTopic('');
      setResearchContext('');
    } else {
      setExplanationResult(null);
      setExplainTopic('');
      setPrerequisite('');
      setRelatedField('');
    }
  };

  // Process content to render LaTeX equations properly
  const renderMathMarkdown = (content: string) => {
    if (!content) return null;

    console.log('[LaTeX Debug] Content:', content);

    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;

    // Match display math: $$...$$
    const displayMathRegex = /\$\$([\s\S]*?)\$\$/g;
    // Match inline math: $...$ (but not $$)
    const inlineMathRegex = /\$(?!\$)([\s\S]+?)\$(?!\$)/g;

    // First, handle display math ($$...$$)
    let match;
    const displayMatches: Array<{ start: number; end: number; content: string }> = [];
    while ((match = displayMathRegex.exec(content)) !== null) {
      displayMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[1],
      });
    }

    // Then handle inline math ($...$)
    const inlineMatches: Array<{ start: number; end: number; content: string }> = [];
    inlineMathRegex.lastIndex = 0;
    while ((match = inlineMathRegex.exec(content)) !== null) {
      const isInsideDisplay = displayMatches.some(
        (dm) => match!.index >= dm.start && match!.index < dm.end
      );
      if (!isInsideDisplay) {
        inlineMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          content: match[1].trim(),
        });
      }
    }

    // Combine and sort all matches
    const allMatches = [
      ...displayMatches.map((m) => ({ ...m, type: 'display' as const })),
      ...inlineMatches.map((m) => ({ ...m, type: 'inline' as const })),
    ].sort((a, b) => a.start - b.start);

    // Build the output
    allMatches.forEach((match, idx) => {
      // Add text before this match
      if (match.start > lastIndex) {
        const textBefore = content.substring(lastIndex, match.start);
        parts.push(textBefore);
      }

      // Add the math
      try {
        if (match.type === 'display') {
          parts.push(
            <div key={`display-${idx}`} className="my-4 overflow-x-auto">
              <BlockMath math={match.content} />
            </div>
          );
        } else {
          parts.push(
            <InlineMath key={`inline-${idx}`} math={match.content} />
          );
        }
      } catch (error) {
        console.error('[LaTeX Error]', error);
        parts.push(`[Math Error: ${match.content}]`);
      }

      lastIndex = match.end;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return <div className="markdown-content">{parts}</div>;
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Tab Navigation */}
      <div className="flex gap-2 p-4 border-b border-[var(--border-color)]">
        <button
          onClick={() => setActiveTab('research')}
          className={cn(
            'btn flex items-center gap-2',
            activeTab === 'research' ? 'btn-primary' : 'btn-secondary'
          )}
        >
          <Search size={18} />
          Research Synthesis
        </button>
        <button
          onClick={() => setActiveTab('explain')}
          className={cn(
            'btn flex items-center gap-2',
            activeTab === 'explain' ? 'btn-primary' : 'btn-secondary'
          )}
        >
          <BookOpen size={18} />
          Explain Topic
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            'btn flex items-center gap-2',
            activeTab === 'history' ? 'btn-primary' : 'btn-secondary'
          )}
        >
          <History size={18} />
          History ({researchHistory.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'research' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Research Input Form */}
            <div className="card p-6 space-y-4">
              <h2 className="heading-3">Research Synthesis</h2>
              <p className="text-[var(--text-secondary)]">
                Get AI-powered research summaries with key findings and connections
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Topic</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={researchTopic}
                      onChange={(e) => setResearchTopic(e.target.value)}
                      placeholder="e.g., Transformer architectures in machine learning"
                      className="input flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && handleFetchResearch()}
                    />
                  </div>
                </div>

                {/* Voice Controls for Research */}
                <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
                  <label className="block text-sm font-medium mb-3">Voice Interaction</label>
                  <VoiceControls
                    onTranscript={(text) => setResearchTopic(text)}
                    textToSpeak={researchResult?.overview || ''}
                    className="justify-center"
                  />
                  <p className="text-xs text-[var(--text-tertiary)] mt-2 text-center">
                    Use microphone to speak your topic, or speaker to hear the overview
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Context (Optional)
                  </label>
                  <textarea
                    value={researchContext}
                    onChange={(e) => setResearchContext(e.target.value)}
                    placeholder="e.g., I'm interested in connections to physics and quantum computing"
                    className="textarea h-20"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeArxiv"
                    checked={includeArxiv}
                    onChange={(e) => setIncludeArxiv(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="includeArxiv" className="text-sm">
                    Include papers from arXiv
                  </label>
                </div>

                <button
                  onClick={handleFetchResearch}
                  disabled={isLoading || !researchTopic.trim()}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Researching...
                    </>
                  ) : (
                    <>
                      <Search size={18} />
                      Fetch Research
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Research Results */}
            {researchResult && (
              <div className="card p-6 space-y-6 fade-in">
                <div className="flex items-start justify-between">
                  <h3 className="heading-3">{researchResult.topic}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleClearResult}
                      className="btn-ghost"
                      title="Start New Research"
                    >
                      <Plus size={18} />
                    </button>
                    <button
                      onClick={() => handleCopy(JSON.stringify(researchResult, null, 2))}
                      className="btn-ghost"
                      title="Copy"
                    >
                      {copied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                    <button
                      onClick={() =>
                        handleDownload(
                          JSON.stringify(researchResult, null, 2),
                          `research-${researchResult.topic.toLowerCase().replace(/\s+/g, '-')}.md`
                        )
                      }
                      className="btn-ghost"
                      title="Download"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Overview</h4>
                  <p className="text-[var(--text-secondary)]">{researchResult.overview}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Key Findings</h4>
                  <ul className="list-disc list-inside space-y-2 text-[var(--text-secondary)]">
                    {researchResult.key_findings.map((finding, idx) => (
                      <li key={idx}>{finding}</li>
                    ))}
                  </ul>
                </div>

                {researchResult.connections && (
                  <div>
                    <h4 className="font-semibold mb-2">Connections</h4>
                    <p className="text-[var(--text-secondary)]">{researchResult.connections}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-2">Further Reading</h4>
                  <div className="space-y-2">
                    {researchResult.further_reading.map((ref, idx) => (
                      <a
                        key={idx}
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                      >
                        <p className="font-medium text-primary-600">{ref.title}</p>
                        {ref.author && (
                          <p className="text-sm text-[var(--text-tertiary)]">{ref.author}</p>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'explain' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {(() => {
              console.log('[LaTeX Debug] Explain tab active, explanationResult exists:', !!explanationResult);
              return null;
            })()}
            {/* Explanation Input Form */}
            <div className="card p-6 space-y-4">
              <h2 className="heading-3">Topic Explanation</h2>
              <p className="text-[var(--text-secondary)]">
                Get step-by-step explanations with LaTeX equations and analogies
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Topic</label>
                  <input
                    type="text"
                    value={explainTopic}
                    onChange={(e) => setExplainTopic(e.target.value)}
                    placeholder="e.g., Derive the math behind attention mechanisms"
                    className="input"
                    onKeyPress={(e) => e.key === 'Enter' && handleExplainTopic()}
                  />
                </div>

                {/* Voice Controls for Explanation */}
                <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
                  <label className="block text-sm font-medium mb-3">Voice Interaction</label>
                  <VoiceControls
                    onTranscript={(text) => setExplainTopic(text)}
                    textToSpeak={explanationResult?.introduction || ''}
                    className="justify-center"
                  />
                  <p className="text-xs text-[var(--text-tertiary)] mt-2 text-center">
                    Use microphone to speak your topic, or speaker to hear the introduction
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Prerequisite Knowledge
                    </label>
                    <input
                      type="text"
                      value={prerequisite}
                      onChange={(e) => setPrerequisite(e.target.value)}
                      placeholder="e.g., Linear algebra"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Related Field for Analogies
                    </label>
                    <input
                      type="text"
                      value={relatedField}
                      onChange={(e) => setRelatedField(e.target.value)}
                      placeholder="e.g., Physics"
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Complexity Level</label>
                  <div className="flex gap-2">
                    {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setComplexityLevel(level)}
                        className={cn(
                          'btn',
                          complexityLevel === level ? 'btn-primary' : 'btn-secondary'
                        )}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleExplainTopic}
                  disabled={isLoading || !explainTopic.trim()}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Generating Explanation...
                    </>
                  ) : (
                    <>
                      <BookOpen size={18} />
                      Explain Topic
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Explanation Results */}
            {explanationResult && (() => {
              console.log('[LaTeX Debug] Rendering explanation result:', explanationResult);
              return (
              <div className="card p-6 space-y-6 fade-in">
                <div className="flex items-start justify-between">
                  <h3 className="heading-3">{explanationResult.topic}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleClearResult}
                      className="btn-ghost"
                      title="Start New Explanation"
                    >
                      <Plus size={18} />
                    </button>
                    <button
                      onClick={() => handleCopy(JSON.stringify(explanationResult, null, 2))}
                      className="btn-ghost"
                      title="Copy"
                    >
                      {copied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                    <button
                      onClick={() =>
                        handleDownload(
                          JSON.stringify(explanationResult, null, 2),
                          `explanation-${explanationResult.topic.toLowerCase().replace(/\s+/g, '-')}.md`
                        )
                      }
                      className="btn-ghost"
                      title="Download"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Introduction</h4>
                  <div className="text-[var(--text-secondary)]">
                    {(() => {
                      console.log('[LaTeX Debug] Rendering introduction:', explanationResult.introduction);
                      return renderMathMarkdown(explanationResult.introduction);
                    })()}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Step-by-Step Explanation</h4>
                  {explanationResult.steps.map((step, idx) => (
                    <div key={idx} className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
                      <h5 className="font-semibold text-primary-600 mb-2">{step.title}</h5>
                      <div className="markdown-content">
                        {(() => {
                          console.log('[LaTeX Debug] Rendering step content:', step.title, step.content);
                          return renderMathMarkdown(step.content);
                        })()}
                      </div>
                    </div>
                  ))}
                </div>

                {explanationResult.analogies.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Analogies</h4>
                    <div className="space-y-2">
                      {explanationResult.analogies.map((analogy, idx) => (
                        <div key={idx} className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                          <p className="text-[var(--text-secondary)]">{analogy}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {explanationResult.references.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">References</h4>
                    <div className="space-y-2">
                      {explanationResult.references.map((ref, idx) => (
                        <a
                          key={idx}
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                        >
                          <p className="font-medium text-primary-600">{ref.title}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              );
            })()}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="card p-6">
              <h2 className="heading-3 mb-4">Research History</h2>
              <p className="text-[var(--text-secondary)] mb-4">
                Your past research and explanations are automatically saved. Click on any item to view it.
              </p>
              
              {researchHistory.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-secondary)]">
                  <History size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No history yet. Start researching or explaining topics to build your history!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {researchHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                      onClick={() => {
                        if (item.type === 'research') {
                          setResearchResult(item.data as ResearchResult);
                          setActiveTab('research');
                        } else {
                          setExplanationResult(item.data as ExplanationResult);
                          setActiveTab('explain');
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {item.type === 'research' ? (
                              <Search size={16} className="text-primary-600" />
                            ) : (
                              <BookOpen size={16} className="text-primary-600" />
                            )}
                            <span className="text-sm font-medium text-primary-600">
                              {item.type === 'research' ? 'Research' : 'Explanation'}
                            </span>
                          </div>
                          <h4 className="font-semibold mb-1">{item.topic}</h4>
                          <p className="text-sm text-[var(--text-secondary)]">
                            {new Date(item.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.type === 'research') {
                              handleDownload(
                                JSON.stringify(item.data, null, 2),
                                `research-${item.topic.toLowerCase().replace(/\s+/g, '-')}.json`
                              );
                            } else {
                              handleDownload(
                                JSON.stringify(item.data, null, 2),
                                `explanation-${item.topic.toLowerCase().replace(/\s+/g, '-')}.json`
                              );
                            }
                          }}
                          className="btn-ghost p-2"
                          title="Download"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
