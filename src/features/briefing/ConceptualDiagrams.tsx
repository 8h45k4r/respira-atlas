import { useState } from 'react';
import type { Indicator } from '@/data/schemas/manifest';
import { Button } from '@/components/ui/button';
import { Badge, Label } from '@/components/ui/misc';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { downloadSvg } from '@/export/download';
import {
  svgDocument, rect, text, path, line, paragraph, escapeXml,
} from '@/export/svg-primitives';

type DiagramKind = 'pathway' | 'cohort' | 'evidence-to-decision';

const DIAGRAMS: { value: DiagramKind; label: string; hint: string }[] = [
  { value: 'pathway', label: 'Exposure → pathway → outcome', hint: 'Hypothesised mechanism' },
  { value: 'cohort', label: 'Prospective cohort study design', hint: 'Study schematic' },
  { value: 'evidence-to-decision', label: 'Evidence-to-decision workflow', hint: 'Process diagram' },
];

const INK = {
  box: '#ffffff', boxStroke: '#334155', text: '#141f36', muted: '#475569',
  accent: '#1f6563', hypothesis: '#8a5a1b',
};

function boxNode(x: number, y: number, w: number, h: number, label: string, sub?: string) {
  const parts = [rect(x, y, w, h, { fill: INK.box, stroke: INK.boxStroke, strokeWidth: 1.2, rx: 2 })];
  const lines = label.split('\n');
  const startY = y + h / 2 - ((lines.length - 1) * 13) / 2 + (sub ? -5 : 4);
  lines.forEach((l, i) => {
    parts.push(text(l, {
      x: x + w / 2, y: startY + i * 13, size: 11.5, weight: 600,
      fill: INK.text, anchor: 'middle',
    }));
  });
  if (sub) {
    parts.push(text(sub, {
      x: x + w / 2, y: y + h - 9, size: 9.5, fill: INK.muted, anchor: 'middle',
    }));
  }
  return parts.join('\n');
}

function arrow(x1: number, y1: number, x2: number, y2: number, dashed = false, label?: string) {
  const parts = [
    line(x1, y1, x2, y2, {
      stroke: dashed ? INK.hypothesis : INK.accent,
      strokeWidth: 1.5,
      dash: dashed ? '4 3' : undefined,
    }),
  ];
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = 6;
  const p1x = x2 - size * Math.cos(angle - Math.PI / 7);
  const p1y = y2 - size * Math.sin(angle - Math.PI / 7);
  const p2x = x2 - size * Math.cos(angle + Math.PI / 7);
  const p2y = y2 - size * Math.sin(angle + Math.PI / 7);
  parts.push(
    path(`M ${x2},${y2} L ${p1x},${p1y} L ${p2x},${p2y} Z`, {
      fill: dashed ? INK.hypothesis : INK.accent,
    }),
  );
  if (label) {
    parts.push(text(label, {
      x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 5, size: 9,
      fill: dashed ? INK.hypothesis : INK.muted, anchor: 'middle',
    }));
  }
  return parts.join('\n');
}

/**
 * Conceptual diagrams.
 *
 * These are labelled conceptual figures, not data. No arrow here carries a
 * quantified effect, no box carries a count, and every hypothesised link is
 * drawn dashed and labelled as a hypothesis — so a reader cannot mistake the
 * diagram for an estimated causal model or a measured patient flow.
 */
