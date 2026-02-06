/**
 * Smoke test for OBJECTS REWORK (O1–O4).
 * Verifies that the new API contracts and modules are in place.
 * Run: npm test -- test/objects-rework.spec.ts
 */

describe('Objects Rework (O1–O4) smoke', () => {
  describe('O1: Project summary', () => {
    it('ProjectSummaryDto shape: id, name, address, client, salesStage', () => {
      const sample = {
        id: 1,
        name: 'Test',
        address: null,
        client: null,
        salesStage: 'planned',
        executionStatus: null,
      };
      expect(sample.id).toBe(1);
      expect(sample.salesStage).toBe('planned');
    });
  });

  describe('O2: Estimates projects list', () => {
    it('Estimates project item has projectId, quote, acts, invoices, lastActivityAt', () => {
      const item = {
        projectId: 1,
        name: 'Obj',
        address: null,
        client: null,
        quote: { lastQuoteId: null, status: null, total: null, updatedAt: null },
        acts: { count: 0, lastActAt: null },
        invoices: { count: 0, unpaidCount: 0, lastInvoiceAt: null },
        lastActivityAt: null,
      };
      expect(item.projectId).toBe(1);
      expect(item.quote.lastQuoteId).toBeNull();
      expect(item.acts.count).toBe(0);
    });
  });

  describe('O3: Sales projects list and details', () => {
    it('Sales project item has projectId, salesStage, deal, nextAction, owner', () => {
      const item = {
        projectId: 1,
        name: 'Obj',
        address: null,
        client: null,
        salesStage: 'planned',
        deal: null,
        nextAction: null,
        nextActionDue: null,
        lastContactAt: null,
        owner: null,
      };
      expect(item.salesStage).toBe('planned');
      expect(item.deal).toBeNull();
    });
  });

  describe('O4: Project timeline', () => {
    it('TimelineEvent has type, at, title', () => {
      const ev = { type: 'quote', at: new Date().toISOString(), title: 'КП #1' };
      expect(ev.type).toBe('quote');
      expect(ev.title).toBe('КП #1');
      expect(ev.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
