const crypto = require('crypto');

/**
 * Generate a random password
 * @param {number} length - Password length (default 12)
 * @returns {string} Random password
 */
const generateRandomPassword = (length = 12) => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + special;

    // Ensure at least one of each type
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Generate a secure reset token
 * @returns {string} Hex token
 */
const generateResetToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate a hash for reset token (for secure storage)
 * @param {string} token - Plain text token
 * @returns {string} Hashed token
 */
const hashResetToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = {
    generateRandomPassword,
    generateResetToken,
    hashResetToken
};
