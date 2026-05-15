/**
 * COMPLETELY REWRITTEN Tour Guide Manager V2
 * Proper state management, synchronous validation, element waiting
 */

export type TourLevel = 'beginner' | 'intermediate' | 'expert';

export type TourActionType = 
  | 'click' 
  | 'input' 
  | 'select' 
  | 'navigate' 
  | 'wallet-connect'
  | 'form-submit'
  | 'none';

export interface TourStep {
  id: string;
  title: string;
  content: string;
  detailedContent?: string;
  expertTip?: string;
  target: string | (() => Element | null);
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  highlightPadding?: number;
  action?: TourActionType;
  requiredAction?: boolean;
  validateAction?: () => boolean; // MUST be synchronous
  onEnter?: () => void; // Called when step becomes active
  onComplete?: () => void; // Called when moving to next step
  prerequisites?: string[];
  skippable?: boolean;
  nextStep?: string | ((context: TourContext) => string);
}

export interface TourContext {
  isWalletConnected: boolean;
  currentPage: string;
  formData: Record<string, any>;
  completedSteps: string[];
  skippedSteps: string[];
  userLevel: TourLevel;
}

export interface TourState {
  currentStepId: string | null;
  completedSteps: string[];
  skippedSteps: string[];
  startedAt: number;
  lastActiveAt: number;
  userLevel: TourLevel;
  context: TourContext;
  isActive: boolean;
}

type StateChangeListener = (state: TourState) => void;

export class TourGuideManager {
  private steps: Map<string, TourStep> = new Map();
  private stepOrder: string[] = []; // Maintain step order
  private state: TourState;
  private listeners: Set<StateChangeListener> = new Set();
  private elementCheckInterval: NodeJS.Timeout | null = null;
  private storageKey = 'rwa_tour_state_v2';

  constructor() {
    this.state = this.loadState();
  }

