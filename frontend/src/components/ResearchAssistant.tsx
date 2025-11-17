/**
 * Research Assistant component for AI-powered research and explanations
 */
import React, { useState } from 'react';
import { Search, BookOpen, Loader2, Download, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { InlineMath, BlockMath } from 'react-katex';
import apiClient from '@/utils/api';
import { copyToClipboard, downloadFile } from '@/utils/helpers';
import { cn } from '@/utils/helpers';

interface ResearchAssistantProps {
  className?: string;
}

type TabType = 'research' | 'explain';

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
  const [activeTab, setActiveTab] = useState<TabType>('research');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Research state
  const [researchTopic, setResearchTopic] = useState('');
  const [researchContext, setResearchContext] = useState('');
  const [includeArxiv, setIncludeArxiv] = useState(true);
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);

  // Explanation state
  const [explainTopic, setExplainTopic] = useState('');
  const [prerequisite, setPrerequisite] = useState('');
  const [relatedField, setRelatedField] = useState('');
  const [complexityLevel, setComplexityLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [explanationResult, setExplanationResult] = useState<ExplanationResult | null>(null);

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
      });

      setResearchResult(result as ResearchResult);
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
      });

      setExplanationResult(result as ExplanationResult);
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

  // Render math in markdown
  const renderMathMarkdown = (content: string) => {
    return (
      <ReactMarkdown
        className="markdown-content"
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const code = String(children).replace(/\n$/, '');

            // Check if it's a LaTeX equation
            if (code.startsWith('$') && code.endsWith('$')) {
              const equation = code.slice(1, -1);
              return inline ? <InlineMath math={equation} /> : <BlockMath math={equation} />;
            }

            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    );
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
                  <input
                    type="text"
                    value={researchTopic}
                    onChange={(e) => setResearchTopic(e.target.value)}
                    placeholder="e.g., Transformer architectures in machine learning"
                    className="input"
                    onKeyPress={(e) => e.key === 'Enter' && handleFetchResearch()}
                  />
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
            {explanationResult && (
              <div className="card p-6 space-y-6 fade-in">
                <div className="flex items-start justify-between">
                  <h3 className="heading-3">{explanationResult.topic}</h3>
                  <div className="flex gap-2">
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
                  <p className="text-[var(--text-secondary)]">{explanationResult.introduction}</p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Step-by-Step Explanation</h4>
                  {explanationResult.steps.map((step, idx) => (
                    <div key={idx} className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
                      <h5 className="font-semibold text-primary-600 mb-2">{step.title}</h5>
                      <div className="markdown-content">
                        {renderMathMarkdown(step.content)}
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
            )}
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
