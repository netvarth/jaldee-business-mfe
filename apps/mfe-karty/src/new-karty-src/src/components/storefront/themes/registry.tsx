import React from 'react';
import * as minimal from './minimal';
import * as bold from './bold';
import * as boutique from './boutique';
import * as market from './market';
import * as dark from './dark';

export interface StorefrontThemeMeta {
  id: string;
  name: string;
  description: string;
  tags: string[];
  Thumbnail: React.ComponentType;
}

export interface StorefrontTheme extends StorefrontThemeMeta {
  Layout: React.ComponentType;
  Home: React.ComponentType;
}

// -------------------------------------------------------------
// INLINE THUMBNAILS (SVG/CSS ONLY)
// -------------------------------------------------------------
const MinimalThumbnail = () => (
  <div className="w-full h-32 bg-[#FDFDFD] border border-slate-200 flex flex-col justify-between p-3 select-none">
    <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
      <div className="h-2 w-10 bg-slate-800 rounded-sm" />
      <div className="h-2 w-4 bg-slate-300 rounded-sm" />
    </div>
    <div className="flex flex-col items-center gap-1.5 my-2">
      <div className="h-3 w-20 bg-slate-800 rounded-sm" />
      <div className="h-2 w-28 bg-slate-400 rounded-sm" />
    </div>
    <div className="grid grid-cols-3 gap-2">
      <div className="h-10 bg-slate-100 border border-slate-200" />
      <div className="h-10 bg-slate-100 border border-slate-200" />
      <div className="h-10 bg-slate-100 border border-slate-200" />
    </div>
  </div>
);

const BoldThumbnail = () => (
  <div className="w-full h-32 bg-white border-2 border-black flex flex-col justify-between p-2 select-none shadow-[2px_2px_0px_rgba(0,0,0,1)]">
    <div className="bg-yellow-300 border-2 border-black p-1 flex justify-between items-center">
      <div className="h-2 w-8 bg-black" />
      <div className="h-3 w-8 bg-black" />
    </div>
    <div className="bg-black text-white p-2 border-2 border-black text-center my-1.5">
      <div className="h-2 w-16 bg-yellow-300 mx-auto" />
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div className="h-8 bg-white border-2 border-black" />
      <div className="h-8 bg-white border-2 border-black" />
    </div>
  </div>
);

const BoutiqueThumbnail = () => (
  <div className="w-full h-32 bg-[#FAF6F0] border border-[#E6DEC9] flex flex-col justify-between p-3 select-none">
    <div className="flex justify-between items-center border-b border-[#E6DEC9] pb-1.5">
      <div className="h-2 w-12 bg-[#2C2620] rounded-sm italic" />
      <div className="h-1.5 w-6 bg-[#7F7264] rounded-sm" />
    </div>
    <div className="text-center my-1">
      <div className="h-3 w-24 bg-[#2C2620] mx-auto rounded-sm" />
    </div>
    <div className="grid grid-cols-3 gap-2">
      <div className="h-10 bg-[#FCFBF8] border border-[#EBE6DC] rounded-xl" />
      <div className="h-10 bg-[#FCFBF8] border border-[#EBE6DC] rounded-xl" />
      <div className="h-10 bg-[#FCFBF8] border border-[#EBE6DC] rounded-xl" />
    </div>
  </div>
);

const MarketThumbnail = () => (
  <div className="w-full h-32 bg-slate-50 border border-slate-200 flex flex-col justify-between p-2 select-none">
    <div className="bg-blue-600 p-2 flex justify-between items-center">
      <div className="h-2.5 w-8 bg-orange-500 rounded" />
      <div className="h-2 w-12 bg-white rounded-full" />
    </div>
    <div className="bg-orange-500 p-2 text-center text-white my-1 rounded-lg">
      <div className="h-2 w-20 bg-white mx-auto rounded" />
    </div>
    <div className="grid grid-cols-4 gap-1">
      <div className="h-8 bg-white border border-slate-200 rounded" />
      <div className="h-8 bg-white border border-slate-200 rounded" />
      <div className="h-8 bg-white border border-slate-200 rounded" />
      <div className="h-8 bg-white border border-slate-200 rounded" />
    </div>
  </div>
);

const DarkThumbnail = () => (
  <div className="w-full h-32 bg-slate-950 border border-slate-900 flex flex-col justify-between p-3 select-none">
    <div className="flex justify-between items-center border-b border-slate-900 pb-1.5">
      <div className="h-2.5 w-12 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-sm" />
      <div className="h-2 w-6 bg-slate-800 rounded-full" />
    </div>
    <div className="text-center my-1.5">
      <div className="h-3.5 w-20 bg-slate-900 border border-slate-800 mx-auto rounded-xl" />
    </div>
    <div className="grid grid-cols-3 gap-2">
      <div className="h-10 bg-slate-900 border border-slate-800 rounded-xl" />
      <div className="h-10 bg-slate-900 border border-slate-800 rounded-xl" />
      <div className="h-10 bg-slate-900 border border-slate-800 rounded-xl" />
    </div>
  </div>
);

// -------------------------------------------------------------
// THEME REGISTRY
// -------------------------------------------------------------
export const STOREFRONT_THEMES: StorefrontTheme[] = [
  {
    id: 'minimal',
    name: 'Minimalist',
    description: 'Clean, spacious, ultra-simple layout with light typography.',
    tags: ['Clean', 'Spacious', 'Contemporary'],
    Thumbnail: MinimalThumbnail,
    Layout: minimal.Layout,
    Home: minimal.Home,
  },
  {
    id: 'bold',
    name: 'Bold Brutalist',
    description: 'Neobrutalist design with heavy borders, bold colors, and strict grids.',
    tags: ['Modern', 'Brutalist', 'High Contrast'],
    Thumbnail: BoldThumbnail,
    Layout: bold.Layout,
    Home: bold.Home,
  },
  {
    id: 'boutique',
    name: 'La Boutique',
    description: 'Serif-driven editorial storefront for warm, organic, and elegant collections.',
    tags: ['Editorial', 'Elegant', 'Warm'],
    Thumbnail: BoutiqueThumbnail,
    Layout: boutique.Layout,
    Home: boutique.Home,
  },
  {
    id: 'market',
    name: 'Super Flyer',
    description: 'Dense flyer-layout highlighting items, search-focused header, and active deals.',
    tags: ['Dense', 'Deals', 'Flyer'],
    Thumbnail: MarketThumbnail,
    Layout: market.Layout,
    Home: market.Home,
  },
  {
    id: 'dark',
    name: 'Neon Cyberpunk',
    description: 'Sleek dark mode storefront with glowing borders and vibrant indicators.',
    tags: ['Dark Mode', 'Futuristic', 'Neon'],
    Thumbnail: DarkThumbnail,
    Layout: dark.Layout,
    Home: dark.Home,
  },
];

export const DEFAULT_THEME_ID = 'minimal';

export function getTheme(id?: string | null): StorefrontTheme {
  const selected = STOREFRONT_THEMES.find(t => t.id === id);
  return selected || STOREFRONT_THEMES[0];
}
