import express from 'express';
import bcrypt from 'bcryptjs';
import { MailtrapClient } from 'mailtrap';
import Redis from 'ioredis';
import User from '../models/user'; // Path to your User model

const router = express.Router();

// Mailtrap setup
const TOKEN = "f0f1e8442010950d2c90e4e048705a7b"; // Replace with your Mailtrap API token
const clientMailtrap = new MailtrapClient({ token: TOKEN });
const sender = {
  email: "hello@vesarecine.xyz", // Replace with your Mailtrap verified sender email
  name: "Your App Name", // Replace with your app name
};

// Redis setup
const redisClient = new Redis("rediss://default:AYDHAAIjcDEzOWQzMjljYTBjMTM0ZmE4ODcxOTUxNDEwNmM5NGNhNXAxMA@main-buck-32967.upstash.io:6379");

// Signup route with rate limiting
router.post('/', async (req, res) => {
  const { name, email, password } = req.body;
  const ip = req.ip; // Get the IP address of the client

  // Check if all required fields are provided
  if (!name || !email || !password) {
    return res.status(400).send('All fields are required');
  }

  // Rate limiting logic: Limit 5 requests per IP in 1 hour
  const limitKey = `signup_rate_limit:${ip}`;
  const currentCount = await redisClient.get(limitKey);

  if (currentCount && parseInt(currentCount) >= 5) {
    return res.status(429).send('Too many requests. Please try again later.');
  }

  // Increment the count and set the expiration (1 hour)
  await redisClient.multi()
    .incr(limitKey)
    .expire(limitKey, 3600)  // Expire after 1 hour
    .exec();

  // Check if the user already exists in the database
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).send('Email already in use');
  }

  // Hash the password before saving
  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate a 5-digit verification code
  const verificationCode = Math.floor(10000 + Math.random() * 90000); // 5-digit code

  // Store user data temporarily in Redis
  const tempUserData = {
    name,
    email,
    password: hashedPassword,
    verificationCode,
    isVerified: false,
  };

  // Store the temporary user data in Redis with a 5-minute expiration time (300 seconds)
  await redisClient.setex(email, 300, JSON.stringify(tempUserData));

  try {
    // Send verification email
    const recipients = [{ email }];
    await clientMailtrap.send({
      from: sender,
      to: recipients,
      subject: "Verify your email address",
      text: `Welcome, ${name}! Your verification code is: ${verificationCode}`,
    });

    res.status(201).send('User created successfully. Please verify your email.');
  } catch (error) {
    console.error(error);
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
    // Retrieve user data from Redis
    const redisData = await redisClient.get(email);

    if (!redisData) {
      return res.status(400).send('User verification data not found or expired');
    }

    const user = JSON.parse(redisData);

    // Check if the code matches
    if (user.verificationCode === code) {
      // Mark user as verified and move data to database
      const newUser = new User({
        name: user.name,
        email: user.email,
        password: user.password,
        isVerified: true,
      });

      await newUser.save();

      // Delete the temporary user data from Redis
      await redisClient.del(email);

      res.send('Email verified successfully.');
    } else {
      res.status(400).send('Invalid verification code.');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error. Please try again later.');
  }
});

export default router;
