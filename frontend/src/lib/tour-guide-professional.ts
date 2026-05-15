/**
 * PROFESSIONAL TOUR GUIDE SYSTEM
 * Following Nielsen Norman Group UX Guidelines
 * 
 * Key Principles:
 * ✅ Non-blocking: Users can always proceed
 * ✅ Brief and helpful: Microcontent tooltips
 * ✅ Progressive disclosure: Adaptive to user level
 * ✅ User-triggered: Optional guidance
 * ✅ Clean UI: No debug information
 */

export type TourLevel = 'beginner' | 'intermediate' | 'expert';

export interface TourStep {
  id: string;
  title: string;
  content: string;
  detailedContent?: string;
  expertTip?: string;
  target: string | (() => Element | null);
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  highlightPadding?: number;
  // Optional hint (never blocks user)
  hint?: string;
  // Validation for showing hints only (never blocks navigation)
  checkCompletion?: () => boolean;
  onEnter?: () => void;
  onExit?: () => void;
  skippable?: boolean;
}

export interface TourState {
  isActive: boolean;
  currentStepId: string | null;
  userLevel: TourLevel;
  completedSteps: string[];
  skippedSteps: string[];
  startedAt: number | null;
  lastActiveAt: number | null;
}

type StateChangeListener = (state: TourState) => void;

export class ProfessionalTourGuide {
  private steps: Map<string, TourStep> = new Map();
  private stepOrder: string[] = [];
  private state: TourState;
  private listeners: Set<StateChangeListener> = new Set();
  private readonly STORAGE_KEY = 'rwa-tour-state-v3';

  constructor(steps: TourStep[]) {
    // Initialize steps
    steps.forEach(step => {
      this.steps.set(step.id, step);
      this.stepOrder.push(step.id);
    });

    // Load or initialize state
    this.state = this.loadState();
  }

  // ========================================
  // STATE MANAGEMENT
  // ========================================

  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  private loadState(): TourState {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('[Tour] Failed to load state:', error);
    }

