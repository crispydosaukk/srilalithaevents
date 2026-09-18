'use client';

import React, { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import {
  WebsiteContentConfig,
  DEFAULT_WEBSITE_CONTENT,
  TrustBadge,
  StatItem,
  TermsSection,
} from '@/app/data/websiteContentConfig';

interface WebsiteContentEditorProps {
  content: WebsiteContentConfig;
  onChange: (updated: WebsiteContentConfig) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  onReset: () => void;
}

export default function WebsiteContentEditor({
  content,
  onChange,
  onSave,
  isSaving,
  onReset,
}: WebsiteContentEditorProps) {
  const [activeTab, setActiveTab] = useState<'hero' | 'stats_menu' | 'terms'>('hero');
  const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(null);

  // Helper updaters
  const updateHero = (patch: Partial<WebsiteContentConfig['hero']>) => {
    onChange({
      ...content,
      hero: { ...content.hero, ...patch },
    });
  };

  const updateStats = (patch: Partial<WebsiteContentConfig['statsRibbon']>) => {
    onChange({
      ...content,
      statsRibbon: { ...content.statsRibbon, ...patch },
    });
  };

  const updateMenuHeader = (patch: Partial<WebsiteContentConfig['menuHeader']>) => {
    onChange({
      ...content,
      menuHeader: { ...content.menuHeader, ...patch },
    });
  };

  const updateTerms = (patch: Partial<WebsiteContentConfig['termsAndConditions']>) => {
    onChange({
      ...content,
      termsAndConditions: { ...content.termsAndConditions, ...patch },
    });
  };

  // Preset color options for highlighted word
  const COLOR_PRESETS = [
    { label: 'Coral Red', value: '#FF334B' },
    { label: 'Royal Amber', value: '#C8860A' },
    { label: 'Crimson Rose', value: '#E11D48' },
    { label: 'Emerald Green', value: '#059669' },
    { label: 'Royal Blue', value: '#2563EB' },
    { label: 'Warm Gold', value: '#F59E0B' },
  ];

  // Preset background images
  const BG_PRESETS = [
    { label: 'Live Dosa Kitchen', value: '/assets/images/hero_live_catering_bg.jpg' },
  ];

  // Trust Badges Handlers
  const handleAddTrustBadge = () => {
    const newBadge: TrustBadge = {
      id: `badge-${Date.now()}`,
      icon: '✨',
      title: 'Premium Quality',
      subtitle: 'Award Winning Chefs',
      enabled: true,
    };
    updateHero({
      trustBadges: [...content.hero.trustBadges, newBadge],
    });
  };

  const handleUpdateTrustBadge = (index: number, patch: Partial<TrustBadge>) => {
    const updated = [...content.hero.trustBadges];
    updated[index] = { ...updated[index], ...patch };
    updateHero({ trustBadges: updated });
  };

  const handleDeleteTrustBadge = (index: number) => {
    const updated = content.hero.trustBadges.filter((_, i) => i !== index);
    updateHero({ trustBadges: updated });
  };

  // Stats Handlers
  const handleAddStat = () => {
    const newStat: StatItem = {
      id: `stat-${Date.now()}`,
      icon: '⭐',
      value: '100+',
      label: 'New Metric',
      enabled: true,
    };
    updateStats({
      items: [...content.statsRibbon.items, newStat],
    });
  };

  const handleUpdateStat = (index: number, patch: Partial<StatItem>) => {
    const updated = [...content.statsRibbon.items];
    updated[index] = { ...updated[index], ...patch };
    updateStats({ items: updated });
  };

  const handleDeleteStat = (index: number) => {
    const updated = content.statsRibbon.items.filter((_, i) => i !== index);
    updateStats({ items: updated });
  };

  // Terms & Conditions Handlers
  const handleAddTermsSection = () => {
    const newSec: TermsSection = {
      id: `section-${Date.now()}`,
      title: 'NEW POLICY SECTION',
      enabled: true,
      items: ['Policy guideline or term detail goes here.'],
    };
    updateTerms({
      sections: [...content.termsAndConditions.sections, newSec],
    });
    setExpandedPolicyId(newSec.id);
  };

  const handleUpdateTermsSection = (index: number, patch: Partial<TermsSection>) => {
    const updated = [...content.termsAndConditions.sections];
    updated[index] = { ...updated[index], ...patch };
    updateTerms({ sections: updated });
  };

  const handleDeleteTermsSection = (index: number) => {
    const updated = content.termsAndConditions.sections.filter((_, i) => i !== index);
    updateTerms({ sections: updated });
  };

  const handleAddBulletItem = (sectionIndex: number) => {
    const sec = content.termsAndConditions.sections[sectionIndex];
    const newItems = [...sec.items, 'New policy rule or condition'];
    handleUpdateTermsSection(sectionIndex, { items: newItems });
  };

  const handleUpdateBulletItem = (sectionIndex: number, itemIndex: number, text: string) => {
    const sec = content.termsAndConditions.sections[sectionIndex];
    const newItems = [...sec.items];
    newItems[itemIndex] = text;
    handleUpdateTermsSection(sectionIndex, { items: newItems });
  };

  const handleDeleteBulletItem = (sectionIndex: number, itemIndex: number) => {
    const sec = content.termsAndConditions.sections[sectionIndex];
    const newItems = sec.items.filter((_, i) => i !== itemIndex);
    handleUpdateTermsSection(sectionIndex, { items: newItems });
  };

  // Notes Handlers
  const handleAddNote = () => {
    const newNotes = [...(content.termsAndConditions.notes || []), 'Important safety or venue note'];
    updateTerms({ notes: newNotes });
  };

  const handleUpdateNote = (index: number, text: string) => {
    const newNotes = [...(content.termsAndConditions.notes || [])];
    newNotes[index] = text;
    updateTerms({ notes: newNotes });
  };

  const handleDeleteNote = (index: number) => {
    const newNotes = (content.termsAndConditions.notes || []).filter((_, i) => i !== index);
    updateTerms({ notes: newNotes });
  };

  const activeBadgesCount = content.hero.trustBadges.filter(b => b.enabled).length;
  const activeStatsCount = content.statsRibbon.items.filter(s => s.enabled).length;
  const activeTermsCount = content.termsAndConditions.sections.filter(s => s.enabled).length;

  return (
    <div className="space-y-6 max-w-6xl pb-16">
      {/* ── Top Header & Actions ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
              <Icon name="PaintBrushIcon" size={18} />
            </span>
            Website Content Management System (CMS)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Dynamically edit the Homepage Hero Showcase, Trust Badges, Quick Stats Ribbon, Menu Headers, and Terms &amp; Conditions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all border border-gray-200 cursor-pointer"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
          >
            {isSaving ? (
              <>
                <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Icon name="CloudArrowUpIcon" size={16} />
                <span>Save Website Content</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Sub Navigation Tabs ── */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => setActiveTab('hero')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'hero'
              ? 'bg-[#C8860A] text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span>🖼️</span>
          <span>Hero Showcase &amp; Badges (Image 1)</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'hero' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'}`}>
            {activeBadgesCount} Badges Active
          </span>
        </button>

        <button
          onClick={() => setActiveTab('stats_menu')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'stats_menu'
              ? 'bg-[#C8860A] text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span>📊</span>
          <span>Quick Stats &amp; Menu Header (Image 2)</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'stats_menu' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'}`}>
            {activeStatsCount} Stats Active
          </span>
        </button>

        <button
          onClick={() => setActiveTab('terms')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'terms'
              ? 'bg-[#C8860A] text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span>📜</span>
          <span>Terms &amp; Conditions / Legal (Image 3)</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'terms' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'}`}>
            {activeTermsCount} Policies
          </span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* ── TAB 1: HERO SHOWCASE & TRUST BADGES (IMAGE 1) ── */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'hero' && (
        <div className="space-y-6">
          {/* Live Mini Preview Card */}
          <div className="bg-neutral-900 text-white rounded-2xl p-5 border border-neutral-700 relative overflow-hidden shadow-lg">
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-40"
              style={{ backgroundImage: `url('${content.hero.backgroundImage}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
            <div className="relative z-10 max-w-xl">
              <span className="text-[10px] font-mono uppercase bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md mb-2 inline-block">
                ⚡ Live Hero Preview
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold leading-tight drop-shadow-md">
                {content.hero.headlinePart1}{' '}
                <span style={{ color: content.hero.headlinePart2Color }}>
                  {content.hero.headlinePart2}
                </span>
              </h3>
              <p className="text-xs text-gray-300 mt-2 line-clamp-2">
                {content.hero.subtitle}
              </p>
              <div className="flex gap-2 mt-4">
                {content.hero.primaryButton.enabled && (
                  <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 text-white shadow-xs">
                    {content.hero.primaryButton.text}
                  </span>
                )}
                {content.hero.secondaryButton.enabled && (
                  <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-black/50 border border-white/50 text-white">
                    {content.hero.secondaryButton.text}
                  </span>
                )}
              </div>

              {/* Active Badges Preview */}
              {activeBadgesCount > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-white/20">
                  {content.hero.trustBadges.filter(b => b.enabled).map((badge) => (
                    <div key={badge.id} className="flex items-center gap-1.5 bg-black/60 border border-white/30 px-2.5 py-1 rounded-lg text-xs">
                      <span>{badge.icon}</span>
                      <span className="font-bold">{badge.title}</span>
                      <span className="text-[10px] text-gray-300">({badge.subtitle})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 1: Headline & Subtitle */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span>✍️</span> Headline &amp; Subtitle
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Headline (Part 1 - White Text)
                </label>
                <input
                  type="text"
                  value={content.hero.headlinePart1}
                  onChange={(e) => updateHero({ headlinePart1: e.target.value })}
                  placeholder="Make Your Event"
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Headline (Part 2 - Highlighted Color Word)
                </label>
                <input
                  type="text"
                  value={content.hero.headlinePart2}
                  onChange={(e) => updateHero({ headlinePart2: e.target.value })}
                  placeholder="Unforgettable"
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  style={{ color: content.hero.headlinePart2Color }}
                />
              </div>
            </div>

            {/* Color Picker for Highlighted Word */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Highlight Word Color
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="color"
                  value={content.hero.headlinePart2Color}
                  onChange={(e) => updateHero({ headlinePart2Color: e.target.value })}
                  className="w-9 h-9 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={content.hero.headlinePart2Color}
                  onChange={(e) => updateHero({ headlinePart2Color: e.target.value })}
                  className="w-28 border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none uppercase"
                />
                <div className="flex items-center gap-1.5 flex-wrap ml-2">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => updateHero({ headlinePart2Color: p.value })}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition-all flex items-center gap-1 cursor-pointer ${
                        content.hero.headlinePart2Color.toLowerCase() === p.value.toLowerCase()
                          ? 'border-gray-900 ring-2 ring-amber-400 font-bold'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.value }} />
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Hero Subtitle Description
              </label>
              <textarea
                rows={2}
                value={content.hero.subtitle}
                onChange={(e) => updateHero({ subtitle: e.target.value })}
                placeholder="Authentic Pure Vegetarian Indian cuisine. Seamless outdoor catering for all occasions."
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: Background Image */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span>🖼️</span> Hero Background Image
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="flex-1 w-full space-y-2">
                <input
                  type="text"
                  value={content.hero.backgroundImage}
                  onChange={(e) => updateHero({ backgroundImage: e.target.value })}
                  placeholder="/assets/images/hero_live_catering_bg.jpg"
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500">Presets:</span>
                  {BG_PRESETS.map((bg) => (
                    <button
                      key={bg.value}
                      type="button"
                      onClick={() => updateHero({ backgroundImage: bg.value })}
                      className="text-xs px-3 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 font-medium cursor-pointer"
                    >
                      {bg.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-28 h-20 rounded-xl border border-gray-200 overflow-hidden relative bg-neutral-900 flex-shrink-0 shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={content.hero.backgroundImage}
                  alt="Hero Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/images/hero_live_catering_bg.jpg';
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Call To Action (CTA) Buttons */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span>🔘</span> Call to Action (CTA) Buttons
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Button */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">Primary Button (Red/Maroon)</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-gray-500 font-medium">Show Button</span>
                    <input
                      type="checkbox"
                      checked={content.hero.primaryButton.enabled}
                      onChange={(e) => updateHero({
                        primaryButton: { ...content.hero.primaryButton, enabled: e.target.checked }
                      })}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Button Text</label>
                  <input
                    type="text"
                    value={content.hero.primaryButton.text}
                    onChange={(e) => updateHero({
                      primaryButton: { ...content.hero.primaryButton, text: e.target.value }
                    })}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Link Target / Anchor</label>
                  <input
                    type="text"
                    value={content.hero.primaryButton.link}
                    onChange={(e) => updateHero({
                      primaryButton: { ...content.hero.primaryButton, link: e.target.value }
                    })}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Secondary Button */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">Secondary Button (Transparent)</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-gray-500 font-medium">Show Button</span>
                    <input
                      type="checkbox"
                      checked={content.hero.secondaryButton.enabled}
                      onChange={(e) => updateHero({
                        secondaryButton: { ...content.hero.secondaryButton, enabled: e.target.checked }
                      })}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Button Text</label>
                  <input
                    type="text"
                    value={content.hero.secondaryButton.text}
                    onChange={(e) => updateHero({
                      secondaryButton: { ...content.hero.secondaryButton, text: e.target.value }
                    })}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Link Target / Anchor</label>
                  <input
                    type="text"
                    value={content.hero.secondaryButton.link}
                    onChange={(e) => updateHero({
                      secondaryButton: { ...content.hero.secondaryButton, link: e.target.value }
                    })}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Trust Badges Manager (Image 1 Badges) */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span>⭐</span> Hero Trust Badges
                </h3>
                <p className="text-xs text-gray-500">
                  Featured below the hero buttons. You can toggle each badge ON/OFF, edit text, or remove it.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddTrustBadge}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shadow-2xs"
              >
                <Icon name="PlusIcon" size={14} />
                <span>Add Trust Badge</span>
              </button>
            </div>

            {/* Special Highlight for Image 1: 500 Capacity note */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <span className="text-base">💡</span>
              <div>
                <strong className="font-semibold">Need to remove the &quot;500 Capacity (Hall &amp; Outdoor)&quot; badge?</strong>{' '}
                Simply flip its toggle to <span className="font-bold text-gray-700">OFF</span> or click the trash icon below. It will immediately disappear from your live website.
              </div>
            </div>

            <div className="space-y-3">
              {content.hero.trustBadges.map((badge, idx) => (
                <div
                  key={badge.id}
                  className={`p-4 rounded-xl border transition-all ${
                    badge.enabled
                      ? 'border-gray-200 bg-white shadow-2xs'
                      : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={badge.icon}
                        onChange={(e) => handleUpdateTrustBadge(idx, { icon: e.target.value })}
                        className="w-10 h-10 text-center text-lg border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        title="Emoji or Icon"
                      />
                      <span className="text-xs font-bold text-gray-400">Badge #{idx + 1}</span>
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <input
                          type="text"
                          value={badge.title}
                          onChange={(e) => handleUpdateTrustBadge(idx, { title: e.target.value })}
                          placeholder="e.g. 4.9★ Rated"
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={badge.subtitle}
                          onChange={(e) => handleUpdateTrustBadge(idx, { subtitle: e.target.value })}
                          placeholder="e.g. 500+ Happy Events"
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-end flex-shrink-0">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={badge.enabled}
                          onChange={(e) => handleUpdateTrustBadge(idx, { enabled: e.target.checked })}
                          className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                        />
                        <span className="text-xs font-semibold text-gray-700">
                          {badge.enabled ? 'Visible' : 'Hidden'}
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleDeleteTrustBadge(idx)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded cursor-pointer"
                        title="Delete Badge"
                      >
                        <Icon name="TrashIcon" size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* ── TAB 2: QUICK STATS RIBBON & MENU HEADER (IMAGE 2) ── */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'stats_menu' && (
        <div className="space-y-6">
          {/* Live Preview of Stats Ribbon */}
          <div className="rounded-2xl p-6 text-white text-center shadow-lg relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #A86208 0%, #C8860A 50%, #E69D24 100%)' }}>
            <span className="text-[10px] font-mono uppercase bg-black/20 text-white/90 border border-white/30 px-2.5 py-0.5 rounded-md mb-4 inline-block">
              ⚡ Live Stats Ribbon Preview
            </span>
            <div className={`grid grid-cols-2 sm:grid-cols-${Math.min(activeStatsCount || 1, 4)} gap-4 max-w-4xl mx-auto`}>
              {content.statsRibbon.items.filter(s => s.enabled).map((st) => (
                <div key={st.id} className="flex flex-col items-center">
                  <span className="text-xl mb-0.5">{st.icon}</span>
                  <span className="text-2xl sm:text-3xl font-extrabold">{st.value}</span>
                  <span className="text-xs text-amber-100 font-medium mt-0.5">{st.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 1: Quick Stats Ribbon Manager */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span>📊</span> Quick Stats Metrics
                </h3>
                <p className="text-xs text-gray-500">
                  The amber ribbon below the hero displaying key achievement numbers.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddStat}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shadow-2xs"
              >
                <Icon name="PlusIcon" size={14} />
                <span>Add Metric</span>
              </button>
            </div>

            <div className="space-y-3">
              {content.statsRibbon.items.map((stat, idx) => (
                <div
                  key={stat.id}
                  className={`p-4 rounded-xl border transition-all ${
                    stat.enabled
                      ? 'border-gray-200 bg-white shadow-2xs'
                      : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={stat.icon}
                        onChange={(e) => handleUpdateStat(idx, { icon: e.target.value })}
                        className="w-10 h-10 text-center text-lg border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        title="Stat Icon/Emoji"
                      />
                      <span className="text-xs font-bold text-gray-400">Stat #{idx + 1}</span>
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-0.5">Value (Number/Text)</label>
                        <input
                          type="text"
                          value={stat.value}
                          onChange={(e) => handleUpdateStat(idx, { value: e.target.value })}
                          placeholder="e.g. 500+"
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-0.5">Label Description</label>
                        <input
                          type="text"
                          value={stat.label}
                          onChange={(e) => handleUpdateStat(idx, { label: e.target.value })}
                          placeholder="e.g. Events Catered"
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-end flex-shrink-0">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={stat.enabled}
                          onChange={(e) => handleUpdateStat(idx, { enabled: e.target.checked })}
                          className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                        />
                        <span className="text-xs font-semibold text-gray-700">
                          {stat.enabled ? 'Visible' : 'Hidden'}
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleDeleteStat(idx)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded cursor-pointer"
                        title="Delete Stat"
                      >
                        <Icon name="TrashIcon" size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Menu Header & Description */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span>🍽️</span> Menu Section Header &amp; Intro
            </h3>
            <p className="text-xs text-gray-500">
              The heading, category pill badge, and intro text shown right above the packages and dish filters.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Top Pill Badge Text
                </label>
                <input
                  type="text"
                  value={content.menuHeader.badgeText}
                  onChange={(e) => updateMenuHeader({ badgeText: e.target.value })}
                  placeholder="Authentic Culinary Experience"
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Section Heading Title
                </label>
                <input
                  type="text"
                  value={content.menuHeader.title}
                  onChange={(e) => updateMenuHeader({ title: e.target.value })}
                  placeholder="Our Menus & Specials"
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Section Subtitle / Description
              </label>
              <textarea
                rows={2}
                value={content.menuHeader.subtitle}
                onChange={(e) => updateMenuHeader({ subtitle: e.target.value })}
                placeholder="Explore our freshly prepared vegetarian delicacies and live dosa stations."
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* ── TAB 3: TERMS & CONDITIONS / LEGAL (IMAGE 3) ── */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'terms' && (
        <div className="space-y-6">
          {/* Master Enable/Disable Switch Card */}
          <div className={`p-5 rounded-2xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
            content.termsAndConditions.enabled 
              ? 'bg-emerald-50/70 border-emerald-300' 
              : 'bg-rose-50/70 border-rose-300'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                content.termsAndConditions.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {content.termsAndConditions.enabled ? '👁️' : '🚫'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-gray-900">
                    Terms &amp; Conditions Section on Website
                  </h3>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                    content.termsAndConditions.enabled 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {content.termsAndConditions.enabled ? '● Currently Visible (ON)' : '○ Currently Hidden / Off (OFF)'}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {content.termsAndConditions.enabled 
                    ? 'The Terms & Conditions accordion is currently enabled and displayed above the booking section on the homepage.'
                    : 'The Terms & Conditions section is currently turned OFF and hidden from the homepage completely.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => updateTerms({ enabled: !content.termsAndConditions.enabled })}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer flex-shrink-0 ${
                content.termsAndConditions.enabled
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Icon name={content.termsAndConditions.enabled ? 'EyeSlashIcon' : 'EyeIcon'} size={16} />
              <span>{content.termsAndConditions.enabled ? 'Turn OFF / Hide from Website' : 'Turn ON / Show on Website'}</span>
            </button>
          </div>

          {/* Section 1: Header */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span>⚖️</span> Legal Section Header
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Top Pill Badge
                </label>
                <input
                  type="text"
                  value={content.termsAndConditions.badgeText}
                  onChange={(e) => updateTerms({ badgeText: e.target.value })}
                  placeholder="Legal"
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Section Title
                </label>
                <input
                  type="text"
                  value={content.termsAndConditions.title}
                  onChange={(e) => updateTerms({ title: e.target.value })}
                  placeholder="Terms & Conditions"
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Policy Accordion Sections */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span>📜</span> Policy Accordion Sections
                </h3>
                <p className="text-xs text-gray-500">
                  Manage individual terms sections, change titles, add or remove specific rule bullet points.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddTermsSection}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shadow-2xs"
              >
                <Icon name="PlusIcon" size={14} />
                <span>Add Policy Section</span>
              </button>
            </div>

            <div className="space-y-4">
              {content.termsAndConditions.sections.map((section, secIdx) => {
                const isExpanded = expandedPolicyId === section.id;
                return (
                  <div
                    key={section.id}
                    className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs"
                  >
                    {/* Header */}
                    <div className="p-4 bg-gray-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200">
                      <div className="flex-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedPolicyId(isExpanded ? null : section.id)}
                          className="text-gray-500 hover:text-gray-800 transition-colors"
                        >
                          <Icon
                            name={isExpanded ? 'ChevronUpIcon' : 'ChevronDownIcon'}
                            size={18}
                          />
                        </button>
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => handleUpdateTermsSection(secIdx, { title: e.target.value })}
                          className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold text-amber-950 focus:ring-2 focus:ring-amber-500 focus:outline-none uppercase"
                          placeholder="POLICY TITLE"
                        />
                      </div>

                      <div className="flex items-center gap-3 justify-end flex-shrink-0">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                          {section.items.length} Rules
                        </span>

                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={section.enabled}
                            onChange={(e) => handleUpdateTermsSection(secIdx, { enabled: e.target.checked })}
                            className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                          />
                          <span className="text-xs font-semibold text-gray-700">
                            {section.enabled ? 'Visible' : 'Hidden'}
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={() => handleDeleteTermsSection(secIdx)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded cursor-pointer"
                          title="Delete Section"
                        >
                          <Icon name="TrashIcon" size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Bullet Points */}
                    <div className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase text-gray-500 tracking-wider">
                          Policy Bullet Points:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddBulletItem(secIdx)}
                          className="text-xs font-bold text-[#C8860A] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Icon name="PlusIcon" size={12} />
                          <span>Add Bullet Point</span>
                        </button>
                      </div>

                      {section.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="flex items-start gap-2">
                          <span className="text-amber-500 text-sm mt-1 flex-shrink-0">•</span>
                          <textarea
                            rows={1}
                            value={item}
                            onChange={(e) => handleUpdateBulletItem(secIdx, itemIdx, e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-amber-500 focus:outline-none resize-y"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteBulletItem(secIdx, itemIdx)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded cursor-pointer mt-1"
                            title="Delete Item"
                          >
                            <Icon name="XMarkIcon" size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Bottom Notes Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span>📌</span> Important Notes Box
                </h3>
                <p className="text-xs text-gray-500">
                  Fixed notice box appearing at the bottom of the Terms &amp; Conditions section.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddNote}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Icon name="PlusIcon" size={14} />
                <span>Add Note</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Notes Box Title
              </label>
              <input
                type="text"
                value={content.termsAndConditions.notesTitle || 'NOTE'}
                onChange={(e) => updateTerms({ notesTitle: e.target.value })}
                placeholder="NOTE"
                className="w-48 border border-gray-300 rounded-xl px-3.5 py-1.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none uppercase"
              />
            </div>

            <div className="space-y-2">
              {(content.termsAndConditions.notes || []).map((note, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs font-bold w-4">{idx + 1}.</span>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => handleUpdateNote(idx, e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(idx)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded cursor-pointer"
                    title="Delete Note"
                  >
                    <Icon name="TrashIcon" size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
