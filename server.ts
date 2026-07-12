import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// Premium fallback channels (fully streamable live HLS/M3U8 URLs)
const FALLBACK_CHANNELS_DATA = [
  {
    id: "BloombergTV.us",
    name: "Bloomberg TV",
    country: "US",
    logo: "https://i.imgur.com/B9BofpA.png",
    categories: ["business", "news"],
    website: "https://www.bloomberg.com/live",
    streams: [
      { url: "https://liveproduseast.global.ssl.fastly.net/ch/us/master.m3u8", status: "active" }
    ]
  },
  {
    id: "SkyNews.uk",
    name: "Sky News",
    country: "GB",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/e3/Sky_News_logo_2018.svg",
    categories: ["news"],
    website: "https://news.sky.com",
    streams: [
      { url: "https://skynews-skynewsnorthamerica-musicbox.raw.images.skynews.com/SkyNewsNorthAmerica/master.m3u8", status: "active" }
    ]
  },
  {
    id: "France24English.fr",
    name: "France 24 (EN)",
    country: "FR",
    logo: "https://upload.wikimedia.org/wikipedia/commons/2/23/France24_Logo.svg",
    categories: ["news"],
    website: "https://www.france24.com/en/",
    streams: [
      { url: "https://static.france24.com/live/F24_EN_LO_HLS/live_web.m3u8", status: "active" }
    ]
  },
  {
    id: "DWNews.de",
    name: "Deutsche Welle (DW) English",
    country: "DE",
    logo: "https://upload.wikimedia.org/wikipedia/commons/5/5b/Deutsche_Welle_logo_2012.svg",
    categories: ["news"],
    website: "https://www.dw.com",
    streams: [
      { url: "https://dwstream4-lh.akamaihd.net/i/dwstream4_live@131316/master.m3u8", status: "active" }
    ]
  },
  {
    id: "AlJazeeraEnglish.qa",
    name: "Al Jazeera English",
    country: "QA",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/ea/Al_Jazeera_English_logo.svg",
    categories: ["news"],
    website: "https://www.aljazeera.com",
    streams: [
      { url: "https://live-hls-web-aje.getaj.net/AJE/index.m3u8", status: "active" }
    ]
  },
  {
    id: "NHKWorldJapan.jp",
    name: "NHK World-Japan",
    country: "JP",
    logo: "https://upload.wikimedia.org/wikipedia/commons/f/f6/NHK_World-Japan_logo.svg",
    categories: ["news", "general"],
    website: "https://www3.nhk.or.kr/nhkworld/",
    streams: [
      { url: "https://nhkwlive-ojsp.akamaized.net/hls/live/2003459/nhkwlive-ojsp-sec/index_1m.m3u8", status: "active" }
    ]
  },
  {
    id: "ABCNews.au",
    name: "ABC News Australia",
    country: "AU",
    logo: "https://upload.wikimedia.org/wikipedia/commons/a/ab/ABC_News_2010.svg",
    categories: ["news"],
    website: "https://www.abc.net.au/news",
    streams: [
      { url: "https://abcliveevents2-lh.akamaihd.net/i/abcnews_1@959738/master.m3u8", status: "active" }
    ]
  },
  {
    id: "ArirangTV.kr",
    name: "Arirang TV",
    country: "KR",
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Arirang_logo_white_background.svg",
    categories: ["general", "culture"],
    website: "https://www.arirang.com",
    streams: [
      { url: "https://amdlive.ctnd.com.edgesuite.net/arirang_1ch/smil:arirang_1ch.smil/playlist.m3u8", status: "active" }
    ]
  },
  {
    id: "RedBullTV.at",
    name: "Red Bull TV",
    country: "AT",
    logo: "https://upload.wikimedia.org/wikipedia/commons/f/fe/Red_Bull_TV_logo.svg",
    categories: ["sports", "entertainment"],
    website: "https://www.redbull.com/tv",
    streams: [
      { url: "https://rbmn-live.akamaized.net/hls/live/2002830/sports/master.m3u8", status: "active" }
    ]
  },
  {
    id: "CBCNewsNetwork.ca",
    name: "CBC News Network",
    country: "CA",
    logo: "https://upload.wikimedia.org/wikipedia/commons/0/05/CBC_Logo.svg",
    categories: ["news"],
    website: "https://www.cbc.ca/news",
    streams: [
      { url: "https://cbclive-east.akamaized.net/hls/live/2042971/cbc_news/master.m3u8", status: "active" }
    ]
  },
  {
    id: "NASA.us",
    name: "NASA TV",
    country: "US",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg",
    categories: ["documentary", "science"],
    website: "https://www.nasa.gov/nasatv",
    streams: [
      { url: "https://ntvlive.nasa.gov/hls/live/2012371/nasa_tv/master.m3u8", status: "active" }
    ]
  },
  {
    id: "RTVE24h.es",
    name: "RTVE Canal 24 Horas",
    country: "ES",
    logo: "https://upload.wikimedia.org/wikipedia/commons/9/9f/Canal_24_horas_logo_2018.png",
    categories: ["news"],
    website: "https://www.rtve.es/directo/canal-24-horas/",
    streams: [
      { url: "https://rtvev4-live.akamaized.net/hls/live/2043187/rtve_24h/master.m3u8", status: "active" }
    ]
  }
];

