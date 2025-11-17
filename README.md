# 🔒 Studious Adventure - Secure Forum

A key-based secure forum with captcha protection and TOTP file linking.

## Features

- **Key-Based Authentication**: No passwords or emails required. Users generate a secure key to post.
- **Captcha Protection**: Visual captcha system prevents automated abuse on signup and posting.
- **TOTP File Links**: Attach secure file links with Time-based One-Time Password (TOTP) codes.
- **Rate Limiting**: Prevents spam and abuse with configurable rate limits.
- **Anonymous Posting**: Post comments using only your secure key - no sessions, no tracking.
- **Pagination**: Browse topics with configurable page size for better performance.
- **User Filtering**: View all topics created by a specific user.
- **Topic Deletion**: Delete your own topics with key verification.
- **Registration Control**: Enable/disable user registration as needed.
- **Maintenance Mode**: Put site in maintenance mode with custom message.

## Installation

1. Clone the repository:
```bash
git clone https://github.com/peakea/studious-adventure.git
cd studious-adventure
```

2. Install dependencies:
```bash
npm install
```

3. Initialize configuration:
```bash
npm run init
# Or: node cli.js init
```

4. Start the server:
```bash
npm start
# Or: node cli.js start
```

5. Open your browser to `http://localhost:3000`

## CLI Commands

Studious Adventure includes a command-line interface:

```bash
# Start the server
npm start
# Or: node cli.js start

# Start with custom port
node cli.js start --port 8080

# Initialize config.json from default
npm run init
# Or: node cli.js init

# Force overwrite existing config
node cli.js init --force

# View current configuration
npm run config
# Or: node cli.js config

# Show help
node cli.js --help
```

## Linux Service Installation

For production environments, you can install Studious Adventure as a systemd service for automatic startup:

```bash
# Install service (runs as current user by default)
sudo node cli.js install-service

# Install service with specific user
sudo node cli.js install-service --user www-data

# Manage the service
sudo systemctl start studious-adventure
sudo systemctl stop studious-adventure
sudo systemctl restart studious-adventure
sudo systemctl status studious-adventure

# View logs
sudo journalctl -u studious-adventure -f

# Uninstall service
sudo node cli.js uninstall-service
```

**Note:** Service installation requires sudo privileges. The service will automatically start on system boot.

For detailed systemd service documentation, see [SYSTEMD_SERVICE.md](SYSTEMD_SERVICE.md).

## Usage

### Sign Up
1. Visit `/signup` or click "Sign Up to Get Your Key" on the home page
2. Choose a unique author name (this will be displayed on all your posts)
3. Complete the captcha verification
4. Save your generated key securely - you'll need it to post and create topics

### Create a Topic
1. On the home page, enter a topic title
2. Enter your secret key
3. Complete the captcha verification
4. Submit to create a new topic

### Post a Comment
1. Navigate to any topic
2. Enter your comment content and secret key
3. Your author name will be automatically displayed from your registration
4. Optionally add a secure file link with TOTP secret
5. Submit your comment

### Browse Topics
- **Pagination**: Topics are displayed in pages (configurable page size)
- Navigate through pages using the pagination links at the bottom
- **Filter by User**: Click on any author name to see all topics created by that user
- User topic pages also support pagination

### Delete a Topic
1. Navigate to any topic you created
2. Click the "Delete Topic" link at the top of the page
3. Enter your secret key to verify ownership
4. Confirm deletion (this will also delete all comments in the topic)

**Note**: Only the topic creator can delete a topic. You must have the same secret key used to create it.

### Secure File Links with TOTP
When posting a comment, you can optionally include:
- **File Link**: URL to a secure file (e.g., from GitHub)
- **TOTP Secret**: Base32-encoded TOTP secret for file access

The forum will display the current TOTP code that refreshes every 30 seconds.

## Security Features

- Keys are hashed with SHA-256 before storage
- Captchas expire after 5 minutes
- Automatic cleanup of expired captchas
- General rate limiting to prevent abuse
- Captcha protection on signup and topic creation
- Keys must be registered before posting or creating topics
- Author names are unique and tied to keys
- TOTP secrets are validated before storage
- Error messages include helpful links to signup page
- Topic deletion requires ownership verification via key authentication
- Only the topic creator (verified by key_hash) can delete their topics

## Technology Stack

- **Backend**: Node.js with Express
- **Database**: SQLite3 with UUIDv4 primary keys
- **Templates**: EJS
- **Security**: 
  - `canvas` - Captcha image generation
  - `otplib` - TOTP generation and verification
  - `express-rate-limit` - Rate limiting middleware
  - `uuid` - UUIDv4 generation for all database IDs

## Database Schema

All tables use **UUIDv4** (TEXT) for primary keys instead of auto-incrementing integers.

### Tables

- **topics**: Forum topics (with author tracking and key_hash for deletion verification)
  - `id` - UUIDv4 primary key
  - `title` - Topic title
  - `author` - Topic creator name
  - `key_hash` - SHA-256 hash of creator's key (for deletion verification)
  - `created_at` - Timestamp

- **comments**: User comments with key verification
  - `id` - UUIDv4 primary key
  - `topic_id` - UUIDv4 foreign key to topics
  - `author` - Comment author name
  - `content` - Comment text
  - `key_hash` - SHA-256 hash of author's key
  - `file_link` - Optional secure file URL
  - `totp_secret` - Optional TOTP secret
  - `created_at` - Timestamp

