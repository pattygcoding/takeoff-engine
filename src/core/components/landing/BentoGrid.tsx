import type { ComponentPropsWithoutRef, ComponentType, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

export interface BentoGridProps extends ComponentPropsWithoutRef<'div'> {
  className?: string;
}

/**
 * Magic UI `BentoGrid`, re-skinned for the landing palette: a six-column track on large
 * screens (so tiles can span 2, 3 or 6 columns) that collapses to two columns on tablets and
 * one on phones. Row height is a minimum rather than a fixed `auto-rows-[22rem]`, so long
 * translations never clip.
 */
export function BentoGrid({ className = '', ...props }: Readonly<BentoGridProps>) {
  return (
    <div
      className={`grid w-full grid-cols-1 auto-rows-[minmax(300px,auto)] gap-4 sm:grid-cols-2 lg:grid-cols-6 ${className}`}
      {...props}
    />
  );
}

export interface BentoCardProps extends ComponentPropsWithoutRef<'div'> {
  /** Tile heading. */
  name: string;
  /** One-line supporting copy. */
  description: string;
  /** Decorative Lucide icon, rendered inside an `aria-hidden` wrapper. */
  icon: ComponentType<{ className?: string }>;
  /** Live mini-visual shown behind the copy (never stock art). */
  visual?: ReactNode;
  /** Revealed link label. */
  cta: string;
  href: string;
  /** `stack` keeps the visual behind the copy; `row` puts it beside the copy on large screens. */
  layout?: 'stack' | 'row';
}

/**
 * Magic UI `BentoCard`, adapted in three ways for this codebase:
 *  1. it uses the shared `--lp-*` palette and the 2px ink border the rest of the landing page
 *     uses, instead of shadcn tokens and rounded corners;
 *  2. the hover-revealed link is also revealed by `group-focus-within`, so a keyboard user
 *     never lands on an invisible link (WCAG 2.4.7);
 *  3. `layout="row"` renders the wide banner tile with the visual beside the copy.
 */
export function BentoCard({
  name,
  description,
  icon: Icon,
  visual,
  cta,
  href,
  layout = 'stack',
  className = '',
  ...props
}: Readonly<BentoCardProps>) {
  if (layout === 'row') {
    return (
      <div
        className={`group relative flex flex-col overflow-hidden border-2 border-[var(--lp-ink)] bg-[var(--lp-card)] shadow-[var(--lp-shadow-tile)] lg:flex-row lg:items-center lg:justify-between lg:gap-10 ${className}`}
        {...props}
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0 z-20 h-[3px] bg-[var(--lp-accent)]" />
        <div className="relative z-10 p-5 sm:p-6 lg:max-w-[46em]">
          <span aria-hidden="true" className="inline-flex h-10 w-10 items-center justify-center border-2 border-[var(--lp-ink)] bg-[var(--lp-card-alt)]">
            <Icon className="h-5 w-5" />
          </span>
          <h3 className="mt-4 text-[19px] font-extrabold tracking-[-0.02em]">{name}</h3>
          <p className="mt-2 text-[14.5px] text-[var(--lp-muted)]">{description}</p>
          <a
            href={href}
            className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--lp-accent-text)] underline underline-offset-[4px] hover:text-[var(--lp-ink)]"
          >
            {cta}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
        {visual ? (
          <div aria-hidden="true" className="pointer-events-none relative z-0 hidden shrink-0 px-6 pb-6 lg:block lg:pb-0">
            {visual}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`group lp-lift relative flex flex-col overflow-hidden border-2 border-[var(--lp-ink)] bg-[var(--lp-card)] shadow-[var(--lp-shadow-tile)] ${className}`}
      {...props}
    >
      {/* Accent rule + a tinted visual band are what stop six tiles reading as one field: the band
          is lighter than the card in both themes and the rule marks each card's own edge. */}
      <span aria-hidden="true" className="absolute inset-x-0 top-0 z-20 h-[3px] bg-[var(--lp-accent)]" />

      {/* The visual is an in-flow first child (as in Magic UI) rather than an absolute layer:
          it therefore reserves its own height and can never collide with the copy below it. */}
      {visual ? (
        <div
          aria-hidden="true"
          className="pointer-events-none relative z-0 flex-none [mask-image:linear-gradient(to_bottom,black_66%,transparent)]"
        >
          {visual}
        </div>
      ) : null}

      <div className="relative z-10 mt-auto p-5 transition-transform duration-300 ease-out sm:p-6 lg:group-hover:-translate-y-9 lg:group-focus-within:-translate-y-9">
        <span aria-hidden="true" className="inline-flex h-10 w-10 items-center justify-center border-2 border-[var(--lp-ink)] bg-[var(--lp-card-alt)]">
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="mt-4 text-[19px] font-extrabold tracking-[-0.02em]">{name}</h3>
        <p className="mt-2 max-w-[42ch] text-[14.5px] text-[var(--lp-muted)]">{description}</p>
      </div>

      <div className="pointer-events-none relative z-10 hidden px-5 pb-5 transition-all duration-300 ease-out sm:px-6 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block lg:translate-y-9 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100 lg:group-focus-within:translate-y-0 lg:group-focus-within:opacity-100">
        <a
          href={href}
          className="pointer-events-auto inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--lp-accent-text)] underline underline-offset-[4px] hover:text-[var(--lp-ink)]"
        >
          {cta}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>

      {/* Mobile keeps the link visible: there is no hover on touch. */}
      <div className="relative z-10 px-5 pb-5 sm:px-6 lg:hidden">
        <a
          href={href}
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--lp-accent-text)] underline underline-offset-[4px]"
        >
          {cta}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
