// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Cristian Guerra
import { test, expect } from '@playwright/test';
import { executeScenario } from './scenario-runner';
import { isKnownSurvivor } from './scenario-evidence';
import { mutants } from './scenarios';

const strict = process.env.MUTANT_LAB_STRICT === '1';

for (const mutant of mutants) {
  test(`${mutant.id}: expect ${mutant.expect}`, async ({ request }, testInfo) => {
    const result = await executeScenario(request, mutant);
    await testInfo.attach('scenario-evidence.json', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    });

    if (!strict && isKnownSurvivor(result.outcome, mutant.known)) {
      testInfo.annotations.push({ type: 'known finding', description: mutant.known! });
      test.fail(true, `known finding: ${mutant.known}`);
    }

    expect(result.outcome, `${result.phase}: ${result.reason}`).toBe('KILLED');
  });
}
