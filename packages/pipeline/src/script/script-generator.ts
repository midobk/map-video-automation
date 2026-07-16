import type { FactPack } from '../schemas/fact-pack';
import { videoPlanSchema, type VideoPlan } from '../schemas/video-plan';
import { neutralDarkTheme } from '@mapvideo/renderer/themes/examples';
import type { MapVideoPlan, MapVideoScene } from '@mapvideo/renderer/compositions/map-video/schema';

const DEFAULT_TRANSITION_SECONDS = 0.5;
const SCENE_PADDING_SECONDS = 0;

/**
 * Turn a validated fact pack into a renderer-ready video plan.
 *
 * Strategy:
 * - Title scene: topic + summary teaser.
 * - Map-highlight scene: highlight the first few entities.
 * - Comparison scene: land vs water placeholder when claims include percentages.
 * - Outro scene: call to action.
 *
 * Narration text is attached to each scene's `voiceoverText` field for captioning.
 */
export function generateVideoPlan(
  factPack: FactPack,
  options: { projectId?: string; targetDurationSeconds?: number } = {},
): VideoPlan {
  const projectId = options.projectId ?? 'generated';
  const targetDurationSeconds = options.targetDurationSeconds ?? 30;

  const scenes: MapVideoScene[] = [];
  const narrationBySceneId: Record<string, string> = {};

  const titleNarration = `${factPack.topic}. ${factPack.summary.slice(0, 200)}`;
  const titleScene: MapVideoScene = {
    id: 'title',
    kind: 'title',
    durationSeconds: 4,
    title: factPack.topic,
    subtitle: factPack.summary.slice(0, 120),
    caption: factPack.summary.slice(0, 120),
    captionLanguage: 'en',
    voiceoverText: titleNarration,
  };
  scenes.push(titleScene);
  narrationBySceneId.title = titleNarration;

  const entities = factPack.entities.slice(0, 6);
  if (entities.length > 0) {
    const mapNarration = `Key regions include ${entities.join(', ')}.`;
    const mapScene: MapVideoScene = {
      id: 'map-highlight',
      kind: 'map-highlight',
      durationSeconds: 6,
      label: 'Key regions',
      highlighted: entities,
      mapAsset: 'fixtures/maps/world.svg',
      caption: `Featuring ${entities.slice(0, 4).join(', ')}.`,
      captionLanguage: 'en',
      voiceoverText: mapNarration,
    };
    scenes.push(mapScene);
    narrationBySceneId[mapScene.id] = mapNarration;
  }

  const numericClaims = extractNumericClaims(factPack.claims);
  if (numericClaims.length >= 2) {
    const left = numericClaims[0]!;
    const right = numericClaims[1]!;
    const comparisonNarration = `By the numbers: ${left.label} is ${left.value}, while ${right.label} is ${right.value}.`;
    const comparisonScene: MapVideoScene = {
      id: 'comparison',
      kind: 'comparison',
      durationSeconds: 5,
      title: 'By the numbers',
      left: { label: left.label, value: left.value },
      right: { label: right.label, value: right.value },
      caption: `${left.label}: ${left.value} · ${right.label}: ${right.value}`,
      captionLanguage: 'en',
      voiceoverText: comparisonNarration,
    };
    scenes.push(comparisonScene);
    narrationBySceneId[comparisonScene.id] = comparisonNarration;
  }

  const outroNarration = 'Review the video and approve it when ready.';
  const outroScene: MapVideoScene = {
    id: 'outro',
    kind: 'outro',
    durationSeconds: 4,
    title: 'Explore more',
    subtitle: 'Generated for human review',
    caption: 'Review before publishing.',
    captionLanguage: 'en',
    voiceoverText: outroNarration,
  };
  scenes.push(outroScene);
  narrationBySceneId[outroScene.id] = outroNarration;

  const rendererPlan: MapVideoPlan = {
    theme: neutralDarkTheme,
    projectId,
    transitionSeconds: DEFAULT_TRANSITION_SECONDS,
    scenes: scaleDurations(scenes, targetDurationSeconds),
  };

  return videoPlanSchema.parse({
    rendererPlan,
    narrationBySceneId,
    totalDurationSeconds: rendererPlan.scenes.reduce(
      (sum, scene) => sum + scene.durationSeconds,
      0,
    ),
  });
}

function extractNumericClaims(claims: FactPack['claims']): { label: string; value: string }[] {
  const found: { label: string; value: string }[] = [];
  for (const claim of claims) {
    const match = claim.text.match(/(\d+(?:\.\d+)?%)/u);
    if (match) {
      const label = claim.text.split(' ').slice(0, 4).join(' ');
      found.push({ label, value: match[1] ?? '' });
    }
  }
  return found;
}

/**
 * Scale scene durations proportionally to hit the target duration.
 * Never shrink below 1.5 seconds so captions remain readable.
 */
function scaleDurations(scenes: MapVideoScene[], targetSeconds: number): MapVideoScene[] {
  const totalSeconds = scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
  if (totalSeconds <= 0) return scenes;

  const scale = targetSeconds / totalSeconds;
  return scenes.map((scene) => {
    const scaled = Math.max(1.5, scene.durationSeconds * scale - SCENE_PADDING_SECONDS);
    return { ...scene, durationSeconds: Math.min(30, scaled) };
  });
}
