import path from 'node:path';
import { test, expect } from '@playwright/test';

const datasetFixtureDir = path.join(process.cwd(), 'e2e', 'fixtures', 'dataset');
const resultsFixture = path.join(process.cwd(), 'e2e', 'fixtures', 'results', 'subject-a.csv');

test('bundle build workflow accepts a valid dataset fixture', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Build bundle' })).toBeVisible();

    await page.getByTestId('folder-input').setInputFiles(datasetFixtureDir);

    await expect(page.getByRole('heading', { name: 'Subject selection' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'A', exact: true })).toBeVisible();
    await expect(page.getByText('Focal', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue to settings' })).toBeEnabled();

    await page.getByRole('button', { name: 'Continue to settings' }).click();
    await page.getByRole('button', { name: 'Generate trials' }).click();

    await expect(page.getByText('Identity relationship view')).toBeVisible();
    await expect(page.getByText('Trial detail')).toBeVisible();
});

test('results workflow uploads a csv fixture and shows summary metrics', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('tab', { name: 'Analyze results' }).click();
    await expect(page.getByRole('heading', { name: 'Analyze results' })).toBeVisible();

    await page.getByTestId('results-upload-input').setInputFiles(resultsFixture);

    await expect(page.getByText('subject-a.csv')).toBeVisible();
    await expect(page.getByText('Trials: 2').first()).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Subject' })).toContainText('A');
});

test('context help opens from the workflow', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('help-trigger-dataset-requirements').first().click();

    await expect(page.getByText('Dataset requirements')).toBeVisible();
    await expect(page.getByText('The selected folder must contain data_info.csv directly at the root.')).toBeVisible();
});

test('app state persists across reload and can be cleared', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('tab', { name: 'Analyze results' }).click();
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Analyze results' })).toBeVisible();

    await page.getByRole('button', { name: 'Clear saved app state' }).click();
    await expect(page.getByRole('heading', { name: 'Build bundle' })).toBeVisible();
});
