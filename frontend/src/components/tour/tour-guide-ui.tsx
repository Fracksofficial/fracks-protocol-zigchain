'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Info, Zap, BookOpen, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TourGuideManager, TourLevel, TourState } from '@/lib/tour-guide-manager';

interface TourGuideUIProps {
  manager: TourGuideManager;
}

export function TourGuideUI({ manager }: TourGuideUIProps) {
  const [state, setState] = useState<TourState>(() => manager.getState());
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [showDetailed, setShowDetailed] = useState(false);
  const [canProceed, setCanProceed] = useState(true);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Subscribe to manager state changes
  useEffect(() => {
    const unsubscribe = manager.subscribe((newState) => {
      if (mountedRef.current) {
        setState(newState);
        console.log('[TourUI] State updated:', newState.currentStepId);
      }
    });

    // Initial state sync
    setState(manager.getState());

    return () => {
      unsubscribe();
    };
  }, [manager]);

  // Update target element position continuously
  const updateTargetPosition = useCallback(() => {
    if (!manager.isActive()) {
      setTargetRect(null);
      return;
    }

    const element = manager.getCurrentTargetElement();
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);

      // Auto-scroll into view if needed
      const isVisible = (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth
      );

      if (!isVisible) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center' 
        });
      }
    } else {
      setTargetRect(null);
    }
  }, [manager]);

  // Continuous position updates
  useEffect(() => {
    if (!manager.isActive()) {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      return;
    }

    // Update immediately
    updateTargetPosition();

    // Then update every 100ms
    updateIntervalRef.current = setInterval(updateTargetPosition, 100);

    // Listen to scroll and resize
    window.addEventListener('scroll', updateTargetPosition, true);
    window.addEventListener('resize', updateTargetPosition);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      window.removeEventListener('scroll', updateTargetPosition, true);
      window.removeEventListener('resize', updateTargetPosition);
    };
  }, [manager, updateTargetPosition, state.currentStepId]);

  // Check if user can proceed to next step
  useEffect(() => {
    const step = manager.getCurrentStep();
    if (!step || !step.requiredAction || !step.validateAction) {
      setCanProceed(true);
      return;
    }

    // Check validation periodically
    const checkValidation = () => {
      if (step.validateAction) {
        const isValid = step.validateAction();
        setCanProceed(isValid);
      }
    };

    checkValidation();
    const interval = setInterval(checkValidation, 500);

    return () => clearInterval(interval);
  }, [manager, state.currentStepId]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleNext = () => {
    console.log('[TourUI] Next button clicked');
    const success = manager.next();
    if (!success) {
      console.warn('[TourUI] Cannot proceed - validation failed');
    }
  };

  const handlePrevious = () => {
    console.log('[TourUI] Previous button clicked');
    manager.previous();
  };

  const handleSkip = () => {
    console.log('[TourUI] Skip button clicked');
    manager.skip();
  };

  const handleClose = () => {
    console.log('[TourUI] Close button clicked');
    manager.finish();
  };

  const handleLevelChange = (level: TourLevel) => {
    console.log('[TourUI] Level changed to:', level);
    manager.setUserLevel(level);
  };

  const currentStep = manager.getCurrentStep();
  
  if (!currentStep || !manager.isActive()) {
    return null;
  }

  const padding = currentStep.highlightPadding || 8;
  const progress = manager.getProgress();
  const currentIndex = manager.getCurrentStepIndex();
  const totalSteps = manager.getTotalSteps();

  // Get content based on user level
  const getContent = () => {
    if (state.userLevel === 'beginner' && showDetailed && currentStep.detailedContent) {
      return currentStep.detailedContent;
    }
    if (state.userLevel === 'expert' && currentStep.expertTip) {
      return currentStep.expertTip;
    }
    return currentStep.content;
  };

  // Calculate tooltip position
  const getTooltipPosition = (): React.CSSProperties => {
    if (!targetRect) {
      return { 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)' 
      };
    }

    const tooltipWidth = 360;
    const tooltipHeight = 300;
    const margin = 16;
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    let style: React.CSSProperties = {};

    // Vertical positioning
    const spaceBelow = vh - targetRect.bottom;
    const spaceAbove = targetRect.top;

    if (spaceBelow > tooltipHeight + margin) {
      style.top = targetRect.bottom + padding + 12;
    } else if (spaceAbove > tooltipHeight + margin) {
      style.bottom = vh - targetRect.top + padding + 12;
    } else {
      style.top = Math.max(margin, (vh - tooltipHeight) / 2);
    }

    // Horizontal positioning
    const spaceRight = vw - targetRect.right;
    const spaceLeft = targetRect.left;

    if (spaceRight > tooltipWidth + margin) {
      style.left = Math.max(margin, targetRect.left);
    } else if (spaceLeft > tooltipWidth + margin) {
      style.right = vw - targetRect.right;
    } else {
      style.left = Math.max(margin, (vw - tooltipWidth) / 2);
    }

    return style;
  };

  return (
    <AnimatePresence>
      {manager.isActive() && (
        <>
          {/* Highlight Border */}
          {targetRect && (
            <motion.div
              key="highlight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed pointer-events-none z-[9998]"
              style={{
                top: targetRect.top - padding,
                left: targetRect.left - padding,
                width: targetRect.width + padding * 2,
                height: targetRect.height + padding * 2,
                borderRadius: '12px',
                border: '4px solid rgb(59, 130, 246)',
                boxShadow: '0 0 30px rgba(59, 130, 246, 0.8), 0 0 60px rgba(59, 130, 246, 0.4)',
              }}
            >
              <motion.div
                className="absolute inset-0 rounded-[12px] border-4 border-blue-400"
                animate={{
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          )}

          {/* Tooltip */}
          <motion.div
            key={`tooltip-${currentStep.id}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed z-[9999] pointer-events-auto"
            style={getTooltipPosition()}
          >
            <Card className="w-[90vw] max-w-sm shadow-2xl border-2 border-primary/30">
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {/* Level Selector */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant={state.userLevel === 'beginner' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => handleLevelChange('beginner')}
                          className="h-6 px-2 text-xs"
                          title="Beginner Mode"
                        >
                          <BookOpen className="h-3 w-3" />
                        </Button>
                        <Button
                          variant={state.userLevel === 'intermediate' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => handleLevelChange('intermediate')}
                          className="h-6 px-2 text-xs"
                          title="Intermediate Mode"
                        >
                          <Info className="h-3 w-3" />
                        </Button>
                        <Button
                          variant={state.userLevel === 'expert' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => handleLevelChange('expert')}
                          className="h-6 px-2 text-xs"
                          title="Expert Mode"
                        >
                          <Zap className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm">
                      {currentStep.title}
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="ml-2 h-6 w-6 p-0 flex-shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {/* Content */}
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {getContent()}
                  </p>

                  {/* Show more details toggle */}
                  {state.userLevel === 'beginner' && currentStep.detailedContent && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setShowDetailed(!showDetailed)}
                      className="h-auto p-0 text-xs"
                    >
                      {showDetailed ? 'Show less' : 'Show more details'}
                    </Button>
                  )}

                  {/* Action required warning */}
                  {currentStep.requiredAction && !canProceed && (
                    <div className="flex items-start gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-yellow-700 dark:text-yellow-400">
                        Complete the required action to continue
                      </p>
                    </div>
                  )}
                </div>

                {/* Progress */}
                <div className="mt-3 mb-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Step {currentIndex + 1} of {totalSteps}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className="flex-1"
                  >
                    <ChevronLeft className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Back</span>
                  </Button>

                  {currentStep.skippable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSkip}
                      className="flex-1"
                    >
                      Skip
                    </Button>
                  )}

                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleNext}
                    disabled={currentStep.requiredAction && !canProceed}
                    className={cn(
                      "flex-1",
                      currentStep.requiredAction && !canProceed && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>

                {/* Debug Info (only in development) */}
                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-3">
                    <summary className="text-xs text-muted-foreground cursor-pointer">
                      Debug Info
                    </summary>
                    <pre className="text-[10px] mt-2 p-2 bg-muted rounded overflow-auto max-h-32">
                      {JSON.stringify({
                        stepId: currentStep.id,
                        canProceed,
                        requiredAction: currentStep.requiredAction,
                        elementFound: !!manager.getCurrentTargetElement(),
                      }, null, 2)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Add shake animation CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes tour-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-10px); }
      75% { transform: translateX(10px); }
    }
    .tour-shake {
      animation: tour-shake 0.5s ease-in-out;
    }
  `;
  document.head.appendChild(style);
}
