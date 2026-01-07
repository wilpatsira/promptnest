
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
        title: 'Expert Code Reviewer',
        description: 'Get thorough, actionable code reviews with best practices.',
        content: `You are a senior software engineer with 15+ years of experience. Review this {{language}} code for:

1. **Bugs & Logic Errors** - Identify potential issues
2. **Performance** - Suggest optimizations  
3. **Security** - Flag vulnerabilities
4. **Readability** - Improve code clarity
5. **Best Practices** - Apply industry standards

Code to review:
\`\`\`{{language}}
{{code}}
\`\`\`

Provide specific line-by-line feedback with improved code snippets.`,
        tags: ['Development', 'Code Review'],
        platform: 'ChatGPT',
        createdAt: now,
        updatedAt: now,
        history: [],
        isFavorite: true
      },
      {
        id: crypto.randomUUID(),
        userId,
        title: 'Strategic Content Writer',
        description: 'Create engaging, SEO-optimized content for any topic.',
        content: `Write a comprehensive {{content_type}} about "{{topic}}" for {{target_audience}}.

Requirements:
- Tone: {{tone}} (professional/casual/persuasive)
- Length: {{word_count}} words
- Include: compelling hook, clear structure, actionable insights
- Optimize for SEO with natural keyword integration
- End with a strong call-to-action

Additional context: {{context}}`,
        tags: ['Marketing', 'Writing', 'SEO'],
        platform: 'Claude',
        createdAt: now - 1000,
        updatedAt: now - 1000,
        history: [],
        isFavorite: true
      },
      {
        id: crypto.randomUUID(),
        userId,
        title: 'Data Analysis Assistant',
        description: 'Transform raw data into actionable insights.',
        content: `Analyze this {{data_type}} dataset and provide:

1. **Summary Statistics** - Key metrics and distributions
2. **Trend Analysis** - Patterns and anomalies  
3. **Correlations** - Relationships between variables
4. **Actionable Insights** - Business recommendations
5. **Visualization Suggestions** - Best charts to use

Dataset description: {{dataset_description}}
Key questions to answer: {{questions}}
Industry context: {{industry}}

Present findings in a clear, executive-friendly format.`,
        tags: ['Analytics', 'Business'],
        platform: 'Gemini',
        createdAt: now - 2000,
        updatedAt: now - 2000,
        history: [],
        isFavorite: false
      },
      {
        id: crypto.randomUUID(),
        userId,
        title: 'Research Deep Dive',
        description: 'Comprehensive research with citations and sources.',
        content: `Conduct thorough research on "{{research_topic}}" and provide:

**Research Scope:**
- Focus area: {{focus_area}}
- Time period: {{time_period}}
- Geographic scope: {{region}}

**Deliverables:**
1. Executive summary (3-5 key findings)
2. Detailed analysis with supporting evidence
3. Contrarian viewpoints and limitations
4. Future outlook and predictions
5. List of authoritative sources with links

Prioritize recent, peer-reviewed, and credible sources.`,
        tags: ['Research', 'Academic'],
        platform: 'Perplexity',
        createdAt: now - 3000,
        updatedAt: now - 3000,
        history: [],
        isFavorite: false
      },
      {
        id: crypto.randomUUID(),
        userId,
        title: 'API Integration Builder',
        description: 'Generate production-ready API integration code.',
        content: `Create a complete {{language}} integration for the {{api_name}} API.

**Requirements:**
- Authentication: {{auth_type}} (OAuth2/API Key/Bearer)
- Endpoints needed: {{endpoints}}
- Error handling: Comprehensive with retries
- Rate limiting: Respect API limits
- Logging: Debug and production modes

**Include:**
1. Configuration/environment setup
2. API client class with all methods
3. Request/response type definitions
4. Usage examples
5. Unit test templates

Follow {{language}} best practices and coding standards.`,
        tags: ['Development', 'API', 'Integration'],
        platform: 'Copilot',
        createdAt: now - 4000,
        updatedAt: now - 4000,
        history: [],
        isFavorite: false
      },
      {
        id: crypto.randomUUID(),
        userId,
        title: 'Meeting Notes Synthesizer',
        description: 'Transform messy meeting notes into structured summaries.',
        content: `Transform these meeting notes into a professional summary:

**Raw Notes:**
{{meeting_notes}}

**Generate:**
1. **Meeting Overview** - Date, attendees, purpose (2-3 sentences)
2. **Key Decisions** - Bullet points of what was decided
3. **Action Items** - Task, owner, deadline (table format)
4. **Discussion Highlights** - Important points raised
5. **Next Steps** - Follow-up meetings, pending items
6. **Parking Lot** - Topics deferred for later

Format for easy sharing via {{format}} (email/Slack/Notion).`,
        tags: ['Productivity', 'Business'],
        platform: 'Grok',
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
