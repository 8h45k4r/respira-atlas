import { useMemo, useRef, useState, useId } from 'react';
import { Search, MapPin, Building2 } from 'lucide-react';
import type { SearchEntry } from '@/data/schemas/geography';
import type { GeographyMode } from '@/geography/model';
import { Badge } from '@/components/ui/misc';
import { cn } from '@/lib/utils';

export interface AreaSearchResolution {
  readonly entry: SearchEntry;
  /**
   * Set when the query matched a settlement and we are showing the
   * administrative area that contains it. The interface must say so.
   */
  readonly resolvedVia: 'direct' | 'containing-authority';
  readonly notice: string | null;
}

/**
 * Local search over the bundled area index.
 *
 * Matching is on name, alias and area code. A settlement is never silently
 * treated as equivalent to the authority that contains it: when a query resolves
 * through a containing authority, the result says which authority is being shown
 * and that it is not a city-only estimate.
 */
export function AreaSearch({
  entries, mode, areaTypeKey, onResolve, placeholder,
  settlements = [], settlementsLoading = false, onFirstInput,
}: {
  entries: readonly SearchEntry[];
  mode: GeographyMode;
  areaTypeKey: string | null;
  onResolve: (resolution: AreaSearchResolution) => void;
  placeholder?: string;
  settlements?: readonly SearchEntry[];
  settlementsLoading?: boolean;
  /** Called the first time the box is used, so settlements can be fetched. */
  onFirstInput?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length < 2) return [];

    const candidates = [...entries, ...settlements].filter((entry) => {
      if (entry.kind === 'nation') return true;
      // Only offer areas that exist in the current geography mode, so a search
      // can never produce a selection the current map cannot show.
      return entry.mode === mode || entry.mode === 'both';
    });

    const scored = candidates
      .map((entry) => {
        const name = entry.name.toLowerCase();
        const code = entry.code.toLowerCase();
        const aliases = (entry.aliases ?? []).map((a) => a.toLowerCase());
        let score = -1;
        if (code === trimmed) score = 100;
        else if (name === trimmed) score = 95;
        else if (name.startsWith(trimmed)) score = 80;
        else if (aliases.some((a) => a === trimmed)) score = 78;
        else if (aliases.some((a) => a.startsWith(trimmed))) score = 70;
        else if (name.includes(trimmed)) score = 50;
        else if (code.startsWith(trimmed)) score = 40;
        if (score < 0) return null;
        // Prefer the level currently on screen, then population for settlements.
        if (entry.areaTypeKey === areaTypeKey) score += 6;
        if (entry.kind === 'settlement' && entry.population) {
          score += Math.min(4, Math.log10(entry.population));
        }
        return { entry, score };
      })
      .filter((x): x is { entry: SearchEntry; score: number } => x !== null)
      .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name))
      .slice(0, 10);

    return scored.map((x) => x.entry);
  }, [query, entries, settlements, mode, areaTypeKey]);

  const resolve = (entry: SearchEntry) => {
    if (entry.kind === 'settlement' && entry.containedBy) {
      onResolve({
        entry: {
          ...entry,
          code: entry.containedBy.code,
          name: entry.containedBy.name,
          areaTypeKey: entry.containedBy.areaTypeKey,
          kind: 'area',
        },
        resolvedVia: 'containing-authority',
        notice:
          `Showing ${entry.containedBy.name}; this is not a city-only estimate. ` +
          `${entry.name} is a settlement within it, and the figure describes the whole ` +
          'administrative area.',
      });
    } else {
      onResolve({ entry, resolvedVia: 'direct', notice: null });
    }
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="relative">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search for a place, authority or area code
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          id={`${listId}-input`}
          ref={inputRef}
          type="search"
          value={query}
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && results.length > 0 ? `${listId}-option-${activeIndex}` : undefined
          }
          placeholder={placeholder ?? 'Search a place, authority or area code'}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(0);
            onFirstInput?.();
          }}
          onFocus={() => {
            setOpen(true);
            onFirstInput?.();
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 140)}
          onKeyDown={(event) => {
            if (!open || results.length === 0) return;
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActiveIndex((i) => (i + 1) % results.length);
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex((i) => (i - 1 + results.length) % results.length);
            } else if (event.key === 'Enter') {
              event.preventDefault();
              resolve(results[activeIndex]);
            } else if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
          className="h-9 w-full rounded border border-slate-300 bg-white pl-8 pr-2.5 text-sm
                     text-oxford-900 placeholder:text-slate-400
                     focus:outline-none focus:ring-2 focus:ring-brass-700 focus:ring-offset-1"
        />
      </div>

      {open && query.trim().length >= 2 ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="absolute z-40 mt-1 max-h-72 w-full overflow-auto border border-slate-200
                     bg-white shadow-lg scrollbar-thin"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-slate-500">
              {settlementsLoading
                ? 'Loading the place index…'
                : `No match in the bundled index for “${query.trim()}”. Try an authority
                   name or an ONS area code.`}
            </li>
          ) : (
            results.map((entry, index) => (
              <li
                key={`${entry.areaTypeKey}-${entry.code}-${entry.kind}`}
                id={`${listId}-option-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => {
                  event.preventDefault();
                  resolve(entry);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  'flex cursor-pointer items-start gap-2 px-3 py-1.5 text-sm',
                  index === activeIndex && 'bg-accent',
                )}
              >
                {entry.kind === 'settlement' ? (
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                ) : (
                  <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-oxford-900">{entry.name}</span>
                  <span className="block text-2xs text-slate-500">
                    {entry.kind === 'settlement'
                      ? `Settlement in ${entry.nation}${
                          entry.containedBy ? ` — resolves to ${entry.containedBy.name}` : ''
                        }`
                      : `${entry.areaTypeLabel} · ${entry.nation} · ${entry.code}`}
                  </span>
                </span>
                {entry.kind === 'settlement' ? (
                  <Badge tone="warn">settlement</Badge>
                ) : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
