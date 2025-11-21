import crypto from 'crypto';

// Generate a 256-bit (32-byte) random secret
const sessionSecret: string = crypto.randomBytes(32).toString('hex');
console.log(sessionSecret); 