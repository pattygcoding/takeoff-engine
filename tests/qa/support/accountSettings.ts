import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { acknowledgeNotice, label } from './fixtures.ts';
import type { QaSettings } from './qaEnvironment.ts';

export const CANCEL_REASON = 'Too expensive';
export const CANCEL_FEEDBACK = 'QA automation: cancellation flow';

const TIER_LABEL_KEYS: Record<string, string> = {
  starter: 'core.upgradeModal.starterTier',
  pro: 'core.upgradeModal.proTier',
  enterprise: 'core.upgradeModal.enterpriseTier',
};

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const templatePrefix = (key: string): string => label(key).split('{{')[0];

export const cancelButton = (page: Page) => page.getByRole('button', { name: label('core.accountSettings.cancelSubscription'), exact: true });
export const restoreButton = (page: Page) => page.getByRole('button', { name: label('core.accountSettings.restoreSubscription') });

/** Account settings -> Cancel Subscription -> reason form -> Confirm Cancellation. */
export async function cancelThroughSettings(page: Page, settings: QaSettings): Promise<void> {
  await expect(cancelButton(page), 'paid subscribers must be able to cancel from account settings').toBeVisible();
  await cancelButton(page).click();

  const confirm = page.getByRole('button', { name: label('core.accountSettings.confirmCancellation') });
  const form = page.locator('form').filter({ has: confirm });
  await form.getByRole('combobox').selectOption(CANCEL_REASON);
  await form.getByRole('textbox').fill(CANCEL_FEEDBACK);

  const cancellation = page.waitForResponse(`${settings.apiUrl}/billing/cancel-subscription`);
  await confirm.click();
  const response = await cancellation;
  expect(response.status(), `cancellation failed: ${await response.text()}`).toBe(200);
  await acknowledgeNotice(page, 'core.accountSettings.subscriptionCancelledTitle');
}

/**
 * Account settings -> "Upgrade to Pro" / "Change Plan" -> pick a plan in the upgrade modal ->
 * Upgrade/Downgrade button (and the downgrade confirmation). Returns the change-plan response.
 * With `expectFailure`, the app's error notice is acknowledged and the modal is closed.
 */
export async function changePlanThroughSettings(
  page: Page,
  { plan, direction, settings, expectFailure = false }: {
    plan: string;
    direction: string;
    settings: QaSettings;
    expectFailure?: boolean;
  },
): Promise<Record<string, unknown>> {
  const openModal = page.getByRole('button', { name: label('core.accountSettings.upgradeToPro'), exact: true })
    .or(page.getByRole('button', { name: label('core.accountSettings.changePlanOrRedeemCode'), exact: true }));
  await openModal.click();

  const modal = page.getByRole('dialog', { name: label('core.upgradeModal.title') });
  const tierLabel = label(TIER_LABEL_KEYS[plan]);
  const planOption = modal.getByRole('group', { name: label('core.upgradeModal.planOptionsLabel') })
    .getByRole('button')
    .filter({ has: page.getByText(tierLabel, { exact: true }) });
  await planOption.click();
  await expect(planOption).toHaveAttribute('aria-pressed', 'true');

  const actionKey = direction === 'upgrade' ? 'core.upgradeModal.upgradeButton' : 'core.upgradeModal.downgradeButton';
  const action = modal.getByRole('button', { name: new RegExp(`^${escapeRegExp(templatePrefix(actionKey))}${escapeRegExp(tierLabel)}\\b`) });
  await expect(action).toBeEnabled({ timeout: 30_000 });

  const changed = page.waitForResponse(`${settings.apiUrl}/billing/change-plan`);
  await action.click();
  if (direction === 'downgrade') {
    const confirm = page.getByRole('dialog', { name: label('core.upgradeModal.confirmDowngradeTitle') });
    await confirm.getByRole('button', { name: label('core.upgradeModal.confirmDowngradeBtn') }).click();
  }
  const response = await changed;
  const body = await response.json();
  if (expectFailure) {
    expect(response.status(), 'the plan change should have been refused').toBeGreaterThanOrEqual(400);
    await acknowledgeNotice(page, 'core.upgradeModal.checkoutErrorTitle');
    await modal.getByRole('button', { name: 'Close' }).click();
    await expect(modal).toBeHidden();
    return body;
  }
  expect(response.status(), `plan change failed: ${JSON.stringify(body)}`).toBe(200);

  await acknowledgeNotice(page, direction === 'upgrade' ? 'core.upgradeModal.successTitle' : 'core.upgradeModal.downgradeScheduledTitle');
  await expect(modal).toBeHidden();
  return body;
}
