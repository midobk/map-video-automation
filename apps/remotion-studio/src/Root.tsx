import React from 'react';
import { Composition, Folder } from 'remotion';
import type { AnyZodObject, CalculateMetadataFunction } from 'remotion';
import {
  starterComposition,
  mapVideoComposition,
  mapVideoRtlComposition,
  mapVideoCountryZoomComposition,
  mapVideoRankingComposition,
} from '@mapvideo/renderer';
import type { AnyCompositionDefinition } from '@mapvideo/renderer';

const compositions: AnyCompositionDefinition[] = [
  starterComposition,
  mapVideoComposition,
  mapVideoRtlComposition,
  mapVideoCountryZoomComposition,
  mapVideoRankingComposition,
];

function RegisteredComposition({ def }: { def: AnyCompositionDefinition }) {
  return (
    <Composition<AnyZodObject, Record<string, unknown>>
      id={def.id}
      component={def.component as React.ComponentType<Record<string, unknown>>}
      schema={def.schema as AnyZodObject}
      calculateMetadata={
        def.calculateMetadata as CalculateMetadataFunction<Record<string, unknown>>
      }
      fps={def.fps}
      width={def.width}
      height={def.height}
      durationInFrames={def.durationInFrames}
      defaultProps={def.defaultProps as Record<string, unknown>}
    />
  );
}

export const RemotionRoot: React.FC = () => {
  return (
    <Folder name="fixtures">
      {compositions.map((def) => (
        <RegisteredComposition key={def.id} def={def} />
      ))}
    </Folder>
  );
};
