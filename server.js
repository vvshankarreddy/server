const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Body parser middleware for form data
app.use(bodyParser.json());

// Serve the signup route to store credentials locally
app.post('/signup', (req, res) => {
  const { username, password } = req.body;

  // Save credentials to a local file (mocking localStorage with JSON file)
  const users = JSON.parse(fs.readFileSync('users.json', 'utf8') || '[]');
  const userExists = users.some(user => user.username === username);

  if (userExists) {
    return res.json({ success: false, message: 'User already exists' });
  }

  users.push({ username, password });
  fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
  res.json({ success: true });
});

// Handle login (Python will handle actual authentication)
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const { exec } = require('child_process');
  exec(`python3 auth.py ${username} ${password}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.json({ success: false });
    }
    if (stdout.trim() === 'success') {
      return res.json({ success: true });
    } else {
      return res.json({ success: false });
    }
  });
});

// Get port from environment variable or default to 3000 for local testing
const port = process.env.PORT || 3000;

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
