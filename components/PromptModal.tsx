
import React, { useState, useEffect, useMemo } from 'react';
import { X, Play, Check, Edit2, History, Save, ChevronLeft, Clock, ChevronRight, ClipboardPaste, Heart, Trash2, AlertCircle, Copy, ChevronDown, Sparkles, Bot, Brain, Code, Zap, Search as SearchIcon, Type, RotateCcw } from 'lucide-react';
import { Prompt, PromptFormData, Platform, PLATFORMS, getPlatformUrl, PromptVersion } from '../types';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PromptFormData) => Promise<boolean>;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  initialData?: Prompt | null;
  availableTags: string[];
  startEditing?: boolean;
}

const PromptModal: React.FC<PromptModalProps> = ({ isOpen, onClose, onSave, onDelete, onToggleFavorite, initialData, availableTags, startEditing = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveTime, setSaveTime] = useState(0); // Tracking durasi save
  const [showHistory, setShowHistory] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<PromptVersion | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [formData, setFormData] = useState<PromptFormData>({
    title: '',
    description: '',
    content: '',
    tags: [],
    platform: 'ChatGPT',
  });

  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [isPlatformOpen, setIsPlatformOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let timer: any;
    if (isSaving) {
      timer = setInterval(() => setSaveTime(prev => prev + 1), 1000);
    } else {
      setSaveTime(0);
    }
    return () => clearInterval(timer);
  }, [isSaving]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setIsEditing(startEditing);
        setFormData({
          title: initialData.title,
          description: initialData.description,
          content: initialData.content,
          tags: initialData.tags,
          platform: initialData.platform,
        });

        try {
            const savedVars = localStorage.getItem(`prompt_vars_${initialData.id}`);
            if (savedVars) setVariableValues(JSON.parse(savedVars));
            else setVariableValues({});
        } catch (e) {
            setVariableValues({});
        }
      } else {
        setIsEditing(true);
        setFormData({
          title: '',
          description: '',
          content: '',
          tags: [],
          platform: 'ChatGPT',
        });
        setVariableValues({});
      }
      
      setTagInput('');
      setShowTagSuggestions(false);
      setIsPlatformOpen(false);
      setShowHistory(false);
      setShowDeleteConfirm(false);
      setViewingVersion(null);
      setCopied(false);
      setValidationError(null);
      setMissingFields([]);
      setIsSaving(false);
    }
  }, [isOpen, initialData, startEditing]);

  const displayData = viewingVersion || formData;

  const detectedVariables = useMemo(() => {
    const regex = /\{\{(.*?)\}\}/g;
    const matches = [...displayData.content.matchAll(regex)];
    return [...new Set(matches.map(m => m[1].trim()))];
  }, [displayData.content]);

  const handleVariableChange = (variable: string, value: string) => {
    const newValues = { ...variableValues, [variable]: value };
    setVariableValues(newValues);
    
    if (value.trim() && missingFields.includes(variable)) {
        setMissingFields(prev => prev.filter(f => f !== variable));
        if (missingFields.length <= 1) setValidationError(null);
    }
    
    if (initialData?.id) {
        localStorage.setItem(`prompt_vars_${initialData.id}`, JSON.stringify(newValues));
    }
  };

  const resetVariables = () => {
    setVariableValues({});
    setValidationError(null);
    setMissingFields([]);
    if (initialData?.id) {
        localStorage.removeItem(`prompt_vars_${initialData.id}`);
    }
  };

  const getProcessedContent = () => {
    let processed = displayData.content;
    detectedVariables.forEach(variable => {
      const userValue = variableValues[variable] || `{{${variable}}}`;
      const varRegex = new RegExp(`\\{\\{\\s*${variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'g');
      processed = processed.replace(varRegex, userValue);
    });
    return processed;
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && formData.tags.length > 0) {
      setFormData({ ...formData, tags: formData.tags.slice(0, -1) });
    }
  };

  const addTag = (tag: string) => {
    const cleanTag = tag.trim().replace(',', '');
    if (cleanTag && !formData.tags.includes(cleanTag)) {
      setFormData({ ...formData, tags: [...formData.tags, cleanTag] });
      setTagInput('');
      setShowTagSuggestions(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tagToRemove) });
  };

  const filteredSuggestions = useMemo(() => {
    if (!tagInput.trim()) return [];
    const lowerInput = tagInput.toLowerCase();
    return availableTags.filter(
        tag => tag.toLowerCase().includes(lowerInput) && !formData.tags.includes(tag)
    ).slice(0, 5);
  }, [tagInput, availableTags, formData.tags]);

  const getPlatformStyle = (p: Platform) => {
      switch (p) {
        case 'ChatGPT': return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' };
        case 'Claude': return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' };
        case 'Gemini': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' };
        case 'Perplexity': return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500' };
        case 'Grok': return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500' };
        default: return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' };
      }
  };

  const getPlatformIcon = (p: Platform) => {
      switch (p) {
        case 'ChatGPT': return <Bot size={14} />;
        case 'Claude': return <Brain size={14} />;
        case 'Copilot': return <Code size={14} />;
        case 'Gemini': return <Sparkles size={14} />;
        case 'Grok': return <Zap size={14} />;
        case 'Perplexity': return <SearchIcon size={14} />;
        default: return <Bot size={14} />;
      }
  };

  const renderContentWithVariables = (text: string) => {
    const parts = text.split(/(\{\{.*?\}\})/g);
    return parts.map((part, index) => {
      if (part.startsWith('{{') && part.endsWith('}}')) {
        const varName = part.slice(2, -2).trim();
        const hasValue = !!variableValues[varName];
        return (
          <span key={index} className={`px-1 py-0.5 rounded border font-medium transition-all duration-300 ${hasValue ? 'text-green-700 bg-green-50 border-green-200 shadow-sm' : 'text-orange-600 bg-orange-50 border-orange-100'}`}>
            {hasValue ? variableValues[varName] : part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const handleSaveClick = async () => {
    if (!formData.title.trim()) {
        setValidationError("Please enter a title.");
        return;
    }
    if (!formData.content.trim()) {
        setValidationError("Prompt content cannot be empty.");
        return;
    }
    
    setIsSaving(true);
    setValidationError(null);
    
    try {
        const success = await onSave(formData);
        if (success) {
            setIsEditing(false);
            setValidationError(null);
        } else {
            setValidationError("Vault sync timed out. Database might be sleeping. Please try one more time.");
        }
    } catch (err) {
        setValidationError("An unexpected error occurred during sync.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleRun = async () => {
    const emptyVars = detectedVariables.filter(v => !variableValues[v] || !variableValues[v].trim());
    if (emptyVars.length > 0) {
        setMissingFields(emptyVars);
        setValidationError(`Please fill in all variables: ${emptyVars.join(', ')}`);
        setTimeout(() => setValidationError(null), 3000);
        return;
    }

    setValidationError(null);
    setMissingFields([]);
    
    const finalContent = getProcessedContent();
    await navigator.clipboard.writeText(finalContent);
    setCopied(true);
    const url = getPlatformUrl(displayData.platform as Platform, finalContent);
    window.open(url, '_blank');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRestore = () => {
    if (viewingVersion) {
        setFormData({
            title: viewingVersion.title,
            description: viewingVersion.description,
            content: viewingVersion.content,
            tags: viewingVersion.tags,
            platform: viewingVersion.platform,
        });
        setViewingVersion(null);
        setShowHistory(false);
        setIsEditing(true);
    }
  };

  const handleVersionSelect = (version: PromptVersion | null) => {
    setViewingVersion(version);
    if (window.innerWidth < 640) {
        setShowHistory(false);
    }
  };

  const initiateDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (initialData) {
        onDelete(initialData.id);
        setShowDeleteConfirm(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className={`relative w-full ${showHistory ? 'max-w-5xl' : 'max-w-3xl'} bg-white rounded-2xl shadow-soft overflow-hidden flex h-full max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 transition-all ease-in-out`}>
        
        <div className="flex-1 flex flex-col min-w-0 relative">
            
            {showDeleteConfirm && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl border border-gray-100 max-w-sm w-full mx-6 text-center transform scale-100 animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete this prompt?</h3>
                        <p className="text-sm text-gray-500 mb-6 leading-relaxed">This action will remove the prompt from your library. You can undo this action immediately after deleting.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 bg-gray-50 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition-colors border border-gray-200">Cancel</button>
                            <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors shadow-sm shadow-red-500/20">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {viewingVersion && (
                <div className="bg-orange-50 px-6 py-2 border-b border-orange-100 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-orange-800">
                        <Clock size={14} />
                        <span className="font-medium">Viewing version from {new Date(viewingVersion.timestamp).toLocaleDateString()}</span>
                    </div>
                    <button onClick={handleRestore} className="px-3 py-1 bg-white border border-orange-200 text-orange-700 rounded-lg text-xs font-semibold hover:bg-orange-100 transition-colors shadow-sm">Restore</button>
                </div>
            )}

            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white/90 backdrop-blur-md sticky top-0 z-10 min-h-[72px]">
                <div className="flex-1 mr-4 min-w-0">
                {isEditing && !viewingVersion ? (
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="Give your prompt a title"
                        className="w-full text-xl font-bold text-gray-900 bg-white border border-gray-200 shadow-sm rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-400 placeholder:text-gray-300 transition-all"
                        autoFocus={!initialData}
                    />
                ) : (
                    <h2 className="text-xl font-bold text-gray-900 truncate pr-4">{displayData.title || 'Untitled Prompt'}</h2>
                )}
                {isEditing && !viewingVersion ? (
                    <input 
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="Add a brief description..."
                        className="w-full text-sm text-gray-600 mt-2 bg-white border border-gray-200 shadow-sm rounded-lg py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-400 placeholder:text-gray-300 transition-all"
                    />
                ) : (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{displayData.description}</p>
                )}
                </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
                {!isEditing && initialData && (
                    <>
                        <button
                            onClick={() => onToggleFavorite(initialData.id)}
                            className={`p-2 rounded-lg transition-colors ${initialData.isFavorite ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-red-400 hover:bg-red-50'}`}
                        >
                            <Heart size={18} fill={initialData.isFavorite ? "currentColor" : "none"} />
                        </button>
                        <button onClick={() => setShowHistory(!showHistory)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${showHistory ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
                            {viewingVersion && !showHistory ? <><ChevronLeft size={14} /><span className="hidden xs:inline">Back</span></> : <><History size={14} /><span className="hidden xs:inline">History</span></>}
                        </button>
                    </>
                )}
                {!isEditing && !viewingVersion && initialData && (
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm">
                        <Edit2 size={12} />Edit
                    </button>
                )}
                <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-1"><X size={20} /></button>
            </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#FAFAFA]">
            <div className="p-6 max-w-3xl mx-auto space-y-6">

                {(!isEditing || viewingVersion) && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex flex-wrap items-center gap-3">
                            {displayData.tags.map(tag => (
                                <span key={tag} className="px-2.5 py-1 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-lg shadow-sm">{tag}</span>
                            ))}
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border shadow-sm flex items-center gap-1.5
                                ${displayData.platform === 'ChatGPT' ? 'bg-green-50 text-green-700 border-green-100' : 
                                displayData.platform === 'Claude' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                displayData.platform === 'Gemini' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                displayData.platform === 'Perplexity' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                                'bg-purple-50 text-purple-700 border-purple-100'}`}>
                                {getPlatformIcon(displayData.platform as Platform)}
                                {displayData.platform}
                            </span>
                        </div>

                        {detectedVariables.length > 0 && (
                            <div className={`bg-white rounded-xl border transition-all duration-300 shadow-sm p-5 space-y-4 animate-in slide-in-from-top-2 ${validationError ? 'border-red-200 bg-red-50/10' : 'border-gray-200'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg transition-colors ${validationError ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                                            <Type size={16} />
                                        </div>
                                        <h3 className={`text-sm font-bold transition-colors ${validationError ? 'text-red-700' : 'text-gray-900'}`}>
                                            {validationError ? 'Sync Status' : 'Fill Variables'}
                                        </h3>
                                    </div>
                                    <button onClick={resetVariables} className="p-1.5 text-gray-400 hover:text-orange-500 transition-colors">
                                        <RotateCcw size={14} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {detectedVariables.map(variable => (
                                        <div key={variable} className="space-y-1.5">
                                            <label className={`text-[10px] font-bold uppercase tracking-wider ml-1 transition-colors ${missingFields.includes(variable) ? 'text-red-500' : 'text-gray-400'}`}>{variable}</label>
                                            <input
                                                type="text"
                                                value={variableValues[variable] || ''}
                                                onChange={(e) => handleVariableChange(variable, e.target.value)}
                                                placeholder={`Enter value for ${variable}`}
                                                className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none transition-all duration-300 ${
                                                    missingFields.includes(variable)
                                                    ? 'bg-red-50/50 border-red-300 ring-4 ring-red-500/5 focus:border-red-500 animate-shake'
                                                    : variableValues[variable] 
                                                    ? 'bg-green-50/30 border-green-200 focus:ring-2 focus:ring-green-500/10 focus:border-green-500' 
                                                    : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500'
                                                }`}
                                            />
                                        </div>
                                    ))}
                                </div>
                                {validationError && (
                                    <div className="flex items-center gap-2 text-[11px] font-semibold text-red-500 bg-red-50 p-2 rounded-lg animate-in fade-in slide-in-from-left-2">
                                        <AlertCircle size={14} />
                                        {validationError}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-4 py-2 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Prompt Content (Preview)</span>
                            </div>
                            <div className="p-6 font-mono text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                                {renderContentWithVariables(displayData.content)}
                            </div>
                        </div>
                    </div>
                )}

                {isEditing && !viewingVersion && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Platform</label>
                                <div className="relative">
                                    <button type="button" onClick={() => setIsPlatformOpen(!isPlatformOpen)} className={`w-full px-3 py-2.5 flex items-center justify-between border rounded-xl text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 ${getPlatformStyle(formData.platform).bg} ${getPlatformStyle(formData.platform).border} ${getPlatformStyle(formData.platform).text}`}>
                                        <div className="flex items-center gap-2.5 font-medium">{getPlatformIcon(formData.platform)}{formData.platform}</div>
                                        <ChevronDown size={14} className={`transition-transform duration-200 ${isPlatformOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isPlatformOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setIsPlatformOpen(false)} />
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 z-20 animate-in fade-in zoom-in-95 max-h-60 overflow-y-auto">
                                                {PLATFORMS.map(p => (
                                                    <button key={p} type="button" onClick={() => { setFormData({ ...formData, platform: p }); setIsPlatformOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 transition-colors ${formData.platform === p ? 'bg-gray-50 font-medium text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                                                        {getPlatformIcon(p)}{p}{formData.platform === p && <Check size={14} className="ml-auto text-gray-900" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1.5 relative">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Tags</label>
                                <div className="flex flex-wrap items-center gap-2 p-2 bg-white border border-gray-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-gray-900/10 min-h-[42px]">
                                    {formData.tags.map(tag => (
                                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg">
                                            {tag}<button type="button" onClick={() => removeTag(tag)} className="text-gray-400 hover:text-gray-600"><X size={12} /></button>
                                        </span>
                                    ))}
                                    <input type="text" value={tagInput} onChange={(e) => { setTagInput(e.target.value); setShowTagSuggestions(true); }} onFocus={() => setShowTagSuggestions(true)} onKeyDown={handleTagKeyDown} placeholder={formData.tags.length === 0 ? "Type tag + Enter..." : ""} className="flex-1 bg-transparent text-sm min-w-[80px] focus:outline-none placeholder:text-gray-400" />
                                </div>
                                {showTagSuggestions && filteredSuggestions.length > 0 && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setShowTagSuggestions(false)} />
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-lg shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95">
                                            <div className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-50">Suggestions</div>
                                            {filteredSuggestions.map(tag => (<button key={tag} type="button" onClick={() => addTag(tag)} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gray-300" />{tag}</button>))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Prompt Content</label>
                                <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100 shadow-sm">
                                    Use {"{{ }}"} for variables
                                </span>
                            </div>
                            <textarea value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} placeholder="Type your prompt here. Use {{variable}} for dynamic parts." className="w-full h-80 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all resize-none placeholder:text-gray-400 shadow-sm" />
                        </div>
                        {validationError && (
                            <div className="flex items-center gap-2 text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100 animate-in fade-in slide-in-from-bottom-2">
                                <AlertCircle size={14} />
                                {validationError}
                            </div>
                        )}
                    </div>
                )}
            </div>
            </div>

            {!viewingVersion && (
                <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-white">
                    {isEditing ? (
                        <>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => initialData ? setIsEditing(false) : onClose()} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
                                {initialData && (<button type="button" onClick={initiateDelete} className="px-3 py-2 text-sm font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={16} /></button>)}
                            </div>
                            <button onClick={handleSaveClick} disabled={isSaving} className={`flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 ${validationError && !isSaving ? 'bg-red-500 text-white' : 'bg-gray-900 text-white hover:bg-black'}`}>
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {isSaving 
                                  ? (saveTime > 5 ? "Waking up cloud vault..." : "Syncing...") 
                                  : validationError ? "Retry Sync" : "Save Version"
                                }
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-4">
                                <div className="text-xs text-gray-400">Last edited {new Date(initialData?.updatedAt || Date.now()).toLocaleDateString()}</div>
                                <button type="button" onClick={initiateDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                            </div>
                            
                            <div className="flex items-center gap-2 sm:gap-3">
                                <button onClick={handleRun} className={`flex items-center gap-2 px-4 sm:px-6 py-2 text-sm font-medium rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 ${copied ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-900 text-white hover:bg-black'}`}>
                                    {copied ? <><Check size={16} /><span>Copied!</span></> : <><Play size={16} fill="currentColor" /><span>Run in {displayData.platform}</span></>}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>

        {showHistory && initialData && (
            <div className="absolute inset-0 z-50 w-full sm:static sm:w-80 sm:border-l border-gray-100 bg-[#FAFAFA] flex flex-col animate-in slide-in-from-right duration-200">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm"><History size={16} />Version History</div>
                    <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600"><ChevronRight size={16} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="relative pl-4 pb-4 border-l-2 border-gray-200 last:border-0">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-green-500 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /></div>
                        <div onClick={() => handleVersionSelect(null)} className={`cursor-pointer p-3 rounded-xl border transition-all ${!viewingVersion ? 'bg-white border-green-200 shadow-sm' : 'hover:bg-white hover:border-gray-200 border-transparent'}`}>
                            <div className="flex justify-between items-start mb-1"><span className="text-sm font-semibold text-gray-900">Current Draft</span><span className="px-1.5 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded uppercase">Active</span></div>
                            <p className="text-xs text-gray-400">Just now</p>
                        </div>
                    </div>
                    {initialData.history && initialData.history.map((version, idx) => (
                        <div key={idx} className="relative pl-4 pb-4 border-l-2 border-gray-200 last:border-0 last:pb-0">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-gray-200" />
                            <div onClick={() => handleVersionSelect(version)} className={`cursor-pointer p-3 rounded-xl border transition-all ${viewingVersion === version ? 'bg-white border-orange-200 shadow-sm ring-1 ring-orange-100' : 'hover:bg-white hover:border-gray-200 border-transparent'}`}>
                                <div className="flex justify-between items-start mb-1"><span className="text-sm font-semibold text-gray-700">Version {initialData.history!.length - idx}</span></div>
                                <div className="flex items-center gap-1 text-xs text-gray-400 mb-2"><Clock size={10} />{new Date(version.timestamp).toLocaleString()}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

const Loader2 = ({ size, className }: { size: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/>
    </svg>
);

export default PromptModal;
