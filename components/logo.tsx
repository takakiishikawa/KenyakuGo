export function KenyakuGoIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#52B788" />
      {/* ¥ symbol */}
      <path d="M9 7 L16 17 L23 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.5 13.5 H21.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M10.5 17.5 H21.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 17.5 V25" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
