import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Channel, Stream } from "../types";
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  Tv, Radio, AlertTriangle, RefreshCw, Info, ExternalLink 
} from "lucide-react";

interface VideoPlayerProps {
  channel: Channel | null;
  onClose?: () => void;
}

export default function VideoPlayer({ channel }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeStreamIndex, setActiveStreamIndex] = useState<number>(0);
  const [diagnostics, setDiagnostics] = useState<{
    engine: string;
    resolution: string;
    bitrate: string;
    buffered: number;
  }>({
    engine: "None",
    resolution: "Unknown",
    bitrate: "0 kbps",
    buffered: 0
  });

  const activeStream: Stream | undefined = channel?.streams[activeStreamIndex];

  // Initialize and attach HLS stream
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeStream) return;

    // Reset player state
    setIsLoading(true);
    setStreamError(null);
    setIsPlaying(false);
    setDiagnostics({
      engine: "None",
      resolution: activeStream.resolution || "Auto",
      bitrate: "Calibrating...",
      buffered: 0
    });

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const streamUrl = activeStream.url;

    // Setup HLS.js
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        setDiagnostics(prev => ({ ...prev, engine: "HLS.js (Engine)" }));
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        setIsLoading(false);
        video.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Auto-play might be blocked by browser policies
            setIsPlaying(false);
          });
      });

      hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
        const details = data.details;
        const levelInfo = hls.levels[hls.currentLevel];
        const resStr = levelInfo 
          ? `${levelInfo.width}x${levelInfo.height}` 
          : `${activeStream.width || "?"}x${activeStream.height || "?"}`;
        
        const estBitrate = levelInfo 
          ? `${Math.round(levelInfo.bitrate / 1000)} kbps` 
          : "Auto";

        setDiagnostics(prev => ({
          ...prev,
          resolution: resStr,
          bitrate: estBitrate,
        }));
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.warn("HLS.js fatal error:", data.type);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setStreamError("This stream is currently offline or blocking external players.");
              setIsLoading(false);
              break;
          }
        }
      });
    } 
    // Fallback to Native HLS (for Safari on macOS/iOS)
    else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      setDiagnostics(prev => ({ ...prev, engine: "Native Browser Engine" }));

      const handleNativeLoad = () => {
        setIsLoading(false);
        video.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      };

      const handleNativeError = () => {
        setStreamError("This stream is currently offline or blocking external players.");
        setIsLoading(false);
      };

      video.addEventListener("loadedmetadata", handleNativeLoad);
      video.addEventListener("error", handleNativeError);

      return () => {
        video.removeEventListener("loadedmetadata", handleNativeLoad);
        video.removeEventListener("error", handleNativeError);
      };
    } else {
      setStreamError("Your browser does not support HLS streaming. Please try Chrome or Firefox.");
      setIsLoading(false);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel, activeStreamIndex]);

  // Handle Play/Pause
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  // Handle Volume Change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    if (videoRef.current) {
      videoRef.current.volume = value;
      videoRef.current.muted = value === 0 || isMuted;
    }
  };

  const toggleMute = () => {
    const mutedState = !isMuted;
    setIsMuted(mutedState);
    if (videoRef.current) {
      videoRef.current.muted = mutedState;
    }
  };

  // Monitor Buffer size
  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video) return;
      
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const duration = video.currentTime;
        setDiagnostics(prev => ({
          ...prev,
          buffered: Math.max(0, parseFloat((bufferedEnd - duration).toFixed(1)))
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fullscreen implementation
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.error("Error enabling fullscreen:", err));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false));
    }
  };

  // Listen to escape key for fullscreen sync
  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  const handleRetry = () => {
    // Reset selection index to trigger reload
    setActiveStreamIndex(prev => prev);
    setIsLoading(true);
    setStreamError(null);
  };

  // If no channel is selected, show an attractive landing screen inside the TV box
  if (!channel) {
    return (
      <div className="flex flex-col items-center justify-center bg-black border border-white/10 rounded-sm p-8 text-center h-full min-h-[400px] shadow-2xl relative overflow-hidden">
        {/* Background visual art */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-[#0F0F0F] to-black opacity-80 pointer-events-none" />
        
        {/* Editorial-style subtle side status */}
        <div className="absolute left-6 top-6 text-[9px] tracking-[0.4em] font-bold uppercase text-white/20">TERRESTRIAL RECEIVER</div>
        <div className="absolute right-6 top-6 text-[9px] tracking-[0.2em] font-mono font-bold text-orange-500/80">ONLINE // FTA_UP</div>

        <div className="relative z-10 flex flex-col items-center max-w-sm gap-6 pt-6">
          <div className="w-14 h-14 bg-black border border-white/10 flex items-center justify-center shadow-lg shadow-black">
            <Tv className="text-orange-500 h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-3">
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase italic text-white/90 font-display">
              World<br /><span className="text-transparent" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.4)" }}>Orbit</span>
            </h1>
            <p className="text-xs text-white/60 leading-relaxed font-sans max-w-xs mx-auto">
              Scanning the ionosphere for unencrypted signals across sovereign territories. Select a coordinate on the 3D grid or a region to begin extraction.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            <span className="text-[9px] font-mono px-3 py-1 bg-white/5 text-white/60 rounded-none border border-white/10 uppercase tracking-widest font-semibold">
              HLS Protocol
            </span>
            <span className="text-[9px] font-mono px-3 py-1 bg-white/5 text-white/60 rounded-none border border-white/10 uppercase tracking-widest font-semibold">
              Unencrypted
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black rounded-sm border border-white/10 shadow-2xl overflow-hidden aspect-video w-full transition-all duration-300 ${
        isFullscreen ? "rounded-none border-none aspect-auto h-screen" : "max-h-[500px]"
      }`}
    >
      {/* Actual HTML5 Video Tag */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        playsInline
      />

      {/* LOADING STATE - Elegant monochrome bars overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black">
          <div className="absolute inset-0 opacity-5 bg-gradient-to-tr from-white via-orange-500 to-transparent animate-pulse" />
          <div className="flex flex-col items-center gap-4 relative z-10">
            <div className="flex gap-1 justify-center items-center h-8">
              <span className="w-1.5 h-6 bg-white/40 rounded-none animate-[bounce_1s_infinite_100ms]" />
              <span className="w-1.5 h-8 bg-white/60 rounded-none animate-[bounce_1s_infinite_200ms]" />
              <span className="w-1.5 h-10 bg-orange-500 rounded-none animate-[bounce_1s_infinite_300ms]" />
              <span className="w-1.5 h-8 bg-orange-400 rounded-none animate-[bounce_1s_infinite_400ms]" />
              <span className="w-1.5 h-6 bg-white/40 rounded-none animate-[bounce_1s_infinite_500ms]" />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold tracking-widest text-white uppercase">CONNECTING SATELLITE FEED</span>
              <span className="text-[9px] font-mono text-orange-500 mt-1 uppercase tracking-widest font-bold">
                TUNING {channel.name}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ERROR STATE - SMPTE TV Color Bars with noise animation */}
      {streamError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black select-none">
          {/* SVG SMPTE Classic Color Bar Background */}
          <div className="absolute inset-0 flex flex-col w-full h-full">
            {/* Top 75% columns */}
            <div className="flex w-full h-3/4">
              <div className="w-[14.28%] h-full bg-gray-300" />
              <div className="w-[14.28%] h-full bg-yellow-400" />
              <div className="w-[14.28%] h-full bg-cyan-400" />
              <div className="w-[14.28%] h-full bg-emerald-500" />
              <div className="w-[14.28%] h-full bg-magenta-500" />
              <div className="w-[14.28%] h-full bg-red-600" />
              <div className="w-[14.28%] h-full bg-blue-600" />
            </div>
            {/* Bottom 25% bars */}
            <div className="flex w-full h-1/4">
              <div className="w-[14.28%] h-full bg-blue-600" />
              <div className="w-[14.28%] h-full bg-slate-900" />
              <div className="w-[14.28%] h-full bg-magenta-500" />
              <div className="w-[14.28%] h-full bg-slate-900" />
              <div className="w-[14.28%] h-full bg-cyan-400" />
              <div className="w-[14.28%] h-full bg-slate-900" />
              <div className="w-[14.28%] h-full bg-gray-300" />
            </div>
          </div>

          {/* Glitch CRT Filter overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(0,0,0,0.6)_100%)] bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.06),_rgba(0,255,0,0.02),_rgba(0,0,255,0.06))] bg-[length:100%_4px,_6px_100%] pointer-events-none opacity-40" />

          {/* Content Card */}
          <div className="relative z-10 max-w-md mx-6 p-6 bg-black border border-red-600/30 rounded-sm shadow-2xl backdrop-blur-md flex flex-col items-center text-center gap-4">
            <div className="p-3 bg-red-950/80 border border-red-500/20 text-red-500 rounded-sm">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-slate-100 font-sans tracking-widest uppercase">Feed Offline or Blocked</h4>
              <p className="text-xs text-white/60 leading-relaxed max-w-sm font-sans">
                The public broadcast node for <span className="text-orange-500 font-bold">{channel.name}</span> returned an extraction error. This can occur with transient Free-To-Air satellite links.
              </p>
            </div>

            <div className="flex gap-2 w-full pt-1">
              <button 
                onClick={handleRetry}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[10px] font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm uppercase tracking-widest transition-all"
              >
                <RefreshCw size={12} />
                Retry Uplink
              </button>
              
              {channel.streams.length > 1 && (
                <button 
                  onClick={() => {
                    setActiveStreamIndex((activeStreamIndex + 1) % channel.streams.length);
                    setStreamError(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[10px] font-bold text-orange-500 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-sm uppercase tracking-widest transition-all"
                >
                  <Radio size={12} />
                  Alternate Feed
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HUD OVERLAY - Controls and channel parameters */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-black/60 opacity-0 hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4 z-10 pointer-events-none">
        
        {/* Top HUD: Channel Title & Specs */}
        <div className="flex items-start justify-between w-full pointer-events-auto">
          <div className="flex items-center gap-3 bg-black/90 px-3.5 py-2.5 rounded-sm border border-white/10 shadow-lg max-w-[70%]">
            {channel.logo ? (
              <img 
                src={channel.logo} 
                alt={channel.name} 
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-none object-contain bg-black p-1 border border-white/10"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-none bg-orange-950 text-orange-400 border border-orange-900 flex items-center justify-center font-mono text-xs font-semibold uppercase">
                {channel.name.slice(0, 2)}
              </div>
            )}
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold text-white tracking-wider truncate">{channel.name}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {channel.categories && channel.categories.length > 0 && (
                  <span className="text-[9px] font-mono bg-white/10 text-white/80 px-1.5 py-0.5 rounded-none uppercase tracking-widest">
                    {channel.categories[0]}
                  </span>
                )}
                <span className="text-[9px] font-mono text-orange-500 uppercase tracking-widest font-bold">Live FTA</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {channel.website && (
              <a 
                href={channel.website} 
                target="_blank" 
                rel="noreferrer"
                title="Official Broadcast Website"
                className="p-2 bg-black hover:bg-white/10 rounded-sm border border-white/10 text-white/60 hover:text-white shadow-lg transition-all"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>

        {/* Bottom HUD: Live Controls and Player Diagnostics */}
        <div className="w-full flex flex-col gap-2.5 pointer-events-auto">
          {/* Dynamic Progress Indicator (Tuned frequency graphic representation) */}
          <div className="w-full h-[2px] bg-white/10 rounded-none overflow-hidden relative">
            {isPlaying && (
              <div className="h-full bg-orange-500 w-full animate-[pulse_2s_infinite]" />
            )}
          </div>

          {/* Control Bar Layout */}
          <div className="flex items-center justify-between w-full bg-[#0F0F0F] px-4 py-2.5 rounded-sm border border-white/10 shadow-2xl">
            {/* Play/Pause & Volume */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                disabled={isLoading || !!streamError}
                className="p-1.5 text-white/80 hover:text-white rounded-none hover:bg-white/5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>

              <div className="flex items-center gap-2 group/vol">
                <button
                  onClick={toggleMute}
                  className="p-1.5 text-white/80 hover:text-white rounded-none hover:bg-white/5 transition-all cursor-pointer"
                >
                  {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 md:w-20 h-1 bg-white/10 appearance-none cursor-pointer accent-orange-500 group-hover/vol:bg-white/20 transition-all"
                />
              </div>
            </div>

            {/* Diagnostics Overlay (Highly crafted) */}
            <div className="hidden md:flex items-center gap-4 text-[9px] font-mono text-white/40 uppercase tracking-wider">
              <div className="flex flex-col">
                <span className="text-white/20 uppercase text-[8px] tracking-widest font-bold">Engine</span>
                <span className="text-orange-500 font-bold">{diagnostics.engine}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/20 uppercase text-[8px] tracking-widest font-bold">Resolution</span>
                <span className="text-white/80 font-bold">{diagnostics.resolution}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/20 uppercase text-[8px] tracking-widest font-bold">Bitrate</span>
                <span className="text-orange-400 font-bold">{diagnostics.bitrate}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/20 uppercase text-[8px] tracking-widest font-bold">Buffer</span>
                <span className={`${diagnostics.buffered > 3 ? "text-orange-500" : "text-amber-500"} font-bold`}>
                  {diagnostics.buffered}s
                </span>
              </div>
            </div>

            {/* Quality streams and Fullscreen */}
            <div className="flex items-center gap-2">
              {channel.streams.length > 1 && (
                <select
                  value={activeStreamIndex}
                  onChange={(e) => {
                    setActiveStreamIndex(parseInt(e.target.value));
                    setStreamError(null);
                  }}
                  className="text-[9px] font-mono bg-black border border-white/10 text-white/80 px-2 py-1 rounded-none focus:outline-none focus:border-orange-500 uppercase tracking-widest font-bold"
                >
                  {channel.streams.map((s, idx) => (
                    <option key={`opt-stream-${idx}`} value={idx} className="bg-[#0F0F0F]">
                      Feed #{idx + 1} ({s.resolution || "Auto"})
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={toggleFullscreen}
                className="p-1.5 text-white/80 hover:text-white rounded-none hover:bg-white/5 transition-all cursor-pointer"
              >
                {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
