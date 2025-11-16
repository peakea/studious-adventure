# studious-adventure
A secure forum with key-based posting and TOTP-protected file links

## Features

- **Key-based Authentication**: Post comments using a secret key without login sessions
  - Keys are hashed with SHA-256 and never stored in plain text
  - Similar to the approach used in github.com/peakea/taegyo
- **TOTP File Links**: Share secure file links with Time-based One-Time Password (TOTP) codes
  - Support for links to github.com/peakea/securefiles or any other URL
  - TOTP codes are displayed and refresh every 30 seconds
- **No External Resources**: All CSS styling is inline in EJS templates
- **Rate Limited**: Protection against abuse (100 requests per 15 min, 10 posts per 15 min)
- **SQLite Database**: Persistent storage for topics and comments

## Installation

```bash
npm install
```

## Usage

Start the server:

```bash
npm start
```

The server will run on `http://localhost:3000` (or the port specified in the PORT environment variable).

## How to Use

### Viewing Topics

1. Navigate to the homepage to see all available topics
2. Click on a topic to view its comments

### Posting Comments

1. Navigate to a topic page
2. Fill in the comment form:
   - **Author Name**: Your display name
   - **Comment**: Your message
   - **Secret Key**: Your personal secret key (will be hashed, not stored)
   - **File Link** (optional): URL to a secure file (e.g., github.com/peakea/securefiles)
   - **TOTP Secret** (optional): Base32-encoded TOTP secret for file access verification
3. Submit the form

### Creating Topics

1. On the homepage, use the "Create New Topic" form
2. Enter a topic title and submit

### Viewing TOTP Codes

If a comment has a file link with a TOTP secret:
- The current TOTP code will be displayed below the file link
- The code refreshes every 30 seconds (reload the page to see the new code)
- Users can use this code to access the secure file

## Security Features

- **Key Hashing**: User keys are hashed with SHA-256 before storage
- **No Sessions**: No login sessions or cookies required
- **Rate Limiting**: Prevents brute force and spam attacks
- **Input Validation**: All user inputs are validated
- **SQL Injection Protection**: Uses parameterized queries via sqlite3

## Technology Stack

- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **SQLite3**: Database
- **EJS**: Templating engine
- **otplib**: TOTP generation
- **express-rate-limit**: Rate limiting middleware

## License

MIT
