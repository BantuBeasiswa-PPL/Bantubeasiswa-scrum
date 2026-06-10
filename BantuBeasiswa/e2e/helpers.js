const jwt = require('jsonwebtoken');

const JWT_SECRET = 'bantubeasiswa_secret_key_ppl_2026_ganti_ini';

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
