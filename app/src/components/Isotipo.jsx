export default function Isotipo({ size = 48, color = '#84C200' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer ring — gap at ~1 o'clock where diagonal exits */}
      <path
        d="M 79 26 A 38 38 0 1 0 68 16"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
      {/* Diagonal bar exiting upper-right */}
      <line
        x1="79" y1="26"
        x2="92" y2="9"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* Upper teardrop — d-shape in upper-right interior */}
      <path
        d="M 66 20 C 77 26 76 44 63 46 C 50 48 46 35 53 27 C 57 21 62 17 66 20 Z"
        stroke={color}
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Lower teardrop — p-shape in lower-left interior */}
      <path
        d="M 34 80 C 23 74 24 56 37 54 C 50 52 54 65 47 73 C 43 79 38 83 34 80 Z"
        stroke={color}
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
