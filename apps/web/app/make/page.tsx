'use client';

import { useState } from 'react';
import Link from 'next/link';
import { generateVideoFromTopic } from '../../lib/actions/content';
import {
  DEFAULT_DURATION_SECONDS,
  isDurationValid,
  MAX_DURATION_SECONDS,
  MIN_DURATION_SECONDS,
} from '../../lib/duration';

interface MakeResult {
  renderUrl: string | null;
  durationSeconds: number;
  message: string;
}

/**
 * MVP fast path: type a topic → get a narrated map video you can play and
 * download. Skips the dashboard's research-review/approval workflow; the
 * created item still lands on `/dashboard` for later review.
 */
export default function MakePage() {
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState<number>(DEFAULT_DURATION_SECONDS);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MakeResult | null>(null);

  const durationInvalid = !isDurationValid(duration);
  const topicEmpty = topic.trim().length === 0;
  const disabled = pending || topicEmpty || durationInvalid;

  async function handleGenerate() {
    if (disabled) return;
    setPending(true);
    setError(null);
    setResult(null);

    const trimmed = topic.trim();
    const outcome = await generateVideoFromTopic({
      // Derive a title from the topic so the user only types one field.
      title: trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed,
      topicPrompt: trimmed,
      language: 'en',
      targetDurationSeconds: duration,
    });

    setPending(false);

    if (!outcome.success) {
      setError(outcome.error);
      return;
    }

    setResult({
      renderUrl: outcome.renderUrl,
      durationSeconds: outcome.durationSeconds,
      message: outcome.message,
    });
  }

  return (
    <>
      <div className="dashboard-header">
        <h1>Make a video</h1>
      </div>
      <p className="lede">
        Type a geography topic, pick a length, and generate a narrated map video.
        Real AI research + voice narration run locally and the MP4 renders to
        your machine.
      </p>

      <section className="dashboard-form">
        {error && (
          <div className="dashboard-error" role="alert">
            {error}
          </div>
        )}

        <label htmlFor="topic">Topic</label>
        <textarea
          id="topic"
          rows={4}
          maxLength={2000}
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="e.g. The Nile river and its two major tributaries"
          disabled={pending}
        />

        <label className="dashboard-duration-field" style={{ marginTop: 12 }}>
          <span>Duration</span>
          <input
            type="number"
            min={MIN_DURATION_SECONDS}
            max={MAX_DURATION_SECONDS}
            step={1}
            value={duration}
            disabled={pending}
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              setDuration(Number.isNaN(next) ? DEFAULT_DURATION_SECONDS : next);
            }}
            aria-invalid={durationInvalid}
            aria-label="Target duration in seconds"
          />
          <span>s</span>
        </label>
        {!durationInvalid ? null : (
          <p className="dashboard-hint dashboard-message-warning" role="alert">
            Duration must be an integer between {MIN_DURATION_SECONDS}s and {MAX_DURATION_SECONDS}s.
          </p>
        )}

        <button
          type="button"
          className="dashboard-button"
          disabled={disabled}
          onClick={handleGenerate}
          style={{ marginTop: 16 }}
        >
          {pending ? 'Rendering…' : 'Generate video'}
        </button>
      </section>

      {result && (
        <section className="dashboard-preview-block" style={{ marginTop: 24 }}>
          <div
            className={result.renderUrl ? 'dashboard-message' : 'dashboard-error'}
            role={result.renderUrl ? 'status' : 'alert'}
          >
            {result.message}
          </div>
          <div className="dashboard-preview">
            {result.renderUrl ? (
              <video
                src={result.renderUrl}
                controls
                preload="metadata"
                style={{ width: '100%', maxHeight: 480, borderRadius: 8 }}
              />
            ) : (
              <div className="dashboard-preview-placeholder">
                <p>No downloadable MP4 was produced.</p>
                <p className="dashboard-hint">
                  {/skipped in cloud render mode/i.test(result.message) ? (
                    <>Run locally with <code>RENDER_MODE=local</code> to produce a preview.</>
                  ) : (
                    <>See the message above for what went wrong, then try again.</>
                  )}
                </p>
              </div>
            )}
          </div>
          {result.renderUrl && (
            <div className="dashboard-button-row" style={{ marginTop: 16, gap: 12 }}>
              <a href={result.renderUrl} download className="dashboard-button">
                Download MP4
              </a>
              <button
                type="button"
                className="dashboard-button"
                onClick={() => setResult(null)}
              >
                Make another
              </button>
            </div>
          )}
          <p className="dashboard-hint" style={{ marginTop: 12 }}>
            Saved to your dashboard too —{' '}
            <Link href="/dashboard">review and approve it there</Link>.
          </p>
        </section>
      )}
    </>
  );
}