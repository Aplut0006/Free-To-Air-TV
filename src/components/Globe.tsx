import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { getCountryCode } from "../utils/countryMapping";
import { Country } from "../types";
import { Compass, RotateCw, Globe as GlobeIcon, ZoomIn, ZoomOut } from "lucide-react";

interface GlobeProps {
  countries: Country[];
  selectedCountryCode: string | null;
  onSelectCountry: (code: string) => void;
}

export default function Globe({ countries, selectedCountryCode, onSelectCountry }: GlobeProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Globe states
  const [topoData, setTopoData] = useState<any>(null);
  const [rotation, setRotation] = useState<[number, number, number]>([-10, -30, 0]);
  const [scale, setScale] = useState<number>(240);
  const [hoveredCountry, setHoveredCountry] = useState<{
    name: string;
    code: string;
    flag: string;
    channelCount: number;
    x: number;
    y: number;
  } | null>(null);

  // Map of active countries for fast lookup
  const activeCountriesMap = useMemo(() => {
    const map = new Map<string, Country>();
    for (const c of countries) {
      map.set(c.code.toUpperCase(), c);
    }
    return map;
  }, [countries]);

  // Loading geography
  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then((res) => res.json())
      .then((data) => {
        setTopoData(data);
      })
      .catch((err) => console.error("Error loading world atlas TopoJSON:", err));
  }, []);

  // Convert TopoJSON to GeoJSON features
  const worldFeatures = useMemo(() => {
    if (!topoData) return [];
    const geojson = topojson.feature(topoData, topoData.objects.countries) as any;
    return geojson.features;
  }, [topoData]);

  // Handle D3 projection
  const projection = useMemo(() => {
    return d3.geoOrthographic()
      .scale(scale)
      .translate([300, 300])
      .rotate(rotation)
      .clipAngle(90);
  }, [scale, rotation]);

  const pathGenerator = useMemo(() => {
    return d3.geoPath().projection(projection);
  }, [projection]);

  const graticulePath = useMemo(() => {
    return d3.geoGraticule()();
  }, []);

  // Auto-center on selected country
  const isAnimatingRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!selectedCountryCode || worldFeatures.length === 0) return;

    // Find country feature
    const feature = worldFeatures.find((f: any) => {
      const code = getCountryCode(f.id, f.properties.name);
      return code === selectedCountryCode.toUpperCase();
    });

    if (!feature) return;

    // Calculate centroid
    const centroid = d3.geoCentroid(feature);
    if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return;

    const targetRotation: [number, number, number] = [-centroid[0], -centroid[1], 0];
    const startRotation = [...rotation] as [number, number, number];

    // Smoothly interpolate rotation
    const duration = 800; // ms
    const startTime = performance.now();
    isAnimatingRef.current = true;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Cubic ease-out interpolation
      const ease = 1 - Math.pow(1 - progress, 3);

      // Handle longitude wrap-around for shortest path
      let startLon = startRotation[0];
      let targetLon = targetRotation[0];
      let diffLon = targetLon - startLon;
      if (diffLon > 180) targetLon -= 360;
      else if (diffLon < -180) targetLon += 360;

      const currentRotation: [number, number, number] = [
        startRotation[0] + (targetLon - startRotation[0]) * ease,
        startRotation[1] + (targetRotation[1] - startRotation[1]) * ease,
        0
      ];

      setRotation(currentRotation);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        isAnimatingRef.current = false;
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedCountryCode, worldFeatures]);

  // Dragging interaction state
  const dragStartRef = useRef<{ x: number; y: number; rot: [number, number, number] } | null>(null);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault();
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rot: [...rotation]
    };
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      isAnimatingRef.current = false;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement> | MouseEvent) => {
    if (!dragStartRef.current) return;
    
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    
    // Sensitivity factor
    const sensitivity = 0.25;

    let newRX = dragStartRef.current.rot[0] + deltaX * sensitivity;
    let newRY = dragStartRef.current.rot[1] - deltaY * sensitivity;

    // Clamp vertical rotation to avoid flipping upside down
    newRY = Math.max(-85, Math.min(85, newRY));

    setRotation([newRX, newRY, 0]);
  };

  const handleMouseUp = () => {
    dragStartRef.current = null;
  };

  // Bind global window events for dragging to prevent stutter
  useEffect(() => {
    const onGlobalMouseMove = (e: MouseEvent) => {
      if (dragStartRef.current) {
        handleMouseMove(e);
      }
    };

    const onGlobalMouseUp = () => {
      handleMouseUp();
    };

    window.addEventListener("mousemove", onGlobalMouseMove);
    window.addEventListener("mouseup", onGlobalMouseUp);

    return () => {
      window.removeEventListener("mousemove", onGlobalMouseMove);
      window.removeEventListener("mouseup", onGlobalMouseUp);
    };
  }, [rotation]);

  // Reset/Auto-Spin animation
  const handleAutoSpin = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
    const startTime = performance.now();
    const duration = 12000; // Complete spin in 12s

    function spin(now: number) {
      setRotation(prev => [(prev[0] + 0.2) % 360, prev[1], prev[2]]);
      animationFrameRef.current = requestAnimationFrame(spin);
    }
    
    animationFrameRef.current = requestAnimationFrame(spin);
  };

  const handleStopSpin = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  // Zoom controls
  const zoomIn = () => setScale(prev => Math.min(450, prev + 30));
  const zoomOut = () => setScale(prev => Math.max(140, prev - 30));
  const resetGlobe = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setRotation([-10, -30, 0]);
    setScale(240);
  };

  return (
    <div className="relative flex flex-col items-center justify-center bg-black p-4 rounded-sm border border-white/10 shadow-2xl overflow-hidden h-full min-h-[500px]" ref={containerRef}>
      {/* Absolute Header Overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 pointer-events-none">
        <h3 className="text-xs font-bold tracking-[0.2em] text-white/40 uppercase font-mono">3D Explorer Grid</h3>
        <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">DRAG // SPIN // SELECT REGION</p>
      </div>

      {/* Control floating panel */}
      <div className="absolute right-4 top-4 z-10 flex flex-col gap-2 bg-[#0F0F0F] p-2 rounded-none border border-white/10 shadow-lg">
        <button
          onClick={zoomIn}
          title="Zoom In"
          className="p-2 text-white/60 hover:text-orange-500 hover:bg-white/5 transition-all"
        >
          <ZoomIn size={15} />
        </button>
        <button
          onClick={zoomOut}
          title="Zoom Out"
          className="p-2 text-white/60 hover:text-orange-500 hover:bg-white/5 transition-all"
        >
          <ZoomOut size={15} />
        </button>
        <button
          onClick={resetGlobe}
          title="Recenter view"
          className="p-2 text-white/60 hover:text-orange-500 hover:bg-white/5 transition-all"
        >
          <Compass size={15} />
        </button>
        <button
          onClick={handleAutoSpin}
          onDoubleClick={handleStopSpin}
          title="Auto-Rotate (Double click to stop)"
          className="p-2 text-white/60 hover:text-orange-500 hover:bg-white/5 transition-all animate-pulse"
        >
          <RotateCw size={15} />
        </button>
      </div>

      {/* SVG Canvas for Globe */}
      <div className="relative w-full max-w-[600px] aspect-square flex items-center justify-center select-none cursor-grab active:cursor-grabbing">
        {topoData ? (
          <svg
            ref={svgRef}
            width="600"
            height="600"
            viewBox="0 0 600 600"
            className="w-full h-full drop-shadow-[0_0_50px_rgba(255,255,255,0.03)]"
            onMouseDown={handleMouseDown}
          >
            <defs>
              {/* Spherical lighting shadow */}
              <radialGradient id="sphereGrad" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#222222" />
                <stop offset="40%" stopColor="#121212" />
                <stop offset="85%" stopColor="#080808" />
                <stop offset="100%" stopColor="#000000" />
              </radialGradient>

              {/* Atmosphere Glow Overlay - Neon Orange */}
              <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
                <stop offset="90%" stopColor="#f97316" stopOpacity="0" />
                <stop offset="96%" stopColor="#f97316" stopOpacity="0.08" />
                <stop offset="99%" stopColor="#ea580c" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Ocean back circle */}
            <circle cx="300" cy="300" r={scale} fill="url(#sphereGrad)" />

            {/* Coordinate Grid (Graticules) */}
            {graticulePath && (
              <path
                d={pathGenerator(graticulePath as any) || ""}
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="0.5"
              />
            )}

            {/* Outer space boundaries (Sphere edge) */}
            <circle cx="300" cy="300" r={scale} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

            {/* Countries Group */}
            <g>
              {worldFeatures.map((feature: any, index: number) => {
                const code = getCountryCode(feature.id, feature.properties.name);
                const activeCountry = code ? activeCountriesMap.get(code) : null;
                const isActive = !!activeCountry;
                const isSelected = code && selectedCountryCode && code === selectedCountryCode.toUpperCase();

                // Generate path string
                const d = pathGenerator(feature);
                if (!d) return null; // Behind the globe projection

                // Colors based on state
                let fill = "#181818"; // Inactive land (stark dark carbon)
                let stroke = "#090909"; // Land borders (almost black)
                let fillOpacity = "0.75";

                if (isActive) {
                  fill = "#333333"; // Active country (monochrome slate)
                  fillOpacity = isSelected ? "0.95" : "0.8";
                  stroke = "#f97316"; // Bright neon orange borders for active countries
                }

                if (isSelected) {
                  fill = "#f97316"; // Selected country (Neon Orange)
                  stroke = "#ffffff"; // Crisp white border
                }

                return (
                  <path
                    key={`country-${index}-${feature.id}`}
                    d={d}
                    fill={fill}
                    fillOpacity={fillOpacity}
                    stroke={stroke}
                    strokeWidth={isSelected ? "1.5" : isActive ? "0.9" : "0.4"}
                    className={`transition-all duration-200 ${
                      isActive ? "cursor-pointer hover:fill-orange-500 hover:fill-opacity-95" : ""
                    }`}
                    onClick={(e) => {
                      if (isActive && code) {
                        e.stopPropagation();
                        onSelectCountry(code);
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (isActive && code && activeCountry) {
                        // Calculate position relative to container
                        const [x, y] = d3.geoCentroid(feature);
                        const projectedPos = projection([x, y]);
                        if (projectedPos && !isNaN(projectedPos[0]) && !isNaN(projectedPos[1])) {
                          setHoveredCountry({
                            name: activeCountry.name,
                             code: activeCountry.code,
                            flag: activeCountry.flag,
                            channelCount: activeCountry.channelCount,
                            x: projectedPos[0],
                            y: projectedPos[1]
                          });
                        }
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredCountry(null);
                    }}
                  />
                );
              })}
            </g>

            {/* Atmosphere glow overlay */}
            <circle cx="300" cy="300" r={scale} fill="url(#glowGrad)" pointerEvents="none" />
          </svg>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <GlobeIcon className="animate-spin text-orange-500 h-10 w-10" />
            <span className="text-white/40 text-xs font-mono font-bold uppercase tracking-widest">Bootstrapping Cartography...</span>
          </div>
        )}

        {/* Floating Tooltip Component */}
        {hoveredCountry && (
          <div
            className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-4 bg-[#0F0F0F] border border-white/10 text-white rounded-none py-2 px-3 shadow-xl flex items-center gap-3 backdrop-blur-md transition-opacity duration-200"
            style={{
              left: `${(hoveredCountry.x / 600) * 100}%`,
              top: `${(hoveredCountry.y / 600) * 100}%`
            }}
          >
            <div className="text-xl">{hoveredCountry.flag}</div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-white tracking-wider uppercase font-sans">{hoveredCountry.name}</span>
              <span className="text-[9px] font-mono text-orange-500 uppercase tracking-widest font-bold">
                {hoveredCountry.channelCount} Channels Available
              </span>
            </div>
            <div className="w-1.5 h-1.5 bg-[#0F0F0F] rotate-45 border-r border-b border-white/10 absolute -bottom-1 left-1/2 transform -translate-x-1/2"></div>
          </div>
        )}
      </div>
    </div>
  );
}
