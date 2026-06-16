const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'eV9tlK8vFvaa8s62LZVh0ssNUfxzV2mN';

function generateMockToken(role, extra = {}) {
  const payload = {
    accountId: 123,
    role: role,
    email: `${role}@test.com`,
    nama: `${role.toUpperCase()} Test`,
    userId: 1,
    ...extra
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

async function loginAs(context, role, extra = {}) {
  const token = generateMockToken(role, extra);
  await context.addCookies([
    {
      name: 'token',
      value: token,
      domain: 'localhost',
      path: '/',
    }
  ]);
}

module.exports = {
  generateMockToken,
  loginAs,
};
