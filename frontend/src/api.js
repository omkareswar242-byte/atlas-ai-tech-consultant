let base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export function getApiBase() { return base; }
export function setApiBase(value) {
    const normalized = value.trim().replace(/\/$/, '');
    if (normalized) {
        const url = new URL(normalized);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
            throw new Error('Use an HTTP(S) URL without credentials, query parameters, or fragments.');
    }
    base = normalized;
}
export async function request(path, method = 'GET', payload) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 60000);
    try {
        const response = await fetch(`${base}/api/v1${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }), signal: controller.signal });
        if (!response.ok)
            throw new Error(response.status === 404 ? '404: Record not found.' : response.status === 409 ? '409: The current version changed. Reload before approving.' : `API request failed (${response.status}). No successful action has been confirmed.`);
        return await response.json();
    }
    catch (error) {
        if (error instanceof TypeError || (error instanceof DOMException && error.name === 'AbortError'))
            throw new Error('The API did not respond. Check the backend connection. Action outcome may be unconfirmed; inspect the record before retrying.');
        throw error;
    }
    finally {
        window.clearTimeout(timeout);
    }
}
const projectPath = (id) => `/scope/projects/${encodeURIComponent(id)}`;
export const api = {
    health: () => request('/health'),
    articles: () => request('/knowledge/articles'),
    query: (question) => request('/knowledge/query', 'POST', { question, max_sources: 3 }),
    emails: () => request('/inbox/emails'),
    autonomy: () => request('/inbox/autonomy'),
    draft: (input) => request('/inbox/drafts', 'POST', input),
    review: (id, input) => request(`/inbox/emails/${encodeURIComponent(id)}/review`, 'POST', input),
    scope: (id) => request(projectPath(id)),
    createScope: (input) => request(`${projectPath(input.project_id)}/meetings`, 'POST', input),
    followUp: (input) => request(`${projectPath(input.project_id)}/follow-up`, 'POST', input),
    approveScope: (id, version, reviewer) => request(`${projectPath(id)}/approve`, 'POST', { version, reviewer }),
};
