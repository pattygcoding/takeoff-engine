import { useId } from 'react';
import type { SVGProps } from 'react';

export interface DotPatternProps extends SVGProps<SVGSVGElement> {
  /** Horizontal spacing between dots, in SVGs user units. */
  width?: number;
  /** Vertical spacing between dots, in SVGs user units. */
  height?: number;
  /** Radius of each dot. */
  cr?: number;
}

/**
 * Magic UI `dot-pattern` backdrop, ported for this codebase: the dot matrix is one tiled
 * `<pattern>` instead of one animated `<circle>` per dot (the upstream version animates each
 * dot through `motion/react`, which is not a dependency here), so it renders identically at
 * a fraction of the DOM and node count. Dots paint in `currentColor`, so callers theme them
 * with a text colour utility (e.g. `text-[var(--lp-rule)]`).
 *
 * Always decorative: `aria-hidden` is set here because the pattern never carries meaning.
 */
export default function DotPattern({
  width = 20,
  height = 20,
  cr = 1,
  className,
  ...props
}: DotPatternProps) {
  // React ids contain characters that are illegal inside a `url(#...)` reference, so strip them.
  const patternId = `dot-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <svg aria-hidden="true" className={className} {...props}>
      <defs>
        <pattern id={patternId} width={width} height={height} patternUnits="userSpaceOnUse">
          <circle cx={cr} cy={cr} r={cr} fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} strokeWidth={0} />
    </svg>
  );
}
