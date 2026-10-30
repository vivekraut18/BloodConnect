import assert from 'node:assert';
import { checkRateLimit } from '../src/lib/rate-limit';
import { isValidStatusTransition } from '../src/lib/validations';

function runTests() {
  console.log('=== BLOODCONNECT SECURITY CHECKS ===\n');

  const mockReq = {
    headers: new Headers({ 'x-forwarded-for': '192.168.1.50' }),
  } as any;

  for (let i = 1; i <= 5; i++) {
    const result = checkRateLimit(mockReq, 'test_login', 5, 10 * 60 * 1000);
    assert.strictEqual(result.allowed, true, `Attempt ${i} should be allowed`);
  }
  assert.strictEqual(
    checkRateLimit(mockReq, 'test_login', 5, 10 * 60 * 1000).allowed,
    false,
    'The sixth attempt must be blocked by the rate limiter'
  );
  console.log('PASS: Rate limiter blocks attempts after the configured threshold');

  assert.strictEqual(isValidStatusTransition('FULFILLED', 'OPEN'), false);
  assert.strictEqual(isValidStatusTransition('CANCELLED', 'DONOR_RESPONDED'), false);
  assert.strictEqual(isValidStatusTransition('OPEN', 'MATCHING'), true);
  console.log('PASS: Blood-request status transition rules are enforced');

  console.log('\n=== SECURITY CHECKS PASSED ===\n');
}

try {
  runTests();
  process.exit(0);
} catch (error) {
  console.error('Security checks failed:', error);
  process.exit(1);
}
