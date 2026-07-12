import React, { useEffect, useState } from "react";
import Globe from "./components/Globe";
import VideoPlayer from "./components/VideoPlayer";
import CountrySidebar from "./components/CountrySidebar";
import ChannelList from "./components/ChannelList";
import { Country, Channel, BackendStatus } from "./types";
import { Tv, Globe as GlobeIcon, Radio, Sparkles, Activity, ShieldAlert } from "lucide-react";

export default function App() {
  // Global App States
  const [countries, setCountries] = useState<Country[]>([]);
  const [featuredChannels, setFeaturedChannels] = useState<Channel[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [countryChannels, setCountryChannels] = useState<Channel[]>([]);
  
  // Loading & error states
  const [loadingCountries, setLoadingCountries] = useState<boolean>(true);
  const [loadingChannels, setLoadingChannels] = useState<boolean>(false);
  const [status, setStatus] = useState<BackendStatus | null>(null);

  // Load countries, featured channels, and server status on mount
  useEffect(() => {
    // 1. Fetch server status
    fetch("/api/status")
      .then((res) => res.json())
      .then((data: BackendStatus) => setStatus(data))
      .catch((err) => console.warn("Could not load server status:", err));

    // 2. Fetch countries
    fetch("/api/countries")
      .then((res) => res.json())
      .then((data: Country[]) => {
        setCountries(data);
        setLoadingCountries(false);
      })
      .catch((err) => {
        console.error("Error loading countries list:", err);
        setLoadingCountries(false);
      });

    // 3. Fetch featured/fallback channels
    fetch("/api/channels/featured")
      .then((res) => res.json())
      .then((data: Channel[]) => {
        setFeaturedChannels(data);
      })
      .catch((err) => console.error("Error loading featured channels:", err));

    // Periodically poll backend status in the background to see when full IPTV indexing completes
    const statusInterval = setInterval(() => {
      fetch("/api/status")
        .then((res) => res.json())
        .then((data: BackendStatus) => {
          setStatus(data);
          // If loaded, update countries list once to get full data
          if (data.loaded && !data.loading) {
            fetch("/api/countries")
              .then((res) => res.json())
              .then((updatedCountries: Country[]) => {
                setCountries(updatedCountries);
              });
            clearInterval(statusInterval);
          }
        })
        .catch(() => {});
    }, 5000);

    return () => clearInterval(statusInterval);
  }, []);

  // Fetch channels when country changes
  useEffect(() => {
    if (!selectedCountryCode) {
      setCountryChannels([]);
      return;
    }

    setLoadingChannels(true);
    fetch(`/api/countries/${selectedCountryCode}/channels`)
      .then((res) => res.json())
      .then((data: Channel[]) => {
        setCountryChannels(data);
        setLoadingChannels(false);

        // Auto-select and play the first channel for immediate visual feedback!
        if (data.length > 0) {
          setSelectedChannel(data[0]);
        }
      })
      .catch((err) => {
        console.error(`Error loading channels for country ${selectedCountryCode}:`, err);
        setLoadingChannels(false);
      });
  }, [selectedCountryCode]);

  const handleSelectCountry = (code: string) => {
    setSelectedCountryCode(code);
  };

  const handleBackToGlobal = () => {
    setSelectedCountryCode(null);
  };

  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    
    // If selecting a channel from Featured or Search that is from a different country,
    // smoothly update selected country to synchronize the UI
    if (channel.country && channel.country.toUpperCase() !== selectedCountryCode?.toUpperCase()) {
      setSelectedCountryCode(channel.country.toUpperCase());
    }
  };

  // Find country details for selected code
  const selectedCountryDetails = countries.find(
    (c) => c.code.toUpperCase() === selectedCountryCode?.toUpperCase()
  ) || null;

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#F5F5F5] flex flex-col font-sans selection:bg-orange-500/20 selection:text-orange-400">
      
      {/* GLOBAL BACKGROUND TELEMETRY SHADING */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-orange-900/5 rounded-full blur-[140px] opacity-40" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-red-900/5 rounded-full blur-[180px] opacity-30" />
      </div>

      {/* HEADER BAR */}
      <header className="relative z-10 border-b border-white/10 bg-[#0F0F0F] px-6 md:px-12 py-6 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-black border border-white/20 flex items-center justify-center shadow-lg shadow-black/50 rounded-sm">
            <Tv className="text-orange-500 h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <div className="text-[10px] tracking-[0.4em] font-bold uppercase text-white/40">Global Broadcast Interface / 01</div>
            <h1 className="text-sm font-black uppercase tracking-widest text-white mt-0.5">
              World Orbit FTA Globe
            </h1>
          </div>
        </div>

        {/* Transmission Navigation mimicry from design */}
        <nav className="flex gap-8 my-2 md:my-0">
          <span className="text-[10px] tracking-widest uppercase font-bold border-b border-white pb-1 text-white">Transmission</span>
          <span className="text-[10px] tracking-widest uppercase font-bold text-white/40 hover:text-white/90 transition-all cursor-pointer">Frequencies</span>
          <span className="text-[10px] tracking-widest uppercase font-bold text-white/40 hover:text-white/90 transition-all cursor-pointer">Archive</span>
        </nav>

        {/* Dynamic Telemetry Status Hub */}
        <div className="flex items-center gap-4 text-[10px] font-mono bg-white/5 border border-white/10 px-4 py-2 rounded-sm">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              status?.loaded 
                ? "bg-orange-500 animate-pulse" 
                : status?.loading 
                  ? "bg-amber-400 animate-spin" 
                  : "bg-red-600"
            }`} />
            <span className="text-white/40 uppercase tracking-widest font-bold">Tuner:</span>
            <span className="text-white/90">
              {status?.loaded 
                ? "Live Sync" 
                : status?.loading 
                  ? `Indexing (${countries.length})` 
                  : "Fallback Engine"}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 border-l border-white/10 pl-4 text-[9px] text-white/40 uppercase tracking-widest font-bold">
            <Activity size={11} className="text-orange-500" />
            <span>Territories: {countries.length}</span>
          </div>
        </div>
      </header>

      {/* MASTER RESPONSIVE GRID CONTENT */}
      <main className="flex-1 relative z-10 w-full max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        
        {/* LEFT COLUMN: MULTIMEDIA STATION (Player & Globe) - Takes 7/12 width */}
        <div className="lg:col-span-7 flex flex-col gap-6 h-full min-h-0">
          
          {/* Section 1: HLS Live Feed Tuner Player */}
          <div className="shrink-0 w-full">
            <VideoPlayer channel={selectedChannel} />
          </div>

          {/* Section 2: Interactive 3D Satellite Map Globe */}
          <div className="flex-1 min-h-[350px]">
            <Globe
              countries={countries}
              selectedCountryCode={selectedCountryCode}
              onSelectCountry={handleSelectCountry}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: CONTROL PANEL SIDEBAR (Country Explorer or Channel list) - Takes 5/12 width */}
        <div className="lg:col-span-5 h-full min-h-0 flex flex-col gap-4">
          
          {/* Beautiful Territorial Extract HUD Card from design */}
          <div className="bg-white/5 border border-white/10 rounded-sm p-5 space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div className="flex items-end gap-3 min-w-0">
                <span className="text-3xl md:text-4xl font-serif italic text-white truncate">
                  {selectedCountryDetails ? selectedCountryDetails.name : "World Orbit"}
                </span>
                <span className="text-[10px] mb-1.5 text-white/40 tracking-widest uppercase font-bold shrink-0">
                  {selectedCountryDetails ? `Reg. ${selectedCountryDetails.code}` : "SCANNING REGIONS"}
                </span>
              </div>
              {selectedCountryCode && (
                <button 
                  onClick={handleBackToGlobal}
                  className="text-[9px] text-orange-400 hover:text-orange-300 font-mono uppercase tracking-widest border border-orange-500/30 hover:border-orange-500 bg-orange-500/5 px-2 py-1 rounded-sm transition-all"
                >
                  GLOBAL
                </button>
              )}
            </div>
            <div className="h-[1px] w-full bg-gradient-to-r from-white/20 via-white/10 to-transparent"></div>
            <div className="flex justify-between text-[10px] tracking-widest uppercase font-bold text-white/50 font-mono">
              <span>Active Transponders: {selectedCountryDetails ? selectedCountryDetails.channelCount : countries.reduce((acc, curr) => acc + curr.channelCount, 0)}</span>
              <span>Extraction: {selectedCountryDetails ? "Locked" : "Standby"}</span>
            </div>
          </div>

          {/* Core Navigation Panels */}
          <div className="flex-1 min-h-0">
            {selectedCountryCode ? (
              <ChannelList
                countryCode={selectedCountryCode}
                country={selectedCountryDetails}
                channels={countryChannels}
                onBack={handleBackToGlobal}
                onSelectChannel={handleSelectChannel}
                selectedChannelId={selectedChannel?.id || null}
                isLoading={loadingChannels}
              />
            ) : (
              <CountrySidebar
                countries={countries}
                selectedCountryCode={selectedCountryCode}
                onSelectCountry={handleSelectCountry}
                featuredChannels={featuredChannels}
                onSelectChannel={handleSelectChannel}
                selectedChannelId={selectedChannel?.id || null}
                backendLoading={status?.loading || loadingCountries}
                backendError={status?.error || null}
              />
            )}
          </div>
        </div>
      </main>

      {/* FOOTER METRICS */}
      <footer className="relative z-10 border-t border-white/10 bg-white text-black py-3 px-6 md:px-12 text-[10px] font-black uppercase tracking-widest flex flex-col md:flex-row items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5">
            <Radio size={11} className="text-orange-500 shrink-0" /> 
            Status: Uplink Nominal
          </span>
          <span className="text-black/40 hidden sm:inline">|</span>
          <span className="text-black/50">Data Rate: 42.4 Mbps</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Stream Protocol: HLS-M3U8</span>
          <span className="text-black/20">/</span>
          <span>© 2026 Planetary Media Systems</span>
        </div>
      </footer>
    </div>
  );
}
