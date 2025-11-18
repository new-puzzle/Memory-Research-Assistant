/**
 * Research Assistant component for AI-powered research and explanations
 */
import React, { useState } from 'react';
import { Search, BookOpen, Loader2, Download, Copy, Check, History, X, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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

  const formatExplanationAsMarkdown = (result: ExplanationResult): string => {
    // Helper function to wrap unwrapped LaTeX expressions in $$...$$
    const wrapUnwrappedLatex = (text: string): string => {
      // First, fix malformed $$ blocks (like $$...$ that should be $$...$$)
      let fixedText = text;
      // Fix cases where $$ starts but ends with single $ followed by markdown/text
      // Pattern: $$...LaTeX content...$**text or $$...LaTeX content...$text
      // Match $$ followed by content, then $ followed by markdown patterns
      fixedText = fixedText.replace(/\$\$([\s\S]*?)\$(\*\*[^*]|##|\[[A-Z]|\n\n[A-Z])/g, (match, content, nextPart) => {
        // Check if content looks like LaTeX (contains \ or math operators)
        if (/\\[a-zA-Z]|[=+\-*/<>]/.test(content)) {
          // This is a broken $$ block - fix it
          return '$$' + content + '$$' + nextPart;
        }
        return match;
      });
      // Also handle simpler case: $$...$** (markdown bold starts immediately)
      fixedText = fixedText.replace(/\$\$([\s\S]*?)\$(\*\*)/g, (match, content, nextPart) => {
        if (/\\[a-zA-Z]|[=+\-*/<>]/.test(content)) {
          return '$$' + content + '$$' + nextPart;
        }
        return match;
      });
      
      // Identify and protect already-wrapped LaTeX
      const protectedRanges: Array<{ start: number; end: number }> = [];
      
      // Find all $$...$$ blocks (display math) - non-greedy to handle multiple blocks
      const displayMathRegex = /\$\$[\s\S]*?\$\$/g;
      let match;
      while ((match = displayMathRegex.exec(fixedText)) !== null) {
        protectedRanges.push({ start: match.index, end: match.index + match[0].length });
      }
      
      // Find all $...$ blocks (inline math) - but not $$
      const inlineMathRegex = /\$(?!\$)([^$\n]+?)\$(?!\$)/g;
      inlineMathRegex.lastIndex = 0;
      while ((match = inlineMathRegex.exec(fixedText)) !== null) {
        protectedRanges.push({ start: match.index, end: match.index + match[0].length });
      }
      
      // Use fixedText for the rest of processing
      text = fixedText;
      
      // Function to check if a position is within a protected range
      const isProtected = (pos: number): boolean => {
        return protectedRanges.some(range => pos >= range.start && pos < range.end);
      };
      
      // Find unwrapped LaTeX expressions - only wrap clearly standalone expressions
      const latexMatches: Array<{ start: number; end: number; content: string }> = [];
      
      // Pattern: \nabla f = \left(...\right) or similar standalone expressions
      // Look for expressions that start with \nabla or \partial and contain = and \left(...\right)
      const standaloneMathPattern = /(\\nabla\s+[^$\n=]+?\s*=\s*\\left\([^)]+?\\right\))/g;
      standaloneMathPattern.lastIndex = 0;
      while ((match = standaloneMathPattern.exec(text)) !== null) {
        if (!isProtected(match.index)) {
          const exprStart = match.index;
          const exprEnd = match.index + match[0].length;
          const expression = match[1].trim();
          
          // Only add if it's substantial and not already wrapped
          if (expression.length > 10) {
            latexMatches.push({ start: exprStart, end: exprEnd, content: expression });
          }
        }
      }
      
      // Pattern: Standalone \frac expressions with = sign
      const fracStandalonePattern = /(\\frac\{[^}]+\}\{[^}]+\}\s*[=+\-*/<>][^$\n]*?)/g;
      fracStandalonePattern.lastIndex = 0;
      while ((match = fracStandalonePattern.exec(text)) !== null) {
        if (!isProtected(match.index)) {
          const exprStart = match.index;
          let exprEnd = match.index + match[0].length;
          
          // Extend to end of line if it's clearly standalone, but stop at non-LaTeX content
          const before = text.substring(Math.max(0, exprStart - 10), exprStart);
          const after = text.substring(exprEnd, Math.min(text.length, exprEnd + 50));
          
          // Only wrap if it's not inline (not followed by lowercase letter or comma)
          if (!after.trim().match(/^[a-z,]/) && !before.trim().endsWith('$')) {
            // Extend carefully - stop at $, \n, or text that doesn't look like LaTeX
            while (exprEnd < text.length && !isProtected(exprEnd)) {
              const char = text[exprEnd];
              
              // Stop at newline
              if (char === '\n') break;
              
              // Stop at $ (might be start of new math block or end of current)
              if (char === '$') {
                // Check if it's $$ (end of display math) or $ (end of inline)
                const nextChar = exprEnd + 1 < text.length ? text[exprEnd + 1] : '';
                if (nextChar === '$') {
                  // It's $$, stop before it
                  break;
                } else {
                  // It's $, might be end of inline math - stop before it
                  break;
                }
              }
              
              // Stop if we hit text that doesn't look like LaTeX (like ** for markdown bold)
              const remaining = text.substring(exprEnd, Math.min(text.length, exprEnd + 5));
              if (remaining.startsWith('**') || remaining.startsWith('##') || remaining.match(/^[A-Z]/)) {
                // Check if it's actually part of LaTeX (like \textbf) or real text
                const prev5 = text.substring(Math.max(0, exprEnd - 5), exprEnd);
                if (!prev5.includes('\\')) {
                  // Not LaTeX, stop here
                  break;
                }
              }
              
              exprEnd++;
            }
            
            const expression = text.substring(exprStart, exprEnd).trim();
            // Only add if expression ends with LaTeX content, not text
            if (expression.length > 5 && /[=+\-*/<>\)\}\\]$/.test(expression)) {
              const overlaps = latexMatches.some(
                e => (exprStart >= e.start && exprStart < e.end) ||
                     (exprEnd > e.start && exprEnd <= e.end) ||
                     (exprStart <= e.start && exprEnd >= e.end)
              );
              if (!overlaps) {
                latexMatches.push({ start: exprStart, end: exprEnd, content: expression });
              }
            }
          }
        }
      }
      
      // Sort matches by start position (descending) to replace from end to start
      latexMatches.sort((a, b) => b.start - a.start);
      
      // Replace unwrapped LaTeX expressions
      let result = text;
      for (const match of latexMatches) {
        // Double-check it's not already wrapped
        const before = result.substring(Math.max(0, match.start - 2), match.start);
        const after = result.substring(match.end, Math.min(result.length, match.end + 2));
        
        if (!before.endsWith('$$') && !after.startsWith('$$')) {
          result = result.substring(0, match.start) + 
                   '$$' + match.content + '$$' + 
                   result.substring(match.end);
        }
      }
      
      return result;
    };
    
    // Helper function to format content with LaTeX wrapping
    const formatContent = (content: string): string => {
      let formatted = wrapUnwrappedLatex(content);
      
      // First, fix any broken $$ blocks where newlines were inserted inside
      // This fixes cases like: $$\n...\n$$ or $$...\n\n$$
      formatted = formatted.replace(/\$\$\s*\n+([^\$]+?)\n+\$\$/g, '$$$1$$');
      formatted = formatted.replace(/\$\$\s*\n+([^\$]+?)\$\$/g, '$$$1$$');
      formatted = formatted.replace(/\$\$([^\$]+?)\n+\s*\$\$/g, '$$$1$$');
      
      // Now ensure proper spacing around display math blocks
      // Use a more careful approach that respects $$ block boundaries
      // Split by $$ blocks, process each segment separately
      const parts: string[] = [];
      let lastIndex = 0;
      const mathBlockRegex = /\$\$[\s\S]*?\$\$/g;
      let match;
      
      while ((match = mathBlockRegex.exec(formatted)) !== null) {
        // Add text before the math block
        const beforeText = formatted.substring(lastIndex, match.index);
        if (beforeText.trim()) {
          // Ensure blank line before math block
          const trimmed = beforeText.trimEnd();
          if (!trimmed.endsWith('\n\n') && !trimmed.endsWith('\n')) {
            parts.push(trimmed + '\n\n');
          } else if (trimmed.endsWith('\n') && !trimmed.endsWith('\n\n')) {
            parts.push(trimmed + '\n');
          } else {
            parts.push(trimmed);
          }
        } else if (lastIndex < match.index) {
          // Empty but we want spacing
          parts.push('\n\n');
        }
        
        // Add the math block
        parts.push(match[0]);
        
        lastIndex = match.index + match[0].length;
      }
      
      // Add remaining text
      if (lastIndex < formatted.length) {
        const remaining = formatted.substring(lastIndex);
        // Ensure blank line after last math block if there's text after
        if (parts.length > 0 && remaining.trim()) {
          const lastPart = parts[parts.length - 1];
          if (lastPart.endsWith('$$') && !lastPart.endsWith('$$\n\n')) {
            parts[parts.length - 1] = lastPart + '\n\n';
          }
        }
        parts.push(remaining);
      }
      
      return parts.join('');
    };
    
    let markdown = `# ${result.topic}\n\n`;
    
    markdown += `## Introduction\n\n${formatContent(result.introduction)}\n\n`;
    
    markdown += `## Step-by-Step Explanation\n\n`;
    result.steps.forEach((step, idx) => {
      // Check if title already includes step number, if so don't duplicate it
      const stepNum = idx + 1;
      const titleAlreadyHasStep = step.title.toLowerCase().startsWith(`step ${stepNum}`) || 
                                   step.title.toLowerCase().startsWith(`step ${stepNum}:`);
      const stepTitle = titleAlreadyHasStep ? step.title : `Step ${stepNum}: ${step.title}`;
      
      markdown += `### ${stepTitle}\n\n${formatContent(step.content)}\n\n`;
    });
    
    if (result.analogies && result.analogies.length > 0) {
      markdown += `## Analogies\n\n`;
      result.analogies.forEach((analogy, idx) => {
        markdown += `${idx + 1}. ${formatContent(analogy)}\n\n`;
      });
    }
    
    if (result.references && result.references.length > 0) {
      markdown += `## References\n\n`;
      result.references.forEach((ref) => {
        markdown += `- [${ref.title}](${ref.url})\n`;
      });
    }
    
    return markdown;
  };

  const formatResearchAsMarkdown = (result: ResearchResult): string => {
    let markdown = `# ${result.topic}\n\n`;
    
    markdown += `## Overview\n\n${result.overview}\n\n`;
    
    if (result.key_findings && result.key_findings.length > 0) {
      markdown += `## Key Findings\n\n`;
      result.key_findings.forEach((finding) => {
        markdown += `- ${finding}\n`;
      });
      markdown += `\n`;
    }
    
    if (result.connections) {
      markdown += `## Connections\n\n${result.connections}\n\n`;
    }
    
    if (result.further_reading && result.further_reading.length > 0) {
      markdown += `## Further Reading\n\n`;
      result.further_reading.forEach((reading) => {
        const author = reading.author ? ` by ${reading.author}` : '';
        markdown += `- [${reading.title}](${reading.url})${author}\n`;
      });
    }
    
        return markdown;
    
      };
    
    
    
      const handleDownloadAsPdf = async (elementId: string, filename: string) => {
        try {
          const input = document.getElementById(elementId);
    
          if (!input) {
            console.error('Element not found for PDF generation!');
            setError('Element not found for PDF generation. Please try again.');
            return;
          }
    
          // Show loading state
          setIsLoading(true);
    
          const canvas = await html2canvas(input, {
            scale: 2, // Higher scale for better quality
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#1a1a1a', // Match your dark theme background
            logging: false, // Disable console logging from html2canvas
            windowWidth: input.scrollWidth,
            windowHeight: input.scrollHeight,
          });
    
          const imgData = canvas.toDataURL('image/png', 1.0);
    
          // Use standard A4 page size in mm
          const pdfWidth = 210; // A4 width in mm
          const pdfHeight = 297; // A4 height in mm
          const imgWidth = canvas.width;
          const imgHeight = canvas.height;
          
          // Calculate scaling to fit page width
          const widthRatio = pdfWidth / imgWidth;
          const scaledWidth = pdfWidth;
          const scaledHeight = imgHeight * widthRatio;
    
          const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
          });
    
          // Handle multi-page content
          if (scaledHeight <= pdfHeight) {
            // Content fits on one page
            pdf.addImage(imgData, 'PNG', 0, 0, scaledWidth, scaledHeight, undefined, 'FAST');
          } else {
            // Content spans multiple pages - split it
            let remainingHeight = scaledHeight;
            let yOffset = 0;
            
            while (remainingHeight > 0) {
              const pageHeight = Math.min(pdfHeight, remainingHeight);
              const sourceY = (scaledHeight - remainingHeight) / widthRatio;
              const sourceHeight = pageHeight / widthRatio;
              
              // Extract portion of image for this page
              const pageCanvas = document.createElement('canvas');
              pageCanvas.width = imgWidth;
              pageCanvas.height = sourceHeight;
              const ctx = pageCanvas.getContext('2d');
              
              if (!ctx) {
                throw new Error('Could not create canvas context');
              }
              
              ctx.drawImage(canvas, 0, sourceY, imgWidth, sourceHeight, 0, 0, imgWidth, sourceHeight);
              const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
              
              pdf.addImage(pageImgData, 'PNG', 0, yOffset, scaledWidth, pageHeight, undefined, 'FAST');
              
              remainingHeight -= pdfHeight;
              
              if (remainingHeight > 0) {
                pdf.addPage();
                yOffset = 0;
              }
            }
          }
    
          pdf.save(filename);
          setIsLoading(false);
        } catch (error: any) {
          console.error('Error generating PDF:', error);
          setError(`Failed to generate PDF: ${error.message || 'Unknown error'}`);
          setIsLoading(false);
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
              <div id="research-result-content" className="card p-6 space-y-6 fade-in">
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
                        handleDownloadAsPdf(
                          'research-result-content',
                          `research-${researchResult.topic.toLowerCase().replace(/\s+/g, '-')}.pdf`
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
              <div id="explanation-result-content" className="card p-6 space-y-6 fade-in">
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
                        handleDownloadAsPdf(
                          'explanation-result-content',
                          `explanation-${explanationResult.topic.toLowerCase().replace(/\s+/g, '-')}.pdf`
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