const FALLBACK_COUNTRIES_DATA = [
  { code: "US", name: "United States", flag: "🇺🇸", channelCount: 2 },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", channelCount: 1 },
  { code: "FR", name: "France", flag: "🇫🇷", channelCount: 1 },
  { code: "DE", name: "Germany", flag: "🇩🇪", channelCount: 1 },
  { code: "QA", name: "Qatar", flag: "🇶🇦", channelCount: 1 },
  { code: "JP", name: "Japan", flag: "🇯🇵", channelCount: 1 },
  { code: "AU", name: "Australia", flag: "🇦🇺", channelCount: 1 },
  { code: "KR", name: "South Korea", flag: "🇰🇷", channelCount: 1 },
  { code: "AT", name: "Austria", flag: "🇦🇹", channelCount: 1 },
  { code: "CA", name: "Canada", flag: "🇨🇦", channelCount: 1 },
  { code: "ES", name: "Spain", flag: "🇪🇸", channelCount: 1 }
];

// In-memory cache
let countriesCache: any[] = [];
let channelsByCountryCache: Record<string, any[]> = {};
let isDataLoading = false;
let loadingError: string | null = null;

// Initialize caches with fallback data first so that the server immediately has content
function initializeFallbacks() {
  countriesCache = [...FALLBACK_COUNTRIES_DATA];
  channelsByCountryCache = {};
  for (const channel of FALLBACK_CHANNELS_DATA) {
    const code = channel.country.toUpperCase();
    if (!channelsByCountryCache[code]) {
      channelsByCountryCache[code] = [];
    }
    channelsByCountryCache[code].push(channel);
  }
}

initializeFallbacks();

