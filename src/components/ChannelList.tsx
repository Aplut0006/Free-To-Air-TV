import React, { useState, useMemo } from "react";
import { Channel, Country } from "../types";
import { Play, Search, ArrowLeft, Tv, ExternalLink, Hash, RefreshCw } from "lucide-react";

interface ChannelListProps {
  countryCode: string;
  country: Country | null;
  channels: Channel[];
  onBack: () => void;
  onSelectChannel: (channel: Channel) => void;
  selectedChannelId: string | null;
  isLoading: boolean;
}

export default function ChannelList({
  countryCode,
  country,
  channels,
  onBack,
  onSelectChannel,
  selectedChannelId,
  isLoading
}: ChannelListProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Extract all categories available in this country
  const categories = useMemo(() => {
    const set = new Set<string>();
    set.add("All");
    for (const ch of channels) {
      if (ch.categories) {
        for (const cat of ch.categories) {
          if (cat) {
            set.add(cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase());
          }
        }
      }
    }
    return Array.from(set);
  }, [channels]);

  // Filter channels based on search and category
  const filteredChannels = useMemo(() => {
    return channels.filter((ch) => {
      // 1. Search Query filter
      const matchesSearch = ch.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // 2. Category filter
      let matchesCategory = true;
      if (selectedCategory !== "All") {
        matchesCategory = ch.categories && ch.categories.some(
          (cat) => cat.toLowerCase() === selectedCategory.toLowerCase()
        );
      }

      return matchesSearch && matchesCategory;
    });
  }, [channels, searchQuery, selectedCategory]);

  return (
    <div className="flex flex-col bg-black border border-white/10 rounded-sm p-5 h-full backdrop-blur-md shadow-xl overflow-hidden min-h-[450px]">
      
      {/* Header: Country Flag, Name & Back Action */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4 shrink-0">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            onClick={onBack}
            className="p-2 bg-black border border-white/10 text-white/40 hover:text-white rounded-none hover:bg-white/5 transition-all cursor-pointer"
            title="Back to Global Explorer"
          >
            <ArrowLeft size={13} />
          </button>
          
          <div className="flex items-center gap-2.5 min-w-0">
            {country && <span className="text-2xl filter saturate-100">{country.flag}</span>}
            <div className="flex flex-col min-w-0">
              <h3 className="text-xs font-bold text-white tracking-widest uppercase truncate font-sans">
                {country ? country.name : countryCode}
              </h3>
              <span className="text-[9px] font-mono text-orange-500 uppercase tracking-widest mt-0.5 font-bold">
                {channels.length} Live Channels Available
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid controls */}
      <div className="flex flex-col gap-3 mb-4 shrink-0">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 h-4 w-4" />
          <input
            type="text"
            placeholder="Search channels inside country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black border border-white/10 text-[#F5F5F5] text-xs pl-9 pr-4 py-2.5 rounded-none placeholder-white/20 focus:outline-none focus:border-orange-500/80 transition-all font-sans"
          />
        </div>

        {/* Categories Horizontal scroller */}
        {categories.length > 2 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {categories.map((cat) => (
              <button
                key={`cat-tab-${cat}`}
                onClick={() => setSelectedCategory(cat)}
                className={`text-[9px] font-mono font-bold px-3 py-1.5 rounded-none border transition-all whitespace-nowrap cursor-pointer uppercase tracking-widest ${
                  selectedCategory === cat
                    ? "bg-[#1C1C1C] border-white/10 text-orange-500"
                    : "bg-[#0F0F0F] border border-white/5 text-white/40 hover:text-white/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Channels list container */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-white/10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-white/30 gap-3">
            <RefreshCw className="h-6 w-6 text-orange-500 animate-spin" />
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Tuning local frequencies...</span>
          </div>
        ) : filteredChannels.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredChannels.map((ch) => {
              const isPlaying = selectedChannelId === ch.id;
              return (
                <button
                  key={`country-ch-card-${ch.id}`}
                  onClick={() => onSelectChannel(ch)}
                  className={`flex items-center gap-3.5 p-3 rounded-none border transition-all text-left cursor-pointer ${
                    isPlaying
                      ? "bg-orange-500/5 border-orange-500 shadow-lg shadow-orange-500/5"
                      : "bg-black/20 border border-white/5 hover:bg-white/5 hover:border-white/15"
                  }`}
                >
                  {/* Channel logo with broken-source safety */}
                  {ch.logo ? (
                    <img
                      src={ch.logo}
                      alt={ch.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 object-contain bg-[#121212] p-1.5 rounded-none border border-white/10 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-none bg-[#121212] border border-white/10 flex items-center justify-center font-mono text-[11px] font-bold text-orange-500 shrink-0 uppercase">
                      {ch.name.slice(0, 2)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className={`text-xs font-bold truncate tracking-wide ${
                      isPlaying ? "text-orange-400" : "text-white/95"
                    }`}>
                      {ch.name}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {ch.categories && ch.categories.length > 0 ? (
                        <span className="text-[9px] font-mono bg-white/5 border border-white/10 text-white/60 px-1.5 py-0.5 rounded-none uppercase tracking-widest font-bold truncate max-w-[85px]">
                          {ch.categories[0]}
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono bg-white/5 border border-white/10 text-white/40 px-1.5 py-0.5 rounded-none uppercase tracking-widest font-bold">
                          General
                        </span>
                      )}
                      <span className="text-[9px] font-mono text-orange-500 uppercase tracking-widest font-black">
                        Free
                      </span>
                    </div>
                  </div>

                  <div className={`p-1.5 rounded-none border transition-all shrink-0 ${
                    isPlaying 
                      ? "bg-orange-950 border-orange-700 text-orange-400" 
                      : "bg-[#121212] border-white/10 text-white/40"
                  }`}>
                    <Play size={10} fill={isPlaying ? "currentColor" : "none"} />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-10 text-center text-white/30 gap-2 border border-white/5 rounded-none bg-black/40">
            <Tv className="h-8 w-8 text-white/10 animate-pulse" />
            <span className="text-xs font-sans">
              No channels match query. Try clearing search keywords or selecting "All" categories.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
