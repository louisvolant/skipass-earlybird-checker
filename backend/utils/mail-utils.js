// utils/mail-utils.js

function maskEmail(email) {
  if (!email) {
    return ""; // Handle null or undefined emails
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return email; // Invalid email format, return original
  }

  const username = parts[0];
  const domainParts = parts[1].split('.');
  if (domainParts.length < 2) {
    return email; // Invalid domain format, return original
  }

  const maskedUsername = username.length > 2 ? username.substring(0, 2) + '*'.repeat(username.length - 2) : '*'.repeat(username.length);
  const maskedDomain = domainParts[0].length > 1 ? domainParts[0].substring(0, 1) + '*'.repeat(domainParts[0].length - 1) : '*'.repeat(domainParts[0].length);
  const maskedTld = domainParts[domainParts.length - 1].length > 1 ? domainParts[domainParts.length - 1].substring(0, 1) + '*'.repeat(domainParts[domainParts.length - 1].length - 1) : '*'.repeat(domainParts[domainParts.length - 1].length);

  return `${maskedUsername}@${maskedDomain}.${maskedTld}`;
}

module.exports = {maskEmail}