async function loadIptvData() {
  if (isDataLoading) return;
  isDataLoading = true;
  loadingError = null;
  console.log("Fetching live IPTV-org datasets...");

  try {
    const [countriesRes, channelsRes, streamsRes] = await Promise.all([
      fetch("https://iptv-org.github.io/api/countries.json").then((r) => r.json()),
      fetch("https://iptv-org.github.io/api/channels.json").then((r) => r.json()),
      fetch("https://iptv-org.github.io/api/streams.json").then((r) => r.json()),
    ]);

    console.log(`IPTV-org download success: ${countriesRes.length} countries, ${channelsRes.length} channels, ${streamsRes.length} streams`);

    // Index streams by channel ID
    const streamMap = new Map<string, any[]>();
    for (const stream of streamsRes) {
      if (!stream.channel || !stream.url) continue;
      
      // Ensure it is an HLS (m3u8) or standard stream (mostly what iptv-org has)
      const isM3U8 = stream.url.includes(".m3u8");
      
      if (!streamMap.has(stream.channel)) {
        streamMap.set(stream.channel, []);
      }
      streamMap.get(stream.channel)!.push({
        url: stream.url,
        status: stream.status || "active",
        resolution: stream.resolution || "unknown",
        height: stream.height || null,
        width: stream.width || null,
        isM3U8
      });
    }

    // Map channels by country code, only keeping streamable channels
    const tempChannelsByCountry: Record<string, any[]> = {};
    const activeCountryCodes = new Set<string>();

    for (const channel of channelsRes) {
      const streams = streamMap.get(channel.id) || [];
      if (streams.length === 0) continue;

      const countryCode = (channel.country || "").toUpperCase();
      if (!countryCode) continue;

      if (!tempChannelsByCountry[countryCode]) {
        tempChannelsByCountry[countryCode] = [];
      }

      tempChannelsByCountry[countryCode].push({
        id: channel.id,
        name: channel.name,
        logo: channel.logo || null,
        categories: channel.categories || [],
        website: channel.website || null,
        streams: streams,
      });

      activeCountryCodes.add(countryCode);
    }

    // Include fallbacks in their respective countries if they aren't already included
    for (const fbChannel of FALLBACK_CHANNELS_DATA) {
      const code = fbChannel.country.toUpperCase();
      if (!tempChannelsByCountry[code]) {
        tempChannelsByCountry[code] = [];
      }
      const exists = tempChannelsByCountry[code].some((ch) => ch.id === fbChannel.id);
      if (!exists) {
        tempChannelsByCountry[code].unshift(fbChannel);
        activeCountryCodes.add(code);
      }
    }

    // Build final countries list
    const tempCountries = countriesRes
      .map((c: any) => {
        const code = (c.code || "").toUpperCase();
        const channels = tempChannelsByCountry[code] || [];
        return {
          code,
          name: c.name,
          flag: c.flag || "🌐",
          languages: c.languages || [],
          channelCount: channels.length,
        };
      })
      .filter((c: any) => c.channelCount > 0);

    // Make sure we have the fallback countries listed even if missing in response
    for (const fbCountry of FALLBACK_COUNTRIES_DATA) {
      const code = fbCountry.code.toUpperCase();
      const exists = tempCountries.some((c: any) => c.code === code);
      if (!exists) {
        tempCountries.push({
          code,
          name: fbCountry.name,
          flag: fbCountry.flag,
          languages: [],
          channelCount: tempChannelsByCountry[code]?.length || 0
        });
      }
    }

    // Sort alphabetically
    tempCountries.sort((a: any, b: any) => a.name.localeCompare(b.name));

    countriesCache = tempCountries;
    channelsByCountryCache = tempChannelsByCountry;
    isDataLoading = false;
    console.log(`Successfully indexed channels across ${countriesCache.length} countries!`);
  } catch (err: any) {
    console.error("Failed to fetch/index live IPTV data. Retaining fallback dataset. Error:", err);
    loadingError = err.message || "Unknown fetching error";
    isDataLoading = false;
    
    // Ensure fallbacks are properly configured in case they weren't
    if (countriesCache.length === 0) {
      initializeFallbacks();
    }
  }
}

// Lazy load or background load
setTimeout(loadIptvData, 1000);

// API Endpoints
app.get("/api/status", (req, res) => {
  res.json({
    loaded: countriesCache.length > 0 && countriesCache !== FALLBACK_COUNTRIES_DATA,
    loading: isDataLoading,
    error: loadingError,
    countriesCount: countriesCache.length,
    fallbackMode: countriesCache === FALLBACK_COUNTRIES_DATA,
  });
});

app.get("/api/countries", (req, res) => {
  res.json(countriesCache);
});

app.get("/api/countries/:code/channels", (req, res) => {
  const code = req.params.code.toUpperCase();
  const channels = channelsByCountryCache[code] || [];
  res.json(channels);
});

// Full search endpoint
app.get("/api/channels/search", (req, res) => {
  const query = (req.query.q || "").toString().toLowerCase();
  if (!query) {
    res.json([]);
    return;
  }

  const results: any[] = [];
  for (const code of Object.keys(channelsByCountryCache)) {
    const channels = channelsByCountryCache[code];
    for (const ch of channels) {
      if (
        ch.name.toLowerCase().includes(query) ||
        (ch.categories && ch.categories.some((cat: string) => cat.toLowerCase().includes(query)))
      ) {
        results.push({
          ...ch,
          countryCode: code,
          countryName: countriesCache.find((c) => c.code === code)?.name || code,
        });
      }
      if (results.length >= 60) break;
    }
    if (results.length >= 60) break;
  }
  res.json(results);
});

// Popular global stations for sidebar/home view
app.get("/api/channels/featured", (req, res) => {
  res.json(FALLBACK_CHANNELS_DATA);
});

// Start server
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
