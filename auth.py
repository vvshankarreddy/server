import sys
import json

# Fetch username and password from command-line arguments
username = sys.argv[1]
password = sys.argv[2]

# Load stored user credentials from the JSON file
with open('users.json', 'r') as f:
    users = json.load(f)

# Check if the user exists and if the password matches
for user in users:
    if user['username'] == username and user['password'] == password:
        print("success")
        sys.exit(0)

print("failure")
sys.exit(1)