    return {
      isActive: false,
      currentStepId: null,
      userLevel: 'intermediate',
      completedSteps: [],
      skippedSteps: [],
      startedAt: null,
      lastActiveAt: null,
    };
  }

  private saveState(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('[Tour] Failed to save state:', error);
    }
  }

  private saveAndNotify(): void {
    this.saveState();
    this.notifyListeners();
  }

  // ========================================
  // TOUR CONTROL (NON-BLOCKING)
  // ========================================

  start(): void {
    if (this.stepOrder.length === 0) return;

    this.state.isActive = true;
    this.state.currentStepId = this.stepOrder[0];
    this.state.startedAt = Date.now();
    this.state.lastActiveAt = Date.now();

    const firstStep = this.steps.get(this.stepOrder[0]);
    if (firstStep?.onEnter) {
      firstStep.onEnter();
    }

    this.saveAndNotify();
  }

  /**
   * Navigate to next step - ALWAYS SUCCEEDS (non-blocking)
   * Following NN/g: "Tooltips shouldn't be essential for tasks"
   */
  next(): void {
    const currentIndex = this.getCurrentStepIndex();
    if (currentIndex === -1) return;

    const currentStep = this.steps.get(this.state.currentStepId!);
    if (currentStep) {
      // Mark as completed (optional tracking)
      if (!this.state.completedSteps.includes(currentStep.id)) {
        this.state.completedSteps.push(currentStep.id);
      }
      
      if (currentStep.onExit) {
        currentStep.onExit();
      }
    }

    // Move to next or finish
    if (currentIndex >= this.stepOrder.length - 1) {
      this.finish();
      return;
    }

    this.state.currentStepId = this.stepOrder[currentIndex + 1];
    this.state.lastActiveAt = Date.now();

    const nextStep = this.steps.get(this.state.currentStepId);
    if (nextStep?.onEnter) {
      nextStep.onEnter();
    }

    this.saveAndNotify();
  }

  /**
   * Navigate to previous step
   */
  previous(): void {
    const currentIndex = this.getCurrentStepIndex();
    if (currentIndex <= 0) return;

    this.state.currentStepId = this.stepOrder[currentIndex - 1];
    this.state.lastActiveAt = Date.now();

    const prevStep = this.steps.get(this.state.currentStepId);
    if (prevStep?.onEnter) {
      prevStep.onEnter();
    }

    this.saveAndNotify();
  }

  /**
   * Skip current step
   */
  skip(): void {
    const currentStep = this.getCurrentStep();
    if (!currentStep || !currentStep.skippable) return;

    if (!this.state.skippedSteps.includes(currentStep.id)) {
      this.state.skippedSteps.push(currentStep.id);
    }

    this.next();
  }

  /**
   * Finish tour
   */
  finish(): void {
    const currentStep = this.getCurrentStep();
    if (currentStep?.onExit) {
      currentStep.onExit();
    }

    this.state.isActive = false;
    this.state.currentStepId = null;
    this.saveAndNotify();
  }

  /**
   * Reset tour completely
   */
  reset(): void {
    this.state = {
      isActive: false,
      currentStepId: null,
      userLevel: 'intermediate',
      completedSteps: [],
      skippedSteps: [],
      startedAt: null,
      lastActiveAt: null,
    };
    this.saveAndNotify();
  }

  /**
   * Jump to specific step
   */
  goToStep(stepId: string): void {
    if (!this.steps.has(stepId)) return;

    this.state.currentStepId = stepId;
    this.state.isActive = true;
    this.state.lastActiveAt = Date.now();

    const step = this.steps.get(stepId);
    if (step?.onEnter) {
      step.onEnter();
    }

    this.saveAndNotify();
  }

  /**
   * Change user experience level
   */
  setUserLevel(level: TourLevel): void {
    this.state.userLevel = level;
    this.saveAndNotify();
  }

  // ========================================
  // STATE GETTERS
  // ========================================

  getState(): TourState {
    return { ...this.state };
  }

  isActive(): boolean {
    return this.state.isActive;
  }

  getCurrentStep(): TourStep | null {
    if (!this.state.currentStepId) return null;
    return this.steps.get(this.state.currentStepId) || null;
  }

  getCurrentStepIndex(): number {
    if (!this.state.currentStepId) return -1;
    return this.stepOrder.indexOf(this.state.currentStepId);
  }

  getTotalSteps(): number {
    return this.stepOrder.length;
  }

  getProgress(): number {
    const current = this.getCurrentStepIndex();
    if (current === -1) return 0;
    return ((current + 1) / this.stepOrder.length) * 100;
  }

  /**
   * Get current target element (with auto-scroll)
   */
  getCurrentTargetElement(): HTMLElement | null {
    const step = this.getCurrentStep();
    if (!step) return null;

    let element: Element | null = null;

    if (typeof step.target === 'function') {
      element = step.target();
    } else if (typeof step.target === 'string') {
      element = document.querySelector(step.target);
    }

    if (!element) return null;

    // Auto-scroll into view if needed
    const rect = element.getBoundingClientRect();
    const isVisible = (
      rect.top >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.left >= 0 &&
      rect.right <= window.innerWidth
    );

    if (!isVisible) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
    }

    return element as HTMLElement;
  }

  /**
   * Get optional hint for current step (non-blocking guidance)
   * Following NN/g: "Provide brief and helpful content inside the tooltip"
   */
  getCurrentHint(): string | null {
    const step = this.getCurrentStep();
    if (!step) return null;

    // Check if user might benefit from a hint
    if (step.checkCompletion && !step.checkCompletion() && step.hint) {
      return step.hint;
    }

    return null;
  }

  /**
   * Check if step action is complete (for optional feedback only)
   * NEVER blocks user navigation
   */
  isStepComplete(): boolean {
    const step = this.getCurrentStep();
    if (!step || !step.checkCompletion) return true;
    return step.checkCompletion();
  }
}