export function ConceptualDiagrams({ indicator }: { indicator: Indicator }) {
  const [kind, setKind] = useState<DiagramKind>('pathway');
  const svg = buildDiagram(kind, indicator);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3 no-print">
        <div className="w-full max-w-sm">
          <Label htmlFor="diagram-kind">Diagram</Label>
          <Select value={kind} onValueChange={(value) => setKind(value as DiagramKind)}>
            <SelectTrigger id="diagram-kind" className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DIAGRAMS.map((option) => (
                <SelectItem key={option.value} value={option.value} hint={option.hint}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="warn">Conceptual figure — contains no data</Badge>
          <Button
            variant="teal"
            size="sm"
            onClick={() => downloadSvg(svg, `conceptual-${kind}`)}
          >
            Download editable SVG
          </Button>
        </div>
      </div>

      <div
        className="border border-slate-200 bg-white p-3 [&_svg]:h-auto [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      <p className="font-figure text-2xs leading-relaxed text-slate-600">
        Every element is a vector shape with live text, so the downloaded file can be
        edited in Illustrator, Inkscape or Figma. Dashed arrows are hypothesised
        relationships, not estimated effects; no quantity is attached to any arrow.
      </p>
    </div>
  );
}

function buildDiagram(kind: DiagramKind, indicator: Indicator): string {
  const width = 900;

  if (kind === 'pathway') {
    const height = 400;
    const body = [
      text('Conceptual pathway: exposure to respiratory outcome', {
        x: 20, y: 26, size: 15, weight: 600, fill: INK.text,
      }),
      text(
        'A hypothesised mechanism, drawn for teaching and discussion. It is not estimated from these data.',
        { x: 20, y: 44, size: 10.5, fill: INK.muted },
      ),
      boxNode(20, 110, 160, 66, 'Environmental\nexposure', 'e.g. ambient PM2.5'),
      boxNode(220, 110, 160, 66, 'Personal\nexposure', 'dose actually received'),
      boxNode(420, 110, 160, 66, 'Biological\nresponse', 'inflammation, remodelling'),
      boxNode(620, 110, 160, 66, 'Respiratory\noutcome', indicator.domainLabel.toLowerCase()),
      boxNode(220, 230, 160, 56, 'Deprivation', 'confounder'),
      boxNode(420, 230, 160, 56, 'Smoking', 'confounder and exposure'),
      boxNode(620, 230, 160, 56, 'Occupational\nexposure', 'often unmeasured'),
      arrow(180, 143, 220, 143, true),
      arrow(380, 143, 420, 143, true),
      arrow(580, 143, 620, 143, true),
      arrow(300, 230, 300, 178, true),
      arrow(500, 230, 500, 178, true),
      arrow(700, 230, 700, 178, true),
      text('— — —  dashed arrow = hypothesised relationship, not a measured effect', {
        x: 20, y: 330, size: 10, fill: INK.hypothesis,
      }),
    ];
    const caveat = paragraph(
      'This atlas measures the right-hand box at area level. It does not measure personal ' +
        'exposure or biological response, and it cannot estimate any of the arrows. An ' +
        'area-level association between an exposure measure and this outcome is consistent ' +
        'with this diagram but does not demonstrate it.',
      { x: 20, y: 352, size: 10, fill: INK.muted, maxWidth: width - 40, lineHeight: 14 },
    );
    return svgDocument([...body, caveat.svg].join('\n'), {
      width, height, title: 'Conceptual pathway from exposure to respiratory outcome',
      description:
        'A conceptual diagram with four stages — environmental exposure, personal exposure, ' +
        'biological response, respiratory outcome — linked by dashed hypothesised arrows, ' +
        'with deprivation, smoking and occupational exposure shown as confounders. ' +
        'It contains no data.',
    });
  }

  if (kind === 'cohort') {
    const height = 380;
    const body = [
      text('Prospective cohort study design', {
        x: 20, y: 26, size: 15, weight: 600, fill: INK.text,
      }),
      text('A schematic of study structure. No participants, counts or results are shown.', {
        x: 20, y: 44, size: 10.5, fill: INK.muted,
      }),
      line(20, 300, 880, 300, { stroke: INK.boxStroke, strokeWidth: 1.2 }),
      text('time', { x: 870, y: 318, size: 10, fill: INK.muted, anchor: 'end' }),
      boxNode(20, 90, 150, 70, 'Define\nsource population', 'eligibility criteria'),
      boxNode(200, 90, 150, 70, 'Measure exposure\nat baseline', 'before outcome occurs'),
      boxNode(380, 70, 150, 54, 'Exposed', 'no outcome at baseline'),
      boxNode(380, 140, 150, 54, 'Unexposed', 'no outcome at baseline'),
      boxNode(580, 70, 150, 54, 'Outcome /\nno outcome'),
      boxNode(580, 140, 150, 54, 'Outcome /\nno outcome'),
      boxNode(770, 105, 110, 54, 'Compare\nincidence'),
      arrow(170, 125, 200, 125),
      arrow(350, 110, 380, 97),
      arrow(350, 140, 380, 167),
      arrow(530, 97, 580, 97),
      arrow(530, 167, 580, 167),
      arrow(730, 97, 770, 125),
      arrow(730, 167, 770, 135),
      text('follow-up', { x: 555, y: 215, size: 9.5, fill: INK.muted, anchor: 'middle' }),
      line(380, 300, 380, 290, { stroke: INK.boxStroke }),
      text('baseline', { x: 380, y: 288, size: 9.5, fill: INK.muted, anchor: 'middle' }),
      line(730, 300, 730, 290, { stroke: INK.boxStroke }),
      text('end of follow-up', { x: 730, y: 288, size: 9.5, fill: INK.muted, anchor: 'middle' }),
    ];
    const caveat = paragraph(
      'Exposure is measured before the outcome occurs, which is what distinguishes a ' +
        'prospective cohort from the cross-sectional, area-level data in this atlas. The ' +
        'figures in this atlas are a snapshot by place, and cannot establish the temporal ' +
        'order this design depends on.',
      { x: 20, y: 332, size: 10, fill: INK.muted, maxWidth: width - 40, lineHeight: 14 },
    );
    return svgDocument([...body, caveat.svg].join('\n'), {
      width, height, title: 'Prospective cohort study design',
      description:
        'A schematic of a prospective cohort: source population, baseline exposure ' +
        'measurement, exposed and unexposed groups followed over time to outcome, then ' +
        'comparison of incidence. It contains no data.',
    });
  }

  const height = 420;
  const steps = [
    ['1. Describe', 'What is the pattern\nby place?', 'this atlas'],
    ['2. Question', 'Is the difference\nsupported?', 'intervals, flags'],
    ['3. Explain', 'What could\naccount for it?', 'ascertainment, need'],
    ['4. Evidence', 'What does the\nliterature show?', 'outside this atlas'],
    ['5. Options', 'What could\nbe done?', 'effect evidence needed'],
    ['6. Decide', 'What is\nproportionate?', 'values and resources'],
  ];
  const body = [
    text('Evidence-to-decision workflow', {
      x: 20, y: 26, size: 15, weight: 600, fill: INK.text,
    }),
    text(
      'Where this atlas sits in a decision process, and where it stops.',
      { x: 20, y: 44, size: 10.5, fill: INK.muted },
    ),
  ];
  steps.forEach((step, index) => {
    const x = 20 + index * 146;
    body.push(rect(x, 90, 130, 96, {
      fill: index < 3 ? '#effbf9' : INK.box,
      stroke: index < 3 ? INK.accent : INK.boxStroke,
      strokeWidth: 1.2, rx: 2,
    }));
    body.push(text(step[0], { x: x + 10, y: 108, size: 10, weight: 600, fill: INK.accent }));
    step[1].split('\n').forEach((l, i) => {
      body.push(text(l, { x: x + 10, y: 128 + i * 13, size: 11, weight: 500, fill: INK.text }));
    });
    body.push(text(step[2], { x: x + 10, y: 174, size: 9, fill: INK.muted }));
    if (index < steps.length - 1) {
      body.push(arrow(x + 130, 138, x + 146, 138));
    }
  });
  body.push(
    rect(20, 212, 422, 26, { fill: '#effbf9', stroke: INK.accent, strokeWidth: 1 }),
    text('Supported by this atlas', {
      x: 231, y: 229, size: 10.5, weight: 600, fill: INK.accent, anchor: 'middle',
    }),
    rect(458, 212, 422, 26, { fill: '#ffffff', stroke: INK.hypothesis, strokeWidth: 1, }),
    text('Requires evidence this atlas does not contain', {
      x: 669, y: 229, size: 10.5, weight: 600, fill: INK.hypothesis, anchor: 'middle',
    }),
  );
  const caveat = paragraph(
    'This atlas describes variation and its uncertainty. It cannot tell you whether an ' +
      'intervention works: that needs evidence of effect from trials or well-designed ' +
      'observational studies, not evidence of geographic variation. Treating step 1 as if ' +
      'it answered step 5 is the most common misuse of a map like this.',
    { x: 20, y: 268, size: 10.5, fill: INK.muted, maxWidth: width - 40, lineHeight: 15 },
  );
  body.push(caveat.svg);
  body.push(
    text(escapeXml('Conceptual figure. Contains no data and no quantified effects.'), {
      x: 20, y: height - 18, size: 9.5, fill: INK.hypothesis,
    }),
  );
  return svgDocument(body.join('\n'), {
    width, height, title: 'Evidence-to-decision workflow',
    description:
      'A six-step workflow from describing a pattern to making a decision, with the first ' +
      'three steps marked as supported by this atlas and the last three as requiring ' +
      'evidence it does not contain. It contains no data.',
  });
}
