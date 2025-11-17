# CLI Usage Guide

Complete guide to using the Studious Adventure CLI commands.

## Basic Commands

### Starting the Server

```bash
# Start with default configuration
npm start
# Or
node cli.js start

# Start with custom port (overrides config.json)
node cli.js start --port 8080

# Start with custom config file
node cli.js start --config /path/to/custom-config.json
```

### Configuration Management

```bash
# Create config.json from defaults
npm run init
# Or
node cli.js init

# Force overwrite existing config.json
node cli.js init --force

# View current configuration
npm run config
# Or
node cli.js config
```

### Getting Help

```bash
# Show all commands
node cli.js --help

# Show help for specific command
node cli.js start --help
node cli.js install-service --help
```

## Production Deployment with Systemd

### Installing as a Service

1. **Initial Setup**
   ```bash
   # Clone and install
   git clone https://github.com/peakea/studious-adventure.git
   cd studious-adventure
   npm install
   
   # Create configuration
   node cli.js init
   
   # Edit configuration as needed
   nano config.json
   ```

2. **Install Service**
   ```bash
   # Install as current user
   sudo node cli.js install-service
   
   # Or install with specific user
   sudo node cli.js install-service --user www-data
   
   # Or install with custom service name
   sudo node cli.js install-service --name forum-production --user www-data
   ```

3. **Start Service**
   ```bash
   sudo systemctl start studious-adventure
   ```

4. **Verify Service**
   ```bash
   # Check status
   sudo systemctl status studious-adventure
   
   # View logs
   sudo journalctl -u studious-adventure -f
   ```

### Managing the Service

```bash
# Start service
sudo systemctl start studious-adventure

# Stop service
sudo systemctl stop studious-adventure

# Restart service
sudo systemctl restart studious-adventure

# Enable auto-start on boot (already done during install)
sudo systemctl enable studious-adventure

# Disable auto-start on boot
sudo systemctl disable studious-adventure

# Check if service is enabled
sudo systemctl is-enabled studious-adventure

# View service status
sudo systemctl status studious-adventure
```

### Viewing Logs

```bash
# Follow logs in real-time
sudo journalctl -u studious-adventure -f

# View last 100 lines
sudo journalctl -u studious-adventure -n 100

# View logs from today
sudo journalctl -u studious-adventure --since today

# View logs with timestamps
sudo journalctl -u studious-adventure -o short-precise

# View only error messages
sudo journalctl -u studious-adventure -p err

# Export logs to file
sudo journalctl -u studious-adventure > forum-logs.txt
```

### Uninstalling the Service

```bash
# Uninstall with default name
sudo node cli.js uninstall-service

# Uninstall with custom name
sudo node cli.js uninstall-service --name forum-production
```

This will:
- Stop the service if running
- Disable auto-start on boot
- Remove the service file
- Reload systemd daemon

## Example Workflows

### Development Workflow

```bash
# 1. Clone and setup
git clone https://github.com/peakea/studious-adventure.git
cd studious-adventure
npm install

# 2. Initialize config
npm run init

# 3. Start server (manual)
npm start

# Or with custom port
node cli.js start --port 8080

# Server runs in foreground, Ctrl+C to stop
```

### Production Workflow

```bash
# 1. Setup application
cd /var/www/studious-adventure
npm install
node cli.js init

# 2. Configure
nano config.json
# Set port, host, rate limits, etc.

# 3. Install as service
sudo node cli.js install-service --user www-data

# 4. Start service
sudo systemctl start studious-adventure

# 5. Enable monitoring
sudo journalctl -u studious-adventure -f
```

### Testing Configuration Changes

```bash
# 1. View current config
node cli.js config

# 2. Edit config
nano config.json

# 3. If running as service, restart
sudo systemctl restart studious-adventure

# 4. If running manually, restart the process
# Press Ctrl+C, then:
node cli.js start

# 5. Check logs for errors
sudo journalctl -u studious-adventure -n 50
```

### Multiple Instances

You can run multiple instances with different configurations:

```bash
# Instance 1: Production
sudo node cli.js install-service --name forum-prod --user www-data
# Edit config.json for production settings

# Instance 2: Staging
sudo node cli.js install-service --name forum-staging --user www-data
# Use different config file and port

# Manage separately
sudo systemctl start forum-prod
sudo systemctl start forum-staging
sudo systemctl status forum-prod
sudo systemctl status forum-staging
```

## Configuration File Locations

When running as a service:
- **Config**: `/path/to/installation/config.json`
- **Database**: `/path/to/installation/forum.db`
- **Logs**: Systemd journal (view with `journalctl`)

When running manually:
- **Config**: `./config.json` in current directory
- **Database**: `./forum.db` in current directory
- **Logs**: Terminal output

## Troubleshooting

### Service won't start

```bash
# Check logs for errors
sudo journalctl -u studious-adventure -n 50

# Try running manually to see errors
cd /path/to/installation
node server.js
```

Common issues:
- Port already in use (change in config.json)
- Missing config.json (run `node cli.js init`)
- Permission errors (check file ownership)
- Database locked (stop other instances)

### Port conflicts

```bash
# Check what's using the port
sudo lsof -i :3000

# Change port in config.json
node cli.js config  # View current
nano config.json    # Edit port
sudo systemctl restart studious-adventure  # Restart service
```

### Permission errors

```bash
# Check file ownership
ls -la /path/to/installation

# Fix ownership (replace www-data with your service user)
sudo chown -R www-data:www-data /path/to/installation

# Restart service
sudo systemctl restart studious-adventure
```

### Service fails after reboot

```bash
# Check if service is enabled
sudo systemctl is-enabled studious-adventure

# If not enabled, enable it
sudo systemctl enable studious-adventure

# Start now
sudo systemctl start studious-adventure
```

## Best Practices

1. **Use systemd for production**: Services restart automatically and logs are centralized
2. **Run as non-root user**: Use `--user` flag during installation
3. **Monitor logs regularly**: Use `journalctl` to watch for issues
4. **Test configuration changes**: Always verify config with `node cli.js config` before restarting
5. **Backup database**: Regularly backup `forum.db` file
6. **Keep config.json secure**: Contains important settings, don't commit to version control

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm start` | Start server (development) |
| `node cli.js start --port 8080` | Start with custom port |
| `npm run init` | Create config.json |
| `npm run config` | View configuration |
| `sudo node cli.js install-service` | Install systemd service |
| `sudo systemctl start studious-adventure` | Start service |
| `sudo systemctl stop studious-adventure` | Stop service |
| `sudo systemctl restart studious-adventure` | Restart service |
| `sudo systemctl status studious-adventure` | Check status |
| `sudo journalctl -u studious-adventure -f` | View logs |
| `sudo node cli.js uninstall-service` | Remove service |
