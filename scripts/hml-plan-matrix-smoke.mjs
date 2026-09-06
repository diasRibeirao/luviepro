const API_BASE = (process.env.LUVIEPRO_API_URL || process.env.API_URL || 'https://luviepro-api-hml.onrender.com').replace(/\/+$/,'');
const endpoint = `${API_BASE}/api/plans`;

const expected = {
  basic: {
    name: 'Basic',
    sortOrder: 10,
    maxClients: 10,
    maxQuotesPerMonth: 10,
    maxUsers: 1,
    monthlyPriceCents: 6990,
    quarterlyPriceCents: 18873,
    semiannualPriceCents: 35649,
    annualPriceCents: 67104,
  },
  starter: {
    name: 'Starter',
    sortOrder: 20,
    maxClients: 30,
    maxQuotesPerMonth: 30,
    maxUsers: 1,
    monthlyPriceCents: 9990,
    quarterlyPriceCents: 26973,
    semiannualPriceCents: 50949,
    annualPriceCents: 95904,
  },
  pro: {
    name: 'Pro',
    sortOrder: 30,
    maxClients: 100,
    maxQuotesPerMonth: 100,
    maxUsers: 3,
    monthlyPriceCents: 11990,
    quarterlyPriceCents: 32373,
    semiannualPriceCents: 61149,
    annualPriceCents: 115104,
  },
  business: {
    name: 'Business',
    sortOrder: 40,
    maxClients: -1,
    maxQuotesPerMonth: -1,
    maxUsers: 10,
    monthlyPriceCents: 14990,
    quarterlyPriceCents: 40473,
    semiannualPriceCents: 76449,
    annualPriceCents: 143904,
  },
};

const fail = (message) => {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
};

const ok = (message) => console.log(`OK   ${message}`);

async function main() {
  console.log(`Checking ${endpoint}`);
  let response;
  try {
    response = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    fail(`request failed: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  if (response.status !== 200) {
    fail(`GET /api/plans -> HTTP ${response.status}`);
    return;
  }
  ok('GET /api/plans -> 200');

  let plans;
  try {
    plans = await response.json();
  } catch {
    fail('response is not valid JSON');
    return;
  }

  if (!Array.isArray(plans)) {
    fail('response is not an array');
    return;
  }
  ok('plan catalog is an array');

  const active = plans.filter((plan) => plan?.active !== false);
  const byCode = new Map(active.map((plan) => [String(plan.plan).toLowerCase(), plan]));

  for (const [code, expectedPlan] of Object.entries(expected)) {
    const actual = byCode.get(code);
    if (!actual) {
      fail(`${code} is missing from active catalog`);
      continue;
    }

    let planOk = true;
    for (const [field, expectedValue] of Object.entries(expectedPlan)) {
      if (actual[field] !== expectedValue) {
        fail(`${code}.${field}: expected ${expectedValue}, got ${actual[field]}`);
        planOk = false;
      }
    }
    if (planOk) ok(`${code} limits/prices`);
  }

  const expectedOrder = Object.keys(expected);
  const actualOrder = active
    .filter((plan) => expectedOrder.includes(String(plan.plan).toLowerCase()))
    .sort((a,b) => Number(a.sortOrder) - Number(b.sortOrder))
    .map((plan) => String(plan.plan).toLowerCase());

  if (JSON.stringify(actualOrder) !== JSON.stringify(expectedOrder)) {
    fail(`catalog order: expected ${expectedOrder.join(' > ')}, got ${actualOrder.join(' > ')}`);
  } else {
    ok(`catalog order ${expectedOrder.join(' > ')}`);
  }

  const duplicateCodes = active
    .map((plan) => String(plan.plan).toLowerCase())
    .filter((code, index, all) => all.indexOf(code) !== index);

  if (duplicateCodes.length) fail(`duplicate plan codes: ${[...new Set(duplicateCodes)].join(', ')}`);
  else ok('no duplicate active plan codes');

  if (!process.exitCode) {
    console.log('\nHML commercial plan matrix smoke passed.');
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.stack || error.message : String(error));
});
