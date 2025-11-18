/**
 * Global state management using Zustand
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
interface User {
  email: string;
  name?: string;
  picture?: string;
  credentials?: {
    access_token?: string;
    refresh_token?: string;
  };
}

interface Note {
  id: string;
  title: string;
  content: string;
  content_type: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface MemoryPalaceRoom {
  id: string;
  name: string;
  description: string;
  notes: string[];
  position: { x: number; y: number; z: number };
  color: string;
  connections: string[];
}

interface MemoryPalaceStructure {
  rooms: MemoryPalaceRoom[];
  notes_index: Record<string, Note>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  available: boolean;
  description: string;
}

export interface ResearchResult {
  topic: string;
  overview: string;
  key_findings: string[];
  connections?: string;
  further_reading: Array<{ title: string; author?: string; url: string }>;
}

export interface ExplanationResult {
  topic: string;
  introduction: string;
  steps: Array<{ title: string; content: string }>;
  analogies: string[];
  references: Array<{ title: string; url: string }>;
  latex_equations?: string[];
}

interface AppState {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  memoryPalace: MemoryPalaceStructure | null;
  setMemoryPalace: (structure: MemoryPalaceStructure) => void;
  currentRoom: string | null;
  setCurrentRoom: (roomId: string | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  availableModels: AIModel[];
  setAvailableModels: (models: AIModel[]) => void;
  // Research persistence
  researchResult: ResearchResult | null;
  setResearchResult: (result: ResearchResult | null) => void;
  explanationResult: ExplanationResult | null;
  setExplanationResult: (result: ExplanationResult | null) => void;
  researchHistory: Array<{ type: 'research' | 'explain'; topic: string; timestamp: string; data: ResearchResult | ExplanationResult }>;
  addToHistory: (type: 'research' | 'explain', topic: string, data: ResearchResult | ExplanationResult) => void;
}

// Auth store
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      login: (token: string, user: User) => {
        localStorage.setItem('auth_token', token);
        set({ isAuthenticated: true, user, token });
      },
      logout: () => {
        localStorage.removeItem('auth_token');
        set({ isAuthenticated: false, user: null, token: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

// App store
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
      toggleDarkMode: () => set((state) => {
        const newMode = !state.isDarkMode;
        document.documentElement.classList.toggle('dark', newMode);
        return { isDarkMode: newMode };
      }),
      memoryPalace: null,
      setMemoryPalace: (structure: MemoryPalaceStructure) => set({ memoryPalace: structure }),
      currentRoom: null,
      setCurrentRoom: (roomId: string | null) => set({ currentRoom: roomId }),
      isLoading: false,
      setIsLoading: (loading: boolean) => set({ isLoading: loading }),
      error: null,
      setError: (error: string | null) => set({ error }),
      selectedModel: 'claude',
      setSelectedModel: (model: string) => set({ selectedModel: model }),
      availableModels: [],
      setAvailableModels: (models: AIModel[]) => set({ availableModels: models }),
      // Research persistence
      researchResult: null,
      setResearchResult: (result: ResearchResult | null) => set({ researchResult: result }),
      explanationResult: null,
      setExplanationResult: (result: ExplanationResult | null) => set({ explanationResult: result }),
      researchHistory: [],
      addToHistory: (type: 'research' | 'explain', topic: string, data: ResearchResult | ExplanationResult) => 
        set((state) => ({
          researchHistory: [
            { type, topic, timestamp: new Date().toISOString(), data },
            ...state.researchHistory.slice(0, 49), // Keep last 50 items
          ],
        })),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        memoryPalace: state.memoryPalace,
        selectedModel: state.selectedModel,
        researchResult: state.researchResult,
        explanationResult: state.explanationResult,
        researchHistory: state.researchHistory,
      }),
    }
  )
);

// Initialize dark mode on load
if (useAppStore.getState().isDarkMode) {
  document.documentElement.classList.add('dark');
}
