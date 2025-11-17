# Captcha Maintenance Service

This document describes the captcha maintenance system, inspired by the [taegyo](https://github.com/peakea/taegyo) project architecture.

## Overview

The captcha maintenance service automatically manages captcha lifecycle, removing expired captchas from the database to prevent bloat and ensure optimal performance.

## Architecture

### Components

1. **Captcha Model** (`models/captchaModel.js`)
   - Handles all database operations for captchas
   - Provides CRUD operations and cleanup functions
   - Separates data layer from business logic

2. **Captcha Service** (`services/captchaService.js`)
   - Generates and validates captchas
   - Manages automatic cleanup intervals
   - Provides statistics and monitoring capabilities

3. **Captcha Utility** (`captcha-util.js`)
   - Command-line tool for manual captcha management
   - View statistics, clean expired captchas, list all captchas

## Automatic Maintenance

The captcha service automatically starts a cleanup interval when the application launches:

```javascript
// Runs every cleanupIntervalMs (default: 10 minutes)
const cleanupInterval = setInterval(cleanExpiredCaptchas, config.cleanupIntervalMs);
```

### How It Works

1. **On Startup**: Service initializes and starts cleanup interval
2. **Initial Cleanup**: Runs 5 seconds after startup to clear any expired captchas
3. **Periodic Cleanup**: Runs every `cleanupIntervalMs` to remove expired captchas
4. **Logging**: Each cleanup operation logs the number of removed captchas

### Example Output

```
[Captcha Service] Starting cleanup service (interval: 600000ms, expiry: 300000ms)
Studious Adventure Forum running on http://0.0.0.0:3000
[Captcha Maintenance] Removed 9 expired captcha(s)
```

## Configuration

Configure captcha maintenance in `config.json`:

```json
{
  "captcha": {
    "expiryMs": 300000,           // 5 minutes - how long captchas remain valid
    "cleanupIntervalMs": 600000,   // 10 minutes - how often cleanup runs
    "characters": 6,               // Number of characters in captcha
    "width": 350,                  // Image width in pixels
    "height": 150,                 // Image height in pixels
    "colors": [                    // Text colors
      "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", 
      "#ffeaa7", "#a29bfe", "#fd79a8", "#fdcb6e"
    ],
    "traceColor": "#2d3436",       // Noise line color
    "traceSize": 3                 // Noise line thickness
  }
}
```

### Configuration Guidelines

- **expiryMs**: Balance security vs user experience
  - Too short: Users may not have time to solve captcha
  - Too long: More database bloat and potential for abuse
  - Recommended: 300000ms (5 minutes)

- **cleanupIntervalMs**: Balance performance vs database size
  - Too frequent: Unnecessary database operations
  - Too infrequent: Database bloat
  - Recommended: 2× the expiry time (e.g., 10 minutes for 5-minute expiry)

## Manual Management

Use the captcha utility script for manual operations:

### View Statistics

```bash
npm run captcha:stats
# Or: node captcha-util.js stats
```

Output:
```
📊 Captcha Statistics
══════════════════════════════════════════════════
Total captchas in database: 12
Expiry time: 5 minutes
Cleanup interval: 10 minutes
══════════════════════════════════════════════════
```

### List All Captchas

```bash
npm run captcha:list
# Or: node captcha-util.js list
```

Output:
```
📋 All Captchas
══════════════════════════════════════════════════════════════════════
✅ VALID | Key: 7bacdf963cda41a2... | Age: 2m 24s
✅ VALID | Key: 86132bc8ddae03c7... | Age: 2m 58s
❌ EXPIRED | Key: ea477bd3c56a1e4a... | Age: 6m 13s
══════════════════════════════════════════════════════════════════════
```

### Clean Expired Captchas

```bash
npm run captcha:clean
# Or: node captcha-util.js clean
```

Output:
```
🧹 Cleanup Complete
Removed 3 expired captcha(s)
```

### Clear All Captchas

⚠️ **Warning**: This removes ALL captchas, including valid ones!

```bash
npm run captcha:clear
# Or: node captcha-util.js clear
```

## Monitoring

### Production Monitoring

Monitor captcha health by watching for cleanup logs:

```bash
# Follow application logs
tail -f /path/to/logs/app.log | grep "Captcha"
```

### Metrics to Watch

1. **Cleanup frequency**: If cleanup removes many captchas regularly, consider:
   - Shorter expiry time
   - More frequent cleanup
   - Investigation of abandoned captchas

2. **Database size**: Monitor captcha table size:
   ```bash
   sqlite3 forum.db "SELECT COUNT(*) FROM captchas;"
   ```

3. **Peak usage**: Check captcha count during peak hours:
   ```bash
   npm run captcha:stats
   ```

## Troubleshooting

### Too Many Captchas Accumulating

**Symptoms**: Captcha count growing continuously

**Solutions**:
1. Check if cleanup service is running:
   ```bash
   grep "Starting cleanup service" logs/app.log
   ```

2. Verify cleanup is executing:
   ```bash
   grep "Captcha Maintenance" logs/app.log
   ```

3. Manually clean if needed:
   ```bash
   npm run captcha:clean
   ```

4. Adjust cleanup interval in config.json

### Captchas Expiring Too Quickly

**Symptoms**: Users report expired captcha errors frequently

**Solutions**:
1. Increase `expiryMs` in config.json
2. Review server time sync (ensure system time is accurate)
3. Check for unusual delays in page loading

### Database Lock Errors

**Symptoms**: Cleanup fails with "database is locked" errors

**Solutions**:
1. Increase cleanup interval to reduce contention
2. Check for other database-heavy operations
3. Consider moving to PostgreSQL for high-traffic sites

## Best Practices

1. **Configuration**
   - Set expiry to at least 3-5 minutes for user convenience
   - Set cleanup interval to 2× expiry time minimum
   - Log all cleanup operations for monitoring

2. **Monitoring**
   - Regularly check captcha statistics in production
   - Alert on unusual accumulation (> 100 captchas)
   - Monitor cleanup logs for errors

3. **Maintenance**
   - Review captcha configuration monthly
   - Adjust settings based on usage patterns
   - Keep cleanup service running at all times

4. **Development**
   - Test with shorter expiry times for faster iteration
   - Use `captcha:list` to debug captcha lifecycle
   - Clear captchas between test runs if needed

## API Reference

### Captcha Service Methods

```javascript
const captchaService = require('./services/captchaService')(config.captcha);

// Generate new captcha
const captcha = await captchaService.generate();
// Returns: { key, text, createdAt }

// Verify captcha answer
const isValid = captchaService.verify(userInput, storedText);
// Returns: boolean

// Check if expired
const expired = captchaService.isExpired(createdAt);
// Returns: boolean

// Get expiry in minutes
const minutes = captchaService.getExpiryMinutes();
// Returns: number

// Manual cleanup
captchaService.cleanExpiredCaptchas();

// Get statistics
captchaService.getStats((err, stats) => {
  // stats: { totalCaptchas, expiryMinutes, cleanupIntervalMinutes }
});

// Shutdown cleanup interval
captchaService.shutdown();
```

### Captcha Model Methods

```javascript
const createCaptchaModel = require('./models/captchaModel');
const captchaModel = createCaptchaModel();

// Create captcha
captchaModel.create(key, text, createdAt, callback);

// Find by key
captchaModel.findByKey(key, callback);

// Delete captcha
captchaModel.delete(key, callback);

// Clean expired
captchaModel.cleanExpired(expiryMs, callback);

// Get count
captchaModel.count(callback);
```

## Credits

This captcha maintenance architecture is inspired by the [taegyo](https://github.com/peakea/taegyo) project, which demonstrates clean separation of concerns and effective resource management.

## See Also

- [Main README](README.md) - General application documentation
- [Configuration Guide](README.md#configuration) - Full configuration options
- [Database Schema](README.md#database-schema) - Database structure details
