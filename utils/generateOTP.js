const crypto = require('crypto');

const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const getOTPExpiry = () => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10); // OTP valid for 10 mins
  return expiry;
};

module.exports = { generateOTP, getOTPExpiry };
