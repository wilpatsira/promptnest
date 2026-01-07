
import { Prompt, PLATFORMS, Platform } from '../types';
import { supabase } from './auth';

const CACHE_KEY = 'promptnest_user_prompts';

const setLocalCache = (prompts: Prompt[]) => {
  if (!prompts) return;
  localStorage.setItem(CACHE_KEY, JSON.stringify(prompts));
};

export const getCachedPrompts = (): Prompt[] => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

export const clearPromptCache = (): void => {
  localStorage.removeItem(CACHE_KEY);
};

const mapDbToPrompt = (p: any): Prompt => ({
  id: p.id,
  userId: p.user_id,
  title: p.title,
  description: p.description || '',
  content: p.content,
  tags: p.tags || [],
  platform: p.platform,
  createdAt: new Date(p.created_at).getTime(),
  updatedAt: new Date(p.updated_at).getTime(),
  history: p.history || [],
  isFavorite: p.is_favorite || false,
});

const mapPromptToDb = (p: Prompt) => ({
  id: p.id,
  user_id: p.userId,
  title: p.title,
  description: p.description,
  content: p.content,
  tags: p.tags,
  platform: p.platform,
  is_favorite: p.isFavorite,
  history: p.history || [],
  updated_at: new Date(p.updatedAt).toISOString(),
  created_at: new Date(p.createdAt).toISOString(),
});

export const fetchPrompts = async (userId: string, retries = 3): Promise<{ data: Prompt[], error: boolean }> => {
  if (!userId || userId.startsWith('offline_')) return { data: [], error: false };

  try {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const prompts = (data || []).map(mapDbToPrompt);
    setLocalCache(prompts);
    return { data: prompts, error: false };
  } catch (error: any) {
    if (retries > 0) {
      await new Promise(res => setTimeout(res, 2000));
      return fetchPrompts(userId, retries - 1);
    }
    return { data: getCachedPrompts(), error: true };
  }
};

/**
 * Queue untuk pending syncs
 */
let syncQueue: Map<string, { prompt: Prompt; userId: string; attempts: number }> = new Map();
let isSyncRunning = false;

/**
 * Process sync queue in background
 */
const processSyncQueue = async () => {
  if (isSyncRunning || syncQueue.size === 0) return;
  isSyncRunning = true;

  for (const [id, item] of syncQueue) {
    try {
      const dbData = mapPromptToDb({ ...item.prompt, userId: item.userId });
      const { error } = await supabase.from('prompts').upsert(dbData, { onConflict: 'id' });

      if (!error) {
        syncQueue.delete(id);
        console.log(`✓ Synced: ${item.prompt.title}`);
      } else {
        throw error;
      }
    } catch (error: any) {
      item.attempts++;
      if (item.attempts >= 3) {
        console.error(`✗ Failed after 3 attempts: ${item.prompt.title}`);
        syncQueue.delete(id);
      } else {
        console.warn(`↻ Retry ${item.attempts}/3: ${item.prompt.title}`);
      }
    }
  }

  isSyncRunning = false;

  // Jika masih ada yang pending, coba lagi setelah 5 detik
  if (syncQueue.size > 0) {
    setTimeout(processSyncQueue, 5000);
  }
};

/**
 * Optimistic Save - Update local cache immediately, sync to cloud in background
 * Returns true immediately after local cache update
 */
export const savePrompt = async (prompt: Prompt, userId: string): Promise<boolean> => {
  if (!userId || userId.startsWith('offline_')) return false;

  // 1. Update cache lokal SEGERA (optimistic)
  const current = getCachedPrompts();
  const updatedCache = current.some(p => p.id === prompt.id)
    ? current.map(p => p.id === prompt.id ? prompt : p)
    : [prompt, ...current];
  setLocalCache(updatedCache);

  // 2. Queue untuk background sync
  syncQueue.set(prompt.id, { prompt, userId, attempts: 0 });

  // 3. Proses queue di background (non-blocking)
  setTimeout(processSyncQueue, 100);

  return true; // Return immediately
};

/**
 * Force sync all pending items (call this on app focus/visibility change)
 */
export const forceSyncPending = () => {
  if (syncQueue.size > 0) {
    processSyncQueue();
  }
};

/**
 * Check if there are pending syncs
 */
export const hasPendingSync = (): boolean => syncQueue.size > 0;

export const deletePrompt = async (promptId: string, userId: string): Promise<boolean> => {
  if (!userId || userId.startsWith('offline_')) return false;
  try {
    const { error } = await supabase.from('prompts').delete().eq('id', promptId).eq('user_id', userId);
    if (error) throw error;
    const filtered = getCachedPrompts().filter(p => p.id !== promptId);
    setLocalCache(filtered);
    return true;
  } catch (error: any) {
    return false;
  }
};

