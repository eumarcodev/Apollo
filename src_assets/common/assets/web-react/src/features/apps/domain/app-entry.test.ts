import { describe, expect, it } from 'vitest';
import { editDraft, newAppDraft, NEW_APP_TEMPLATE } from './app-entry';

describe('new app template', () => {
  it('keeps the legacy defaults', () => {
    const draft = newAppDraft();
    expect(draft).toMatchObject({
      uuid: '',
      name: 'New App',
      'auto-detach': true,
      'wait-all': true,
      'exit-timeout': 5,
      'scale-factor': 100,
      'allow-client-commands': true,
      'virtual-display': false,
      gamepad: '',
    });
    expect(Object.keys(NEW_APP_TEMPLATE)).toHaveLength(20);
  });

  it('never shares nested lists between drafts', () => {
    const first = newAppDraft();
    (first['prep-cmd'] as unknown[]).push({ do: 'x' });
    expect(newAppDraft()['prep-cmd']).toEqual([]);
  });
});

describe('editDraft', () => {
  it('merges a deep copy of the app over the template', () => {
    const app = { uuid: 'u1', name: 'Game', cmd: 'game.exe', detached: ['a'] };
    const draft = editDraft(app);
    expect(draft).toMatchObject({ uuid: 'u1', name: 'Game', cmd: 'game.exe', 'exit-timeout': 5 });
    (draft['detached'] as string[]).push('b');
    expect(app.detached).toEqual(['a']);
  });
});
