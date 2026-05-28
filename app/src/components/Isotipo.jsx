export default function Isotipo({ size = 48, color = '#96C800' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Full circle ring */}
      <circle cx="50" cy="50" r="37" stroke={color} strokeWidth="7" fill="none"/>
      {/* Diagonal bar — exits circle on both sides */}
      <line x1="9" y1="86" x2="91" y2="14" stroke={color} strokeWidth="8" strokeLinecap="round"/>
      {/* Upper-right leaf: outer tip at circle (~79,25), inner tip toward center (~58,47) */}
      <path d="M 79 25 C 95 22 86 52 58 47 C 50 45 55 18 79 25 Z"
        stroke={color} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* Lower-left leaf: 180deg rotation of upper leaf */}
      <path d="M 21 75 C 5 78 14 48 42 53 C 50 55 45 82 21 75 Z"
        stroke={color} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}