export const seedInitialData = async (userId: string): Promise<Prompt[]> => {
  try {
    const { count, error } = await supabase
      .from('prompts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (!error && count && count > 0) {
      const result = await fetchPrompts(userId);
      return result.data;
    }

    const now = Date.now();
    const demoPrompts: Prompt[] = [
      {
        id: crypto.randomUUID(),
        userId,
        title: 'Viral Content Hook Generator',
        description: 'Create scroll-stopping hooks for social media content.',
        content: `You are a viral content strategist. Generate 10 powerful hooks for my {{platform}} content about "{{topic}}".

**Content Goal:** {{goal}} (educate/entertain/inspire/sell)
**Target Audience:** {{audience}}
**Tone:** {{tone}} (professional/casual/bold/inspiring)

For each hook, provide:
1. The hook text (under 15 words)
2. Why it works psychologically  
3. Best visual pairing suggestion

Make them curiosity-driven, benefit-focused, or pattern-interrupting.`,
        tags: ['Content Creation', 'Social Media'],
        platform: 'ChatGPT',
        createdAt: now,
        updatedAt: now,
        history: [],
        isFavorite: true
      },
      {
        id: crypto.randomUUID(),
        userId,
        title: 'Academic Literature Review',
        description: 'Comprehensive literature review for research papers.',
        content: `Conduct a systematic literature review on "{{research_topic}}".

**Research Parameters:**
- Field: {{academic_field}}
- Time range: {{year_range}}
- Focus: {{specific_focus}}

**Deliverables:**
1. **Overview** - Current state of research (300 words)
2. **Key Themes** - Major theoretical frameworks and debates
3. **Methodology Analysis** - Common approaches used
4. **Research Gaps** - Unexplored areas and opportunities
5. **Critical Synthesis** - Connections between studies
6. **Future Directions** - Recommended research questions

Include proper academic citations in {{citation_style}} format.`,
        tags: ['Research', 'Academic', 'Literature Review'],
        platform: 'Perplexity',
        createdAt: now - 1000,
        updatedAt: now - 1000,
        history: [],
        isFavorite: true
      },
      {
        id: crypto.randomUUID(),
        userId,
        title: 'Article & Essay Writer',
        description: 'Create well-structured, engaging long-form content.',
        content: `Write a {{word_count}}-word {{content_type}} about "{{topic}}".

**Writing Brief:**
- Purpose: {{purpose}} (inform/persuade/analyze/narrate)
- Audience: {{target_reader}}
- Tone: {{writing_tone}}
- Key message: {{main_argument}}

**Structure Requirements:**
1. Compelling opening hook
2. Clear thesis statement  
3. Well-organized body with transitions
4. Evidence and examples
5. Strong conclusion with takeaway

**Style Notes:** {{style_notes}}

Write in a distinctive voice that engages readers from start to finish.`,
        tags: ['Writing', 'Articles', 'Essays'],
        platform: 'Claude',
        createdAt: now - 2000,
        updatedAt: now - 2000,
        history: [],
        isFavorite: false
      },
      {
        id: crypto.randomUUID(),
        userId,
        title: 'Lecture Material Builder',
        description: 'Create engaging educational content and presentations.',
        content: `Design a complete {{duration}}-minute lecture on "{{lecture_topic}}".

**Course Context:**
- Subject: {{subject}}
- Level: {{student_level}} (undergraduate/graduate/professional)
- Learning objectives: {{objectives}}

**Generate:**
1. **Lecture Outline** - Main sections with timing
2. **Opening Hook** - Engaging introduction (2-3 minutes)
3. **Core Content** - Key concepts with explanations
4. **Discussion Questions** - 5 thought-provoking questions
5. **Practical Examples** - Real-world applications
6. **Assessment Ideas** - Quiz questions or assignments
7. **Slide Suggestions** - Visual content recommendations

Make it interactive and student-centered.`,
        tags: ['Education', 'Teaching', 'Lectures'],
        platform: 'Gemini',
        createdAt: now - 3000,
        updatedAt: now - 3000,
        history: [],
        isFavorite: false
      },
      {
        id: crypto.randomUUID(),
        userId,
        title: 'Creative Brief Generator',
        description: 'Develop comprehensive briefs for creative projects.',
        content: `Create a professional creative brief for a {{project_type}} project.

**Project Overview:**
- Client/Brand: {{brand_name}}
- Industry: {{industry}}
- Campaign: {{campaign_name}}

**Brief Components:**
1. **Background** - Brand context and challenge
2. **Objectives** - Specific, measurable goals
3. **Target Audience** - Demographics, psychographics, pain points
4. **Key Message** - Single most important takeaway
5. **Tone & Style** - Creative direction guidelines
6. **Deliverables** - Required assets and formats
7. **Timeline** - Key milestones and deadlines
8. **Success Metrics** - How to measure results

Additional requirements: {{additional_notes}}`,
        tags: ['Creative', 'Marketing', 'Branding'],
        platform: 'Copilot',
        createdAt: now - 4000,
        updatedAt: now - 4000,
        history: [],
        isFavorite: false
      },
      {
        id: crypto.randomUUID(),
        userId,
        title: 'Legal Document Analyzer',
        description: 'Review and analyze legal documents for key insights.',
        content: `Analyze this {{document_type}} and provide a comprehensive review.

**Document Context:**
- Type: {{document_type}} (contract/agreement/policy/regulation)
- Jurisdiction: {{jurisdiction}}
- Purpose: {{review_purpose}}

**Analysis Required:**
1. **Executive Summary** - Key points in plain language
2. **Rights & Obligations** - Party responsibilities
3. **Risk Assessment** - Potential liabilities and concerns
4. **Key Clauses** - Important terms highlighted
5. **Missing Elements** - Standard provisions not included
6. **Recommendations** - Suggested modifications
7. **Questions to Clarify** - Ambiguous language identified

**Document text:**
{{document_text}}

Note: This is for informational purposes, not legal advice.`,
        tags: ['Legal', 'Contracts', 'Analysis'],
        platform: 'Claude',
        createdAt: now - 5000,
        updatedAt: now - 5000,
        history: [],
        isFavorite: false
      }
    ];

    const dbPayload = demoPrompts.map(mapPromptToDb);
    await supabase.from('prompts').upsert(dbPayload, { onConflict: 'id' });
    setLocalCache(demoPrompts);
    return demoPrompts;
  } catch {
    return getCachedPrompts();
  }
};
