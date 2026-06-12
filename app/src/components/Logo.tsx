export function Logo() {
  return (
    <div className="brand">
      <svg width="30" height="30" viewBox="0 0 180 200" aria-hidden="true">
        <path d="M90 0C40 0 0 40 0 90c0 60 90 110 90 110s90-50 90-110C180 40 140 0 90 0Z" fill="#F77F2E" />
        <rect x="38" y="58" width="104" height="70" rx="10" fill="#F7F5F0" />
        <circle cx="62" cy="82" r="12" fill="#0F2A43" />
        <path d="M50 108a12 12 0 0 1 24 0Z" fill="#0F2A43" />
        <rect x="84" y="74" width="48" height="7" rx="3.5" fill="#0F2A43" />
        <rect x="84" y="90" width="40" height="6" rx="3" fill="#9FB3C8" />
        <circle cx="138" cy="122" r="20" fill="#13A05C" stroke="#F7F5F0" strokeWidth="5" />
        <path d="M129 122l6 7 13-15" fill="none" stroke="#F7F5F0" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>
        Piè<span className="ci">ci</span>
      </span>
    </div>
  );
}
