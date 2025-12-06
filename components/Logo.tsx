export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer circle - represents 360 degrees */}
      <circle
        cx="50"
        cy="50"
        r="45"
        stroke="currentColor"
        strokeWidth="3"
        className="text-blue-500"
        opacity="0.3"
      />

      {/* Three connected arrows forming a workflow cycle */}
      {/* Arrow 1 - Top */}
      <path
        d="M50 15 L50 35 M50 35 L45 30 M50 35 L55 30"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-blue-500"
      />

      {/* Arrow 2 - Bottom Right */}
      <path
        d="M72 70 L60 55 M60 55 L65 57 M60 55 L62 50"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-violet-500"
      />

      {/* Arrow 3 - Bottom Left */}
      <path
        d="M28 70 L40 55 M40 55 L35 57 M40 55 L38 50"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-blue-500"
      />

      {/* Center dot - focal point */}
      <circle
        cx="50"
        cy="50"
        r="8"
        fill="currentColor"
        className="text-violet-500"
      />

      {/* Small connecting arcs */}
      <path
        d="M 50 42 Q 65 45, 62 58"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        className="text-blue-400"
        opacity="0.4"
      />
      <path
        d="M 50 42 Q 35 45, 38 58"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        className="text-blue-400"
        opacity="0.4"
      />
    </svg>
  );
}
