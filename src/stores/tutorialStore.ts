import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string; // CSS selector
  requiredAction?: 'click' | 'drag' | 'place' | 'remove' | 'test' | 'save';
  validationFn?: () => boolean;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  allowSkip?: boolean;
}

interface TutorialState {
  // State
  isActive: boolean;
  currentStep: number;
  completed: boolean;
  skipped: boolean;
  hasSeenBefore: boolean;
  steps: TutorialStep[];
  progress: number[]; // Array of completed step indices
  
  // Actions
  startTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTutorial: () => void;
  restartTutorial: () => void;
  completeTutorial: () => void;
  setStepComplete: (stepIndex: number) => void;
  pauseTutorial: () => void;
  resumeTutorial: () => void;
  resetTutorial: () => void;
}

// Tutorial steps definition
const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'レベルエディタへようこそ！',
    description: '独自のレベルを作成する方法を学びましょう。クリックして続けます。',
    requiredAction: 'click',
    allowSkip: true,
  },
  {
    id: 'select-block',
    title: 'ブロックタイプを選択',
    description: 'パレットからブロックタイプをクリックして選択してください。',
    targetElement: '[data-testid="block-palette"]',
    requiredAction: 'click',
    tooltipPosition: 'right',
  },
  {
    id: 'place-block',
    title: '最初のブロックを配置',
    description: 'グリッド上をクリックしてブロックを配置してください。',
    targetElement: '[data-testid="editor-canvas"]',
    requiredAction: 'place',
    tooltipPosition: 'top',
  },
  {
    id: 'remove-block',
    title: 'ブロックの削除',
    description: '配置したブロックを右クリックまたは消しゴムツールで削除できます。',
    targetElement: '[data-testid="editor-canvas"]',
    requiredAction: 'remove',
    tooltipPosition: 'top',
  },
  {
    id: 'special-blocks',
    title: '特殊ブロックの使用',
    description: 'パワーアップやボーナスポイントを持つ特殊ブロックを配置してみましょう。',
    targetElement: '[data-testid="block-palette"]',
    requiredAction: 'place',
    tooltipPosition: 'right',
  },
  {
    id: 'test-level',
    title: 'レベルをテスト',
    description: 'テストボタンをクリックしてレベルをプレビューしてください。',
    targetElement: '[data-testid="test-level-button"]',
    requiredAction: 'test',
    tooltipPosition: 'bottom',
  },
  {
    id: 'save-level',
    title: 'レベルを保存',
    description: '保存ボタンをクリックしてレベルを保存してください。',
    targetElement: '[data-testid="save-level-button"]',
    requiredAction: 'save',
    tooltipPosition: 'bottom',
  },
  {
    id: 'load-edit',
    title: '保存したレベルの編集',
    description: '保存したレベルはいつでもロードして編集できます。',
    targetElement: '[data-testid="load-level-button"]',
    tooltipPosition: 'bottom',
    allowSkip: true,
  },
  {
    id: 'completion',
    title: 'おめでとうございます！',
    description: 'レベルエディタの基本をマスターしました。素晴らしいレベルを作成してください！',
    requiredAction: 'click',
    allowSkip: true,
  },
];

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set, get) => ({
      // Initial state
      isActive: false,
      currentStep: 0,
      completed: false,
      skipped: false,
      hasSeenBefore: false,
      steps: tutorialSteps,
      progress: [],

      // Actions
      startTutorial: () => {
        set({
          isActive: true,
          currentStep: 0,
          completed: false,
          skipped: false,
          progress: [],
        });
      },

      nextStep: () => {
        const { currentStep, steps } = get();
        if (currentStep < steps.length - 1) {
          set((state) => ({
            currentStep: state.currentStep + 1,
            progress: [...new Set([...state.progress, state.currentStep])],
          }));
        } else {
          get().completeTutorial();
        }
      },

      previousStep: () => {
        set((state) => ({
          currentStep: Math.max(0, state.currentStep - 1),
        }));
      },

      skipTutorial: () => {
        set({
          isActive: false,
          skipped: true,
          hasSeenBefore: true,
        });
      },

      restartTutorial: () => {
        set({
          isActive: true,
          currentStep: 0,
          completed: false,
          skipped: false,
          progress: [],
        });
      },

      completeTutorial: () => {
        set({
          isActive: false,
          completed: true,
          hasSeenBefore: true,
          progress: tutorialSteps.map((_, i) => i),
        });
        
        // Trigger achievement unlock (if system exists)
        const event = new CustomEvent('achievement-unlock', {
          detail: { 
            id: 'editor-pro',
            title: 'エディタープロ',
            description: 'レベルエディタのチュートリアルを完了しました！'
          }
        });
        window.dispatchEvent(event);
      },

      setStepComplete: (stepIndex: number) => {
        set((state) => ({
          progress: [...new Set([...state.progress, stepIndex])],
        }));
      },

      pauseTutorial: () => {
        set({ isActive: false });
      },

      resumeTutorial: () => {
        set({ isActive: true });
      },

      resetTutorial: () => {
        set({
          isActive: false,
          currentStep: 0,
          completed: false,
          skipped: false,
          hasSeenBefore: false,
          progress: [],
        });
      },
    }),
    {
      name: 'blockbreaker_tutorial_state',
      partialize: (state) => ({
        completed: state.completed,
        skipped: state.skipped,
        hasSeenBefore: state.hasSeenBefore,
        currentStep: state.currentStep,
        progress: state.progress,
      }),
    }
  )
);