import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const IOS_SPRING = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 24,
  mass: 0.8,
};

export interface LiquidGlassCardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  strong?: boolean;
  delay?: number;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  role?: string;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  'data-testid'?: string;
  'aria-label'?: string;
}

export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  children,
  className = '',
  interactive = true,
  strong = false,
  delay = 0,
  onClick,
  role,
  tabIndex,
  onKeyDown,
  'data-testid': dataTestId,
  'aria-label': ariaLabel,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty('--mouse-x', `${x}px`);
    el.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 14, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...IOS_SPRING, delay }}
      whileHover={interactive ? { y: -8, scale: 1.018 } : undefined}
      whileTap={interactive ? { scale: 0.975, y: -2 } : undefined}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onClick={onClick}
      onKeyDown={onKeyDown}
      role={role}
      tabIndex={tabIndex}
      data-testid={dataTestId}
      aria-label={ariaLabel}
      className={`relative overflow-hidden rounded-[28px] ${
        strong ? 'liquid-glass-strong' : 'liquid-glass'
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Pointer-Tracking Specular Glint */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 liquid-specular-glint transition-opacity duration-300 ${
          hovered ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
};

export interface LiquidSegmentedOption<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export function LiquidSegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  className = '',
  ariaLabel,
  tone = 'periwinkle',
}: {
  options: LiquidSegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  layoutId: string;
  className?: string;
  ariaLabel?: string;
  tone?: 'obsidian' | 'periwinkle';
}) {
  const isPeriwinkle = tone === 'periwinkle';
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex flex-wrap items-center gap-1 p-1.5 rounded-full bg-white/55 dark:bg-slate-900/60 backdrop-blur-2xl backdrop-saturate-[180%] border border-white/80 dark:border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.85),0_12px_30px_rgba(17,19,21,0.07)] ${className}`}
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={`relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              active
                ? isPeriwinkle
                  ? 'text-[#313DA8] dark:text-white'
                  : 'text-white dark:text-slate-950'
                : 'text-slate-700 dark:text-slate-300 hover:text-[#111315] dark:hover:text-white'
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={IOS_SPRING}
                className={
                  isPeriwinkle
                    ? 'absolute inset-0 rounded-full bg-[#4F5BD5]/18 dark:bg-[#8E96FF]/28 border border-[#4F5BD5]/40 dark:border-[#8E96FF]/55 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.75),0_6px_18px_rgba(79,91,213,0.18)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.28),0_0_20px_rgba(142,150,255,0.28)]'
                    : 'absolute inset-0 rounded-full bg-[#111315] dark:bg-white shadow-md'
                }
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {opt.icon}
              <span>{opt.label}</span>
              {opt.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold tabular-nums ${
                    active
                      ? 'bg-[#4F5BD5] text-white'
                      : 'bg-[#4F5BD5]/12 text-[#4F5BD5] dark:bg-[#7B83EB]/20 dark:text-[#A5B4FC]'
                  }`}
                >
                  {opt.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export const LiquidSheetModal: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, maxWidthClass = 'max-w-3xl', children }) => {
  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title || 'Modal'}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#111315]/45 dark:bg-black/65 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 42, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.96 }}
            transition={IOS_SPRING}
            className={`relative z-10 w-full ${maxWidthClass} max-h-[92vh] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] liquid-glass-strong text-[#111315] dark:text-slate-100`}
          >
            {/* iOS Sheet Grabber on mobile */}
            <div className="sm:hidden flex justify-center pt-2.5 pb-1">
              <span className="w-10 h-1 rounded-full bg-slate-400/50" />
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
