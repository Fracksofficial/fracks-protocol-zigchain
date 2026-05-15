'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Lightbulb, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ProfessionalTourGuide, TourLevel, TourState } from '@/lib/tour-guide-professional';

interface TourGuideUIProps {
  manager: ProfessionalTourGuide;
}

export function TourGuideUI({ manager }: TourGuideUIProps) {
  const [state, setState] = useState<TourState>(() => manager.getState());
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Subscribe to manager state changes
  useEffect(() => {
    const unsubscribe = manager.subscribe((newState) => {
      if (mountedRef.current) {
        setState(newState);
      }
    });

    setState(manager.getState());
    return () => unsubscribe();
  }, [manager]);

  // Update target element position
  const updateTargetPosition = useCallback(() => {
    if (!manager.isActive()) {
      setTargetRect(null);
      return;
    }

    const element = manager.getCurrentTargetElement();
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);

      // Auto-scroll if element not in view
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
    } else {
      setTargetRect(null);
    }
  }, [manager]);

  // Continuous position updates
  useEffect(() => {
    if (!manager.isActive()) {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      return;
    }

    updateTargetPosition();
    updateIntervalRef.current = setInterval(updateTargetPosition, 100);

    window.addEventListener('scroll', updateTargetPosition, true);
    window.addEventListener('resize', updateTargetPosition);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      window.removeEventListener('scroll', updateTargetPosition, true);
      window.removeEventListener('resize', updateTargetPosition);
    };
  }, [manager, updateTargetPosition, state.currentStepId]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleNext = () => {
    manager.next();
  };

  const handlePrevious = () => {
    manager.previous();
  };

  const handleSkip = () => {
    manager.skip();
  };

  const handleClose = () => {
    manager.finish();
  };

  const handleLevelChange = (level: TourLevel) => {
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
    if (state.userLevel === 'expert' && currentStep.expertTip) {
      return currentStep.expertTip;
    }
    if (state.userLevel === 'beginner' && currentStep.detailedContent) {
      return currentStep.detailedContent;
    }
    return currentStep.content;
  };

  // Smart tooltip positioning
  const getTooltipPosition = (): React.CSSProperties => {
    if (!targetRect) {
      return { 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)' 
      };
    }

    const tooltipWidth = 360;
    const tooltipHeight = 200;
    const margin = 20;
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
          {/* Subtle Highlight - Non-blocking */}
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
                borderRadius: '8px',
                border: '2px solid rgb(59, 130, 246)',
                boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.1)',
              }}
            >
              <motion.div
                className="absolute inset-0 rounded-[8px] border-2 border-blue-400/50"
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          )}

          {/* Professional Tooltip */}
          <motion.div
            key={`tooltip-${currentStep.id}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed z-[9999] pointer-events-auto"
            style={getTooltipPosition()}
          >
            <Card className="w-[90vw] max-w-sm shadow-xl border">
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Lightbulb className="h-4 w-4 text-blue-600" />
                    <h3 className="font-semibold text-sm">
                      {currentStep.title}
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="h-6 w-6 p-0 flex-shrink-0 -mt-1"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {/* Content */}
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {getContent()}
                  </p>

                  {/* Progress */}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Step {currentIndex + 1} of {totalSteps}</span>
                    <span>{Math.round(progress)}% complete</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Navigation - Always enabled (non-blocking) */}
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className="flex-1 h-8 text-xs"
                  >
                    <ChevronLeft className="h-3 w-3 mr-1" />
                    Back
                  </Button>

                  {currentStep.skippable && currentIndex < totalSteps - 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSkip}
                      className="flex-1 h-8 text-xs"
                    >
                      Skip
                    </Button>
                  )}

                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleNext}
                    className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700"
                  >
                    {currentIndex === totalSteps - 1 ? (
                      <>
                        Finish
                        <Rocket className="h-3 w-3 ml-1" />
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Experience Level Selector */}
                <div className="flex items-center gap-1 mt-3 pt-3 border-t">
                  <span className="text-[10px] text-muted-foreground mr-2">Detail level:</span>
                  <Badge 
                    variant={state.userLevel === 'beginner' ? 'default' : 'outline'}
                    className="cursor-pointer h-5 px-2 text-[10px]"
                    onClick={() => handleLevelChange('beginner')}
                  >
                    Basic
                  </Badge>
                  <Badge 
                    variant={state.userLevel === 'intermediate' ? 'default' : 'outline'}
                    className="cursor-pointer h-5 px-2 text-[10px]"
                    onClick={() => handleLevelChange('intermediate')}
                  >
                    Standard
                  </Badge>
                  <Badge 
                    variant={state.userLevel === 'expert' ? 'default' : 'outline'}
                    className="cursor-pointer h-5 px-2 text-[10px]"
                    onClick={() => handleLevelChange('expert')}
                  >
                    Advanced
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
