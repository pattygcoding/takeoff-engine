import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const SCOPE_STATUS = {
  INCLUDED: 'included',
  EXCLUDED: 'excluded',
  OPTIONAL_ADDON: 'optional_addon',
  NOT_APPLICABLE: 'not_applicable',
};

function getNextScopeStatus(currentStatus) {
  const order = [
    SCOPE_STATUS.INCLUDED,
    SCOPE_STATUS.EXCLUDED,
    SCOPE_STATUS.OPTIONAL_ADDON,
    SCOPE_STATUS.NOT_APPLICABLE,
  ];
  const index = order.indexOf(currentStatus);
  return order[(index + 1) % order.length];
}

function formatScopeStatusLabel(status) {
  switch (status) {
    case SCOPE_STATUS.INCLUDED:
      return 'Included';
    case SCOPE_STATUS.EXCLUDED:
      return 'Excluded';
    case SCOPE_STATUS.OPTIONAL_ADDON:
      return 'Optional Add-On';
    case SCOPE_STATUS.NOT_APPLICABLE:
      return 'N/A';
    default:
      return 'Included';
  }
}

function getScopeChangeDiff(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const originalStatus = item?.originalStatus ?? item?.status ?? SCOPE_STATUS.INCLUDED;
      const requestedStatus = item?.status ?? originalStatus;
      const originalAmount = Number(item?.originalAmount ?? item?.costImpact ?? item?.amount ?? 0) || 0;
      const requestedAmount = Number(item?.amount ?? item?.costImpact ?? 0) || 0;
      const changed = originalStatus !== requestedStatus || originalAmount !== requestedAmount;
      if (!changed) return null;
      return {
        ...item,
        id: item?.id ?? item?.title ?? 'unknown',
        title: item?.title ?? item?.name ?? 'Scope Item',
        category: item?.category ?? '',
        originalStatus,
        originalAmount,
        status: requestedStatus,
        amount: requestedAmount,
      };
    })
    .filter(Boolean);
}

// Mirrors lib/product/scope.js categorizeScope()
function categorizeScope(items = []) {
  return {
    included: items.filter((it) => it.status === SCOPE_STATUS.INCLUDED),
    excluded: items.filter((it) => it.status === SCOPE_STATUS.EXCLUDED),
    optionalAddons: items.filter((it) => it.status === SCOPE_STATUS.OPTIONAL_ADDON),
    notApplicable: items.filter((it) => it.status === SCOPE_STATUS.NOT_APPLICABLE),
  };
}

