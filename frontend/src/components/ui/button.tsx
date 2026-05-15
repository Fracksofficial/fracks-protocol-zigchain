"use client";

import { motion, HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      isLoading,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:saturate-50";

    const variants = {
      default:
        "bg-gradient-to-br from-[#172E7F] to-[#2A5FA6] text-white shadow-[0_4px_16px_rgba(23,46,127,0.2)] hover:shadow-[0_8px_24px_rgba(23,46,127,0.3)] hover:from-[#1a3490] hover:to-[#2f67b8] border border-white/10",
      destructive:
        "bg-gradient-to-br from-red-600 to-red-700 text-white shadow-[0_4px_16px_rgba(220,38,38,0.2)] hover:shadow-[0_8px_24px_rgba(220,38,38,0.3)] hover:from-red-700 hover:to-red-800 border border-white/10",
      outline:
        "border-2 border-slate-200 bg-white/90 text-slate-700 shadow-[0_2px_8px_rgba(15,23,42,0.04)] hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)] backdrop-blur-sm",
      secondary:
        "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,0.06)] hover:from-slate-200 hover:to-slate-300 hover:shadow-[0_4px_12px_rgba(15,23,42,0.1)] border border-slate-300/50",
      ghost:
        "hover:bg-slate-100/80 hover:text-slate-900 hover:shadow-[0_2px_8px_rgba(15,23,42,0.04)]",
      link: "text-[#172E7F] underline-offset-4 hover:underline hover:text-[#2A5FA6]",
    };

    const sizes = {
      default: "h-10 px-5 py-2",
      sm: "h-9 rounded-lg px-4 text-xs",
      lg: "h-12 rounded-xl px-8 text-base",
      icon: "h-10 w-10 rounded-xl",
    };

    return (
      <motion.button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        {...props}
      >
        {isLoading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-4 w-4 border-2 border-current border-t-transparent rounded-full"
          />
        ) : (
          children
        )}
      </motion.button>
    );
  }
);

Button.displayName = "Button";

export { Button };
