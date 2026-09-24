/** Line icons shared across the storefront (24×24 viewBox, currentColor). */

function Ic({
  size = 20,
  sw = 1.8,
  children,
}: {
  size?: number;
  sw?: number;
  children: React.ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

type IconProps = { s?: number };

export const ISearch = ({ s = 20 }: IconProps) => (
  <Ic size={s}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </Ic>
);

export const ICart = ({ s = 20 }: IconProps) => (
  <Ic size={s}>
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </Ic>
);

export const IX = ({ s = 16 }: IconProps) => (
  <Ic size={s} sw={2.2}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </Ic>
);

export const IChevronDown = ({ s = 12 }: IconProps) => (
  <Ic size={s} sw={2.6}>
    <path d="M6 9l6 6 6-6" />
  </Ic>
);

export const ICaret = ({ s = 12 }: IconProps) => (
  <Ic size={s} sw={2.5}>
    <polyline points="6 9 12 15 18 9" />
  </Ic>
);

export const IBox = ({ s = 40 }: IconProps) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#d0d0d0"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

export const IPin = ({ s = 20 }: IconProps) => (
  <Ic size={s}>
    <path d="M21 10c0 6.5-9 12-9 12s-9-5.5-9-12a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </Ic>
);

export const IMapIcon = ({ s = 20 }: IconProps) => (
  <Ic size={s}>
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </Ic>
);

export const ICrosshair = ({ s = 20 }: IconProps) => (
  <Ic size={s}>
    <circle cx="12" cy="12" r="10" />
    <line x1="22" y1="12" x2="18" y2="12" />
    <line x1="6" y1="12" x2="2" y2="12" />
    <line x1="12" y1="6" x2="12" y2="2" />
    <line x1="12" y1="22" x2="12" y2="18" />
  </Ic>
);




