import { describe, expect, it } from 'vitest';
import {
  createContentItem,
  updateContentStatus,
  recordApprovalDecision,
} from '../lib/actions/content';

describe('dashboard content actions', () => {
  it('rejects a content item without title or topic', async () => {
    const result = await createContentItem({
      title: '',
      topicPrompt: '',
      language: 'en',
      targetDurationSeconds: 30,
    });
    expect(result.success).toBe(false);
  });

  it('rejects out-of-range target duration', async () => {
    const result = await createContentItem({
      title: 'Test',
      topicPrompt: 'A topic',
      language: 'en',
      targetDurationSeconds: 5,
    });
    expect(result.success).toBe(false);
  });

  it('returns an error when updating status for a missing item', async () => {
    const result = await updateContentStatus('00000000-0000-0000-0000-000000000000', 'APPROVED');
    expect(result.success).toBe(false);
  });

  it('blocks approval when publishing kill switch is enabled', async () => {
    const result = await recordApprovalDecision(
      '00000000-0000-0000-0000-000000000000',
      'APPROVED',
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('kill switch');
    }
  });
});
