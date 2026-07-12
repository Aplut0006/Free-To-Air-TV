import * as d3 from "d3";
import * as topojson from "topojson-client";
import Hls from "hls.js";
import { getCountryCode } from "./utils/countryMapping";
import { Country, Channel, BackendStatus } from "./types";

// ==========================================
// 1. APP STATE
// ==========================================
interface AppState {
  countries: Country[];
  featuredChannels: Channel[];
  selectedCountryCode: string | null;
  selectedChannel: Channel | null;
  countryChannels: Channel[];
  loadingCountries: boolean;
  loadingChannels: boolean;
  backendStatus: BackendStatus | null;
  activeTab: "countries" | "featured" | "search";
  
  // Globe states
  rotation: [number, number, number];
  scale: number;
  isAutoSpinning: boolean;
  
  // Queries
  countriesSearchQuery: string;
  globalSearchQuery: string;
  localSearchQuery: string;
  localSelectedCategory: string;

  // Global search results
  globalSearchResults: Channel[];
  globalSearchLoading: boolean;

  // Video state
  playerPlaying: boolean;
  playerVolume: number;
  playerMuted: boolean;
  playerFullscreen: boolean;
  playerActiveStreamIndex: number;
  playerError: string | null;
  playerLoading: boolean;
  playerDiagnostics: {
    engine: string;
    resolution: string;
    bitrate: string;
    buffered: number;
  };
}

const state: AppState = {
  countries: [],
  featuredChannels: [],
  selectedCountryCode: null,
  selectedChannel: null,
  countryChannels: [],
  loadingCountries: true,
  loadingChannels: false,
  backendStatus: null,
  activeTab: "countries",

  rotation: [-10, -30, 0],
  scale: 240,
  isAutoSpinning: true,

  countriesSearchQuery: "",
  globalSearchQuery: "",
  localSearchQuery: "",
  localSelectedCategory: "All",

  globalSearchResults: [],
  globalSearchLoading: false,

  playerPlaying: false,
  playerVolume: 0.8,
  playerMuted: false,
  playerFullscreen: false,
  playerActiveStreamIndex: 0,
  playerError: null,
  playerLoading: false,
  playerDiagnostics: {
    engine: "None",
    resolution: "Unknown",
    bitrate: "0 kbps",
    buffered: 0,
  }
};