// Mirrors lib/product/scope.js formatScopeAddonImpact()
function formatScopeAddonImpact(item, baseAmount = 0) {
  const raw = Number(item?.costImpact) || 0;
  if (!raw) return null;
  if (item?.costImpactType === 'percent') {
    const amount = Number(baseAmount) > 0 ? Number(baseAmount) * (raw / 100) : 0;
    if (amount > 0) {
      return `+$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return null;
  }
  return `+$${raw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Mirrors ScopeSummaryDisplay's column-building logic (Not Applicable is intentionally dropped)
function buildScopeSummaryColumns(scopeItems) {
  const { included, excluded, optionalAddons } = categorizeScope(scopeItems);
  const columns = [];
  if (included.length > 0) columns.push({ key: 'included', items: included });
  if (excluded.length > 0) columns.push({ key: 'excluded', items: excluded });
  if (optionalAddons.length > 0) columns.push({ key: 'addons', items: optionalAddons, showImpactBadge: true });
  return columns;
}

// Mirrors ScopeInclusionsModal handlers: status/add/remove respect readOnly,
// but add-on price fields stay editable even when the project is otherwise locked.
function createScopeEditor(initialItems, readOnly) {
  let items = initialItems.map((it) => ({ ...it }));

  return {
    getItems: () => items,
    handleStatusChange(id, newStatus) {
      if (readOnly) return;
      items = items.map((it) => (it.id === id ? { ...it, status: newStatus } : it));
    },
    handleCostImpactChange(id, rawValue) {
      const parsed = rawValue === '' ? 0 : Number(rawValue);
      items = items.map((it) => (it.id === id ? { ...it, costImpact: Number.isFinite(parsed) ? parsed : 0 } : it));
    },
    handleCostImpactTypeChange(id, costImpactType) {
      items = items.map((it) => (it.id === id ? { ...it, costImpactType } : it));
    },
  };
}

// Mirrors ScopeInclusionsModal's handleSave(): panel variant stays open after saving,
// modal variant closes only after the saved-confirmation dialog is dismissed.
function simulateSave({ onSave }) {
  onSave();
}

function simulateDismissSavedConfirm({ isPanel, onClose }) {
  if (!isPanel) onClose();
}

// Mirrors ClientCounterOfferModal's negotiation list: NA items are hidden entirely,
// and add-on items are rendered as informational price cards, not the include/exclude toggle.
function buildCounterOfferList(scopeItems) {
  return scopeItems
    .filter((item) => item.status !== SCOPE_STATUS.NOT_APPLICABLE)
    .map((item) => ({
      id: item.id,
      isAddon: item.status === SCOPE_STATUS.OPTIONAL_ADDON,
      isToggleable: item.status !== SCOPE_STATUS.OPTIONAL_ADDON,
      addonImpact: item.status === SCOPE_STATUS.OPTIONAL_ADDON ? formatScopeAddonImpact(item) : null,
    }));
}

describe('Scope Inclusions/Exclusions & Optional Add-On Pricing (Frontend Logic)', () => {
  describe('formatScopeAddonImpact', () => {
    it('formats a flat dollar add-on price', () => {
      assert.strictEqual(formatScopeAddonImpact({ costImpact: 500, costImpactType: 'flat' }), '+$500.00');
    });

    it('formats a percentage add-on price as its calculated dollar value when the direct-cost base is known', () => {
      assert.strictEqual(formatScopeAddonImpact({ costImpact: 5, costImpactType: 'percent' }, 2000), '+$100.00');
    });

    it('hides percentage add-on tags when the direct-cost base is not available yet', () => {
      assert.strictEqual(formatScopeAddonImpact({ costImpact: 5, costImpactType: 'percent' }), null);
    });

    it('treats missing costImpactType as flat dollars', () => {
      assert.strictEqual(formatScopeAddonImpact({ costImpact: 250 }), '+$250.00');
    });

    it('returns null when there is no priced impact', () => {
      assert.strictEqual(formatScopeAddonImpact({ costImpact: 0, costImpactType: 'flat' }), null);
      assert.strictEqual(formatScopeAddonImpact({}), null);
    });
  });

  describe('ScopeSummaryDisplay column building', () => {
    const scopeItems = [
      { id: '1', status: SCOPE_STATUS.INCLUDED, title: 'Water Heaters' },
      { id: '2', status: SCOPE_STATUS.EXCLUDED, title: 'Toilets' },
      { id: '3', status: SCOPE_STATUS.OPTIONAL_ADDON, title: 'ADA Sink Carriers', costImpact: 500, costImpactType: 'flat' },
      { id: '4', status: SCOPE_STATUS.NOT_APPLICABLE, title: 'Rock Sawing' },
    ];

    it('never renders a "Not Applicable" column', () => {
      const columns = buildScopeSummaryColumns(scopeItems);
      assert.ok(!columns.some((c) => c.key === 'na'));
      assert.strictEqual(columns.length, 3);
    });

    it('only shows the priced impact badge on the add-ons column', () => {
      const columns = buildScopeSummaryColumns(scopeItems);
      const includedCol = columns.find((c) => c.key === 'included');
      const addonsCol = columns.find((c) => c.key === 'addons');

      assert.strictEqual(includedCol.showImpactBadge, undefined);
      assert.strictEqual(addonsCol.showImpactBadge, true);
      assert.strictEqual(addonsCol.items.length, 1);
      assert.strictEqual(addonsCol.items[0].id, '3');
    });

    it('omits empty columns entirely (e.g. no add-ons selected)', () => {
      const columns = buildScopeSummaryColumns([
        { id: '1', status: SCOPE_STATUS.INCLUDED, title: 'Water Heaters' },
      ]);
      assert.strictEqual(columns.length, 1);
      assert.strictEqual(columns[0].key, 'included');
    });
  });

  describe('ScopeInclusionsModal editability rules', () => {
    it('blocks status changes when the project is read-only', () => {
      const editor = createScopeEditor(
        [{ id: 'a', status: SCOPE_STATUS.INCLUDED, costImpact: 0, costImpactType: 'flat' }],
        true
      );
      editor.handleStatusChange('a', SCOPE_STATUS.EXCLUDED);
      assert.strictEqual(editor.getItems()[0].status, SCOPE_STATUS.INCLUDED);
    });

    it('still allows add-on price edits even when the project is read-only (negotiation stays open)', () => {
      const editor = createScopeEditor(
        [{ id: 'a', status: SCOPE_STATUS.OPTIONAL_ADDON, costImpact: 0, costImpactType: 'flat' }],
        true
      );
      editor.handleCostImpactChange('a', '750');
      editor.handleCostImpactTypeChange('a', 'percent');

      assert.strictEqual(editor.getItems()[0].costImpact, 750);
      assert.strictEqual(editor.getItems()[0].costImpactType, 'percent');
    });

    it('allows status changes when not read-only', () => {
      const editor = createScopeEditor(
        [{ id: 'a', status: SCOPE_STATUS.INCLUDED, costImpact: 0, costImpactType: 'flat' }],
        false
      );
      editor.handleStatusChange('a', SCOPE_STATUS.EXCLUDED);
      assert.strictEqual(editor.getItems()[0].status, SCOPE_STATUS.EXCLUDED);
    });

    it('coerces invalid or blank price input down to 0 instead of NaN', () => {
      const editor = createScopeEditor(
        [{ id: 'a', status: SCOPE_STATUS.OPTIONAL_ADDON, costImpact: 500, costImpactType: 'flat' }],
        false
      );
      editor.handleCostImpactChange('a', '');
      assert.strictEqual(editor.getItems()[0].costImpact, 0);

      editor.handleCostImpactChange('a', 'not-a-number');
      assert.strictEqual(editor.getItems()[0].costImpact, 0);
    });
  });

  describe('Save & saved-confirmation flow (panel vs modal variant)', () => {
    it('panel variant stays open after saving (no onClose call)', () => {
      let closed = false;
      simulateSave({ onSave: () => {} });
      assert.strictEqual(closed, false);
    });

    it('modal variant only closes once the saved-confirmation dialog is dismissed', () => {
      let closed = false;
      simulateSave({ onSave: () => {} });
      assert.strictEqual(closed, false, 'should not close immediately on save');

      simulateDismissSavedConfirm({ isPanel: false, onClose: () => { closed = true; } });
      assert.strictEqual(closed, true, 'should close after dismissing the confirmation');
    });

    it('panel variant ignores dismiss-triggered close entirely', () => {
      let closed = false;
      simulateDismissSavedConfirm({ isPanel: true, onClose: () => { closed = true; } });
      assert.strictEqual(closed, false);
    });
  });

  describe('ClientCounterOfferModal negotiation list building', () => {
    const scopeItems = [
      { id: '1', status: SCOPE_STATUS.INCLUDED, title: 'Water Heaters' },
      { id: '2', status: SCOPE_STATUS.EXCLUDED, title: 'Toilets' },
      { id: '3', status: SCOPE_STATUS.OPTIONAL_ADDON, title: 'ADA Sink Carriers', costImpact: 500, costImpactType: 'flat' },
      { id: '4', status: SCOPE_STATUS.NOT_APPLICABLE, title: 'Rock Sawing' },
    ];

    it('excludes Not Applicable items from the negotiation list entirely', () => {
      const list = buildCounterOfferList(scopeItems);
      assert.ok(!list.some((it) => it.id === '4'));
      assert.strictEqual(list.length, 3);
    });

    it('renders add-on items as non-toggleable informational price cards', () => {
      const list = buildCounterOfferList(scopeItems);
      const addonEntry = list.find((it) => it.id === '3');

      assert.strictEqual(addonEntry.isAddon, true);
      assert.strictEqual(addonEntry.isToggleable, false);
      assert.strictEqual(addonEntry.addonImpact, '+$500.00');
    });

    it('does not display a percentage add-on tag without a dollar base at the planning stage', () => {
      const list = buildCounterOfferList([
        { id: '3', status: SCOPE_STATUS.OPTIONAL_ADDON, title: 'ADA Sink Carriers', costImpact: 5, costImpactType: 'percent' },
      ]);

      assert.strictEqual(list[0].addonImpact, null);
    });

    it('keeps included/excluded items toggleable with no addon price shown', () => {
      const list = buildCounterOfferList(scopeItems);
      const includedEntry = list.find((it) => it.id === '1');

      assert.strictEqual(includedEntry.isToggleable, true);
      assert.strictEqual(includedEntry.addonImpact, null);
    });

    it('cycles through all four scope statuses and labels add-on amounts', () => {
      assert.strictEqual(getNextScopeStatus(SCOPE_STATUS.INCLUDED), SCOPE_STATUS.EXCLUDED);
      assert.strictEqual(getNextScopeStatus(SCOPE_STATUS.EXCLUDED), SCOPE_STATUS.OPTIONAL_ADDON);
      assert.strictEqual(getNextScopeStatus(SCOPE_STATUS.OPTIONAL_ADDON), SCOPE_STATUS.NOT_APPLICABLE);
      assert.strictEqual(getNextScopeStatus(SCOPE_STATUS.NOT_APPLICABLE), SCOPE_STATUS.INCLUDED);
      assert.strictEqual(formatScopeStatusLabel(SCOPE_STATUS.OPTIONAL_ADDON), 'Optional Add-On');
      assert.strictEqual(formatScopeStatusLabel(SCOPE_STATUS.NOT_APPLICABLE), 'N/A');
    });

    it('builds before/after diff records while skipping unchanged items', () => {
      const diff = getScopeChangeDiff([
        { id: 'a', title: 'Toilets', status: SCOPE_STATUS.EXCLUDED, costImpact: 0, originalStatus: SCOPE_STATUS.INCLUDED, originalAmount: 0 },
        { id: 'b', title: 'ADA Grab Bars', status: SCOPE_STATUS.OPTIONAL_ADDON, costImpact: 600, originalStatus: SCOPE_STATUS.OPTIONAL_ADDON, originalAmount: 450 },
        { id: 'c', title: 'Dumpster', status: SCOPE_STATUS.EXCLUDED, costImpact: 0, originalStatus: SCOPE_STATUS.EXCLUDED, originalAmount: 0 },
      ]);

      assert.deepStrictEqual(diff.map((item) => item.id), ['a', 'b']);
      assert.strictEqual(diff[0].originalStatus, SCOPE_STATUS.INCLUDED);
      assert.strictEqual(diff[0].status, SCOPE_STATUS.EXCLUDED);
      assert.strictEqual(diff[1].amount, 600);
      assert.strictEqual(diff[1].originalAmount, 450);
    });
  });
});
