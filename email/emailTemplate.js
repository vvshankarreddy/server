function getVerificationText(name, verificationCode) {
    return `Welcome, ${name}!\n\nYour verification code is: ${verificationCode}\n\nPlease enter this code in the app to verify your email address.`;
  }
  
  module.exports = { getVerificationText };
  