// ==========================================
// 2. VECTOR ICONS (Lucide SVGs)
// ==========================================
const ICONS = {
  tv: `<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><path d="m17 2-5 5-5-5"/></svg>`,
  globe: `<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
  sparkles: `<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/><path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5Z"/><path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z"/></svg>`,
  search: `<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  activity: `<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  compass: `<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
  rotateCw: `<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><polyline points="16 3 21 3 21 8"/></svg>`,
  zoomIn: `<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>`,
  zoomOut: `<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/></svg>`,
  arrowLeft: `<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`,
  play: `<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
  pause: `<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg>`,
  volume2: `<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4.702a.7.7 0 0 0-1.203-.497L5.387 8.5H3a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h2.387l4.41 4.295c.387.376 1.013.1 1.013-.442V4.702Z"/><path d="M15 9a5 5 0 0 1 0 6"/><path d="M19.071 4.929a10 10 0 0 1 0 14.142"/></svg>`,
  volumeX: `<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4.702a.7.7 0 0 0-1.203-.497L5.387 8.5H3a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h2.387l4.41 4.295c.387.376 1.013.1 1.013-.442V4.702Z"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/></svg>`,
  maximize: `<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 3 6 3-3 6"/><path d="M9 21 3 18l3-6"/><path d="M21 6v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  minimize: `<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6"/><path d="M20 10h-6V4"/><path d="M14 10l7-7"/><path d="M10 14l-7 7"/></svg>`,
  alertTriangle: `<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`,
  externalLink: `<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`,
  refreshCw: `<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>`,
  radio: `<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M7.76 16.24a6 6 0 0 1 0-8.49"/><path d="M4.93 19.07a10 10 0 0 1 0-14.14"/></svg>`,
  mapPin: `<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  info: `<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`
};

function injectIcons() {
  const mappings = [
    { id: "header-tv-icon", icon: ICONS.tv, cls: "h-4 w-4" },
    { id: "header-activity-icon", icon: ICONS.activity, cls: "h-3.5 w-3.5 text-orange-500" },
    { id: "tab-countries-icon", icon: ICONS.globe, cls: "h-3 w-3" },
    { id: "tab-featured-icon", icon: ICONS.sparkles, cls: "h-3 w-3" },
    { id: "tab-search-icon", icon: ICONS.search, cls: "h-3 w-3" },
    { id: "icon-zoom-in", icon: ICONS.zoomIn, cls: "h-4 w-4" },
    { id: "icon-zoom-out", icon: ICONS.zoomOut, cls: "h-4 w-4" },
    { id: "icon-reset", icon: ICONS.compass, cls: "h-4 w-4" },
    { id: "icon-spin", icon: ICONS.rotateCw, cls: "h-4 w-4" },
    { id: "icon-channels-back", icon: ICONS.arrowLeft, cls: "h-3.5 w-3.5" },
    { id: "search-countries-icon", icon: ICONS.search, cls: "h-4 w-4" },
    { id: "search-global-icon", icon: ICONS.search, cls: "h-4 w-4" },
    { id: "search-local-channels-icon", icon: ICONS.search, cls: "h-4 w-4" },
    { id: "db-sync-loader-icon", icon: ICONS.refreshCw, cls: "h-3.5 w-3.5" },
    { id: "db-sync-warning-icon", icon: ICONS.alertTriangle, cls: "h-4 w-4" },
    { id: "footer-radio-icon", icon: ICONS.radio, cls: "h-3 w-3 text-orange-500 mr-1" },
    { id: "hot-feeds-sparkle-icon", icon: ICONS.sparkles, cls: "h-3.5 w-3.5" },
    { id: "global-search-loader", icon: ICONS.refreshCw, cls: "h-3.5 w-3.5 animate-spin" }
  ];

  for (const map of mappings) {
    const el = document.getElementById(map.id);
    if (el) {
      el.innerHTML = map.icon;
      // Add sizing classes to the newly injected svg
      const svg = el.querySelector("svg");
      if (svg) {
        svg.setAttribute("class", map.cls);
      }
    }
  }
}

// ==========================================
// 3. D3 GLOBE IMPLEMENTATION
// ==========================================
const svg = d3.select("#globe-svg");
let topoData: any = null;
let worldFeatures: any[] = [];
let isDraggingGlobe = false;
let isCenteringAnimationActive = false;
let centeringAnimationFrame: number | null = null;

const projection = d3.geoOrthographic()
  .scale(state.scale)
  .translate([300, 300])
  .rotate(state.rotation)
  .clipAngle(90);

const pathGenerator = d3.geoPath().projection(projection);
const graticule = d3.geoGraticule()();

function drawGlobe() {
  if (!topoData || worldFeatures.length === 0) return;

  projection.scale(state.scale).rotate(state.rotation);
  svg.selectAll("*").remove();

  const defs = svg.append("defs");
  
  // Radial sphere shading for elegant 3D volume
  const sphereGrad = defs.append("radialGradient")
    .attr("id", "sphere-grad")
    .attr("cx", "35%")
    .attr("cy", "35%")
    .attr("r", "65%");
  sphereGrad.append("stop").attr("offset", "0%").attr("stop-color", "#1F1F1F");
  sphereGrad.append("stop").attr("offset", "70%").attr("stop-color", "#0A0A0A");
  sphereGrad.append("stop").attr("offset", "100%").attr("stop-color", "#040404");

  // Globe outer atmospheric corona glow
  const atmosphereGlow = defs.append("filter")
    .attr("id", "atmos-glow")
    .attr("x", "-20%")
    .attr("y", "-20%")
    .attr("width", "140%")
    .attr("height", "140%");
  atmosphereGlow.append("feGaussianBlur")
    .attr("stdDeviation", "15")
    .attr("result", "blur");

  // Sphere body
  svg.append("circle")
    .attr("cx", 300)
    .attr("cy", 300)
    .attr("r", state.scale)
    .attr("fill", "url(#sphere-grad)")
    .attr("stroke", "rgba(255, 255, 255, 0.08)")
    .attr("stroke-width", 1);

  // Grid Graticules
  svg.append("path")
    .datum(graticule)
    .attr("d", pathGenerator)
    .attr("fill", "none")
    .attr("stroke", "rgba(255, 255, 255, 0.04)")
    .attr("stroke-width", 0.5);

  const activeSet = new Set(state.countries.map(c => c.code.toUpperCase()));

  // Render landmasses
  svg.append("g")
    .selectAll("path")
    .data(worldFeatures)
    .enter()
    .append("path")
    .attr("d", pathGenerator)
    .attr("fill", (d: any) => {
      const code = getCountryCode(d.id, d.properties.name);
      if (code) {
        if (state.selectedCountryCode && code === state.selectedCountryCode.toUpperCase()) {
          return "rgba(249, 115, 22, 0.35)"; // Highlighted active
        }
        if (activeSet.has(code)) {
          return "rgba(255, 255, 255, 0.09)"; // Feed available
        }
      }
      return "rgba(255, 255, 255, 0.02)"; // Empty territory
    })
    .attr("stroke", (d: any) => {
      const code = getCountryCode(d.id, d.properties.name);
      if (code) {
        if (state.selectedCountryCode && code === state.selectedCountryCode.toUpperCase()) {
          return "#F97316";
        }
        if (activeSet.has(code)) {
          return "rgba(255, 255, 255, 0.18)";
        }
      }
      return "rgba(255, 255, 255, 0.04)";
    })
    .attr("stroke-width", (d: any) => {
      const code = getCountryCode(d.id, d.properties.name);
      if (state.selectedCountryCode && code === state.selectedCountryCode.toUpperCase()) {
        return 1.5;
      }
      return 0.5;
    })
    .style("cursor", (d: any) => {
      const code = getCountryCode(d.id, d.properties.name);
      return (code && activeSet.has(code)) ? "pointer" : "default";
    })
    .on("mouseover", function(event, d: any) {
      const code = getCountryCode(d.id, d.properties.name);
      if (!code) return;

      const activeCountry = state.countries.find(c => c.code.toUpperCase() === code);
      if (!activeCountry) return;

      // Soft glow on hover
      d3.select(this)
        .transition()
        .duration(120)
        .attr("fill", (state.selectedCountryCode && code === state.selectedCountryCode.toUpperCase()) ? "rgba(249, 115, 22, 0.5)" : "rgba(249, 115, 22, 0.25)")
        .attr("stroke", "#F97316");

      // Set tooltip text and display
      const tooltip = document.getElementById("globe-tooltip");
      if (tooltip) {
        document.getElementById("tooltip-flag")!.textContent = activeCountry.flag || "🌐";
        document.getElementById("tooltip-name")!.textContent = activeCountry.name;
        document.getElementById("tooltip-channels")!.textContent = `${activeCountry.channelCount} Live Feeds`;
        tooltip.classList.remove("hidden");
        tooltip.classList.add("flex");
        
        const [mx, my] = d3.pointer(event, document.getElementById("globe-component-container"));
        tooltip.style.left = `${mx}px`;
        tooltip.style.top = `${my}px`;
      }
    })
    .on("mousemove", function(event) {
      const tooltip = document.getElementById("globe-tooltip");
      if (tooltip && tooltip.classList.contains("flex")) {
        const [mx, my] = d3.pointer(event, document.getElementById("globe-component-container"));
        tooltip.style.left = `${mx}px`;
        tooltip.style.top = `${my}px`;
      }
    })
    .on("mouseout", function(event, d: any) {
      const code = getCountryCode(d.id, d.properties.name);
      const isSelected = state.selectedCountryCode && code === state.selectedCountryCode.toUpperCase();
      
      d3.select(this)
        .transition()
        .duration(120)
        .attr("fill", isSelected ? "rgba(249, 115, 22, 0.35)" : (code && activeSet.has(code) ? "rgba(255, 255, 255, 0.09)" : "rgba(255, 255, 255, 0.02)"))
        .attr("stroke", isSelected ? "#F97316" : (code && activeSet.has(code) ? "rgba(255, 255, 255, 0.18)" : "rgba(255, 255, 255, 0.04)"))
        .attr("stroke-width", isSelected ? 1.5 : 0.5);

      const tooltip = document.getElementById("globe-tooltip");
      if (tooltip) {
        tooltip.classList.remove("flex");
        tooltip.classList.add("hidden");
      }
    })
    .on("click", function(event, d: any) {
      const code = getCountryCode(d.id, d.properties.name);
      if (code && activeSet.has(code)) {
        selectCountry(code);
      }
    });
}

// Centering & Rotational easing logic
function centerOnCountry(countryCode: string) {
  if (worldFeatures.length === 0) return;

  const feature = worldFeatures.find((f: any) => {
    const code = getCountryCode(f.id, f.properties.name);
    return code === countryCode.toUpperCase();
  });

  if (!feature) return;

  const centroid = d3.geoCentroid(feature);
  if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return;

  const targetRotation: [number, number, number] = [-centroid[0], -centroid[1], 0];
  const startRotation = [...state.rotation] as [number, number, number];

  const duration = 800;
  const startTime = performance.now();
  isCenteringAnimationActive = true;

  if (centeringAnimationFrame) {
    cancelAnimationFrame(centeringAnimationFrame);
  }

  function animate(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // cubic ease out

    let startLon = startRotation[0];
    let targetLon = targetRotation[0];
    let diffLon = targetLon - startLon;
    
    // Shortest rotational path wrap check
    if (diffLon > 180) targetLon -= 360;
    else if (diffLon < -180) targetLon += 360;

    state.rotation = [
      startLon + (targetLon - startLon) * ease,
      startRotation[1] + (targetRotation[1] - startRotation[1]) * ease,
      0
    ];

    drawGlobe();

    if (progress < 1) {
      centeringAnimationFrame = requestAnimationFrame(animate);
    } else {
      isCenteringAnimationActive = false;
    }
  }

  centeringAnimationFrame = requestAnimationFrame(animate);
}

// Drag Behavior setup
const dragBehavior = d3.drag<SVGSVGElement, unknown>()
  .on("start", () => {
    isDraggingGlobe = true;
  })
  .on("drag", (event) => {
    const k = 75 / state.scale;
    state.rotation[0] += event.dx * k;
    state.rotation[1] -= event.dy * k;
    state.rotation[1] = Math.max(-85, Math.min(85, state.rotation[1])); // prevent overflow
    drawGlobe();
  })
  .on("end", () => {
    isDraggingGlobe = false;
  });

d3.select("#globe-svg").call(dragBehavior as any);

// Auto spin background timer
let lastSpinTime = performance.now();
function spinLoop(now: number) {
  if (state.isAutoSpinning && !isDraggingGlobe && !isCenteringAnimationActive) {
    const delta = now - lastSpinTime;
    state.rotation[0] += delta * 0.007; // spin increment
    if (state.rotation[0] > 180) state.rotation[0] -= 360;
    drawGlobe();
  }
  lastSpinTime = now;
  requestAnimationFrame(spinLoop);
}

// Load geography features
function loadMapGeography() {
  fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
    .then((res) => res.json())
    .then((data) => {
      topoData = data;
      worldFeatures = (topojson.feature(data, data.objects.countries) as any).features;
      
      const loader = document.getElementById("globe-loader");
      if (loader) loader.classList.add("hidden");
      
      drawGlobe();
      requestAnimationFrame(spinLoop);
    })
    .catch((err) => {
      console.error("Cartography indexing failure:", err);
    });
}

// ==========================================
// 4. VIDEO STREAM ENGINE (HLS.js)
// ==========================================
let hlsInstance: Hls | null = null;
let bufferTrackingInterval: any = null;

function renderVideoPlayer() {
  const container = document.getElementById("video-player-container");
  if (!container) return;

  const ch = state.selectedChannel;

  if (!ch) {
    // Blank landing screen
    container.innerHTML = `
      <div class="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10 select-none">
        <!-- Scanlines noise mimicry -->
        <div class="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none opacity-40"></div>
        <div class="scanline-effect absolute inset-0 bg-gradient-to-b from-white/3 to-transparent h-12 w-full pointer-events-none"></div>

        <div class="w-16 h-16 bg-[#121212] border border-white/10 rounded-sm flex items-center justify-center shadow-lg mb-6 text-white/30">
          ${ICONS.tv}
        </div>

        <div class="text-[10px] tracking-[0.4em] font-mono text-orange-500 uppercase font-black">SYSTEM // COLD STANDBY</div>
        <h2 class="text-sm font-black uppercase tracking-widest text-white mt-2 mb-1.5 font-sans">
          Select Frequency To Extract Live Feed
        </h2>
        <p class="text-xs text-white/40 max-w-sm font-sans">
          Tuning live satellite streams from terrestrial nodes. Click any unencrypted territory marker on the 3D grid or scan popular transponders.
        </p>

        <div class="mt-6 flex items-center gap-5 font-mono text-[9px] text-white/35 uppercase tracking-widest border border-white/5 bg-white/2 px-4 py-1.5 rounded-sm">
          <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse mr-0.5"></span> Feed: No Signal</span>
          <span>Buffer: NULL</span>
          <span>Engine: Standby</span>
        </div>
      </div>
    `;
    return;
  }

  const activeStream = ch.streams[state.playerActiveStreamIndex];

  container.innerHTML = `
    <!-- Top overlay bar -->
    <div class="absolute top-0 inset-x-0 z-20 bg-gradient-to-b from-black/90 via-black/60 to-transparent p-4 flex items-center justify-between pointer-events-auto">
      <div class="flex items-center gap-3 min-w-0">
        <span class="text-2xl filter saturate-100 shrink-0">
          ${ch.country ? getCountryFlag(ch.country) : "🌐"}
        </span>
        <div class="flex flex-col min-w-0">
          <span class="text-xs font-bold text-white tracking-wide truncate">${ch.name}</span>
          <span class="text-[9px] font-mono text-orange-400 uppercase tracking-widest font-bold mt-0.5">
            Node Frequency Live // Feed ${state.playerActiveStreamIndex + 1} of ${ch.streams.length}
          </span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        ${ch.website ? `
          <a href="${ch.website}" target="_blank" rel="noreferrer" class="p-2 text-white/40 hover:text-white hover:bg-white/5 transition-all" title="Visit Channel Website">
            ${ICONS.externalLink}
          </a>
        ` : ""}
        <button id="btn-player-close" class="p-2 text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer" title="Disconnect Feed">
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>

    <!-- MAIN HTML VIDEO ELEMENT -->
    <video id="hls-video" class="w-full h-full object-contain bg-[#050505]"></video>

    <!-- LOADING SPINNER OVERLAY -->
    <div id="player-loading-overlay" class="${state.playerLoading ? "flex" : "hidden"} absolute inset-0 z-15 bg-[#0A0A0A]/90 flex-col items-center justify-center text-center gap-4">
      <div class="flex flex-col items-center gap-3">
        <!-- Monochromatic bouncing visualizer bars as a premium loader -->
        <div class="flex items-end gap-1 h-6 w-8">
          <div class="bg-orange-500 w-1 h-full animate-bounce [animation-delay:0.1s]"></div>
          <div class="bg-orange-500 w-1 h-2/3 animate-bounce [animation-delay:0.3s]"></div>
          <div class="bg-orange-500 w-1 h-full animate-bounce [animation-delay:0.2s]"></div>
          <div class="bg-orange-500 w-1 h-1/2 animate-bounce [animation-delay:0.4s]"></div>
        </div>
        <span class="text-[10px] font-mono text-orange-500 uppercase tracking-widest font-black animate-pulse mt-2">CALIBRATING RECEIVER COIL...</span>
      </div>
    </div>

    <!-- ERROR STATE OVERLAY -->
    <div id="player-error-overlay" class="${state.playerError ? "flex" : "hidden"} absolute inset-0 z-15 bg-[#0C0C0C] p-6 flex-col items-center justify-center text-center gap-4">
      <div class="w-12 h-12 rounded-none bg-red-950/20 border border-red-500/30 flex items-center justify-center text-red-500 mb-2">
        ${ICONS.alertTriangle}
      </div>
      <span class="text-xs font-bold text-red-400 uppercase tracking-widest">FEED EXTRACTION TERMINATED</span>
      <p class="text-[11px] text-white/50 max-w-sm leading-relaxed">${state.playerError || ""}</p>
      
      <div class="flex gap-3 mt-2">
        <button id="btn-player-retry" class="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:border-white/30 text-white/80 hover:text-white text-[10px] font-mono uppercase tracking-widest transition-all cursor-pointer">
          ${ICONS.refreshCw} Re-Calibrate
        </button>
        ${ch.streams.length > 1 ? `
          <button id="btn-player-next-stream" class="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 hover:border-orange-500/80 text-orange-400 hover:text-orange-300 text-[10px] font-mono uppercase tracking-widest transition-all cursor-pointer">
            Next Stream Feed
          </button>
        ` : ""}
      </div>
    </div>

    <!-- Bottom Controls HUD Bar -->
    <div class="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/95 via-black/80 to-transparent px-4 py-4 pt-10 flex flex-col gap-3 pointer-events-auto opacity-0 hover:opacity-100 transition-opacity duration-300">
      <div class="flex items-center justify-between gap-4">
        <!-- Left: Play/Pause, volume slider -->
        <div class="flex items-center gap-4">
          <button id="btn-play-toggle" class="p-2 text-white hover:text-orange-500 transition-all cursor-pointer">
            <span id="player-play-icon"></span>
          </button>
          
          <div class="flex items-center gap-2 group/vol">
            <button id="btn-mute-toggle" class="p-2 text-white/60 hover:text-white transition-all cursor-pointer">
              <span id="player-volume-icon"></span>
            </button>
            <input id="slider-volume" type="range" min="0" max="1" step="0.05" value="${state.playerVolume}" class="w-16 md:w-20 accent-orange-500 bg-white/10 hover:bg-white/20 h-1 rounded-sm cursor-pointer transition-all" />
          </div>
        </div>

        <!-- Right: stream index selection, full-screen toggle -->
        <div class="flex items-center gap-3.5">
          <!-- Feed multi-source select node -->
          ${ch.streams.length > 1 ? `
            <select id="select-active-stream" class="bg-black/80 border border-white/10 hover:border-white/20 text-white/80 hover:text-white text-[9px] font-mono uppercase tracking-wider px-2 py-1 rounded-none outline-none cursor-pointer">
              ${ch.streams.map((s, idx) => `
                <option value="${idx}" ${idx === state.playerActiveStreamIndex ? "selected" : ""}>FEED ${idx + 1} (${s.resolution || "AUTO"})</option>
              `).join("")}
            </select>
          ` : ""}

          <button id="btn-fullscreen-toggle" class="p-2 text-white/60 hover:text-white transition-all cursor-pointer" title="Fullscreen Mode">
            <span id="player-fullscreen-icon"></span>
          </button>
        </div>
      </div>

      <!-- Live Diagnostics Sub-HUD Panel -->
      <div class="grid grid-cols-4 border-t border-white/10 pt-2.5 text-[9px] font-mono text-white/40 uppercase tracking-widest font-bold">
        <div class="flex flex-col gap-0.5">
          <span class="text-white/25">Receiver Engine</span>
          <span id="diag-engine" class="text-white/90 font-semibold truncate">None</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-white/25">Resolution</span>
          <span id="diag-resolution" class="text-white/90 font-semibold">Unknown</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-white/25">Bitrate Info</span>
          <span id="diag-bitrate" class="text-white/90 font-semibold">0 kbps</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-white/25">Coil Buffer</span>
          <span id="diag-buffered" class="text-white/90 font-semibold">0s</span>
        </div>
      </div>
    </div>
  `;

  // Apply sizing to inner icons inside top bar / controllers
  const retryBtnIcon = container.querySelector("#btn-player-retry svg");
  if (retryBtnIcon) retryBtnIcon.setAttribute("class", "h-3.5 w-3.5 mr-1 animate-spin");

  // Wire events
  document.getElementById("btn-player-close")?.addEventListener("click", () => {
    state.selectedChannel = null;
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    if (bufferTrackingInterval) clearInterval(bufferTrackingInterval);
    renderVideoPlayer();
  });

  document.getElementById("btn-play-toggle")?.addEventListener("click", togglePlay);
  document.getElementById("btn-mute-toggle")?.addEventListener("click", toggleMute);
  
  const volSlider = document.getElementById("slider-volume");
  volSlider?.addEventListener("input", handleVolumeSliderInput);

  document.getElementById("btn-fullscreen-toggle")?.addEventListener("click", toggleFullscreen);

  document.getElementById("btn-player-retry")?.addEventListener("click", () => {
    initializeHlsStream(state.selectedChannel, state.playerActiveStreamIndex);
  });

  document.getElementById("btn-player-next-stream")?.addEventListener("click", () => {
    const nextIdx = (state.playerActiveStreamIndex + 1) % ch.streams.length;
    initializeHlsStream(state.selectedChannel, nextIdx);
  });

  const streamSelector = document.getElementById("select-active-stream");
  streamSelector?.addEventListener("change", (e) => {
    const idx = parseInt((e.target as HTMLSelectElement).value);
    initializeHlsStream(state.selectedChannel, idx);
  });

  // Load HLS and start diagnostics
  initializeHlsStream(ch, state.playerActiveStreamIndex);
}

function initializeHlsStream(channel: Channel, streamIndex: number) {
  const video = document.getElementById("hls-video") as HTMLVideoElement;
  if (!video) return;

  if (bufferTrackingInterval) {
    clearInterval(bufferTrackingInterval);
    bufferTrackingInterval = null;
  }

  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }

  const stream = channel.streams[streamIndex];
  if (!stream) return;

  state.playerLoading = true;
  state.playerError = null;
  state.playerPlaying = false;
  state.playerActiveStreamIndex = streamIndex;
  state.playerDiagnostics = {
    engine: "None",
    resolution: stream.resolution || "Auto",
    bitrate: "Calibrating...",
    buffered: 0
  };

  // Toggle overlays visibility
  const loadingOverlay = document.getElementById("player-loading-overlay");
  const errorOverlay = document.getElementById("player-error-overlay");
  if (loadingOverlay) loadingOverlay.classList.replace("hidden", "flex");
  if (errorOverlay) errorOverlay.classList.replace("flex", "hidden");

  updatePlayPauseButtonUI();
  updateVolumeButtonUI();
  updatePlayerDiagnosticsUI();

  const streamUrl = stream.url;

  if (Hls.isSupported()) {
    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 90,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
    });

    hlsInstance = hls;
    hls.loadSource(streamUrl);
    hls.attachMedia(video);

    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      state.playerDiagnostics.engine = "HLS.js Engine";
      updatePlayerDiagnosticsUI();
    });

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      state.playerLoading = false;
      if (loadingOverlay) loadingOverlay.classList.replace("flex", "hidden");
      
      video.muted = state.playerMuted;
      video.volume = state.playerVolume;

      video.play()
        .then(() => {
          state.playerPlaying = true;
          updatePlayPauseButtonUI();
        })
        .catch((err) => {
          console.warn("Receiver block - autoplay locked:", err);
          state.playerPlaying = false;
          updatePlayPauseButtonUI();
        });
    });

    hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
      const levelInfo = hls.levels[hls.currentLevel];
      const resStr = levelInfo 
        ? `${levelInfo.width}x${levelInfo.height}` 
        : `${stream.width || "?"}x${stream.height || "?"}`;
      
      const estBitrate = levelInfo 
        ? `${Math.round(levelInfo.bitrate / 1000)} kbps` 
        : "Auto";

      state.playerDiagnostics.resolution = resStr;
      state.playerDiagnostics.bitrate = estBitrate;
      updatePlayerDiagnosticsUI();
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        console.warn("HLS dynamic stream anomaly:", data.type);
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            break;
          default:
            state.playerError = "This feed stream is currently offline or blocks external embedding hosts.";
            state.playerLoading = false;
            if (loadingOverlay) loadingOverlay.classList.replace("flex", "hidden");
            showPlayerErrorOverlay();
            break;
        }
      }
    });
  } 
  // Safari Native player logic
  else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = streamUrl;
    state.playerDiagnostics.engine = "Native Browser Core";
    updatePlayerDiagnosticsUI();

    const handleNativeLoad = () => {
      state.playerLoading = false;
      if (loadingOverlay) loadingOverlay.classList.replace("flex", "hidden");
      
      video.muted = state.playerMuted;
      video.volume = state.playerVolume;

      video.play()
        .then(() => {
          state.playerPlaying = true;
          updatePlayPauseButtonUI();
        })
        .catch(() => {
          state.playerPlaying = false;
          updatePlayPauseButtonUI();
        });
    };

    const handleNativeError = () => {
      state.playerError = "This feed stream is currently offline or blocks external embedding hosts.";
      state.playerLoading = false;
      if (loadingOverlay) loadingOverlay.classList.replace("flex", "hidden");
      showPlayerErrorOverlay();
    };

    video.addEventListener("loadedmetadata", handleNativeLoad);
    video.addEventListener("error", handleNativeError);
  } else {
    state.playerError = "Your terminal platform does not support HLS feeds. Try Chrome, Safari, or Firefox.";
    state.playerLoading = false;
    if (loadingOverlay) loadingOverlay.classList.replace("flex", "hidden");
    showPlayerErrorOverlay();
  }

  // Active buffer tracking interval
  bufferTrackingInterval = setInterval(() => {
    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const duration = video.currentTime;
      state.playerDiagnostics.buffered = Math.max(0, parseFloat((bufferedEnd - duration).toFixed(1)));
      updatePlayerDiagnosticsUI();
    }
  }, 1000);
}

function showPlayerErrorOverlay() {
  const overlay = document.getElementById("player-error-overlay");
  if (!overlay) return;
  
  overlay.querySelector("p")!.textContent = state.playerError || "Unknown connection fault.";
  overlay.classList.replace("hidden", "flex");
}

function togglePlay() {
  const video = document.getElementById("hls-video") as HTMLVideoElement;
  if (!video) return;

  if (state.playerPlaying) {
    video.pause();
    state.playerPlaying = false;
  } else {
    video.play()
      .then(() => {
        state.playerPlaying = true;
      })
      .catch(() => {
        state.playerPlaying = false;
      });
  }
  updatePlayPauseButtonUI();
}

function toggleMute() {
  const video = document.getElementById("hls-video") as HTMLVideoElement;
  if (!video) return;

  state.playerMuted = !state.playerMuted;
  video.muted = state.playerMuted;
  updateVolumeButtonUI();
}

function handleVolumeSliderInput(e: Event) {
  const video = document.getElementById("hls-video") as HTMLVideoElement;
  const value = parseFloat((e.target as HTMLInputElement).value);
  state.playerVolume = value;
  
  if (video) {
    video.volume = value;
    state.playerMuted = value === 0;
    video.muted = state.playerMuted;
  }
  updateVolumeButtonUI();
}

function toggleFullscreen() {
  const container = document.getElementById("video-player-container");
  if (!container) return;

  if (!document.fullscreenElement) {
    container.requestFullscreen()
      .then(() => {
        state.playerFullscreen = true;
        updateFullscreenButtonUI();
      })
      .catch((err) => console.error("Fullscreen lock failure:", err));
  } else {
    document.exitFullscreen()
      .then(() => {
        state.playerFullscreen = false;
        updateFullscreenButtonUI();
      });
  }
}

// Fullscreen escape monitoring
document.addEventListener("fullscreenchange", () => {
  state.playerFullscreen = !!document.fullscreenElement;
  updateFullscreenButtonUI();
});

// SUB HUD RENDERERS
function updatePlayerHUD() {
  updatePlayPauseButtonUI();
  updateVolumeButtonUI();
  updateFullscreenButtonUI();
  updatePlayerDiagnosticsUI();
}

function updatePlayPauseButtonUI() {
  const btn = document.getElementById("player-play-icon");
  if (btn) {
    btn.innerHTML = state.playerPlaying ? ICONS.pause : ICONS.play;
    const svg = btn.querySelector("svg");
    if (svg) svg.setAttribute("class", "h-4 w-4");
  }
}

function updateVolumeButtonUI() {
  const btn = document.getElementById("player-volume-icon");
  if (btn) {
    btn.innerHTML = state.playerMuted ? ICONS.volumeX : ICONS.volume2;
    const svg = btn.querySelector("svg");
    if (svg) svg.setAttribute("class", "h-4 w-4 text-white/70");
  }

  const slider = document.getElementById("slider-volume") as HTMLInputElement;
  if (slider) {
    slider.value = state.playerMuted ? "0" : state.playerVolume.toString();
  }
}

function updateFullscreenButtonUI() {
  const btn = document.getElementById("player-fullscreen-icon");
  if (btn) {
    btn.innerHTML = state.playerFullscreen ? ICONS.minimize : ICONS.maximize;
    const svg = btn.querySelector("svg");
    if (svg) svg.setAttribute("class", "h-4 w-4 text-white/70");
  }
}

function updatePlayerDiagnosticsUI() {
  const diagEngine = document.getElementById("diag-engine");
  const diagRes = document.getElementById("diag-resolution");
  const diagBitrate = document.getElementById("diag-bitrate");
  const diagBuf = document.getElementById("diag-buffered");

  if (diagEngine) diagEngine.textContent = state.playerDiagnostics.engine;
  if (diagRes) diagRes.textContent = state.playerDiagnostics.resolution;
  if (diagBitrate) diagBitrate.textContent = state.playerDiagnostics.bitrate;
  if (diagBuf) diagBuf.textContent = `${state.playerDiagnostics.buffered}s`;
}

// ==========================================
// 5. SIDEBAR CONTROLS & SELECTION CARDS
// ==========================================
function setSidebarTab(tab: "countries" | "featured" | "search") {
  state.activeTab = tab;

  // Toggle active tab visual classes
  const tabBtnIds = {
    countries: "tab-countries-btn",
    featured: "tab-featured-btn",
    search: "tab-search-btn"
  };

  const panels = {
    countries: "panel-countries",
    featured: "panel-featured",
    search: "panel-search"
  };

  for (const [key, id] of Object.entries(tabBtnIds)) {
    const btn = document.getElementById(id);
    if (btn) {
      if (key === tab) {
        btn.className = "flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-none uppercase tracking-widest bg-[#1C1C1C] border border-white/10 text-orange-500 cursor-pointer";
      } else {
        btn.className = "flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-none uppercase tracking-widest text-white/40 hover:text-white/80 cursor-pointer";
      }
    }
  }

  // Toggle panels
  for (const [key, pId] of Object.entries(panels)) {
    const panel = document.getElementById(pId);
    if (panel) {
      if (key === tab) {
        panel.classList.remove("hidden");
      } else {
        panel.classList.add("hidden");
      }
    }
  }

  // If opening scan all, execute search once if query is present
  if (tab === "search" && state.globalSearchQuery) {
    executeGlobalSearch();
  }
}

function selectCountry(countryCode: string) {
  state.selectedCountryCode = countryCode.toUpperCase();
  state.localSearchQuery = "";
  state.localSelectedCategory = "All";

  // Center the globe smoothly on this centroid
  centerOnCountry(countryCode);

  // Load local channels
  state.loadingChannels = true;
  renderChannelListPanel();

  // Hide the standard tab list and show local channels panel
  document.getElementById("sidebar-tabs-nav")?.classList.add("hidden");
  document.getElementById("panel-countries")?.classList.add("hidden");
  document.getElementById("panel-featured")?.classList.add("hidden");
  document.getElementById("panel-search")?.classList.add("hidden");
  document.getElementById("panel-channels")?.classList.remove("hidden");

  fetch(`/api/countries/${countryCode}/channels`)
    .then((res) => res.json())
    .then((data: Channel[]) => {
      state.countryChannels = data;
      state.loadingChannels = false;
      renderChannelListPanel();

      // Trigger autoplay of the first active channel inside this territory
      if (data.length > 0) {
        playChannel(data[0]);
      }
    })
    .catch((err) => {
      console.error("Local transponder query failed:", err);
      state.loadingChannels = false;
      renderChannelListPanel();
    });

  // Redraw globe to highlight this selection
  drawGlobe();

  // Update Hud card
  updateHUDCard();
}

function backToGlobalExplorer() {
  state.selectedCountryCode = null;
  state.countryChannels = [];
  
  // Show standard tabs
  document.getElementById("sidebar-tabs-nav")?.classList.remove("hidden");
  document.getElementById("panel-channels")?.classList.add("hidden");
  
  // Open current active tab
  setSidebarTab(state.activeTab);

  // Redraw globe
  drawGlobe();

  // Update Hud
  updateHUDCard();
}

function playChannel(ch: Channel) {
  state.selectedChannel = ch;
  state.playerActiveStreamIndex = 0;
  
  // Synchronize country selection on player click if from featured/search
  if (ch.country && ch.country.toUpperCase() !== state.selectedCountryCode) {
    // Check if country exists in list
    const code = ch.country.toUpperCase();
    const countryExists = state.countries.some(c => c.code.toUpperCase() === code);
    if (countryExists) {
      selectCountry(code);
    }
  }

  // Force sidebar lists to re-draw to show updated highlighted playing channel border
  renderChannelListPanel();
  renderFeaturedPanel();
  renderGlobalSearchResults();

  renderVideoPlayer();
}

// HUD Extract Display Card updater
function updateHUDCard() {
  const countryNameEl = document.getElementById("hud-country-name");
  const regionCodeEl = document.getElementById("hud-region-code");
  const transpondersEl = document.getElementById("hud-transponders-count");
  const extractionEl = document.getElementById("hud-extraction-status");
  const backBtn = document.getElementById("btn-hud-back");

  const selectedCountry = state.countries.find(c => c.code.toUpperCase() === state.selectedCountryCode);

  if (selectedCountry) {
    if (countryNameEl) countryNameEl.textContent = selectedCountry.name;
    if (regionCodeEl) regionCodeEl.textContent = `Reg. ${selectedCountry.code}`;
    if (transpondersEl) transpondersEl.textContent = selectedCountry.channelCount.toString();
    if (extractionEl) extractionEl.textContent = "Locked";
    if (backBtn) backBtn.classList.remove("hidden");
  } else {
    const totalCount = state.countries.reduce((sum, c) => sum + c.channelCount, 0);
    if (countryNameEl) countryNameEl.textContent = "World Orbit";
    if (regionCodeEl) regionCodeEl.textContent = "SCANNING REGIONS";
    if (transpondersEl) transpondersEl.textContent = totalCount.toString();
    if (extractionEl) extractionEl.textContent = "Standby";
    if (backBtn) backBtn.classList.add("hidden");
  }
}

// ------------------------------
// PANEL RENDERING ROUTINES
// ------------------------------

// RENDER REGIONS PANEL (TAB 1)
function renderRegionsPanel() {
  const container = document.getElementById("countries-list-scrollable");
  if (!container) return;

  const query = state.countriesSearchQuery.toLowerCase().trim();
  const filtered = state.countries.filter((c) => 
    c.name.toLowerCase().includes(query) || 
    c.code.toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center p-8 text-center text-white/30 gap-2">
        <svg class="h-6 w-6 text-white/10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
        <span class="text-[10px] font-mono uppercase tracking-widest">No orbital matches found</span>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((c) => {
    const isSelected = state.selectedCountryCode === c.code.toUpperCase();
    return `
      <button data-code="${c.code}" class="w-full flex items-center justify-between p-3 border transition-all text-left cursor-pointer ${
        isSelected 
          ? "bg-orange-500/5 border-orange-500" 
          : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/15"
      }">
        <div class="flex items-center gap-3 min-w-0">
          <span class="text-2xl filter saturate-100 shrink-0">${c.flag || "🌐"}</span>
          <div class="flex flex-col min-w-0">
            <span class="text-xs font-bold text-white/90 tracking-wide truncate">${c.name}</span>
            <span class="text-[9px] font-mono text-white/40 uppercase tracking-widest mt-0.5">TERRITORIAL CODE: ${c.code}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[9px] font-mono bg-white/5 border border-white/10 text-white/60 px-1.5 py-0.5 uppercase tracking-widest font-bold">
            ${c.channelCount} Feeds
          </span>
          <div class="p-1 border border-white/10 bg-[#121212] text-white/40 shrink-0">
            <svg class="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
          </div>
        </div>
      </button>
    `;
  }).join("");

  // Bind clicks
  container.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      const code = btn.getAttribute("data-code");
      if (code) selectCountry(code);
    });
  });
}

// RENDER FEATURED PANEL (TAB 2)
function renderFeaturedPanel() {
  const container = document.getElementById("featured-feeds-scrollable");
  if (!container) return;

  if (state.featuredChannels.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center p-8 text-center text-white/30 gap-2">
        <span class="text-[10px] font-mono uppercase tracking-widest animate-pulse">Synchronizing unencrypted feeds...</span>
      </div>
    `;
    return;
  }

  container.innerHTML = state.featuredChannels.map((ch) => {
    const isPlaying = state.selectedChannel?.id === ch.id;
    return `
      <button data-id="${ch.id}" class="w-full flex items-center gap-3.5 p-3 border transition-all text-left cursor-pointer ${
        isPlaying 
          ? "bg-orange-500/5 border-orange-500" 
          : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/15"
      }">
        <!-- Channel logo with broken-source safety -->
        ${ch.logo ? `
          <img src="${ch.logo}" alt="${ch.name}" referrerPolicy="no-referrer" class="w-10 h-10 object-contain bg-[#121212] p-1.5 border border-white/10 shrink-0" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
        ` : ""}
        <div class="w-10 h-10 bg-[#121212] border border-white/10 flex items-center justify-center font-mono text-[11px] font-bold text-orange-500 shrink-0 uppercase ${ch.logo ? "hidden" : ""}">
          ${ch.name.slice(0, 2)}
        </div>

        <div class="flex-1 min-w-0 flex flex-col">
          <span class="text-xs font-bold truncate tracking-wide text-white/95">${ch.name}</span>
          <div class="flex items-center gap-2 mt-1 flex-wrap">
            <span class="text-[9px] font-mono bg-white/5 border border-white/10 text-white/60 px-1.5 py-0.5 uppercase tracking-widest font-bold truncate max-w-[85px]">
              ${ch.categories && ch.categories.length > 0 ? ch.categories[0] : "General"}
            </span>
            <span class="text-[9px] font-mono text-orange-500 uppercase tracking-widest font-black">
              Featured
            </span>
          </div>
        </div>

        <div class="p-1.5 border transition-all shrink-0 ${
          isPlaying 
            ? "bg-orange-950 border-orange-700 text-orange-400" 
            : "bg-[#121212] border-white/10 text-white/40"
        }">
          ${isPlaying ? ICONS.pause : ICONS.play}
        </div>
      </button>
    `;
  }).join("");

  // Fix SVGs inside the lists buttons
  container.querySelectorAll("svg").forEach(svg => svg.setAttribute("class", "h-2.5 w-2.5"));

  // Bind clicks
  container.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const channel = state.featuredChannels.find(ch => ch.id === id);
      if (channel) playChannel(channel);
    });
  });
}

