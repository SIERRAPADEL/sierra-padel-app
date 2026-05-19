export default function Isotipo({ size = 48, color = '#84C200' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="28" r="24" stroke={color} strokeWidth="2.8" />
      <path d="M16 38 C16 28 22 20 28 24 C34 28 34 20 40 22" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M16 20 C20 28 24 36 28 32 C32 28 36 36 40 34" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <line x1="38" y1="14" x2="47" y2="6" stroke={color} strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}
