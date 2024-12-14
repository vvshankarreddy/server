const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/user'); // Path to your User model
const { MailtrapClient } = require("mailtrap");
const Redis = require('ioredis'); // Redis integration

const router = express.Router();

// Redis setup
const redisClient = new Redis("rediss://default:AYDHAAIjcDEzOWQzMjljYTBjMTM0ZmE4ODcxOTUxNDEwNmM5NGNhNXAxMA@main-buck-32967.upstash.io:6379");

// Mailtrap setup
const TOKEN = "f0f1e8442010950d2c90e4e048705a7b"; // Replace with your Mailtrap API token
const client = new MailtrapClient({ token: TOKEN });
const sender = {
  email: "hello@vesarecine.xyz", // Replace with your Mailtrap verified sender email
  name: "Email verification", // Replace with your app name
};

// Signup route
router.post('/', async (req, res) => {
  const { name, email, password } = req.body;
  const ip = req.ip; // Capture user's IP address for rate-limiting

  // Check if all required fields are provided
  if (!name || !email || !password) {
    return res.status(400).send('All fields are required');
  }

  // Log input data for debugging
  console.log('Signup request data:', req.body);

  // Rate limiting: Check how many requests have been made in the last hour
  const requests = await redisClient.get(ip);
  if (requests && parseInt(requests) >= 25) {
    return res.status(429).send('Too many requests. Please try again later.');
  }

  // Increment request count in Redis for the user's IP (valid for 1 hour)
  await redisClient.incr(ip);
  await redisClient.expire(ip, 3600); // Set TTL for 1 hour

  try {
    // Check if the email already exists in the main MongoDB database
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Email already exists in the database:', email); // Debugging log
      return res.status(400).send('Email already in use');
    }

    // Check if the email exists in Redis (user started signup but hasn't verified)
    const existingUserInRedis = await redisClient.get(email);
    if (existingUserInRedis) {
      console.log('Email exists in Redis:', email); // Debugging log
      const existingUserData = JSON.parse(existingUserInRedis);

      // Update the Redis data for the new signup request
      existingUserData.name = name;
      existingUserData.password = await bcrypt.hash(password, 10); // Hash the password again

      // Store the updated data in Redis
      await redisClient.set(email, JSON.stringify(existingUserData));
      await redisClient.expire(email, 3600); // Set TTL for 1 hour to expire after a certain period

      // Send a new verification email
      const verificationCode = Math.floor(10000 + Math.random() * 90000); // 5-digit code
      existingUserData.verificationCode = verificationCode; // Update verification code in Redis

      await client.send({
        from: sender,
        to: [{ email }],
        subject: "Verify your email address",
        text: `Welcome, ${name}! Your verification code is: ${verificationCode}`,
      });

      return res.status(200).send('Verification code sent. Please check your email.');
    }

    // If email doesn't exist in either the database or Redis, proceed with new user signup
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a 5-digit verification code
    const verificationCode = Math.floor(10000 + Math.random() * 90000); // 5-digit code

    // Store user data temporarily in Redis
    const userData = {
      name,
      email,
      password: hashedPassword,
      verificationCode,
      isVerified: false, // Pending verification
    };

    await redisClient.set(email, JSON.stringify(userData)); // Store user data in Redis with email as key
    await redisClient.expire(email, 3600); // Set TTL for 1 hour to ensure data expires after a certain period

    // Send verification email
    const recipients = [{ email }];
    await client.send({
      from: sender,
      to: recipients,
      subject: "Verify your email address",
      text: `Welcome, ${name}! Your verification code is: ${verificationCode}`,
    });

    res.status(201).send('User created successfully. Please verify your email.');
  } catch (error) {
    console.error('Signup failed:', error);
    res.status(500).send('Server error. Please try again later.');
  }
});

// Email verification route
router.post('/verify', async (req, res) => {
  const { email, code } = req.body;

  // Check if email and code are provided
  if (!email || !code) {
    return res.status(400).send('Email and verification code are required');
  }

  try {
    // Retrieve user data from Redis using the email as key
    const userData = await redisClient.get(email);
    if (!userData) {
      return res.status(404).send('User not found or verification link expired');
    }

    const parsedData = JSON.parse(userData);

    // Check if the code matches
    if (parsedData.verificationCode === parseInt(code)) {
      // Mark user as verified in Redis
      parsedData.isVerified = true;

      // Create user in the main database
      const user = new User({
        name: parsedData.name,
        email: parsedData.email,
        password: parsedData.password, // Store hashed password
        isVerified: parsedData.isVerified,
      });

      await user.save(); // Save to the main database

      // Remove the temporary user data from Redis
      await redisClient.del(email);

      res.status(200).send('Email verified successfully.');
    } else {
      res.status(400).send('Invalid verification code.');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error. Please try again later.');
  }
});

module.exports = router;
