import React from 'react';
import { Award, CheckSquare, Compass, Newspaper, Shield } from 'lucide-react';
import type { Language, MobileTab } from '../types';
import { tr } from '../data/i18n';

interface MobileNavProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  pendingTasksCount: number;
  lang: Language;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onSelectTab,
  pendingTasksCount,
  lang,
}) => {
  const items: Array<{
    id: MobileTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    { id: 'status', label: tr(lang, 'navStatus'), icon: <Shield className="w-5 h-5" /> },
    {
      id: 'tasks',
      label: tr(lang, 'navTasks'),
      icon: <CheckSquare className="w-5 h-5" />,
      badge: pendingTasksCount > 0 ? pendingTasksCount : undefined,
    },
    { id: 'dream', label: tr(lang, 'navDream'), icon: <Compass className="w-5 h-5" /> },
    { id: 'skills', label: tr(lang, 'navSkills'), icon: <Award className="w-5 h-5" /> },
    { id: 'perks', label: tr(lang, 'navPerks'), icon: <Newspaper className="w-5 h-5" /> },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-300 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] safe-bottom">
      <div className="grid grid-cols-5 max-w-xl mx-auto">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-2.5 px-1 transition ${
                isActive ? 'text-sky-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-3 right-3 h-0.5 bg-sky-600 rounded-b" />
              )}
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-orange-600 text-white font-mono text-[9px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="font-hud font-bold text-[10px] tracking-wide mt-0.5 uppercase">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
