import type { FieldType } from "../../lib/formSchema";

// Source: hand-drawn SVGs (viewBox 0 0 64 64) from C:\Users\stefan\salt\repositories\
// personal-projects\office-ping-pong-2\frontend\public\assets\original\formout-icons-svg
// The originals' two fixed colors (base #E9DED1 / accent #B46D3D) are replaced with
// currentColor / var(--accent) here so the icons follow the chosen color scheme and
// dark/light mode instead of being locked to a single shade.
const BASE = "currentColor";
const ACCENT = "var(--accent)";
const ACCENT_CONTRAST = "var(--accent-contrast)";

export function FieldTypeIcon({
  type,
  size = "65%",
}: {
  type: FieldType;
  // A percentage (default) scales the icon with its box's size -- right when
  // the button sits in the responsive grid. A pixel value is only used when
  // the size has already been measured from a specific source, e.g. the drag ghost.
  size?: number | string;
}) {
  switch (type) {
    case "HEADING":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          width={size}
          height={size}
          aria-hidden="true"
        >
          <text
            x={32}
            y={50}
            fill={BASE}
            fontFamily="Arial, sans-serif"
            fontSize={52}
            fontWeight={700}
            textAnchor="middle"
          >
            T
          </text>
        </svg>
      );

    case "SUBHEADING":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          width={size}
          height={size}
          aria-hidden="true"
        >
          <text
            x={32}
            y={46}
            fill={BASE}
            fontFamily="Arial, sans-serif"
            fontSize={40}
            fontWeight={700}
            textAnchor="middle"
          >
            T
          </text>
        </svg>
      );

    case "PARAGRAPH":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          width={size}
          height={size}
          aria-hidden="true"
        >
          <text
            x={32}
            y={40}
            fill={BASE}
            fontFamily="Arial, sans-serif"
            fontSize={23}
            fontWeight={600}
            letterSpacing={1}
            textAnchor="middle"
          >
            ABC
          </text>
        </svg>
      );

    case "DIVIDER":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          width={size}
          height={size}
          aria-hidden="true"
        >
          <path
            d="M12 32h40"
            stroke={BASE}
            strokeWidth={4}
            strokeLinecap="round"
          />
        </svg>
      );

    case "TEXT":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          width={size}
          height={size}
          aria-hidden="true"
        >
          <rect
            x={7.5}
            y={19.5}
            width={49}
            height={25}
            rx={4.5}
            stroke={BASE}
            strokeWidth={3}
          />
          <text
            x={13}
            y={37.5}
            fill={BASE}
            fontFamily="Arial, sans-serif"
            fontSize={15}
            fontWeight={600}
          >
            ABC
          </text>
          <path
            d="M50 26v12"
            stroke={ACCENT}
            strokeWidth={2.8}
            strokeLinecap="round"
          />
        </svg>
      );

    case "TEXTAREA":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          width={size}
          height={size}
          aria-hidden="true"
        >
          <rect
            x={10.5}
            y={10.5}
            width={43}
            height={43}
            rx={4.5}
            stroke={BASE}
            strokeWidth={3}
          />
          <path
            d="M18 22h28M18 31h23M18 40h17"
            stroke={BASE}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <path
            d="M40 35v11"
            stroke={ACCENT}
            strokeWidth={2.8}
            strokeLinecap="round"
          />
        </svg>
      );

    case "NUMBER":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          width={size}
          height={size}
          aria-hidden="true"
        >
          <rect
            x={5.5}
            y={18.5}
            width={53}
            height={27}
            rx={4}
            stroke={BASE}
            strokeWidth={3}
          />
          <text
            x={11}
            y={37.5}
            fill={BASE}
            fontFamily="Arial, sans-serif"
            fontSize={15}
            fontWeight={600}
          >
            123
          </text>
          <path d="M43.5 20v24" stroke={BASE} strokeWidth={2} opacity={0.55} />
          <path
            d="m48 28.5 2.5-2.5 2.5 2.5M48 35.5l2.5 2.5 2.5-2.5"
            stroke={ACCENT}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "CHECKBOX":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          width={size}
          height={size}
          aria-hidden="true"
        >
          <rect
            x={14}
            y={14}
            width={36}
            height={36}
            rx={6}
            stroke={BASE}
            strokeWidth={3.5}
          />
          <path
            d="m22 32 7 7 14-16"
            stroke={ACCENT}
            strokeWidth={4.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "SINGLE_CHOICE":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          width={size}
          height={size}
          aria-hidden="true"
        >
          <g stroke={BASE} strokeWidth={3} strokeLinecap="round">
            <circle cx={18} cy={15} r={4.5} />
            <circle cx={18} cy={32} r={4.5} />
            <circle cx={18} cy={49} r={4.5} />
            <path d="M29 15h21M29 32h17M29 49h21" />
          </g>
          <circle cx={18} cy={32} r={2.25} fill={ACCENT} />
        </svg>
      );

    case "MULTIPLE_CHOICE":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          width={size}
          height={size}
          aria-hidden="true"
        >
          <g
            stroke={BASE}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x={13.5} y={10.5} width={9} height={9} rx={1.5} />
            <rect x={13.5} y={27.5} width={9} height={9} rx={1.5} />
            <rect x={13.5} y={44.5} width={9} height={9} rx={1.5} />
            <path d="M29 15h21M29 32h17M29 49h21" />
          </g>
          <path
            d="m15.5 15 2 2 4-5M15.5 49l2 2 4-5"
            stroke={ACCENT}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "SCALE":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          width={size}
          height={size}
          aria-hidden="true"
        >
          <path
            d="M14 32h36M14 24v16M50 24v16"
            stroke={BASE}
            strokeWidth={3.5}
            strokeLinecap="round"
          />
          <circle cx={40} cy={32} r={5.5} fill={ACCENT} />
        </svg>
      );

    case "DATE":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          width={size}
          height={size}
          aria-hidden="true"
        >
          <rect
            x={11.5}
            y={14.5}
            width={41}
            height={38}
            rx={5}
            stroke={BASE}
            strokeWidth={3}
          />
          <path
            d="M12 26h40M21 10v9M43 10v9"
            stroke={BASE}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <g fill={BASE}>
            <rect x={18} y={32} width={5} height={4} rx={1} />
            <rect x={41} y={32} width={5} height={4} rx={1} />
            <rect x={18} y={42} width={5} height={4} rx={1} />
            <rect x={29.5} y={42} width={5} height={4} rx={1} />
            <rect x={41} y={42} width={5} height={4} rx={1} />
          </g>
          <rect x={29.5} y={32} width={5} height={4} rx={1} fill={ACCENT} />
        </svg>
      );

    case "TIME":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          width={size}
          height={size}
          aria-hidden="true"
        >
          <circle cx={32} cy={32} r={20} stroke={ACCENT} strokeWidth={3.5} />
          <path
            d="M32 20v13l9 6"
            stroke={BASE}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "DATETIME":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          width={size}
          height={size}
          aria-hidden="true"
        >
          <rect
            x={7.5}
            y={13.5}
            width={39}
            height={36}
            rx={5}
            stroke={BASE}
            strokeWidth={3}
          />
          <path
            d="M8 24h38M17 9v9M37 9v9"
            stroke={BASE}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <g fill={BASE}>
            <rect x={14} y={30} width={5} height={4} rx={1} />
            <rect x={25} y={30} width={5} height={4} rx={1} />
            <rect x={14} y={39} width={5} height={4} rx={1} />
            <rect x={25} y={39} width={5} height={4} rx={1} />
          </g>
          <circle cx={45} cy={44} r={11} fill={ACCENT} />
          <path
            d="M45 38v6l4 3"
            stroke={ACCENT_CONTRAST}
            strokeWidth={2.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}
