import { useId } from 'react';
import type { SVGProps } from 'react';

export interface GridPatternProps extends SVGProps<SVGSVGElement> {
  /** Cell width, in SVG user units. */
  width?: number;
  /** Cell height, in SVG user units. */
  height?: number;
  /** Pattern x offset. */
  x?: number;
  /** Pattern y offset. */
  y?: number;
  /** `[x, y]` cell coordinates to fill solid, for a sparse highlight inside the grid. */
  squares?: Array<[x: number, y: number]>;
  /** Dash array applied to the grid lines, e.g. `'4 4'` for a dashed grid. */
  strokeDasharray?: string;
}

/**
 * Magic UI `grid-pattern` backdrop, ported verbatim apart from the extra props type
 * (no index signature) and the generated id. Line colour comes from `stroke-*` / `fill-*`
 * utilities on `className`, plus `currentColor` for the squares when `text-*` is used.
 *
 * Always decorative: `aria-hidden` is set here because the grid never carries meaning.
 */
export default function GridPattern({
  width = 44,
  height = 44,
  x = -1,
  y = -1,
  strokeDasharray = '0',
  squares,
  className,
  ...props
}: Readonly<GridPatternProps>) {
  // React ids contain characters that are illegal inside a `url(#...)` reference, so strip them.
  const patternId = `grid-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <svg aria-hidden="true" className={className} {...props}>
      <defs>
        <pattern
          id={patternId}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path d={`M.5 ${height}V.5H${width}`} fill="none" strokeDasharray={strokeDasharray} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${patternId})`} />
      {squares ? (
        <svg x={x} y={y} className="overflow-visible">
          {squares.map(([squareX, squareY]) => (
            <rect
              key={`${squareX}-${squareY}`}
              strokeWidth="0"
              width={width - 1}
              height={height - 1}
              x={squareX * width + 1}
              y={squareY * height + 1}
            />
          ))}
        </svg>
      ) : null}
    </svg>
  );
}
