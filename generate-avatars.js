const fs = require('fs');
const path = require('path');

const avatarsDir = path.join(__dirname, 'assets', 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// 12 Avatar definitions with distinct, high-tech Gen-Z aesthetics
const avatars = [
  // MALE-LEANING (1 to 6)
  {
    file: 'av1.svg',
    title: 'Cyber Dev',
    gender: 'male',
    bg1: '#4F46E5', bg2: '#06B6D4',
    hair: '#1E1B4B', skin: '#FCD34D',
    accColor: '#06B6D4',
    svg: `
      <defs>
        <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4F46E5"/>
          <stop offset="100%" stop-color="#06B6D4"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="60" fill="url(#bg1)"/>
      <!-- Body -->
      <path d="M25 120 C25 90 40 82 60 82 C80 82 95 90 95 120 Z" fill="#0F172A"/>
      <path d="M45 88 L60 102 L75 88 Z" fill="#38BDF8"/>
      <!-- Head -->
      <ellipse cx="60" cy="55" rx="24" ry="28" fill="#FCD34D"/>
      <!-- Hair -->
      <path d="M36 48 C36 28 50 22 68 22 C84 22 86 35 84 50 C76 42 66 38 52 40 C42 42 38 46 36 48 Z" fill="#1E1B4B"/>
      <!-- Tech Glasses -->
      <rect x="42" y="48" width="16" height="10" rx="3" fill="#06B6D4" opacity="0.9"/>
      <rect x="62" y="48" width="16" height="10" rx="3" fill="#06B6D4" opacity="0.9"/>
      <line x1="58" y1="53" x2="62" y2="53" stroke="#06B6D4" stroke-width="2"/>
      <!-- Smile -->
      <path d="M52 70 Q60 76 68 70" stroke="#78350F" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- Cyber Earphone -->
      <circle cx="36" cy="56" r="4" fill="#38BDF8"/>
      <circle cx="84" cy="56" r="4" fill="#38BDF8"/>
    `
  },
  {
    file: 'av2.svg',
    title: 'Code Ninja',
    gender: 'male',
    bg1: '#7C3AED', bg2: '#DB2777',
    hair: '#111827', skin: '#FBBF24',
    svg: `
      <defs>
        <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#7C3AED"/>
          <stop offset="100%" stop-color="#DB2777"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="60" fill="url(#bg2)"/>
      <!-- Jacket -->
      <path d="M22 120 C22 92 38 80 60 80 C82 80 98 92 98 120 Z" fill="#18181B"/>
      <path d="M52 80 L60 96 L68 80" stroke="#A855F7" stroke-width="3" fill="none"/>
      <!-- Head -->
      <ellipse cx="60" cy="54" rx="23" ry="26" fill="#FBBF24"/>
      <!-- Headband -->
      <rect x="36" y="38" width="48" height="9" rx="2" fill="#E11D48"/>
      <circle cx="60" cy="42.5" r="2.5" fill="#FFFFFF"/>
      <!-- Hair -->
      <path d="M35 38 C34 22 52 18 64 18 C78 18 85 26 85 38 Z" fill="#111827"/>
      <!-- Eyes -->
      <ellipse cx="49" cy="54" rx="3" ry="2" fill="#18181B"/>
      <ellipse cx="71" cy="54" rx="3" ry="2" fill="#18181B"/>
      <!-- Smile -->
      <path d="M54 68 Q60 72 66 68" stroke="#78350F" stroke-width="2" fill="none" stroke-linecap="round"/>
    `
  },
  {
    file: 'av3.svg',
    title: 'AI Architect',
    gender: 'male',
    bg1: '#059669', bg2: '#10B981',
    svg: `
      <defs>
        <linearGradient id="bg3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0F766E"/>
          <stop offset="100%" stop-color="#14B8A6"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="60" fill="url(#bg3)"/>
      <path d="M24 120 C24 90 38 82 60 82 C82 82 96 90 96 120 Z" fill="#134E4A"/>
      <ellipse cx="60" cy="54" rx="23" ry="27" fill="#FDE68A"/>
      <!-- Short Spiky Hair -->
      <path d="M36 44 L44 26 L52 36 L62 24 L70 34 L80 28 L84 46 Z" fill="#451A03"/>
      <!-- Cool VR/Cyber Goggles -->
      <path d="M40 48 H80 V58 H40 Z" fill="#0D9488" rx="4"/>
      <circle cx="50" cy="53" r="3" fill="#5EEAD4"/>
      <circle cx="70" cy="53" r="3" fill="#5EEAD4"/>
      <path d="M53 71 Q60 75 67 71" stroke="#92400E" stroke-width="2" fill="none" stroke-linecap="round"/>
    `
  },
  {
    file: 'av4.svg',
    title: 'Cloud Hacker',
    gender: 'male',
    svg: `
      <defs>
        <linearGradient id="bg4" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3B82F6"/>
          <stop offset="100%" stop-color="#8B5CF6"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="60" fill="url(#bg4)"/>
      <path d="M22 120 C22 92 38 82 60 82 C82 82 98 92 98 120 Z" fill="#1E293B"/>
      <ellipse cx="60" cy="56" rx="22" ry="26" fill="#FBCFE8"/>
      <!-- Beanie Hat -->
      <path d="M36 44 C36 24 50 18 60 18 C70 18 84 24 84 44 Z" fill="#F43F5E"/>
      <rect x="34" y="40" width="52" height="8" rx="3" fill="#BE123C"/>
      <!-- Round Glasses -->
      <circle cx="50" cy="56" r="7" stroke="#0F172A" stroke-width="2" fill="none"/>
      <circle cx="70" cy="56" r="7" stroke="#0F172A" stroke-width="2" fill="none"/>
      <line x1="57" y1="56" x2="63" y2="56" stroke="#0F172A" stroke-width="2"/>
      <circle cx="50" cy="56" r="2" fill="#0F172A"/>
      <circle cx="70" cy="56" r="2" fill="#0F172A"/>
      <path d="M54 70 Q60 74 66 70" stroke="#831843" stroke-width="2" fill="none" stroke-linecap="round"/>
    `
  },
  {
    file: 'av5.svg',
    title: 'Quantum Dev',
    gender: 'male',
    svg: `
      <defs>
        <linearGradient id="bg5" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F59E0B"/>
          <stop offset="100%" stop-color="#EF4444"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="60" fill="url(#bg5)"/>
      <path d="M25 120 C25 90 40 82 60 82 C80 82 95 90 95 120 Z" fill="#27272A"/>
      <ellipse cx="60" cy="55" rx="23" ry="27" fill="#FED7AA"/>
      <!-- Neat Side-part hair -->
      <path d="M37 45 C37 26 50 20 62 20 C78 20 83 28 83 45 C73 34 57 32 37 45 Z" fill="#312E81"/>
      <ellipse cx="49" cy="55" rx="3" ry="2" fill="#18181B"/>
      <ellipse cx="71" cy="55" rx="3" ry="2" fill="#18181B"/>
      <!-- Smart Smile -->
      <path d="M52 70 Q60 76 68 70" stroke="#7C2D12" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- Glowing Ear Cuffs -->
      <circle cx="36" cy="56" r="3" fill="#FBBF24"/>
    `
  },
  {
    file: 'av6.svg',
    title: 'Pixel Punk',
    gender: 'male',
    svg: `
      <defs>
        <linearGradient id="bg6" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#8B5CF6"/>
          <stop offset="100%" stop-color="#EC4899"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="60" fill="url(#bg6)"/>
      <path d="M24 120 C24 92 38 82 60 82 C82 82 96 92 96 120 Z" fill="#111827"/>
      <ellipse cx="60" cy="55" rx="23" ry="27" fill="#FDE047"/>
      <!-- Wild Synth Mohawk -->
      <path d="M50 40 L52 14 L60 22 L66 12 L70 38 Z" fill="#EC4899"/>
      <!-- Neon visor -->
      <path d="M42 50 L78 50 L74 60 L46 60 Z" fill="#06B6D4"/>
      <path d="M54 70 Q60 74 66 70" stroke="#854D0E" stroke-width="2" fill="none" stroke-linecap="round"/>
    `
  },

  // FEMALE-LEANING (7 to 12)
  {
    file: 'av7.svg',
    title: 'Cyber Queen',
    gender: 'female',
    svg: `
      <defs>
        <linearGradient id="bg7" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#8B5CF6"/>
          <stop offset="100%" stop-color="#F43F5E"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="60" fill="url(#bg7)"/>
      <path d="M26 120 C26 92 40 84 60 84 C80 84 94 92 94 120 Z" fill="#311042"/>
      <ellipse cx="60" cy="56" rx="22" ry="26" fill="#FED7AA"/>
      <!-- Stylish Purple Bob Hair -->
      <path d="M34 50 C32 26 50 20 62 20 C76 20 88 28 86 52 C82 72 78 78 76 80 C74 72 74 58 72 50 C62 42 46 44 38 52 C36 68 34 76 34 80 C32 74 32 64 34 50 Z" fill="#6B21A8"/>
      <!-- Neon Glasses -->
      <rect x="42" y="50" width="15" height="9" rx="3" fill="#F43F5E"/>
      <rect x="63" y="50" width="15" height="9" rx="3" fill="#F43F5E"/>
      <line x1="57" y1="54" x2="63" y2="54" stroke="#F43F5E" stroke-width="2"/>
      <!-- Lip gloss -->
      <path d="M54 70 Q60 75 66 70" stroke="#E11D48" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    `
  },
  {
    file: 'av8.svg',
    title: 'Code Sorceress',
    gender: 'female',
    svg: `
      <defs>
        <linearGradient id="bg8" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0284C7"/>
          <stop offset="100%" stop-color="#2DD4BF"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="60" fill="url(#bg8)"/>
      <path d="M24 120 C24 92 38 84 60 84 C82 84 96 92 96 120 Z" fill="#0C4A6E"/>
      <!-- Long flowy hair in back -->
      <path d="M30 50 C30 80 32 105 32 120 L88 120 C88 105 90 80 90 50 Z" fill="#1E1B4B"/>
      <ellipse cx="60" cy="55" rx="22" ry="25" fill="#FCD34D"/>
      <!-- Bangs -->
      <path d="M35 44 C42 32 54 30 64 30 C76 30 85 36 85 44 C76 38 66 36 50 38 Z" fill="#312E81"/>
      <!-- Eyes with cat-eye liner -->
      <ellipse cx="48" cy="54" rx="3.5" ry="2" fill="#0F172A"/>
      <ellipse cx="72" cy="54" rx="3.5" ry="2" fill="#0F172A"/>
      <path d="M53 69 Q60 74 67 69" stroke="#9A3412" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- Neon hair highlight -->
      <path d="M34 52 C33 70 34 90 35 110" stroke="#22D3EE" stroke-width="3" stroke-linecap="round"/>
    `
  },
  {
    file: 'av9.svg',
    title: 'UI Diva',
    gender: 'female',
    svg: `
      <defs>
        <linearGradient id="bg9" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F43F5E"/>
          <stop offset="100%" stop-color="#F59E0B"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="60" fill="url(#bg9)"/>
      <path d="M26 120 C26 92 40 84 60 84 C80 84 94 92 94 120 Z" fill="#1C1917"/>
      <!-- High Top Bun -->
      <circle cx="60" cy="22" r="14" fill="#3F2212"/>
      <ellipse cx="60" cy="56" rx="22" ry="26" fill="#FBCFE8"/>
      <!-- Hair frame -->
      <path d="M36 48 C36 34 46 30 60 30 C74 30 84 34 84 48 C78 40 68 38 52 38 Z" fill="#3F2212"/>
      <!-- Big Round Wire Glasses -->
      <circle cx="49" cy="55" r="7.5" stroke="#F59E0B" stroke-width="2" fill="none"/>
      <circle cx="71" cy="55" r="7.5" stroke="#F59E0B" stroke-width="2" fill="none"/>
      <line x1="56.5" y1="55" x2="63.5" y2="55" stroke="#F59E0B" stroke-width="2"/>
      <path d="M53 71 Q60 76 67 71" stroke="#BE123C" stroke-width="2" fill="none" stroke-linecap="round"/>
    `
  },
  {
    file: 'av10.svg',
    title: 'Data Diva',
    gender: 'female',
    svg: `
      <defs>
        <linearGradient id="bg10" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10B981"/>
          <stop offset="100%" stop-color="#6366F1"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="60" fill="url(#bg10)"/>
      <path d="M25 120 C25 92 40 84 60 84 C80 84 95 92 95 120 Z" fill="#1E1B4B"/>
      <ellipse cx="60" cy="56" rx="22" ry="26" fill="#FBBF24"/>
      <!-- Modern Braids / Bob -->
      <path d="M34 50 C34 32 46 26 60 26 C74 26 86 32 86 50 C86 78 78 84 76 88 C74 80 72 70 72 56 C60 46 48 46 38 56 C38 70 36 80 34 88 Z" fill="#172554"/>
      <!-- Tech Headset -->
      <path d="M33 55 C32 36 44 24 60 24 C76 24 88 36 87 55" stroke="#A78BFA" stroke-width="3" fill="none"/>
      <rect x="30" y="52" width="6" height="10" rx="3" fill="#8B5CF6"/>
      <rect x="84" y="52" width="6" height="10" rx="3" fill="#8B5CF6"/>
      <ellipse cx="49" cy="56" rx="3" ry="2" fill="#0F172A"/>
      <ellipse cx="71" cy="56" rx="3" ry="2" fill="#0F172A"/>
      <path d="M53 71 Q60 76 67 71" stroke="#92400E" stroke-width="2" fill="none" stroke-linecap="round"/>
    `
  },
  {
    file: 'av11.svg',
    title: 'Quantum Star',
    gender: 'female',
    svg: `
      <defs>
        <linearGradient id="bg11" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#EC4899"/>
          <stop offset="100%" stop-color="#8B5CF6"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="60" fill="url(#bg11)"/>
      <path d="M25 120 C25 92 40 84 60 84 C80 84 95 92 95 120 Z" fill="#2E1065"/>
      <ellipse cx="60" cy="55" rx="22" ry="26" fill="#FED7AA"/>
      <!-- Wavy Teal Hair -->
      <path d="M34 54 C32 30 46 22 62 22 C78 22 88 32 86 54 C82 72 82 82 82 88 C76 74 74 64 74 54 C64 46 48 46 38 54 C38 64 36 74 32 88 Z" fill="#0D9488"/>
      <ellipse cx="48" cy="55" rx="3" ry="2" fill="#0F172A"/>
      <ellipse cx="72" cy="55" rx="3" ry="2" fill="#0F172A"/>
      <!-- Cyber Star Hairpin -->
      <polygon points="40,32 42,38 48,38 43,42 45,48 40,44 35,48 37,42 32,38 38,38" fill="#FDE047"/>
      <path d="M53 70 Q60 75 67 70" stroke="#BE123C" stroke-width="2" fill="none" stroke-linecap="round"/>
    `
  },
  {
    file: 'av12.svg',
    title: 'Web3 Diva',
    gender: 'female',
    svg: `
      <defs>
        <linearGradient id="bg12" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#6366F1"/>
          <stop offset="100%" stop-color="#06B6D4"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="60" fill="url(#bg12)"/>
      <path d="M24 120 C24 92 38 84 60 84 C82 84 96 92 96 120 Z" fill="#0F172A"/>
      <!-- Afro volume -->
      <circle cx="44" cy="40" r="16" fill="#18181B"/>
      <circle cx="76" cy="40" r="16" fill="#18181B"/>
      <circle cx="60" cy="32" r="18" fill="#18181B"/>
      <ellipse cx="60" cy="56" rx="22" ry="26" fill="#A16207"/>
      <!-- Neon Headband -->
      <path d="M38 42 Q60 38 82 42" stroke="#22D3EE" stroke-width="4" fill="none"/>
      <ellipse cx="49" cy="56" rx="3" ry="2" fill="#18181B"/>
      <ellipse cx="71" cy="56" rx="3" ry="2" fill="#18181B"/>
      <path d="M53 71 Q60 76 67 71" stroke="#451A03" stroke-width="2" fill="none" stroke-linecap="round"/>
    `
  }
];

avatars.forEach(av => {
  const fullSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 120 120" width="120" height="120" xmlns="http://www.w3.org/2000/svg">
  ${av.svg.trim()}
</svg>`;
  fs.writeFileSync(path.join(avatarsDir, av.file), fullSvg);
});

// Also create an avatar index metadata file for easy frontend consumption
const avatarMeta = avatars.map(av => ({
  id: av.file.replace('.svg', ''),
  name: av.title,
  gender: av.gender,
  file: `assets/avatars/${av.file}`
}));
fs.writeFileSync(path.join(avatarsDir, 'avatars.json'), JSON.stringify(avatarMeta, null, 2));

console.log('✅ Generated 12 tech avatars & avatars.json in assets/avatars/');