- **users**: Registered users with unique author names and hashed keys
  - `id` - UUIDv4 primary key
  - `author_name` - Unique display name
  - `key_hash` - SHA-256 hash of user's secret key
  - `created_at` - Timestamp

- **captchas**: Temporary captcha storage with expiration
  - `key` - Random TEXT key
  - `text` - Captcha answer
  - `created_at` - Unix timestamp

### Fresh Database

The database is automatically created when you first start the server. If you need to reset the database:

```bash
# Stop the server if running
# Delete the database file
rm forum.db

# Restart the server - it will create a fresh database
npm start
```

A default "Welcome to the Secure Forum" topic will be created automatically.

## Configuration

The application uses a configuration system based on [taegyo](https://github.com/peakea/taegyo):

### Configuration Files

- **`default-config.json`**: Default configuration (committed to git)
- **`config.json`**: User-specific configuration (auto-created from default, ignored by git)

On first run, `config.json` is automatically created from `default-config.json`. You can customize `config.json` to change:

### Server Settings
```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  }
}
```

### Site Information
```json
{
  "site": {
    "title": "Studious Adventure Forum",
    "description": "A simple forum with key-based authentication",
    "registrationOpen": true,
    "maintenanceMode": false,
    "maintenanceMessage": "The forum is currently undergoing maintenance. Please check back later."
  }
}
```

**Registration Control:**
- `registrationOpen` (true/false): Controls whether new users can register
- When closed, the signup link is hidden and replaced with a notice
- Use `npm run site:registration:open` or `npm run site:registration:close` to toggle

**Maintenance Mode:**
- `maintenanceMode` (true/false): Puts the entire site in maintenance mode
- When enabled, displays a maintenance page to all visitors (except static assets)
- `maintenanceMessage`: Custom message shown on the maintenance page
- Use `npm run site:maintenance:on` or `npm run site:maintenance:off` to toggle
- Auto-refreshes every 60 seconds to check if maintenance is complete

### Database Configuration
```json
{
  "database": {
    "dbFile": "forum.db"
  }
}
```

### Pagination
```json
{
  "pagination": {
    "pageSize": 10
  }
}
```
Controls how many topics are displayed per page on the homepage and user topic pages.

### Rate Limiting
```json
{
  "rateLimit": {
    "general": {
      "windowMs": 900000,
      "max": 100,
      "message": "Too many requests from this IP, please try again later."
    }
  }
}
```

**Note:** Post-specific rate limiting has been removed as it's ineffective for hidden services (e.g., Tor) where IP-based limiting doesn't work reliably. The captcha system provides the primary anti-spam protection.

### Captcha Settings
```json
{
  "captcha": {
    "expiryMs": 300000,
    "cleanupIntervalMs": 600000,
    "characters": 6,
    "font": "Arial",
    "size": 60,
    "width": 350,
    "height": 150,
    "colors": ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7", "#a29bfe", "#fd79a8", "#fdcb6e"],
    "traceColor": "#2d3436",
    "traceSize": 3
  }
}
```

**Captcha Maintenance Service:**
- `expiryMs` (300000 = 5 minutes): Time before a captcha expires and becomes invalid
- `cleanupIntervalMs` (600000 = 10 minutes): How often the maintenance service runs to clean expired captchas
- The service automatically starts on application launch and runs in the background
- Expired captchas are removed from the database to prevent bloat
- Cleanup operations are logged to the console for monitoring

**Visual Settings:**
- `characters`: Number of characters in captcha text (default: 6)
- `width` × `height`: Captcha image dimensions in pixels
- `colors`: Array of hex colors for captcha text
- `traceColor` and `traceSize`: Settings for noise lines

## Site Management Commands

### Registration Control

```bash
# Check current site status
npm run site:status

# Open user registration
npm run site:registration:open

# Close user registration
npm run site:registration:close
```

### Maintenance Mode

```bash
# Enable maintenance mode
npm run site:maintenance:on
# Or with custom message:
node site-config.js maintenance:on "Upgrading database, back in 2 hours"

# Disable maintenance mode
npm run site:maintenance:off

# Update maintenance message
node site-config.js maintenance:message "System upgrade in progress"
```

**Note**: All site configuration changes require a server restart to take effect.

### Captcha Utility Commands

Manage captchas using npm scripts or direct commands:

```bash
# View captcha statistics and configuration
npm run captcha:stats

# Remove expired captchas manually
npm run captcha:clean

# List all captchas with their status
npm run captcha:list

# Clear all captchas (use with caution)
npm run captcha:clear
```

The captcha maintenance service runs automatically in the background, but these commands are useful for:
- Monitoring captcha health in production
- Manual cleanup during development
- Troubleshooting captcha-related issues
- Database maintenance operations

## Documentation

- [CLI Usage Guide](CLI_USAGE.md) - Complete guide to CLI commands and workflows
- [Captcha Maintenance](CAPTCHA_MAINTENANCE.md) - Detailed guide to the captcha maintenance service
- [Systemd Service](SYSTEMD_SERVICE.md) - Production deployment with systemd

## Credits

Inspired by:
- [taegyo](https://github.com/peakea/taegyo) - Key-based authentication pattern and configuration system
- [securefiles](https://github.com/peakea/securefiles) - Captcha system implementation, CLI structure, and systemd service setup

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
