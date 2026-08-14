"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

export interface TabOption<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
}

interface AnimatedTabsProps<T extends string> {
  tabs: TabOption<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  layoutId?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function AnimatedTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  layoutId = "animatedTabPill",
  className = "",
  size = "md",
}: AnimatedTabsProps<T>) {
  const paddingClasses =
    size === "sm"
      ? "px-3 py-1.5 text-[11px]"
      : size === "lg"
      ? "px-5 py-2.5 text-xs"
      : "px-4 py-2 text-xs";

  return (
    <div
      className={`inline-flex items-center rounded-2xl bg-slate-100 p-1 border border-slate-200/80 shadow-xs relative ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative z-10 flex items-center justify-center gap-2 ${paddingClasses} font-extrabold rounded-xl transition-colors cursor-pointer select-none ${
              isActive ? "text-emerald-900 font-black" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
                className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/60 z-[-1]"
              />
            )}
            {tab.icon && <span className="w-4 h-4 flex items-center justify-center">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface AnimatedTabContentProps {
  activeKey: string;
  children: ReactNode;
  className?: string;
}

export function AnimatedTabContent({ activeKey, children, className = "" }: AnimatedTabContentProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeKey}
        initial={{ opacity: 0, y: 10, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.995 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
