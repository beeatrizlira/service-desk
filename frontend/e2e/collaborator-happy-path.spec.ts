import { expect, test } from '@playwright/test';

test('collaborator can login, open a ticket and find it in my tickets', async ({
  page,
}) => {
  const ticketTitle = `E2E-${Date.now()}`;

  await page.goto('/login');

  await page.getByLabel('Email').fill('colaborador@service-desk.local');
  await page.getByLabel('Senha').fill('123456');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/my-tickets$/);

  await page.getByRole('link', { name: 'Nova Solicitacao' }).first().click();
  await expect(page).toHaveURL(/\/tickets\/new$/);

  await page.locator('#ticket-title').fill(ticketTitle);
  await page.locator('#ticket-category').selectOption('TI');
  await page
    .locator('#ticket-description')
    .fill('Chamado criado pelo fluxo happy path de e2e visual.');

  await page.getByRole('button', { name: 'Criar solicitacao' }).click();
  await expect(page.getByText('Solicitacao criada com sucesso.')).toBeVisible();

  await page.getByRole('link', { name: 'Minhas Solicitacoes' }).first().click();
  await expect(page).toHaveURL(/\/my-tickets$/);

  const searchInput = page.locator('input[placeholder="ID, titulo ou descricao"]:visible').first();
  await searchInput.fill(ticketTitle);

  await expect(page.getByText(ticketTitle)).toBeVisible();
});
