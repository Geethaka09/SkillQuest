require('dotenv').config();

console.log('--- Environment Variable Check ---');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_USER:', process.env.SMTP_USER ? '***SET***' : 'NOT SET');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***SET***' : 'NOT SET');
console.log('FROM_EMAIL (derived form SMTP_USER):', process.env.SMTP_USER);
