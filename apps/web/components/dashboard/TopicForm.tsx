'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createContentItem, type CreateContentInput } from '../../lib/actions/content';

export function TopicForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const input: CreateContentInput = {
      title: formData.get('title') as string,
      topicPrompt: formData.get('topicPrompt') as string,
      language: formData.get('language') as 'en' | 'fr' | 'ar',
      targetDurationSeconds: Number(formData.get('targetDurationSeconds')),
    };
    const result = await createContentItem(input);
    setPending(false);
    if (result.success) {
      router.push(`/dashboard/content/${result.id}`);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <form action={handleSubmit} className="dashboard-form">
      {error && <div className="dashboard-error" role="alert">{error}</div>}

      <label htmlFor="title">Title</label>
      <input id="title" name="title" type="text" maxLength={120} required />

      <label htmlFor="topicPrompt">Topic / angle</label>
      <textarea
        id="topicPrompt"
        name="topicPrompt"
        rows={5}
        maxLength={2000}
        required
        placeholder="Describe the topic, angle, and any sources or constraints."
      />

      <div className="dashboard-form-row">
        <div>
          <label htmlFor="language">Language</label>
          <select id="language" name="language" defaultValue="en">
            <option value="en">English</option>
            <option value="fr">French</option>
            <option value="ar">Arabic</option>
          </select>
        </div>
        <div>
          <label htmlFor="targetDurationSeconds">Target duration (seconds)</label>
          <input
            id="targetDurationSeconds"
            name="targetDurationSeconds"
            type="number"
            min={15}
            max={90}
            defaultValue={30}
            required
          />
        </div>
      </div>

      <button type="submit" disabled={pending} className="dashboard-button">
        {pending ? 'Creating...' : 'Create video idea'}
      </button>
    </form>
  );
}
