export interface Stream {
  url: string;
  status: string;
  resolution?: string;
  height?: number | null;
  width?: number | null;
  isM3U8?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  logo: string | null;
  categories: string[];
  website: string | null;
  streams: Stream[];
  country?: string;
  countryCode?: string;
  countryName?: string;
}

export interface Country {
  code: string;
  name: string;
  flag: string;
  languages: string[];
  channelCount: number;
}

export interface BackendStatus {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  countriesCount: number;
  fallbackMode: boolean;
}
