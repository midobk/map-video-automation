export { claimSchema, riskLevelSchema, factPackSchema } from './fact-pack';
export type { Claim, RiskLevel, FactPack } from './fact-pack';
export { videoPlanSchema } from './video-plan';
export type { VideoPlan } from './video-plan';
// Re-export the renderer plan schema/type so server actions and components
// in the web app can parse the `video_plan` DB column (which stores the
// renderer plan, not the wrapping VideoPlan) without taking a direct
// dependency on `@mapvideo/renderer`.
export { mapVideoPlanSchema } from '@mapvideo/renderer/compositions/map-video/schema';
export type { MapVideoPlan } from '@mapvideo/renderer/compositions/map-video/schema';
