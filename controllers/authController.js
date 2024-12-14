const bcrypt = require('bcryptjs');
const User = require('../models/user'); // Path to your User model
const { sendVerificationEmail } = require('../email/emailService');
const { redisClient } = require('../redis/redisClient');

async function signUp(req, res) {
  const { name, email, password } = req.body;
  const ip = req.ip; // Capture user's IP address for rate-limiting

  if (!name || !email || !password) {
    return res.status(400).send('All fields are required');
  }

  try {
    // Rate limiting logic and user existence checks
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).send('Email already in use');

    const existingUserInRedis = await redisClient.get(email);
    if (existingUserInRedis) {
      const existingUserData = JSON.parse(existingUserInRedis);
      existingUserData.name = name;
      existingUserData.password = await bcrypt.hash(password, 10);
      const verificationCode = Math.floor(10000 + Math.random() * 90000);
      existingUserData.verificationCode = verificationCode;
      
      await redisClient.set(email, JSON.stringify(existingUserData));
      await redisClient.expire(email, 3600); // Set TTL for 1 hour

      await sendVerificationEmail(email, name, verificationCode);
      return res.status(200).send('Verification code sent. Please check your email.');
    }

    // New user signup
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(10000 + Math.random() * 90000);
    const userData = { name, email, password: hashedPassword, verificationCode, isVerified: false };

    await redisClient.set(email, JSON.stringify(userData));
    await redisClient.expire(email, 3600); // Set TTL for 1 hour

    await sendVerificationEmail(email, name, verificationCode);
    res.status(201).send('User created successfully. Please verify your email.');
  } catch (error) {
    console.error('Signup failed:', error);
    res.status(500).send('Server error. Please try again later.');
  }
}

async function verifyEmail(req, res) {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).send('Email and verification code are required');
  }

  try {
    const userData = await redisClient.get(email);
    if (!userData) {
      return res.status(404).send('User not found or verification link expired');
    }

    const parsedData = JSON.parse(userData);
    if (parsedData.verificationCode === parseInt(code)) {
      parsedData.isVerified = true;

      const user = new User({
        name: parsedData.name,
        email: parsedData.email,
        password: parsedData.password,
        isVerified: parsedData.isVerified,
      });

      await user.save();
      await redisClient.del(email);
      res.status(200).send('Email verified successfully.');
    } else {
      res.status(400).send('Invalid verification code.');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error. Please try again later.');
  }
}

module.exports = { signUp, verifyEmail };
