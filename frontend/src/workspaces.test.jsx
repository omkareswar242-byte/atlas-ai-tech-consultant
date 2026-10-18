// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api } from './api';
import Knowledge from './pages/Knowledge';
import Inbox from './pages/Inbox';
import Scope from './pages/Scope';
import Shell from './components/Shell';
import App from './App';
const shared = { notify: vi.fn(), log: vi.fn(), onRefresh: vi.fn(), onScope: vi.fn() };
const scope = { project_id: 'ui-test', version: 1, objective: 'Improve search', requirements: [{ id: 'REQ-001', description: 'Improve product search', status: 'confirmed', source_excerpt: 'search', priority: 'must_have', feasibility: 'needs_clarification', acceptance_criteria: ['Review search behavior'] }], estimate_tasks: [{ description: 'Placeholder work', low_hours: 2, likely_hours: 4, high_hours: 8 }], proposal_text: 'Draft scope for review', approval_status: 'draft' };
const email = { input: { from_address: 'client@example.com', subject: 'Logo question', body: 'How do I update my logo?' }, draft: { email_id: 'test-mail', category: 'how_to', summary: 'Logo question', draft_reply: 'Open Design Settings.', risk: 'low', sources: [], requires_human_approval: true }, review: null };
beforeEach(() => {
    location.hash = '';
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation(() => ({ matches: true, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    Element.prototype.scrollIntoView = vi.fn();
    vi.spyOn(api, 'articles').mockResolvedValue([]);
    vi.spyOn(api, 'emails').mockResolvedValue([structuredClone(email)]);
    vi.spyOn(api, 'autonomy').mockResolvedValue([]);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); sessionStorage.clear(); });
describe('working product screens', () => {
    it('navigates every product page after JavaScript conversion', async () => {
        vi.spyOn(api, 'health').mockResolvedValue({status:'ok',service:'atlas',ai_backend:'test',article_count:5});
        render(<App />);
        const destinations = [
            ['Knowledge Brain', 'Knowledge assistant'],
            ['Inbox Agent', 'Inbox'],
            ['Meeting-to-Scope', 'Scope studio'],
            ['Evaluations', 'Evidence over assumptions.'],
            ['Activity', 'Every decision, in context.'],
            ['Settings', 'Built on clear boundaries.'],
            ['Overview', 'Your AI consulting workspace'],
        ];
        for (const [name, heading] of destinations) {
            fireEvent.click(screen.getByRole('button', {name, exact:true}));
            await waitFor(() => expect(screen.getByRole('heading', {level:1,name:new RegExp(heading.replace('.', '\\.'),'i')})).toBeTruthy());
        }
    }, 20000);
    it('submits a real query contract and displays the returned answer', async () => {
        const query = vi.spyOn(api, 'query').mockResolvedValue({ answer: 'Returned grounded answer', status: 'answered', sources: [], needs_human: false, escalation_id: null, confidence: 0 });
        render(<Knowledge {...shared}/>);
        fireEvent.change(screen.getByLabelText('Ask a question'), { target: { value: 'How do I change the logo?' } });
        fireEvent.click(screen.getByRole('button', { name: 'Ask question' }));
        await screen.findByText('Returned grounded answer');
        expect(query).toHaveBeenCalledWith('How do I change the logo?');
    });
    it('shows actual escalation details rather than simulating expert delivery', async () => {
        vi.spyOn(api, 'query').mockResolvedValue({ answer: 'Not supported', status: 'insufficient_evidence', sources: [], needs_human: true, escalation_id: 'esc-test', confidence: 0 });
        render(<Knowledge {...shared}/>);
        fireEvent.change(screen.getByLabelText('Ask a question'), { target: { value: 'Unknown capability' } });
        fireEvent.click(screen.getByRole('button', { name: 'Ask question' }));
        fireEvent.click(await screen.findByRole('button', { name: /View expert request/ }));
        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(screen.getByText('esc-test')).toBeTruthy();
    });
    it('filters sent messages honestly and supports email search', async () => {
        render(<Inbox {...shared}/>);
        await screen.findByRole('button', { name: /Logo question/ });
        fireEvent.change(screen.getByLabelText('Search emails'), { target: { value: 'no-match' } });
        await screen.findByText('No matching emails');
        fireEvent.click(screen.getByRole('button', { name: /^Sent/ }));
        await screen.findByText('No emails sent');
    });
    it('requires confirmation before recording an inbox approval', async () => {
        const review = vi.spyOn(api, 'review').mockResolvedValue({ email_id: 'test-mail', status: 'recorded', unchanged: true, review: { final_reply: email.draft.draft_reply, decision: 'approved' } });
        render(<Inbox {...shared}/>);
        fireEvent.click(await screen.findByRole('button', { name: /Logo question/ }));
        fireEvent.click(await screen.findByRole('button', { name: /Approve review/ }));
        expect(review).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Record approval' }));
        await waitFor(() => expect(review).toHaveBeenCalledTimes(1));
    });
    it('generates a scope and requires a reviewer plus confirmation for approval', async () => {
        vi.spyOn(api, 'scope').mockRejectedValue(new Error('404: Record not found.'));
        const create = vi.spyOn(api, 'createScope').mockResolvedValue(structuredClone(scope));
        const approve = vi.spyOn(api, 'approveScope').mockResolvedValue({ ...scope, approval_status: 'approved' });
        render(<Scope {...shared}/>);
        fireEvent.change(screen.getByLabelText('Project ID'), { target: { value: 'ui-test' } });
        fireEvent.change(screen.getByLabelText('Meeting ID'), { target: { value: 'meeting-1' } });
        fireEvent.change(screen.getByLabelText('Transcript'), { target: { value: 'We need better product search.' } });
        fireEvent.submit(screen.getByLabelText('Transcript').closest('form'));
        await waitFor(() => expect(create).toHaveBeenCalled());
        await screen.findByText('Improve product search');
        fireEvent.change(screen.getByLabelText('Reviewer name'), { target: { value: 'Student' } });
        fireEvent.click(screen.getByRole('button', { name: /Approve v1/ }));
        expect(approve).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Confirm approval' }));
        await waitFor(() => expect(approve).toHaveBeenCalledWith('ui-test', 1, 'Student'));
    });
    it('opens keyboard command navigation and navigates to a selected screen', async () => {
        const navigate = vi.fn();
        render(<Shell page="overview" onNavigate={navigate} health={null} connected={false} activities={[]}><div>Workspace</div></Shell>);
        fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
        const dialog = await screen.findByRole('dialog');
        expect(dialog).toBeTruthy();
        const input = dialog.querySelector('input');
        fireEvent.change(input, { target: { value: 'evaluations' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        await waitFor(() => expect(navigate).toHaveBeenCalledWith('evaluations'));
    });
});
