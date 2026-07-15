import React, { useMemo } from 'react';
import { geoPath } from 'd3-geo';
import { createProjection, interpolateProjectionState } from './projections';
import { allCountries, findFeaturesByIsoCodes, landFeature } from './topology';
import type { Feature, Geometry } from 'geojson';
import type { VideoTheme } from '../themes/theme-schema';
import type { MapLabel, ProjectionName } from './types';

export interface MapCanvasProps {
  width: number;
  height: number;
  theme: VideoTheme;
  projection?: ProjectionName;
  focusIsoCodes?: readonly string[];
  contextIsoCodes?: readonly string[];
  labels?: readonly MapLabel[];
  zoomProgress?: number;
}

interface ResolvedColors {
  ocean: string;
  land: string;
  border: string;
  highlight: string;
  context: string;
  label: string;
}

function resolveMapColors(theme: VideoTheme): ResolvedColors {
  const map = theme.map;
  return {
    ocean: map?.ocean ?? theme.colors.background,
    land: map?.land ?? theme.colors.surface,
    border: map?.border ?? theme.colors.mutedText,
    highlight: map?.highlight ?? theme.colors.accent,
    context: map?.land ?? theme.colors.surface,
    label: map?.label ?? theme.colors.text,
  };
}

/**
 * Render a deterministic D3 Geo vector map for a map-highlight scene.
 *
 * - Ocean and land masses come from Natural Earth (via world-atlas).
 * - Focus and context countries are resolved through the ISO country dictionary.
 * - Projection state is interpolated between a world view and a fitted focus
 *   view based on `zoomProgress`.
 */
export const MapCanvas: React.FC<MapCanvasProps> = ({
  width,
  height,
  theme,
  projection: projectionName = 'natural-earth',
  focusIsoCodes = [],
  contextIsoCodes = [],
  labels = [],
  zoomProgress = 0,
}) => {
  const colors = resolveMapColors(theme);

  const { currentProjection, focusFeatures, contextFeatures } = useMemo(() => {
    const projectionFactory = () => createProjection(projectionName);
    const projection = projectionFactory();

    // World fit: show the full land mass at the start of the zoom.
    projection.fitSize([width, height], landFeature);
    const initialState = {
      rotate: projection.rotate().slice(0, 2) as [number, number],
      scale: projection.scale(),
      translate: projection.translate().slice() as [number, number],
    };

    // Focus fit: zoom to the requested countries, or fall back to the world view.
    const focusFeatures = findFeaturesByIsoCodes(focusIsoCodes);
    const contextFeatures = findFeaturesByIsoCodes(contextIsoCodes);
    const focusCollection: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
      type: 'FeatureCollection',
      features: focusFeatures,
    };

    let targetState = initialState;
    if (focusFeatures.length > 0) {
      const focusProjection = projectionFactory();
      focusProjection.fitSize([width, height], focusCollection);
      targetState = {
        rotate: focusProjection.rotate().slice(0, 2) as [number, number],
        scale: focusProjection.scale(),
        translate: focusProjection.translate().slice() as [number, number],
      };
    }

    const currentState = interpolateProjectionState(
      initialState,
      targetState,
      Math.max(0, Math.min(1, zoomProgress)),
    );

    projection.rotate([currentState.rotate[0], currentState.rotate[1]]);
    projection.scale(currentState.scale);
    projection.translate([currentState.translate[0], currentState.translate[1]]);

    return {
      currentProjection: projection,
      focusFeatures,
      contextFeatures,
    };
  }, [width, height, projectionName, focusIsoCodes, contextIsoCodes, zoomProgress]);

  const pathGenerator = useMemo(() => geoPath().projection(currentProjection), [currentProjection]);

  // Country path strings are computed once per render.
  const landPath = useMemo(() => pathGenerator(landFeature) ?? undefined, [pathGenerator]);
  const countryPaths = useMemo(() => {
    return allCountries.features.map((feature: Feature<Geometry>) => ({
      d: pathGenerator(feature) ?? undefined,
      name: (feature.properties?.name as string | undefined) ?? '',
    }));
  }, [pathGenerator]);

  const focusNames = useMemo(
    () => new Set(focusFeatures.map((f) => (f.properties?.name as string | undefined) ?? '')),
    [focusFeatures],
  );
  const contextNames = useMemo(
    () => new Set(contextFeatures.map((f) => (f.properties?.name as string | undefined) ?? '')),
    [contextFeatures],
  );

  const labelPositions = useMemo(() => {
    return labels
      .map((label) => {
        const [x, y] = currentProjection([label.longitude, label.latitude]) ?? [
          undefined,
          undefined,
        ];
        if (x === undefined || y === undefined) {
          return null;
        }
        if (x < -50 || x > width + 50 || y < -50 || y > height + 50) {
          return null;
        }
        return { ...label, x, y };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [labels, currentProjection, width, height]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        backgroundColor: colors.ocean,
        borderRadius: theme.borderRadius,
        overflow: 'hidden',
      }}
    >
      <g>
        {landPath && <path d={landPath} fill={colors.land} stroke="none" />}
        {countryPaths.map(({ d, name }, index) => {
          if (!d) {
            return null;
          }
          const isFocus = focusNames.has(name);
          const isContext = contextNames.has(name);
          const fill = isFocus ? colors.highlight : isContext ? colors.context : colors.land;
          return (
            <path
              key={name || `country-${index}`}
              d={d}
              fill={fill}
              stroke={colors.border}
              strokeWidth={isFocus ? 1.5 : 0.5}
              opacity={isContext ? 0.85 : 1}
            />
          );
        })}
      </g>

      {labelPositions.map((label) => (
        <text
          key={label.text}
          x={label.x}
          y={label.y}
          fill={colors.label}
          fontSize={24}
          fontWeight={600}
          textAnchor="middle"
          style={{ textShadow: `0 2px 4px ${colors.ocean}` }}
        >
          {label.text}
        </text>
      ))}
    </svg>
  );
};
