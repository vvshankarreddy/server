const { MailtrapClient } = require("mailtrap");
const { mailtrapConfig } = require('../config/mailtrapConfig');
const emailTemplate = require('./emailTemplate');

const client = new MailtrapClient({ token: mailtrapConfig.TOKEN });

async function sendVerificationEmail(email, name, verificationCode) {
  const subject = "Verify your email address";
  const text = emailTemplate.getVerificationText(name, verificationCode);

  const sender = {
    email: "hello@vesarecine.xyz", // Replace with your Mailtrap verified sender email
    name: "Email verification",
  };

  const recipients = [{ email }];
  await client.send({
    from: sender,
    to: recipients,
    subject,
    text,
  });
}

module.exports = { sendVerificationEmail };
