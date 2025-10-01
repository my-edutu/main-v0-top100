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

// Helper function to get flag emoji from country
// Editors: update country mappings here if needed
export const flagEmoji = (country: string): string => {
  const countryMap: { [key: string]: string } = {
    'Nigeria': '🇳🇬',
    'Ghana': '🇬🇭',
    'South Africa': '🇿🇦',
    'Morocco': '🇲🇦',
    'Mali': '🇲🇱',
    'Tanzania': '🇹🇿',
    'Zimbabwe': '🇿🇼',
    'Uganda': '🇺🇬',
    'Gambia': '🇬🇲',
    'Somalia': '🇸🇴',
    'Egypt': '🇪🇬',
    'Ethiopia': '🇪🇹',
    'Kenya': '🇰🇪',
    'Uganda': '🇺🇬',
    'Algeria': '🇩🇿',
    'Angola': '🇦🇴',
    'Benin': '🇧🇯',
    'Botswana': '🇧🇼',
    'Burkina Faso': '🇧🇫',
    'Burundi': '🇧🇮',
    'Cameroon': '🇨🇲',
    'Cape Verde': '🇨🇻',
    'Central African Republic': '🇨🇫',
    'Chad': '🇹🇩',
    'Comoros': '🇰🇲',
    'Democratic Republic of the Congo': '🇨🇩',
    'Djibouti': '🇩🇯',
    'Equatorial Guinea': '🇬🇶',
    'Eritrea': '🇪🇷',
    'Eswatini': '🇸🇿',
    'Ethiopia': '🇪🇹',
    'Gabon': '🇬🇦',
    'Gambia': '🇬🇲',
    'Ghana': '🇬🇭',
    'Guinea': '🇬🇳',
    'Guinea-Bissau': '🇬🇼',
    'Ivory Coast': '🇨🇮',
    'Kenya': '🇰🇪',
    'Lesotho': '🇱🇸',
    'Liberia': '🇱🇷',
    'Libya': '🇱🇾',
    'Madagascar': '🇲🇬',
    'Malawi': '🇲🇼',
    'Mali': '🇲🇱',
    'Mauritania': '🇲🇷',
    'Mauritius': '🇲🇺',
    'Morocco': '🇲🇦',
    'Mozambique': '🇲🇿',
    'Namibia': '🇳🇦',
    'Niger': '🇳🇪',
    'Nigeria': '🇳🇬',
    'Rwanda': '🇷🇼',
    'Sao Tome and Principe': '🇸🇹',
    'Senegal': '🇸🇳',
    'Seychelles': '🇸🇨',
    'Sierra Leone': '🇸🇱',
    'Somalia': '🇸🇴',
    'South Africa': '🇿🇦',
    'South Sudan': '🇸🇸',
    'Sudan': '🇸🇩',
    'Tanzania': '🇹🇿',
    'Togo': '🇹🇬',
    'Tunisia': '🇹🇳',
    'Uganda': '🇺🇬',
    'Zambia': '🇿🇲',
    'Zimbabwe': '🇿🇼',
  };
  
  return countryMap[country] || '🌍'; // Default world emoji for unmapped countries
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