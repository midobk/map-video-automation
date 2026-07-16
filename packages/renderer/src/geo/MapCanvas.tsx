import React, { useMemo } from 'react';
import { geoPath } from 'd3-geo';
import type { Feature, Geometry } from 'geojson';
import type { VideoTheme } from '../themes/theme-schema';
import {
  createProjection,
  fitProjectionState,
  interpolateProjectionState,
  isPointVisibleOnProjection,
} from './projections';
import {
  allCountries,
  countryIso3ForFeature,
  featureCollectionFromIsoCodes,
  landFeature,
} from './topology';
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

function resolveMapColors(theme: VideoTheme) {
  return {
    ocean: theme.map?.ocean ?? theme.colors.background,
    land: theme.map?.land ?? theme.colors.surface,
    border: theme.map?.border ?? theme.colors.mutedText,
    highlight: theme.map?.highlight ?? theme.colors.accent,
    context: theme.map?.context ?? theme.colors.surface,
    label: theme.map?.label ?? theme.colors.text,
  };
}

/** Render an offline, deterministic Natural Earth vector map. */
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

  const currentProjection = useMemo(() => {
    const initialState = fitProjectionState(
      projectionName,
      [width, height],
      landFeature,
      { padding: 24 },
    );
    const focusCollection = featureCollectionFromIsoCodes(focusIsoCodes);
    const targetState =
      focusCollection.features.length === 0
        ? initialState
        : fitProjectionState(projectionName, [width, height], focusCollection, {
            padding: 96,
            centerOnFeature: true,
          });
    const state = interpolateProjectionState(initialState, targetState, zoomProgress);
    return createProjection(projectionName)
      .rotate([state.rotate[0], state.rotate[1], 0])
      .scale(state.scale)
      .translate([state.translate[0], state.translate[1]]);
  }, [focusIsoCodes, height, projectionName, width, zoomProgress]);

  const pathGenerator = useMemo(() => geoPath().projection(currentProjection), [currentProjection]);
  const landPath = useMemo(() => pathGenerator(landFeature) ?? undefined, [pathGenerator]);
  const focusSet = useMemo(() => new Set(focusIsoCodes), [focusIsoCodes]);
  const contextSet = useMemo(() => new Set(contextIsoCodes), [contextIsoCodes]);

  const countryPaths = useMemo(
    () =>
      allCountries.features.map((country: Feature<Geometry>, index) => ({
        d: pathGenerator(country) ?? undefined,
        key:
          typeof country.properties?.name === 'string'
            ? country.properties.name
            : `country-${index}`,
        iso3: countryIso3ForFeature(country),
      })),
    [pathGenerator],
  );

  const labelPositions = useMemo(() => {
    const projectionRotation = currentProjection.rotate();
    const rotation: [number, number] = [
      projectionRotation[0] ?? 0,
      projectionRotation[1] ?? 0,
    ];

    return labels.flatMap((label, index) => {
      const point: [number, number] = [label.longitude, label.latitude];
      if (!isPointVisibleOnProjection(projectionName, rotation, point)) return [];

      const projected = currentProjection(point);
      if (!projected) return [];
      const [x, y] = projected;
      if (x < -50 || x > width + 50 || y < -50 || y > height + 50) return [];
      return [{ ...label, x, y, key: `${label.text}:${label.longitude}:${label.latitude}:${index}` }];
    });
  }, [currentProjection, height, labels, projectionName, width]);

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
        {countryPaths.map(({ d, key, iso3 }) => {
          if (!d) return null;
          const isFocus = iso3 !== undefined && focusSet.has(iso3);
          const isContext = iso3 !== undefined && contextSet.has(iso3);
          const fill = isFocus ? colors.highlight : isContext ? colors.context : colors.land;
          return (
            <path
              key={key}
              d={d}
              fill={fill}
              stroke={colors.border}
              strokeWidth={isFocus ? 1.5 : 0.5}
              opacity={isContext ? 0.9 : 1}
            />
          );
        })}
      </g>
      {labelPositions.map((label) => (
        <text
          key={label.key}
          x={label.x}
          y={label.y}
          fill={colors.label}
          fontSize={24}
          fontWeight={600}
          textAnchor="middle"
          style={{ paintOrder: 'stroke', stroke: colors.ocean, strokeWidth: 5 }}
        >
          {label.text}
        </text>
      ))}
    </svg>
  );
};
