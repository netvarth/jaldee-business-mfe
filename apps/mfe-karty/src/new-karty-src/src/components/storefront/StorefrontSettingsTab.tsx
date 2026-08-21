import React, { useState } from 'react';
import { Globe, Palette, ExternalLink, RefreshCw, Upload, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { ThemeGallery } from './ThemeGallery';

export const StorefrontSettingsTab = () => {
  const [subTab, setSubTab] = useState<'branding' | 'themes'>('branding');
  const [domain, setDomain] = useState('mystore.karty.shop');
  const [themeColor, setThemeColor] = useState('#55349A');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Storefront</h1>
          <p className="text-sm font-semibold text-slate-500">Configure your customer-facing online store.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200/50 flex">
            <button
              onClick={() => setSubTab('branding')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                subTab === 'branding'
                  ? "bg-white text-slate-900 shadow-sm font-extrabold"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              Branding & Domains
            </button>
            <button
              onClick={() => setSubTab('themes')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                subTab === 'themes'
                  ? "bg-white text-slate-900 shadow-sm font-extrabold"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              Themes Gallery
            </button>
          </div>

          <Link
            to="/store"
            target="_blank"
            className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md"
          >
            View Storefront
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {subTab === 'themes' ? (
        <ThemeGallery />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
                <Globe className="h-5 w-5 text-[#55349A]" />
                Domain & URL
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Subdomain</label>
                  <div className="flex">
                    <input
                      type="text"
                      value={domain.split('.')[0]}
                      onChange={e => setDomain(`${e.target.value}.karty.shop`)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 border-r-0 rounded-l-xl text-sm font-bold focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] outline-none"
                    />
                    <span className="px-4 py-2.5 bg-slate-100 border border-slate-200 border-l-0 rounded-r-xl text-sm font-semibold text-slate-500">
                      .karty.shop
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Custom Domain</label>
                  <input
                    type="text"
                    placeholder="e.g. www.mybrand.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] outline-none"
                  />
                  <p className="text-xs font-semibold text-slate-400 mt-1.5">Point your CNAME record to <span className="font-mono text-slate-600 bg-slate-100 px-1 py-0.5 rounded">domains.karty.shop</span></p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
                <Palette className="h-5 w-5 text-[#55349A]" />
                Theme & Branding
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Store Logo</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-slate-200 transition-colors">
                      <Upload className="h-5 w-5 text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">Click to upload logo</p>
                    <p className="text-xs font-semibold text-slate-400 mt-1">SVG, PNG, JPG (max 2MB)</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Primary Brand Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={themeColor}
                      onChange={e => setThemeColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={themeColor.toUpperCase()}
                      onChange={e => setThemeColor(e.target.value)}
                      className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold font-mono outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
                <Search className="h-5 w-5 text-[#55349A]" />
                SEO Details
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Store Title (Meta Title)</label>
                  <input
                    type="text"
                    placeholder="e.g. MyBrand - Premium Goods"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Store Description (Meta Description)</label>
                  <textarea
                    rows={3}
                    placeholder="Describe your store for search engines..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] outline-none resize-none"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Preview & Save */}
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-2xl p-6 shadow-xl sticky top-24">
              <h3 className="text-white font-black text-lg mb-2">Save Changes</h3>
              <p className="text-slate-400 text-sm font-semibold mb-6">Update your live storefront with these new settings.</p>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-[#55349A] hover:bg-[#43297a] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-70"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  'Publish Changes'
                )}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
