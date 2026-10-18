import { Mail, ExternalLink } from 'lucide-react';
import { TEAM, AFFILIATION_NOTICE, type TeamMember } from '@/data/team';
import { Badge } from '@/components/ui/misc';

const BASE = import.meta.env.BASE_URL ?? '/';

/**
 * Project team.
 *
 * Photographs are served from this origin rather than hotlinked: the
 * Content-Security-Policy restricts `img-src` to `'self'`, so an external image
 * URL would simply not render, and self-hosting also avoids depending on
 * another site staying up.
 */
export function TeamSection({ heading = 'Team' }: { heading?: string }) {
  return (
    <section aria-labelledby="team-heading" className="space-y-5">
      <div className="max-w-3xl">
        <h2 id="team-heading" className="text-lg font-semibold leading-tight text-oxford-900">
          {heading}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          This atlas is built and maintained by a small team combining respiratory and
          environmental health epidemiology with research data engineering.
        </p>
      </div>

      <ul className="space-y-5">
        {TEAM.map((member) => (
          <li key={member.id}>
            <MemberCard member={member} />
          </li>
        ))}
      </ul>

      <aside
        className="max-w-3xl border-l-2 border-amber-500 bg-amber-50/50 py-2.5 pl-3 pr-3"
        aria-label="Affiliation notice"
      >
        <h3 className="label-caps mb-1">On affiliations</h3>
        <p className="text-xs leading-relaxed text-amber-950">{AFFILIATION_NOTICE}</p>
      </aside>
    </section>
  );
}

function MemberCard({ member }: { member: TeamMember }) {
  return (
    <article className="panel flex flex-col gap-4 p-4 sm:flex-row sm:gap-5">
      <div className="shrink-0">
        <img
          src={`${BASE}${member.photo}`}
          alt={`Portrait of ${member.name}`}
          width={132}
          height={132}
          loading="lazy"
          decoding="async"
          className="h-28 w-28 rounded border border-slate-200 object-cover sm:h-32 sm:w-32"
        />
        <p className="mt-1.5 max-w-[8.25rem] font-figure text-[9px] leading-snug text-slate-400">
          {member.photoCredit}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <header>
          <h3 className="text-base font-semibold leading-snug text-oxford-900">
            {member.name}
            {member.postNominals ? (
              <span className="font-normal text-slate-600">, {member.postNominals}</span>
            ) : null}
          </h3>
          <p className="mt-0.5 text-sm font-medium text-brass-700">{member.role}</p>
          <p className="mt-0.5 font-figure text-2xs text-slate-500">{member.roleDetail}</p>
        </header>

        <div className="mt-2.5 space-y-2">
          {member.biography.map((paragraph, index) => (
            <p key={index} className="text-xs leading-relaxed text-slate-700">
              {paragraph}
            </p>
          ))}
        </div>

        {member.expertise.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1" aria-label={`Expertise of ${member.name}`}>
            {member.expertise.map((item) => (
              <li key={item}>
                <Badge tone="neutral">{item}</Badge>
              </li>
            ))}
          </ul>
        ) : null}

        {member.email || member.links?.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            {member.email ? (
              <a
                href={`mailto:${member.email}`}
                className="inline-flex items-center gap-1 font-figure text-2xs text-brass-700
                           underline-offset-2 hover:underline focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-brass-700"
              >
                <Mail className="h-3 w-3" aria-hidden />
                {member.email}
              </a>
            ) : null}
            {member.links?.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 font-figure text-2xs text-brass-700
                           underline-offset-2 hover:underline focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-brass-700"
              >
                <ExternalLink className="h-3 w-3" aria-hidden />
                {link.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