  /**
   * Register tour steps in order
   */
  registerSteps(steps: TourStep[]) {
    this.steps.clear();
    this.stepOrder = [];
    
    steps.forEach(step => {
      this.steps.set(step.id, step);
      this.stepOrder.push(step.id);
    });
    
    console.log('[Tour] Registered', steps.length, 'steps');
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Start or resume tour
   */
  start(stepId?: string) {
    const firstStepId = stepId || this.stepOrder[0];
    if (!firstStepId) {
      console.error('[Tour] No steps registered');
      return;
    }

    this.state.currentStepId = firstStepId;
    this.state.isActive = true;
    this.state.lastActiveAt = Date.now();
    
    if (!this.state.startedAt) {
      this.state.startedAt = Date.now();
    }

    const step = this.steps.get(firstStepId);
    if (step?.onEnter) {
      step.onEnter();
    }

    this.saveAndNotify();
    this.startElementCheck();
    console.log('[Tour] Started at step:', firstStepId);
  }

  /**
   * Navigate to next step with proper validation
   */
  next(): boolean {
    const currentStep = this.getCurrentStep();
    if (!currentStep) {
      console.error('[Tour] No current step');
      return false;
    }

    console.log('[Tour] Attempting to advance from:', currentStep.id);

    // Check if action is required and validate
    if (currentStep.requiredAction && currentStep.validateAction) {
      const isValid = currentStep.validateAction();
      console.log('[Tour] Validation result:', isValid);
      
      if (!isValid) {
        console.warn('[Tour] Cannot proceed - action not completed');
        // Shake the target element
        this.shakeTargetElement();
        return false;
      }
    }

    // Mark current step as completed
    if (!this.state.completedSteps.includes(currentStep.id)) {
      this.state.completedSteps.push(currentStep.id);
    }

    // Call completion callback
    if (currentStep.onComplete) {
      currentStep.onComplete();
    }

    // Determine next step
    const nextStepId = this.getNextStepId(currentStep);
    
    if (!nextStepId) {
      console.log('[Tour] No more steps - finishing');
      this.finish();
      return true;
    }

    // Move to next step
    this.state.currentStepId = nextStepId;
    this.state.lastActiveAt = Date.now();

    const nextStep = this.steps.get(nextStepId);
    if (nextStep?.onEnter) {
      nextStep.onEnter();
    }

    this.saveAndNotify();
    console.log('[Tour] Advanced to step:', nextStepId);
    return true;
  }

  /**
   * Navigate to previous step
   */
  previous(): boolean {
    const currentIndex = this.getCurrentStepIndex();
    if (currentIndex <= 0) {
      console.warn('[Tour] Already at first step');
      return false;
    }

    const prevStepId = this.stepOrder[currentIndex - 1];
    this.state.currentStepId = prevStepId;
    this.state.lastActiveAt = Date.now();

    const step = this.steps.get(prevStepId);
    if (step?.onEnter) {
      step.onEnter();
    }

    this.saveAndNotify();
    console.log('[Tour] Went back to step:', prevStepId);
    return true;
  }

  /**
   * Skip current step (if allowed)
   */
  skip(): boolean {
    const currentStep = this.getCurrentStep();
    if (!currentStep || !currentStep.skippable) {
      console.warn('[Tour] Cannot skip this step');
      return false;
    }

    if (!this.state.skippedSteps.includes(currentStep.id)) {
      this.state.skippedSteps.push(currentStep.id);
    }

    console.log('[Tour] Skipped step:', currentStep.id);
    return this.next();
  }

  /**
   * Finish tour
   */
  finish() {
    this.state.currentStepId = null;
    this.state.isActive = false;
    this.stopElementCheck();
    this.saveAndNotify();
    console.log('[Tour] Finished');
  }

  /**
   * Reset tour completely
   */
  reset() {
    this.state = {
      currentStepId: null,
      completedSteps: [],
      skippedSteps: [],
      startedAt: 0,
      lastActiveAt: 0,
      userLevel: this.state.userLevel,
      context: {
        isWalletConnected: false,
        currentPage: '/',
        formData: {},
        completedSteps: [],
        skippedSteps: [],
        userLevel: this.state.userLevel,
      },
      isActive: false,
    };
    this.stopElementCheck();
    this.saveAndNotify();
    console.log('[Tour] Reset');
  }

  /**
   * Update context (for tracking app state)
   */
  updateContext(updates: Partial<TourContext>) {
    this.state.context = { ...this.state.context, ...updates };
    this.saveAndNotify();
  }

  /**
   * Set user experience level
   */
  setUserLevel(level: TourLevel) {
    this.state.userLevel = level;
    this.state.context.userLevel = level;
    this.saveAndNotify();
    console.log('[Tour] User level set to:', level);
  }

  /**
   * Get current target element (with retry logic)
   */
  getCurrentTargetElement(): Element | null {
    const step = this.getCurrentStep();
    if (!step) return null;

    try {
      if (typeof step.target === 'function') {
        return step.target();
      }
      return document.querySelector(step.target);
    } catch (error) {
      console.error('[Tour] Error finding element:', error);
      return null;
    }
  }

  /**
   * Get current step
   */
  getCurrentStep(): TourStep | null {
    if (!this.state.currentStepId) return null;
    return this.steps.get(this.state.currentStepId) || null;
  }

  /**
   * Get current state (immutable)
   */
  getState(): TourState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Check if tour is active
   */
  isActive(): boolean {
    return this.state.isActive && this.state.currentStepId !== null;
  }

  /**
   * Get progress percentage
   */
  getProgress(): number {
    const total = this.stepOrder.length;
    const completed = this.state.completedSteps.length;
    return total > 0 ? (completed / total) * 100 : 0;
  }

  /**
   * Get current step index (0-based)
   */
  getCurrentStepIndex(): number {
    if (!this.state.currentStepId) return -1;
    return this.stepOrder.indexOf(this.state.currentStepId);
  }

  /**
   * Get total number of steps
   */
  getTotalSteps(): number {
    return this.stepOrder.length;
  }

  // Private helper methods

  private getNextStepId(currentStep: TourStep): string | null {
    // Use custom next step logic if provided
    if (currentStep.nextStep) {
      if (typeof currentStep.nextStep === 'function') {
        return currentStep.nextStep(this.state.context);
      }
      return currentStep.nextStep;
    }

    // Get next step in order
    const currentIndex = this.stepOrder.indexOf(currentStep.id);
    if (currentIndex === -1 || currentIndex === this.stepOrder.length - 1) {
      return null;
    }

    return this.stepOrder[currentIndex + 1];
  }

  private shakeTargetElement() {
    const element = this.getCurrentTargetElement();
    if (element && element instanceof HTMLElement) {
      element.classList.add('tour-shake');
      setTimeout(() => {
        element.classList.remove('tour-shake');
      }, 500);
    }
  }

  private startElementCheck() {
    this.stopElementCheck();
    
    // Check if element exists every 500ms
    this.elementCheckInterval = setInterval(() => {
      if (!this.isActive()) {
        this.stopElementCheck();
        return;
      }

      const element = this.getCurrentTargetElement();
      if (!element) {
        console.warn('[Tour] Target element not found for step:', this.state.currentStepId);
      }
    }, 500);
  }

  private stopElementCheck() {
    if (this.elementCheckInterval) {
      clearInterval(this.elementCheckInterval);
      this.elementCheckInterval = null;
    }
  }

  private saveAndNotify() {
    this.saveState();
    this.notifyListeners();
  }

  private notifyListeners() {
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('[Tour] Listener error:', error);
      }
    });
  }

  private saveState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (error) {
      console.error('[Tour] Failed to save state:', error);
    }
  }

  private loadState(): TourState {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // Check if state is recent (within 24 hours)
        const age = Date.now() - (parsed.lastActiveAt || 0);
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (age < maxAge) {
          console.log('[Tour] Loaded saved state');
          return { ...parsed, isActive: false }; // Don't auto-start
        }
      }
    } catch (error) {
      console.error('[Tour] Failed to load state:', error);
    }

    // Return default state
    return {
      currentStepId: null,
      completedSteps: [],
      skippedSteps: [],
      startedAt: 0,
      lastActiveAt: 0,
      userLevel: 'beginner',
      context: {
        isWalletConnected: false,
        currentPage: '/',
        formData: {},
        completedSteps: [],
        skippedSteps: [],
        userLevel: 'beginner',
      },
      isActive: false,
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopElementCheck();
    this.listeners.clear();
    this.steps.clear();
    this.stepOrder = [];
  }
}