// GLOBAL REMOTE SEARCH PANEL (TAB 3)
function debounce(func: (...args: any[]) => void, delay: number) {
  let timeoutId: any;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

const debounceGlobalSearch = debounce(() => {
  executeGlobalSearch();
}, 400);

function executeGlobalSearch() {
  const query = state.globalSearchQuery.trim();
  if (!query) {
    state.globalSearchResults = [];
    renderGlobalSearchResults();
    return;
  }

  state.globalSearchLoading = true;
  document.getElementById("global-search-loader")?.classList.remove("hidden");

  fetch(`/api/channels/search?q=${encodeURIComponent(query)}`)
    .then((res) => res.json())
    .then((data: Channel[]) => {
      state.globalSearchResults = data;
      state.globalSearchLoading = false;
      document.getElementById("global-search-loader")?.classList.add("hidden");
      renderGlobalSearchResults();
    })
    .catch((err) => {
      console.error("Global orbital search error:", err);
      state.globalSearchLoading = false;
      document.getElementById("global-search-loader")?.classList.add("hidden");
      renderGlobalSearchResults();
    });
}

function renderGlobalSearchResults() {
  const container = document.getElementById("global-search-scrollable");
  if (!container) return;

  if (state.globalSearchLoading && state.globalSearchResults.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center p-12 text-center text-white/30 gap-3">
        <div class="h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <span class="text-[10px] font-mono uppercase tracking-widest font-bold">Scanning unencrypted direct broadcasts...</span>
      </div>
    `;
    return;
  }

  if (!state.globalSearchQuery) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center p-10 text-center text-white/30 gap-2 border border-white/5 bg-black/40">
        <svg class="h-8 w-8 text-white/10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        <span class="text-xs font-sans text-white/45">
          Enter keyword parameters to trace transponder lines globally.
        </span>
      </div>
    `;
    return;
  }

  if (state.globalSearchResults.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center p-10 text-center text-white/30 gap-2 border border-white/5 bg-black/40">
        <svg class="h-8 w-8 text-white/10 animate-pulse" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <span class="text-xs font-sans">
          No active frequencies match your query. Clear search terms and try another filter.
        </span>
      </div>
    `;
    return;
  }

  container.innerHTML = state.globalSearchResults.map((ch) => {
    const isPlaying = state.selectedChannel?.id === ch.id;
    return `
      <button data-id="${ch.id}" class="w-full flex items-center gap-3.5 p-3 border transition-all text-left cursor-pointer ${
        isPlaying 
          ? "bg-orange-500/5 border-orange-500" 
          : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/15"
      }">
        <!-- Channel logo with broken-source safety -->
        ${ch.logo ? `
          <img src="${ch.logo}" alt="${ch.name}" referrerPolicy="no-referrer" class="w-10 h-10 object-contain bg-[#121212] p-1.5 border border-white/10 shrink-0" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
        ` : ""}
        <div class="w-10 h-10 bg-[#121212] border border-white/10 flex items-center justify-center font-mono text-[11px] font-bold text-orange-500 shrink-0 uppercase ${ch.logo ? "hidden" : ""}">
          ${ch.name.slice(0, 2)}
        </div>

        <div class="flex-1 min-w-0 flex flex-col">
          <span class="text-xs font-bold truncate tracking-wide text-white/95">${ch.name}</span>
          <div class="flex items-center gap-2 mt-1 flex-wrap">
            <span class="text-[9px] font-mono bg-white/5 border border-white/10 text-white/60 px-1.5 py-0.5 uppercase tracking-widest font-bold truncate max-w-[85px]">
              ${ch.countryName || ch.countryCode || "Global"}
            </span>
            <span class="text-[9px] font-mono text-orange-500 uppercase tracking-widest font-bold">
              ${ch.categories && ch.categories.length > 0 ? ch.categories[0] : "General"}
            </span>
          </div>
        </div>

        <div class="p-1.5 border transition-all shrink-0 ${
          isPlaying 
            ? "bg-orange-950 border-orange-700 text-orange-400" 
            : "bg-[#121212] border-white/10 text-white/40"
        }">
          ${isPlaying ? ICONS.pause : ICONS.play}
        </div>
      </button>
    `;
  }).join("");

  // Fix SVGs
  container.querySelectorAll("svg").forEach(svg => svg.setAttribute("class", "h-2.5 w-2.5"));

  // Bind click
  container.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const channel = state.globalSearchResults.find(ch => ch.id === id);
      if (channel) playChannel(channel);
    });
  });
}

// RENDER CHANNELS IN SELECTED COUNTRY PANEL (SWAPPED SIDEBAR)
function renderChannelListPanel() {
  const container = document.getElementById("local-channels-scrollable");
  if (!container) return;

  const titleEl = document.getElementById("channels-country-title");
  const flagEl = document.getElementById("channels-country-flag");
  const subtitleEl = document.getElementById("channels-count-subtitle");

  const selectedCountry = state.countries.find(c => c.code.toUpperCase() === state.selectedCountryCode);

  if (titleEl && selectedCountry) titleEl.textContent = selectedCountry.name;
  if (flagEl && selectedCountry) flagEl.textContent = selectedCountry.flag || "🌐";
  if (subtitleEl) subtitleEl.textContent = `${state.countryChannels.length} Live Channels Available`;

  if (state.loadingChannels) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center p-12 text-center text-white/30 gap-3">
        <div class="h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <span class="text-[10px] font-mono uppercase tracking-widest font-bold">Tuning local frequencies...</span>
      </div>
    `;
    return;
  }

  // Compile active categories
  const categories = new Set<string>();
  categories.add("All");
  for (const ch of state.countryChannels) {
    if (ch.categories) {
      for (const cat of ch.categories) {
        categories.add(cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase());
      }
    }
  }
  const categoriesArr = Array.from(categories);

  // Render category chips
  const chipsContainer = document.getElementById("local-categories-chips");
  if (chipsContainer) {
    if (categoriesArr.length > 2) {
      chipsContainer.classList.remove("hidden");
      chipsContainer.innerHTML = categoriesArr.map((cat) => {
        const isSelected = state.localSelectedCategory === cat;
        return `
          <button data-cat="${cat}" class="text-[9px] font-mono font-bold px-3 py-1.5 rounded-none border transition-all whitespace-nowrap cursor-pointer uppercase tracking-widest ${
            isSelected
              ? "bg-[#1C1C1C] border-white/10 text-orange-500"
              : "bg-[#0F0F0F] border border-white/5 text-white/40 hover:text-white/80"
          }">
            ${cat}
          </button>
        `;
      }).join("");

      // Bind category clicks
      chipsContainer.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", () => {
          const cat = btn.getAttribute("data-cat");
          if (cat) {
            state.localSelectedCategory = cat;
            renderChannelListPanel();
          }
        });
      });
    } else {
      chipsContainer.classList.add("hidden");
    }
  }

  // Filter country channels
  const localQuery = state.localSearchQuery.toLowerCase().trim();
  const filtered = state.countryChannels.filter((ch) => {
    const matchesQuery = ch.name.toLowerCase().includes(localQuery);
    
    let matchesCategory = true;
    if (state.localSelectedCategory !== "All") {
      matchesCategory = (ch.categories || []).some(
        (cat) => cat.toLowerCase() === state.localSelectedCategory.toLowerCase()
      );
    }
    return matchesQuery && matchesCategory;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center p-10 text-center text-white/30 gap-2 border border-white/5 rounded-none bg-black/40">
        <svg class="h-8 w-8 text-white/10 animate-pulse" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10" /><path d="m21 21-4.3-4.3" /></svg>
        <span class="text-xs font-sans text-white/50">
          No local matches. Try clearing search keywords.
        </span>
      </div>
    `;
    return;
  }

  // Render grids of local channels
  container.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      ${filtered.map((ch) => {
        const isPlaying = state.selectedChannel?.id === ch.id;
        return `
          <button data-id="${ch.id}" class="flex items-center gap-3.5 p-3 rounded-none border transition-all text-left cursor-pointer ${
            isPlaying
              ? "bg-orange-500/5 border-orange-500 shadow-lg shadow-orange-500/5"
              : "bg-black/20 border border-white/5 hover:bg-white/5 hover:border-white/15"
          }">
            <!-- Channel logo -->
            ${ch.logo ? `
              <img src="${ch.logo}" alt="${ch.name}" referrerPolicy="no-referrer" class="w-10 h-10 object-contain bg-[#121212] p-1.5 rounded-none border border-white/10 shrink-0" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
            ` : ""}
            <div class="w-10 h-10 rounded-none bg-[#121212] border border-white/10 flex items-center justify-center font-mono text-[11px] font-bold text-orange-500 shrink-0 uppercase ${ch.logo ? "hidden" : ""}">
              ${ch.name.slice(0, 2)}
            </div>

            <div class="flex-1 min-w-0 flex flex-col">
              <span class="text-xs font-bold truncate tracking-wide text-white/95">
                ${ch.name}
              </span>
              <div class="flex items-center gap-1.5 mt-1">
                <span class="text-[9px] font-mono bg-white/5 border border-white/10 text-white/60 px-1.5 py-0.5 rounded-none uppercase tracking-widest font-bold truncate max-w-[85px]">
                  ${ch.categories && ch.categories.length > 0 ? ch.categories[0] : "General"}
                </span>
                <span class="text-[9px] font-mono text-orange-500 uppercase tracking-widest font-black">
                  Free
                </span>
              </div>
            </div>

            <div class="p-1.5 rounded-none border transition-all shrink-0 ${
              isPlaying 
                ? "bg-orange-950 border-orange-700 text-orange-400" 
                : "bg-[#121212] border-white/10 text-white/40"
            }">
              ${isPlaying ? ICONS.pause : ICONS.play}
            </div>
          </button>
        `;
      }).join("")}
    </div>
  `;

  // Fix SVGs
  container.querySelectorAll("svg").forEach(svg => svg.setAttribute("class", "h-2.5 w-2.5"));

  // Bind click
  container.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const channel = state.countryChannels.find(ch => ch.id === id);
      if (channel) playChannel(channel);
    });
  });
}

