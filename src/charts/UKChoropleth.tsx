import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5map from '@amcharts/amcharts5/map';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import type { MapViewModel, AreaViewModel } from './map-view-model';
import { NON_DATA_STYLES } from './palette';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

export interface UKChoroplethProps {
  readonly viewModel: MapViewModel;
  readonly onSelect: (code: string) => void;
  readonly onHover?: (code: string | null) => void;
  /** Bumped by the caller when the geography layer itself changes. */
  readonly layerKey: string;
  readonly height?: number;
  readonly ariaLabel: string;
}

/**
 * Interactive UK choropleth.
 *
 * Only the UK is drawn: there is no world map, no globe and no background
 * geography. The projection is fitted to the UK bounding box including Northern
 * Ireland and the Scottish islands, so the whole state is visible at first paint.
 *
 * The amCharts root is created once per geography layer. Changing indicator,
 * period or classification updates polygon fills in place rather than remounting
 * the chart, which keeps filtering responsive on a 218-polygon layer.
 */
export function UKChoropleth({
  viewModel, onSelect, onHover, layerKey, height = 560, ariaLabel,
}: UKChoroplethProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<am5.Root | null>(null);
  const seriesRef = useRef<am5map.MapPolygonSeries | null>(null);
  const chartRef = useRef<am5map.MapChart | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const titleId = useId();
  // Styling is applied both from the effect below and from the series'
  // `datavalidated` event, because on first paint the polygons do not exist yet
  // when the effect runs. The ref keeps both paths on the same view model.
  const viewModelRef = useRef(viewModel);
  viewModelRef.current = viewModel;
  const applyStylingRef = useRef<() => void>(() => {});

  // Callbacks are read through refs so that re-rendering the parent never
  // forces the chart to be rebuilt.
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  onSelectRef.current = onSelect;
  onHoverRef.current = onHover;

  const geoJson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: viewModel.areas.map((area) => area.feature),
    }),
    // Geometry only changes when the layer changes; fills are applied separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layerKey],
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const root = am5.Root.new(element);
    root.setThemes(reducedMotion ? [] : [am5themes_Animated.new(root)]);
    // The attribution logo is required for unlicensed use and is left in place.
    rootRef.current = root;

    const chart = root.container.children.push(
      am5map.MapChart.new(root, {
        projection: am5map.geoMercator(),
        panX: 'translateX',
        panY: 'translateY',
        wheelY: 'zoom',
        // Keep the UK filling the frame; no world context is drawn or needed.
        maxZoomLevel: 24,
        minZoomLevel: 0.9,
        paddingTop: 4,
        paddingBottom: 4,
      }),
    );
    chartRef.current = chart;

    const series = chart.series.push(
      am5map.MapPolygonSeries.new(root, {
        geoJSON: geoJson as never,
        valueField: 'value',
        calculateAggregates: false,
      }),
    );
    seriesRef.current = series;

    series.mapPolygons.template.setAll({
      strokeWidth: 0.5,
      stroke: am5.color('#ffffff'),
      interactive: true,
      tooltipText: '{description}',
      // Cursor and a lightened fill signal interactivity; neither encodes a value.
      cursorOverStyle: 'pointer',
    });

    series.mapPolygons.template.states.create('hover', {
      fillOpacity: 0.78,
      strokeWidth: 1.6,
      stroke: am5.color('#141f36'),
    });

    series.mapPolygons.template.events.on('click', (event) => {
      const context = event.target.dataItem?.dataContext as { code?: string } | undefined;
      if (context?.code) onSelectRef.current(context.code);
    });
    series.mapPolygons.template.events.on('pointerover', (event) => {
      const context = event.target.dataItem?.dataContext as { code?: string } | undefined;
      onHoverRef.current?.(context?.code ?? null);
    });
    series.mapPolygons.template.events.on('pointerout', () => {
      onHoverRef.current?.(null);
    });

    const zoomControl = chart.set('zoomControl', am5map.ZoomControl.new(root, {}));
    zoomControl.homeButton.set('visible', true);

    // Fit the UK once geometry is in place, including Northern Ireland and islands,
    // and paint the polygons as soon as they exist.
    series.events.on('datavalidated', () => {
      applyStylingRef.current();
      chart.goHome(0);
    });

    return () => {
      // Every chart root is disposed on unmount; nothing is left holding the DOM node.
      seriesRef.current = null;
      chartRef.current = null;
      rootRef.current = null;
      root.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoJson, reducedMotion]);

  // Apply fills, outlines and descriptions without rebuilding the chart.
  const applyStyling = useCallback(() => {
    const series = seriesRef.current;
    const root = rootRef.current;
    if (!series || !root) return;

    const current = viewModelRef.current;
    const byCode = new Map<string, AreaViewModel>(
      current.areas.map((area) => [area.code, area]),
    );

    series.mapPolygons.each((polygon) => {
      const context = polygon.dataItem?.dataContext as { code?: string } | undefined;
      const area = context?.code ? byCode.get(context.code) : undefined;
      if (!area) return;

      const fill =
        area.render.kind === 'value'
          ? area.render.fill
          : NON_DATA_STYLES[area.render.style].fill;

      polygon.setAll({
        fill: am5.color(fill),
        stroke: am5.color(area.stroke),
        strokeWidth: area.strokeWidth,
        // Selected and compared areas sit above their neighbours so their
        // outline is never clipped by an adjacent polygon.
        layer: area.selectionIndex !== null ? 2 : 0,
        fillPattern:
          area.render.kind === 'non-data' &&
          NON_DATA_STYLES[area.render.style].pattern !== 'none'
            ? am5.LinePattern.new(root, {
                color: am5.color(NON_DATA_STYLES[area.render.style].stroke),
                rotation: NON_DATA_STYLES[area.render.style].pattern === 'hatch' ? 90 : 45,
                strokeWidth: 0.8,
                gap: 4,
                fill: am5.color(NON_DATA_STYLES[area.render.style].fill),
              })
            : undefined,
      });

      // Keep the tooltip and the accessible description in step.
      const dataContext = polygon.dataItem?.dataContext as Record<string, unknown> | undefined;
      if (dataContext) dataContext.description = area.description;
    });
  }, []);

  applyStylingRef.current = applyStyling;

  useEffect(() => {
    applyStyling();
  }, [viewModel, applyStyling]);

  return (
    <div className="relative">
      <h3 id={titleId} className="sr-only">
        {ariaLabel}
      </h3>
      <div
        ref={containerRef}
        role="img"
        aria-labelledby={titleId}
        aria-describedby={`${titleId}-desc`}
        style={{ height }}
        className="w-full bg-white"
      />
      {/* A text alternative to the map; the linked table below is the full one. */}
      <p id={`${titleId}-desc`} className="sr-only">
        {viewModel.subtitle}. {viewModel.classificationNote}{' '}
        {viewModel.counts.withValue} areas have a value,{' '}
        {viewModel.counts.missing} have no published value,{' '}
        {viewModel.counts.suppressed} are suppressed and{' '}
        {viewModel.counts.outsideCoverage} are outside the dataset coverage. The
        accompanying data table lists every area and value.
      </p>
    </div>
  );
}
