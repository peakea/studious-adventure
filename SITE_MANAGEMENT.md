# Site Management Guide

This guide explains how to manage user registration and maintenance mode for your Studious Adventure forum.

## Overview

The forum includes built-in tools to control:
- **User Registration**: Enable or disable new user signups
- **Maintenance Mode**: Display a maintenance page to all visitors

These features are useful for:
- Closing registration when you have enough users
- Preventing spam during attacks
- Performing database maintenance or upgrades
- Temporarily closing the site for administrative work

## Registration Control

### What It Does

When registration is closed:
- The signup link on the homepage is hidden
- A notice is displayed: "⚠️ Registration Closed: New user registration is currently disabled."
- Attempts to access `/signup` return a 403 error page with helpful message
- Existing users can still post and comment normally

### How to Use

#### Check Current Status

```bash
npm run site:status
# Or: node site-config.js status
```

Output:
```
🔧 Site Configuration Status
════════════════════════════════════════════════════════════
Site Title: Studious Adventure Forum
Registration: ✅ OPEN
Maintenance Mode: ✅ INACTIVE
════════════════════════════════════════════════════════════
```

#### Open Registration

```bash
npm run site:registration:open
# Or: node site-config.js registration:open
```

#### Close Registration

```bash
npm run site:registration:close
# Or: node site-config.js registration:close
```

### Configuration

Settings are stored in `config.json`:

```json
{
  "site": {
    "registrationOpen": true
  }
}
```

**Important**: Changes require a server restart to take effect.

## Maintenance Mode

### What It Does

When maintenance mode is enabled:
- **All** visitors see a maintenance page (503 status)
- Static assets (images, styles) remain accessible
- The page auto-refreshes every 60 seconds
- A custom message explains why the site is down

### Maintenance Page Features

- Beautiful gradient design
- Pulsing maintenance icon (🔧)
- Custom message support
- Automatic refresh every minute
- Manual refresh button
- Mobile-responsive

### How to Use

#### Enable Maintenance Mode

Basic:
```bash
npm run site:maintenance:on
# Or: node site-config.js maintenance:on
```

With Custom Message:
```bash
node site-config.js maintenance:on "Database upgrade in progress. Back online at 3 PM EST."
```

#### Disable Maintenance Mode

```bash
npm run site:maintenance:off
# Or: node site-config.js maintenance:off
```

#### Update Maintenance Message

```bash
node site-config.js maintenance:message "Extended maintenance: Hardware upgrade in progress"
```

### Configuration

Settings are stored in `config.json`:

```json
{
  "site": {
    "maintenanceMode": false,
    "maintenanceMessage": "The forum is currently undergoing maintenance. Please check back later."
  }
}
```

**Important**: Changes require a server restart to take effect.

## Common Workflows

### Performing Database Maintenance

```bash
# 1. Enable maintenance mode
npm run site:maintenance:on
node site-config.js maintenance:on "Performing database maintenance"

# 2. Restart server to apply changes
pkill -f "node server.js"
npm start &

# 3. Perform your maintenance
# ... database backup, migration, etc. ...

# 4. Disable maintenance mode
npm run site:maintenance:off

# 5. Restart server
pkill -f "node server.js"
npm start &
```

### Handling Spam Attacks

```bash
# Quickly close registration during spam attack
npm run site:registration:close
pkill -f "node server.js"
npm start &

# Clean up spam (using your preferred method)
# ...

# Re-open registration when ready
npm run site:registration:open
pkill -f "node server.js"
npm start &
```

### Upgrading Server Software

```bash
# Put site in maintenance mode
node site-config.js maintenance:on "Upgrading to latest version. Back in 15 minutes."
pkill -f "node server.js"
npm start &

# Perform upgrade
git pull
npm install
npm audit fix

# Remove maintenance mode
npm run site:maintenance:off

# Restart with new version
pkill -f "node server.js"
npm start &
```

## Automated Management

### Using Systemd

If you're using systemd to manage your forum, you can reload configuration without full restart:

```bash
# Update config
npm run site:maintenance:on

# Restart service
sudo systemctl restart studious-adventure

# Check status
sudo systemctl status studious-adventure
```

### Scheduled Maintenance

You can schedule maintenance using cron:

```bash
# Enable maintenance at 2 AM
0 2 * * * cd /path/to/forum && node site-config.js maintenance:on "Scheduled maintenance" && systemctl restart studious-adventure

# Disable maintenance at 4 AM
0 4 * * * cd /path/to/forum && node site-config.js maintenance:off && systemctl restart studious-adventure
```

## Best Practices

### Registration Control

1. **Monitor signups**: Watch for unusual signup patterns
2. **Close proactively**: Don't wait for spam to start
3. **Communicate**: Update your community before closing registration
4. **Document reason**: Keep notes on why registration was closed

### Maintenance Mode

1. **Set expectations**: Include estimated downtime in message
2. **Schedule wisely**: Choose low-traffic times
3. **Test first**: Verify maintenance mode works before real maintenance
4. **Have rollback plan**: Be ready to disable if issues occur
5. **Monitor logs**: Watch for errors during maintenance

### Configuration Management

1. **Backup config**: Keep a backup of `config.json`
2. **Version control**: Track config changes in git (if safe)
3. **Document changes**: Note why settings were changed
4. **Test changes**: Verify in development before production

## Troubleshooting

### Registration Toggle Not Working

**Problem**: Changed registration setting but signup link still shows/hides incorrectly

**Solution**:
1. Verify config was saved: `cat config.json | grep registrationOpen`
2. Ensure server was restarted: `pkill -f "node server.js" && npm start`
3. Clear browser cache and reload page
4. Check server logs for errors

### Maintenance Page Not Displaying

**Problem**: Enabled maintenance mode but site still accessible

**Solution**:
1. Verify config: `cat config.json | grep maintenanceMode`
2. Check for true boolean (not string): `"maintenanceMode": true`
3. Restart server: `pkill -f "node server.js" && npm start`
4. Try accessing from incognito/private window
5. Check server logs: `grep -i maintenance logs/*.log`

### Can't Disable Maintenance Mode

**Problem**: Site stuck in maintenance mode

**Solution**:
1. Manually edit config.json:
   ```bash
   # Edit config
   nano config.json
   # Set: "maintenanceMode": false
   ```
2. Restart server
3. If editing fails, restore from backup or default-config.json

### Server Won't Restart

**Problem**: Server fails to start after config change

**Solution**:
1. Check config syntax: `node -c config.json`
2. Restore default: `cp default-config.json config.json`
3. Check server logs: `tail -n 50 logs/error.log`
4. Verify port availability: `lsof -i :3000`

## Security Considerations

### File Permissions

Ensure `config.json` has appropriate permissions:

```bash
# Set restrictive permissions
chmod 600 config.json

# Owned by service user
chown forum-user:forum-user config.json
```

### Access Control

- Limit who can run site-config.js
- Use sudo for production changes
- Log all configuration changes
- Review changes in version control

### Backup Strategy

Always backup before changes:

```bash
# Before making changes
cp config.json config.json.backup.$(date +%Y%m%d_%H%M%S)

# Make changes
npm run site:maintenance:on

# If issues, restore
cp config.json.backup.20250116_020000 config.json
```

## See Also

- [Main README](README.md) - General application documentation
- [Captcha Maintenance](CAPTCHA_MAINTENANCE.md) - Captcha management guide
- [CLI Usage Guide](CLI_USAGE.md) - Command-line interface guide
- [Systemd Service](SYSTEMD_SERVICE.md) - Production deployment guide
