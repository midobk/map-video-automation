import { safetyDefaults } from '@mapvideo/shared';

export default function HomePage() {
  return (
    <main>
      <p className="eyebrow">PHASE 0 · LOCAL FOUNDATION</p>
      <h1>Map Video Automation</h1>
      <p className="lede">
        A deterministic, source-backed production system for vertical map videos. Real providers and
        publishing remain disabled while the foundation is validated.
      </p>
      <section aria-labelledby="safety-title">
        <h2 id="safety-title">Safety defaults</h2>
        <dl>
          <div>
            <dt>Provider mode</dt>
            <dd>{safetyDefaults.providerMode}</dd>
          </div>
          <div>
            <dt>Publisher mode</dt>
            <dd>{safetyDefaults.publisherMode}</dd>
          </div>
          <div>
            <dt>Publishing kill switch</dt>
            <dd>{String(safetyDefaults.publishingKillSwitch)}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
