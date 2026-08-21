import React, { useState } from 'react';
import { STOREFRONT_THEMES, getTheme } from './themes/registry';
import { useStorefrontSettings, useUpdateStorefrontSettings } from '@/services/useStorefrontSettings';
import { ExternalLink, Check, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

export const ThemeGallery = () => {
  const { data: settings, isLoading } = useStorefrontSettings();
  const updateSettings = useUpdateStorefrontSettings();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const activeThemeId = settings?.themeId || 'minimal';

  const handleSelectTheme = (themeId: string) => {
    if (!settings) return;

    updateSettings.mutate(
      { ...settings, themeId },
      {
        onSuccess: () => {
          setSuccessMsg(`Successfully activated the theme!`);
          setTimeout(() => setSuccessMsg(null), 3000);
        },
      }
    );
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading themes...</div>;
  }

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold px-4 py-3 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <Check className="h-4 w-4 bg-emerald-500 text-white rounded-full p-0.5" />
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {STOREFRONT_THEMES.map(theme => {
          const isActive = theme.id === activeThemeId;
          const Thumbnail = theme.Thumbnail;

          return (
            <div
              key={theme.id}
              className={cn(
                "bg-white rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col justify-between",
                isActive
                  ? "border-[#55349A] ring-2 ring-[#55349A]/20 shadow-md"
                  : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
              )}
            >
              <div className="p-4 border-b border-slate-100 bg-slate-50 relative group">
                <Thumbnail />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2">
                  <a
                    href={`/store?previewTheme=${theme.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 bg-white text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold shadow-md hover:bg-slate-100"
                  >
                    Live Preview
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">{theme.name}</h3>
                    {isActive && (
                      <span className="bg-[#55349A]/10 text-[#55349A] text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    {theme.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {theme.tags.map(tag => (
                      <span key={tag} className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleSelectTheme(theme.id)}
                  disabled={isActive || updateSettings.isPending}
                  className={cn(
                    "w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                    isActive
                      ? "bg-slate-50 border border-slate-200 text-slate-400 cursor-default"
                      : "bg-[#55349A] hover:bg-[#43297a] text-white shadow-md active:scale-95 disabled:opacity-50"
                  )}
                >
                  {updateSettings.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  {isActive ? 'Theme in Use' : 'Use this theme'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