// Country flags utility mapping
const FLAG_OVERLAY: Record<string, string> = {
  US: "🇺🇸", GB: "🇬🇧", FR: "🇫🇷", DE: "🇩🇪", QA: "🇶🇦", JP: "🇯🇵",
  AU: "🇦🇺", KR: "🇰🇷", AT: "🇦🇹", CA: "🇨🇦", ES: "🇪🇸"
};

function getCountryFlag(code: string): string {
  const norm = code.toUpperCase();
  if (FLAG_OVERLAY[norm]) return FLAG_OVERLAY[norm];
  
  // Try finding in loaded countries
  const found = state.countries.find(c => c.code.toUpperCase() === norm);
  return found ? found.flag : "🌐";
}

// ==========================================
// 6. INITIALIZATION & DATA FETCHING
// ==========================================
function startTunerStatusHubPolling() {
  const tunerDot = document.getElementById("tuner-status-dot");
  const tunerText = document.getElementById("tuner-status-text");
  
  function pollStatus() {
    fetch("/api/status")
      .then((res) => res.json())
      .then((statusData: BackendStatus) => {
        state.backendStatus = statusData;
        
        // Update header counters
        document.getElementById("header-territory-count")!.textContent = statusData.countriesCount.toString();

        // Update status dot and text in the Hub
        if (tunerDot && tunerText) {
          if (statusData.loaded) {
            tunerDot.className = "w-2 h-2 rounded-full bg-orange-500 animate-pulse";
            tunerText.textContent = "Live Sync";
            document.getElementById("db-sync-notice")?.classList.add("hidden");
            document.getElementById("db-sync-warning")?.classList.add("hidden");
          } else if (statusData.loading) {
            tunerDot.className = "w-2 h-2 rounded-full bg-amber-400 animate-spin";
            tunerText.textContent = `Indexing (${statusData.countriesCount})`;
            document.getElementById("db-sync-notice")?.classList.remove("hidden");
            document.getElementById("db-sync-text")!.textContent = `EXTRACTING TERRESTRIAL INDEX (${statusData.countriesCount} COILS)...`;
          } else {
            tunerDot.className = "w-2 h-2 rounded-full bg-red-600";
            tunerText.textContent = "Fallback Engine";
            document.getElementById("db-sync-notice")?.classList.add("hidden");
            document.getElementById("db-sync-warning")?.classList.remove("hidden");
          }
        }

        // Once loaded, sync fully-indexed countries list
        if (statusData.loaded && !statusData.loading) {
          fetchCountriesList();
          clearInterval(statusPollingId);
        }
      })
      .catch(() => {});
  }

  // Poll immediately and start interval
  pollStatus();
  const statusPollingId = setInterval(pollStatus, 5000);
}

