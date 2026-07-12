// ISO 3166-1 Numeric to Alpha-2 country code mapping
const NUMERIC_TO_ALPHA2: Record<string, string> = {
  "004": "AF", "008": "AL", "012": "DZ", "016": "AS", "020": "AD", "024": "AO", "028": "AG", "032": "AR", "036": "AU",
  "040": "AT", "044": "BS", "048": "BH", "050": "BD", "052": "BB", "056": "BE", "060": "BM", "064": "BT", "068": "BO",
  "070": "BA", "072": "BW", "076": "BR", "084": "BZ", "090": "SB", "092": "VG", "096": "BN", "100": "BG", "104": "MM",
  "108": "BI", "112": "BY", "116": "KH", "120": "CM", "124": "CA", "132": "CV", "136": "KY", "140": "CF", "144": "LK",
  "148": "TD", "152": "CL", "156": "CN", "170": "CO", "174": "KM", "178": "CG", "180": "CD", "184": "CK", "188": "CR",
  "191": "HR", "192": "CU", "196": "CY", "203": "CZ", "204": "BJ", "208": "DK", "212": "DM", "214": "DO", "218": "EC",
  "222": "SV", "226": "GQ", "231": "ET", "232": "ER", "233": "EE", "234": "FO", "238": "FK", "242": "FJ", "246": "FI",
  "248": "AX", "250": "FR", "254": "GF", "258": "PF", "262": "TF", "266": "GA", "268": "GM", "270": "GE", "275": "PS",
  "276": "DE", "288": "GH", "292": "GI", "300": "GR", "304": "GL", "308": "GD", "312": "GP", "316": "GU", "320": "GT",
  "324": "GN", "328": "GY", "332": "HT", "340": "HN", "344": "HK", "348": "HU", "352": "IS", "356": "IN", "360": "ID",
  "364": "IR", "368": "IQ", "372": "IE", "376": "IL", "380": "IT", "384": "CI", "388": "JM", "392": "JP", "398": "KZ",
  "400": "KE", "404": "KI", "408": "KP", "410": "KR", "414": "KW", "417": "KG", "418": "LA", "422": "LB", "426": "LS",
  "428": "LV", "430": "LR", "434": "LY", "438": "LI", "440": "LT", "442": "LU", "446": "MO", "450": "MG", "454": "MW",
  "458": "MY", "462": "MV", "466": "ML", "470": "MT", "474": "MQ", "478": "MR", "480": "MU", "484": "MX", "496": "MN",
  "498": "MD", "499": "ME", "500": "MS", "504": "MA", "508": "MZ", "512": "OM", "516": "NA", "520": "NR", "524": "NP",
  "528": "NL", "531": "CW", "533": "AW", "540": "NC", "548": "NZ", "554": "NI", "558": "NE", "562": "NG", "566": "NU",
  "570": "NF", "574": "MP", "578": "NO", "583": "FM", "584": "MH", "585": "PW", "586": "PK", "591": "PA", "598": "PG",
  "600": "PY", "604": "PE", "608": "PH", "612": "PN", "616": "PL", "620": "PT", "624": "GW", "626": "TL", "630": "PR",
  "634": "QA", "638": "RE", "642": "RO", "643": "RU", "646": "RW", "652": "BL", "654": "SH", "659": "KN", "660": "AI",
  "662": "LC", "663": "MF", "666": "PM", "670": "VC", "674": "SM", "678": "ST", "682": "SA", "686": "SN", "688": "RS",
  "690": "SC", "694": "SL", "702": "SG", "703": "SK", "704": "VN", "705": "SI", "706": "SO", "710": "ZA", "716": "ZW",
  "724": "ES", "728": "SS", "729": "SD", "740": "SR", "744": "SJ", "748": "SZ", "752": "SE", "756": "CH", "760": "SY",
  "762": "TJ", "764": "TH", "768": "TG", "772": "TK", "776": "TO", "780": "TT", "784": "AE", "788": "TN", "792": "TR",
  "795": "TM", "796": "TC", "798": "TV", "800": "UG", "804": "UA", "818": "EG", "826": "GB", "834": "TZ", "840": "US",
  "850": "VI", "854": "BF", "858": "UY", "860": "UZ", "862": "VE", "876": "WF", "882": "WS", "887": "YE", "894": "ZM"
};

/**
 * Maps a d3 world-atlas country feature to its ISO-3166-1 alpha-2 code.
 */
export function getCountryCode(featureId: string | number | undefined, featureName?: string): string | null {
  if (!featureId) {
    if (featureName) {
      return findByCountryName(featureName);
    }
    return null;
  }

  // Convert to 3-character padded string
  const numId = String(featureId).padStart(3, "0");
  const code = NUMERIC_TO_ALPHA2[numId];
  if (code) return code;

  // Try name fallback
  if (featureName) {
    return findByCountryName(featureName);
  }

  return null;
}

// Fallback search by standard country names
function findByCountryName(name: string): string | null {
  const norm = name.toLowerCase().trim();
  
  const matches: Record<string, string> = {
    "united states": "US", "usa": "US", "united states of america": "US",
    "united kingdom": "GB", "uk": "GB", "great britain": "GB", "england": "GB",
    "france": "FR", "germany": "DE", "japan": "JP", "australia": "AU",
    "south korea": "KR", "korea, republic of": "KR", "korea": "KR",
    "canada": "CA", "spain": "ES", "qatar": "QA", "china": "CN",
    "india": "IN", "brazil": "BR", "mexico": "MX", "italy": "IT",
    "russia": "RU", "russian federation": "RU", "argentina": "AR",
    "south africa": "ZA", "austria": "AT", "switzerland": "CH",
    "netherlands": "NL", "belgium": "BE", "sweden": "SE", "norway": "NO",
    "denmark": "DK", "finland": "FI", "new zealand": "NZ", "singapore": "SG",
    "taiwan": "TW", "hong kong": "HK", "ireland": "IE", "portugal": "PT",
    "greece": "GR", "turkey": "TR", "poland": "PL", "saudi arabia": "SA"
  };

  if (matches[norm]) return matches[norm];

  // Partial match search
  for (const [key, value] of Object.entries(matches)) {
    if (norm.includes(key) || key.includes(norm)) {
      return value;
    }
  }

  return null;
}
