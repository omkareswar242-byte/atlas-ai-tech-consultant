import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, setApiBase } from './api';
describe('central API boundary', () => {
    beforeEach(() => { vi.stubGlobal('window', globalThis); setApiBase(''); });
    afterEach(() => vi.unstubAllGlobals());
    it('reads actual health through the same-origin proxy', async () => {
        const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ok', ai_backend: 'test', article_count: 5 }), { status: 200 }));
        vi.stubGlobal('fetch', fetcher);
        expect((await api.health()).article_count).toBe(5);
        expect(fetcher.mock.calls[0][0]).toBe('/api/v1/health');
    });
    it('posts a knowledge question with the documented contract', async () => {
        const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ sources: [], needs_human: true }), { status: 200 }));
        vi.stubGlobal('fetch', fetcher);
        await api.query('An unknown question');
        expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ question: 'An unknown question', max_sources: 3 });
    });
    it('never retries an ambiguous review request', async () => {
        const fetcher = vi.fn().mockRejectedValue(new TypeError('private implementation detail'));
        vi.stubGlobal('fetch', fetcher);
        await expect(api.review('abc', { decision: 'approved', final_reply: 'Reply' })).rejects.toThrow('unconfirmed');
        expect(fetcher).toHaveBeenCalledTimes(1);
    });
    it('retains a safe not-found indication for scope creation checks', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('private payload', { status: 404 })));
        await expect(api.scope('missing')).rejects.toThrow('404: Record not found');
    });
    it('blocks credentials and non-http origins', () => {
        expect(() => setApiBase('https://user:secret@example.com')).toThrow();
        expect(() => setApiBase('file:///tmp')).toThrow();
    });
    it('uses a configured origin and encodes project identifiers', async () => {
        setApiBase('https://api.example.com/');
        const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
        vi.stubGlobal('fetch', fetcher);
        await api.scope('project space');
        expect(fetcher.mock.calls[0][0]).toBe('https://api.example.com/api/v1/scope/projects/project%20space');
    });
    it('does not expose raw server errors', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('sk-private-details', { status: 500 })));
        await expect(api.emails()).rejects.toThrow('API request failed (500)');
    });
});
