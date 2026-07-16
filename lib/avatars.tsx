import React from 'react';

// Utility functions for generating avatars based on name
// Editors: update the color palette here if needed
const COLOR_PALETTE = [
  '#FDE68A', // amber-100
  '#A7F3D0', // emerald-100
  '#BFDBFE', // blue-100
  '#FBCFE8', // pink-100
  '#C7D2FE', // indigo-100
  '#FECACA', // red-100
  '#E9D5FF', // violet-100
  '#BBF7D0'  // green-100
];

/**
 * Extract initials from a full name
 * Takes first letter of first and last tokens; fallback to first two of single word
 * @param name Full name string
 * @returns Initials as uppercase string
 */
export function initials(name: string): string {
  const tokens = name.trim().split(/\s+/);
  
  if (tokens.length === 0) return '';
  if (tokens.length === 1) {
    // If only one token, take first two characters
    return tokens[0].substring(0, 2).toUpperCase();
  }
  
  // Take first letter of first and last tokens
  return (tokens[0][0] + tokens[tokens.length - 1][0]).toUpperCase();
}

/**
 * Generate a deterministic color from a name using a simple hash
 * @param name Name string to generate color for
 * @returns Color from the palette
 */
export function colorFromName(name: string): string {
  // Simple hash function to generate a consistent index from name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert hash to positive and get index in palette
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}

// Country name -> ISO 3166-1 alpha-2 code. The flag emoji is derived from the
// code, so adding a country here is a one-line change.
// Editors: update country mappings here if needed
const COUNTRY_CODES: { [key: string]: string } = {
  // Africa
  'Algeria': 'dz',
  'Angola': 'ao',
  'Benin': 'bj',
  'Botswana': 'bw',
  'Burkina Faso': 'bf',
  'Burundi': 'bi',
  'Cameroon': 'cm',
  'Cape Verde': 'cv',
  'Central African Republic': 'cf',
  'Chad': 'td',
  'Comoros': 'km',
  'Democratic Republic of the Congo': 'cd',
  'Djibouti': 'dj',
  'Egypt': 'eg',
  'Equatorial Guinea': 'gq',
  'Eritrea': 'er',
  'Eswatini': 'sz',
  'Ethiopia': 'et',
  'Gabon': 'ga',
  'Gambia': 'gm',
  'Ghana': 'gh',
  'Guinea': 'gn',
  'Guinea-Bissau': 'gw',
  'Ivory Coast': 'ci',
  'Kenya': 'ke',
  'Lesotho': 'ls',
  'Liberia': 'lr',
  'Libya': 'ly',
  'Madagascar': 'mg',
  'Malawi': 'mw',
  'Mali': 'ml',
  'Mauritania': 'mr',
  'Mauritius': 'mu',
  'Morocco': 'ma',
  'Mozambique': 'mz',
  'Namibia': 'na',
  'Niger': 'ne',
  'Nigeria': 'ng',
  'Rwanda': 'rw',
  'Sao Tome and Principe': 'st',
  'Senegal': 'sn',
  'Seychelles': 'sc',
  'Sierra Leone': 'sl',
  'Somalia': 'so',
  'South Africa': 'za',
  'South Sudan': 'ss',
  'Sudan': 'sd',
  'Tanzania': 'tz',
  'Togo': 'tg',
  'Tunisia': 'tn',
  'Uganda': 'ug',
  'Zambia': 'zm',
  'Zimbabwe': 'zw',
  // Rest of the world
  'Argentina': 'ar',
  'Armenia': 'am',
  'Australia': 'au',
  'Brazil': 'br',
  'Canada': 'ca',
  'China': 'cn',
  'France': 'fr',
  'Germany': 'de',
  'India': 'in',
  'Ireland': 'ie',
  'Italy': 'it',
  'Japan': 'jp',
  'Netherlands': 'nl',
  'New Zealand': 'nz',
  'North Macedonia': 'mk',
  'Pakistan': 'pk',
  'Portugal': 'pt',
  'Qatar': 'qa',
  'Saudi Arabia': 'sa',
  'Spain': 'es',
  'Sweden': 'se',
  'Switzerland': 'ch',
  'Thailand': 'th',
  'Turkey': 'tr',
  'United Arab Emirates': 'ae',
  'United Kingdom': 'gb',
  'United States': 'us',
};

// Alternate spellings that show up in awardee-submitted data.
const COUNTRY_ALIASES: { [key: string]: string } = {
  "Cote d'Ivoire": 'Ivory Coast',
  'Cote dIvoire': 'Ivory Coast',
  "C\u00f4te d'Ivoire": 'Ivory Coast',
  'DRC': 'Democratic Republic of the Congo',
  'DR Congo': 'Democratic Republic of the Congo',
  'Congo (DRC)': 'Democratic Republic of the Congo',
  'Swaziland': 'Eswatini',
  'Cabo Verde': 'Cape Verde',
  'UK': 'United Kingdom',
  'U.K.': 'United Kingdom',
  'Great Britain': 'United Kingdom',
  'England': 'United Kingdom',
  'Scotland': 'United Kingdom',
  'Wales': 'United Kingdom',
  'USA': 'United States',
  'U.S.A.': 'United States',
  'U.S.': 'United States',
  'US': 'United States',
  'America': 'United States',
  'United States of America': 'United States',
  'UAE': 'United Arab Emirates',
  'Holland': 'Netherlands',
  'Macedonia': 'North Macedonia',
  'Tanzania, United Republic of': 'Tanzania',
};

/**
 * Turn an ISO 3166-1 alpha-2 code into its flag emoji by mapping each letter to
 * its regional indicator symbol. Falls back to the globe for anything invalid.
 */
export const flagFromCountryCode = (code: string): string => {
  const normalized = code?.trim().toUpperCase();
  if (!normalized || !/^[A-Z]{2}$/.test(normalized)) return '\u{1F30D}';
  return String.fromCodePoint(
    ...[...normalized].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65)
  );
};

// Helper function to get flag emoji from country
export const flagEmoji = (country: string): string => {
  const name = country?.trim();
  if (!name) return '\u{1F30D}';
  const canonical = COUNTRY_ALIASES[name] ?? name;
  const code = COUNTRY_CODES[canonical];
  return code ? flagFromCountryCode(code) : '\u{1F30D}'; // Default world emoji for unmapped countries
};

/**
 * SVG Avatar component that displays initials with a colored background
 * The color is deterministically generated from the name
 */
interface AvatarSVGProps {
  name: string;
  size?: number;
}

export const AvatarSVG: React.FC<AvatarSVGProps> = ({ name, size = 48 }) => {
  const initial = initials(name);
  const bgColor = colorFromName(name);
  
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`} 
        className="rounded-full"
      >
        <circle cx={size / 2} cy={size / 2} r={size / 2} fill={bgColor} />
        <text 
          x={size / 2} 
          y={size / 2} 
          textAnchor="middle" 
          dominantBaseline="middle" 
          fontSize={size / 3} 
          fontWeight="bold"
          fill="currentColor"
        >
          {initial}
        </text>
      </svg>
    </div>
  );
};