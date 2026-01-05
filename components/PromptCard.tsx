import React, { useState, useMemo } from 'react';
import { Play, Copy, Check, Clock, ClipboardPaste, Heart, Type } from 'lucide-react';
import { Prompt, getPlatformUrl } from '../types';

interface PromptCardProps {
  prompt: Prompt;
  onView: (prompt: Prompt) => void;
  onToggleFavorite: (id: string) => void;
}

const PromptCard: React.FC<PromptCardProps> = ({ prompt, onView, onToggleFavorite }) => {
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const hasVariables = useMemo(() => /\{\{.*?\}\}/g.test(prompt.content), [prompt.content]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRun = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Jika ada variabel, arahkan user ke modal pengisian terlebih dahulu
    if (hasVariables) {
        onView(prompt);
        return;
    }

    // Jika tidak ada variabel, jalankan langsung
    await navigator.clipboard.writeText(prompt.content);
    setIsRunning(true);
    setCopied(true);
    
    const url = getPlatformUrl(prompt.platform, prompt.content);
    window.open(url, '_blank');

    setTimeout(() => {
        setIsRunning(false);
        setCopied(false);
    }, 2500);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div 
      onClick={() => onView(prompt)} 
      className="group relative bg-white rounded-2xl p-5 border border-gray-100 shadow-card 
      transition-all duration-300 flex flex-col h-full cursor-pointer
      sm:hover:shadow-soft sm:hover:border-gray-200 sm:hover:-translate-y-1"
    >
      {/* Card Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                ${prompt.platform === 'ChatGPT' ? 'bg-green-50 text-green-700' : 
                  prompt.platform === 'Claude' ? 'bg-orange-50 text-orange-700' :
                  prompt.platform === 'Gemini' ? 'bg-blue-50 text-blue-700' :
                  prompt.platform === 'Perplexity' ? 'bg-teal-50 text-teal-700' :
                  prompt.platform === 'Grok' ? 'bg-gray-100 text-gray-700' :
                  'bg-purple-50 text-purple-700'}`}>
                {prompt.platform}
            </span>
            {hasVariables && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-[10px] font-bold uppercase border border-orange-100">
                    <Type size={10} /> Dynamic
                </span>
            )}
        </div>
        
        <div className="flex items-center gap-1">
          <button
             type="button"
             onClick={(e) => { e.stopPropagation(); onToggleFavorite(prompt.id); }}
             className={`p-1.5 rounded-full transition-all ${prompt.isFavorite ? 'text-red-500 bg-red-50' : 'text-gray-300 hover:text-red-400 hover:bg-red-50'}`}
          >
             <Heart size={16} fill={prompt.isFavorite ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4 flex-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-1 leading-tight tracking-tight group-hover:text-gray-600 transition-colors">
          {prompt.title}
        </h3>
        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{prompt.description}</p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-6">
        {prompt.tags.slice(0, 3).map(tag => (
          <span key={tag} className="px-2 py-1 bg-gray-50 text-gray-500 text-[10px] font-medium rounded-md border border-gray-100">
            {tag}
          </span>
        ))}
        {prompt.tags.length > 3 && (
            <span className="px-2 py-1 text-gray-400 text-[10px] font-medium">+ {prompt.tags.length - 3}</span>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                <Clock size={12} />
                <span>{formatDate(prompt.updatedAt)}</span>
            </div>
        </div>
        
        <div className="flex gap-2">
            <button 
                type="button"
                onClick={handleCopy}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
            </button>
            <button 
                type="button"
                onClick={handleRun}
                disabled={isRunning}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all shadow-sm active:scale-95 ${
                    isRunning 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-900 text-white hover:bg-black'
                } ${hasVariables ? 'ring-1 ring-orange-200' : ''}`}
            >
                {isRunning ? (
                    <>
                        <span>Copied! Press Ctrl+V</span>
                        <ClipboardPaste size={12} />
                    </>
                ) : (
                    <>
                        <span>{hasVariables ? 'Fill & Run' : 'Run'}</span>
                        <Play size={10} fill="currentColor" />
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default PromptCard;