import React, { useState, useEffect } from "react";
import { Country, Channel } from "../types";
import { 
  Search, Globe, Tv, Sparkles, AlertCircle, Play, 
  MapPin, Loader2, RefreshCw 
} from "lucide-react";

interface CountrySidebarProps {
  countries: Country[];
  selectedCountryCode: string | null;
  onSelectCountry: (code: string) => void;
  featuredChannels: Channel[];
  onSelectChannel: (channel: Channel) => void;
  selectedChannelId: string | null;
  backendLoading: boolean;
  backendError: string | null;
}

export default function CountrySidebar({
  countries,
  selectedCountryCode,
  onSelectCountry,
  featuredChannels,
  onSelectChannel,
  selectedChannelId,
  backendLoading,
  backendError
}: CountrySidebarProps) {
  const [activeTab, setActiveTab] = useState<"countries" | "featured" | "search">("countries");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Filter countries
  const filteredCountries = countries.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle global search API
  useEffect(() => {
    if (activeTab !== "search" || !globalSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/channels/search?q=${encodeURIComponent(globalSearchQuery)}`)
        .then((res) => res.json())
        .then((data) => {
          setSearchResults(data);
          setIsSearching(false);
        })
        .catch((err) => {
          console.error("Error searching channels:", err);
          setIsSearching(false);
        });
    }, 4000); // 400ms debounce

    return () => clearTimeout(delayDebounce);
  }, [globalSearchQuery, activeTab]);

  return (
    <div className="flex flex-col bg-black border border-white/10 rounded-sm p-5 h-full backdrop-blur-md shadow-xl overflow-hidden min-h-[500px]">
      
      {/* Tab Navigation */}
      <div className="grid grid-cols-3 gap-1 bg-[#121212] p-1 rounded-none border border-white/10 mb-4">
        <button
          onClick={() => setActiveTab("countries")}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-none uppercase tracking-widest transition-all cursor-pointer ${
            activeTab === "countries"
              ? "bg-[#1C1C1C] border border-white/10 text-orange-500"
              : "text-white/40 hover:text-white/80"
          }`}
        >
          <Globe size={12} />
          Regions
        </button>
        <button
          onClick={() => setActiveTab("featured")}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-none uppercase tracking-widest transition-all cursor-pointer ${
            activeTab === "featured"
              ? "bg-[#1C1C1C] border border-white/10 text-orange-500"
              : "text-white/40 hover:text-white/80"
          }`}
        >
          <Sparkles size={12} />
          Hot Feeds
        </button>
        <button
          onClick={() => setActiveTab("search")}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-none uppercase tracking-widest transition-all cursor-pointer ${
            activeTab === "search"
              ? "bg-[#1C1C1C] border border-white/10 text-orange-500"
              : "text-white/40 hover:text-white/80"
          }`}
        >
          <Search size={12} />
          Scan All
        </button>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* TAB 1: COUNTRIES EXPLORER */}
        {activeTab === "countries" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search inputs */}
            <div className="relative mb-3.5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 h-4 w-4" />
              <input
                type="text"
                placeholder="Search territories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black border border-white/10 text-[#F5F5F5] text-xs pl-9 pr-4 py-2.5 rounded-none placeholder-white/20 focus:outline-none focus:border-orange-500/80 transition-all font-sans"
              />
            </div>

            {/* Backend Loading indicators */}
            {backendLoading && countries.length <= 11 && (
              <div className="flex items-center gap-3 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-none text-orange-500 text-[10px] mb-3 font-mono animate-pulse uppercase tracking-widest font-bold">
                <Loader2 size={12} className="animate-spin" />
                EXTRACTING TERRESTRIAL INDEX...
              </div>
            )}

            {backendError && (
              <div className="flex items-start gap-2.5 p-3 bg-red-950/10 border border-red-900/20 rounded-none text-red-400 text-xs mb-3 font-sans">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold">Sync notice:</span> Offline database active. Pre-loaded satellite records loaded.
                </div>
              </div>
            )}

            {/* Countries Scrollable Grid */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((c) => {
                  const isSelected = selectedCountryCode?.toUpperCase() === c.code.toUpperCase();
                  return (
                    <button
                      key={`country-btn-${c.code}`}
                      onClick={() => onSelectCountry(c.code)}
                      className={`w-full flex items-center justify-between p-3 rounded-none border transition-all text-left cursor-pointer ${
                        isSelected
                          ? "bg-orange-500/5 border-orange-500 shadow-md shadow-orange-500/5"
                          : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/15"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl filter saturate-100">{c.flag}</span>
                        <div className="flex flex-col min-w-0">
                          <span className={`text-xs font-bold tracking-wide ${
                            isSelected ? "text-orange-400" : "text-white/95"
                          }`}>
                            {c.name}
                          </span>
                          <span className="text-[9px] font-mono text-white/30 mt-0.5 uppercase tracking-widest">
                            ISO: {c.code}
                          </span>
                        </div>
                      </div>

                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-none border font-mono text-[9px] font-bold uppercase tracking-wider ${
                        isSelected
                          ? "bg-orange-950 border-orange-800 text-orange-400"
                          : "bg-[#121212] border-white/10 text-white/40"
                      }`}>
                        <Tv size={10} />
                        {c.channelCount} CH
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-white/30 gap-2 border border-white/5 rounded-none bg-black/40">
                  <Globe className="h-8 w-8 text-white/10 animate-pulse" />
                  <span className="text-xs font-sans">No countries matched search query.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: INSTANT PLAY / FEATURED */}
        {activeTab === "featured" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="mb-3">
              <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Sparkles size={12} className="text-orange-500" />
                Featured Global Feeds
              </h4>
              <p className="text-[10px] text-white/30 mt-0.5 uppercase tracking-wider font-bold">Unencrypted direct extraction node channels.</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-white/10">
              {featuredChannels.map((ch) => {
                const isPlayingThis = selectedChannelId === ch.id;
                return (
                  <button
                    key={`featured-ch-${ch.id}`}
                    onClick={() => onSelectChannel(ch)}
                    className={`w-full flex items-center gap-3.5 p-3 rounded-none border transition-all text-left cursor-pointer ${
                      isPlayingThis
                        ? "bg-orange-500/5 border-orange-500 shadow-lg shadow-orange-500/5"
                        : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/15"
                    }`}
                  >
                    {/* Channel Logo */}
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
                        isPlayingThis ? "text-orange-400" : "text-white/95"
                      }`}>
                        {ch.name}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-mono bg-white/5 text-white/60 px-1.5 py-0.5 rounded-none uppercase tracking-widest font-semibold border border-white/10">
                          {ch.country}
                        </span>
                        {ch.categories && ch.categories.length > 0 && (
                          <span className="text-[9px] font-mono text-white/40 truncate">
                            • {ch.categories[0]}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={`p-1.5 rounded-none border transition-all shrink-0 ${
                      isPlayingThis 
                        ? "bg-orange-950 border-orange-700 text-orange-400 animate-pulse" 
                        : "bg-[#121212] border-white/10 text-white/40"
                    }`}>
                      <Play size={10} fill={isPlayingThis ? "currentColor" : "none"} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: GLOBAL SATELLITE SEARCH */}
        {activeTab === "search" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Real-time search query */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 h-4 w-4" />
              <input
                type="text"
                placeholder="Search global channels..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                className="w-full bg-black border border-white/10 text-[#F5F5F5] text-xs pl-9 pr-4 py-2.5 rounded-none placeholder-white/20 focus:outline-none focus:border-orange-500/80 transition-all font-sans"
              />
            </div>

            <div className="mb-2 text-[9px] text-white/30 font-mono flex items-center justify-between uppercase tracking-widest font-bold">
              <span>SCANNING IONOSPHERE INDEX</span>
              {isSearching && <Loader2 size={10} className="animate-spin text-orange-500" />}
            </div>

            {/* Search results list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-white/10">
              {globalSearchQuery.trim() ? (
                searchResults.length > 0 ? (
                  searchResults.map((ch) => {
                    const isPlayingThis = selectedChannelId === ch.id;
                    return (
                      <button
                        key={`search-ch-${ch.id}`}
                        onClick={() => onSelectChannel(ch)}
                        className={`w-full flex items-center gap-3.5 p-3 rounded-none border transition-all text-left cursor-pointer ${
                          isPlayingThis
                            ? "bg-orange-500/5 border-orange-500 shadow-lg shadow-orange-500/5"
                            : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/15"
                        }`}
                      >
                        {/* Channel Logo */}
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
                            isPlayingThis ? "text-orange-400" : "text-white/95"
                          }`}>
                            {ch.name}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-mono bg-white/5 text-white/60 px-1.5 py-0.5 rounded-none uppercase tracking-widest font-semibold border border-white/10 flex items-center gap-0.5">
                              <MapPin size={8} />
                              {ch.countryName || ch.countryCode}
                            </span>
                            {ch.categories && ch.categories.length > 0 && (
                              <span className="text-[9px] font-mono text-white/40 truncate">
                                • {ch.categories[0]}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className={`p-1.5 rounded-none border transition-all shrink-0 ${
                          isPlayingThis 
                            ? "bg-orange-950 border-orange-700 text-orange-400" 
                            : "bg-[#121212] border-white/10 text-white/40"
                        }`}>
                          <Play size={10} fill={isPlayingThis ? "currentColor" : "none"} />
                        </div>
                      </button>
                    );
                  })
                ) : (
                  !isSearching && (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-white/30 gap-2 border border-white/5 rounded-none bg-black/40">
                      <AlertCircle className="h-8 w-8 text-white/10" />
                      <div className="text-xs font-sans leading-relaxed">
                        No feeds matched keyword. Try entering "BBC", "NASA", "News", "RTVE", or "Sport".
                      </div>
                    </div>
                  )
                )
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-white/30 gap-2.5 border border-white/5 rounded-none bg-black/40">
                  <Tv className="h-8 w-8 text-white/10 animate-pulse" />
                  <div className="text-[11px] font-sans max-w-xs leading-relaxed uppercase tracking-wide">
                    Enter channel label or category keyword to scan the direct satellite directory.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
