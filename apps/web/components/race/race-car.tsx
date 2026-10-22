const CAR_COLORS = ["#22c55e", "#38bdf8", "#f59e0b", "#c084fc", "#fb7185", "#2dd4bf"] as const;

export function carColorForId(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return CAR_COLORS[hash % CAR_COLORS.length] ?? CAR_COLORS[0];
}

type RaceCarProps = {
  color: string;
  moving: boolean;
};

export function RaceCar({ color, moving }: RaceCarProps) {
  return (
    <svg
      aria-hidden="true"
      className={`block h-auto w-full ${moving ? "race-car-moving" : ""}`}
      fill="none"
      viewBox="16 10 128 46"
    >
      <ellipse cx="78" cy="53.2" fill="#000" opacity="0.16" rx="48" ry="1.5" />
      <path
        d="M18 46h112c6 0 10-3.2 10-7.2v-2c0-2.4-2-4.8-5.6-5.6L122 29l-16-12c-3.2-2.4-7-3.6-11.2-3.6H72c-5.2 0-9.8 2-12.8 5.6L48 30H30c-6.4 0-12 4-12 9.2V46Z"
        fill={color}
      />
      <path d="M48 35.5h74" stroke="#000" strokeOpacity="0.16" strokeWidth="1.4" />
      <path d="M74 17.2h12.5c2.4 0 4.6 1 6.2 2.8L100 27H68l6-9.8Z" fill="#0c1218" opacity="0.72" />
      <path d="M76 18h6.4L79.2 26h-8.6L76 18Z" fill="#fff" opacity="0.22" />
      <path d="M128 30.2h7.2c.8 0 1.4.6 1.4 1.4v1.8h-8.6v-3.2Z" fill="#fff8dc" />
      <path
        d="M22 31.4h4.4c.6 0 1 .4 1 1v1.8c0 .6-.4 1-1 1H22c-.7 0-1.1-.4-1.1-1v-1.8c0-.6.4-1 1.1-1Z"
        fill="#fb7185"
      />
      <Wheel cx={44} cy={46} />
      <Wheel cx={110} cy={46} />
    </svg>
  );
}

function Wheel({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g className="race-wheel">
      <circle cx={cx} cy={cy} fill="#14171c" r="7.2" />
      <circle cx={cx} cy={cy} fill="#2c313a" r="5" />
      <circle cx={cx} cy={cy} fill="#e6e8ed" r="1.8" />
      <path
        d={`M${cx} ${cy - 4.4} V${cy + 4.4} M${cx - 4.4} ${cy} H${cx + 4.4}`}
        stroke="#a7adb6"
        strokeLinecap="round"
        strokeWidth="1.2"
      />
    </g>
  );
}