function fetchCountriesList() {
  state.loadingCountries = true;
  
  fetch("/api/countries")
    .then((res) => res.json())
    .then((countriesData: Country[]) => {
      state.countries = countriesData;
      state.loadingCountries = false;
      
      // Highlight on HUD card
      updateHUDCard();

      // Render Regions lists
      renderRegionsPanel();

      // Update globe paths to show unencrypted regions
      drawGlobe();
    })
    .catch((err) => {
      console.error("Failed to compile satellite countries index:", err);
      state.loadingCountries = false;
    });
}

function fetchFeaturedChannels() {
  fetch("/api/channels/featured")
    .then((res) => res.json())
    .then((channelsData: Channel[]) => {
      state.featuredChannels = channelsData;
      renderFeaturedPanel();
      
      // Auto-play the first featured channel on load so we start with live feed noise/content!
      if (channelsData.length > 0) {
        playChannel(channelsData[0]);
      }
    })
    .catch((err) => {
      console.error("Featured transponders loading error:", err);
    });
}

// ------------------------------
// EVENT REGISTERINGS
// ------------------------------
function registerControlsEvents() {
  // Floating Globe Action buttons
  document.getElementById("btn-zoom-in")?.addEventListener("click", () => {
    state.scale = Math.min(500, state.scale + 30);
    drawGlobe();
  });

  document.getElementById("btn-zoom-out")?.addEventListener("click", () => {
    state.scale = Math.max(120, state.scale - 30);
    drawGlobe();
  });

  document.getElementById("btn-reset-globe")?.addEventListener("click", () => {
    state.rotation = [-10, -30, 0];
    drawGlobe();
  });

  const spinBtn = document.getElementById("btn-auto-spin");
  spinBtn?.addEventListener("click", () => {
    state.isAutoSpinning = !state.isAutoSpinning;
    if (spinBtn) {
      if (state.isAutoSpinning) {
        spinBtn.classList.add("animate-pulse");
        spinBtn.querySelector("svg")?.classList.add("text-orange-500");
      } else {
        spinBtn.classList.remove("animate-pulse");
        spinBtn.querySelector("svg")?.classList.remove("text-orange-500");
      }
    }
  });

  // Territorial HUD back action
  document.getElementById("btn-hud-back")?.addEventListener("click", backToGlobalExplorer);

  // Sidebar Tab triggers
  document.getElementById("tab-countries-btn")?.addEventListener("click", () => setSidebarTab("countries"));
  document.getElementById("tab-featured-btn")?.addEventListener("click", () => setSidebarTab("featured"));
  document.getElementById("tab-search-btn")?.addEventListener("click", () => setSidebarTab("search"));

  // Back button in ChannelList panel
  document.getElementById("btn-channels-back")?.addEventListener("click", backToGlobalExplorer);

  // Search input listeners
  const inputSearchCountries = document.getElementById("input-search-countries") as HTMLInputElement;
  inputSearchCountries?.addEventListener("input", (e) => {
    state.countriesSearchQuery = (e.target as HTMLInputElement).value;
    renderRegionsPanel();
  });

  const inputSearchGlobal = document.getElementById("input-search-global") as HTMLInputElement;
  inputSearchGlobal?.addEventListener("input", (e) => {
    state.globalSearchQuery = (e.target as HTMLInputElement).value;
    debounceGlobalSearch();
  });

  const inputSearchLocal = document.getElementById("input-search-local") as HTMLInputElement;
  inputSearchLocal?.addEventListener("input", (e) => {
    state.localSearchQuery = (e.target as HTMLInputElement).value;
    renderChannelListPanel();
  });
}

// Window resizing adjustments
window.addEventListener("resize", () => {
  // Re-draw projection translations if responsive bounding changes
  drawGlobe();
});

// INITIALIZE APP
function init() {
  injectIcons();
  registerControlsEvents();
  renderVideoPlayer(); // Render landing player
  loadMapGeography(); // Render globe
  
  // Load data
  startTunerStatusHubPolling();
  fetchCountriesList();
  fetchFeaturedChannels();
}

// Start everything up once DOM completes bootstrapping
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
