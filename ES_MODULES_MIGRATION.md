# ES Modules Migration Guide

## Overview

The entire codebase has been successfully converted from CommonJS (`require`/`module.exports`) to ES modules (`import`/`export`). This migration provides better compatibility with modern JavaScript tools and follows current best practices.

## Changes Made

### 1. Package Configuration

**File**: `package.json`

Added the `"type": "module"` field to enable ES modules:

```json
{
  "type": "module",
  ...
}
```

### 2. Core Files

#### `db.js`
- Changed: `const sqlite3 = require('sqlite3').verbose()` → `import sqlite3 from 'sqlite3'`
- Changed: `const { v4: uuidv4 } = require('uuid')` → `import { v4 as uuidv4 } from 'uuid'`
- Changed: `module.exports = db` → `export default db`
- Added: `__dirname` polyfill using `fileURLToPath` and `dirname`
- Fixed: SQLite initialization to properly use `sqlite3.verbose().Database()`

#### `server.js`
- Changed: All `require()` statements to `import` statements
- Changed: Controller imports to use named imports with `* as`
- Added: `__dirname` polyfill for path resolution
- Changed: Service imports to use default imports

### 3. Models

#### `models/captchaModel.js`
- Changed: `const db = require('../db')` → `import db from '../db.js'`
- Changed: `module.exports = createCaptchaModel` → `export default createCaptchaModel`

### 4. Services

#### `services/captchaService.js`
- Changed: `const { createCanvas } = require('canvas')` → `import { createCanvas } from 'canvas'`
- Changed: `const crypto = require('crypto')` → `import crypto from 'crypto'`
- Changed: `module.exports = function createCaptchaService(...)` → `export default function createCaptchaService(...)`

### 5. Middleware

#### `middleware/maintenanceMiddleware.js`
- Changed: `module.exports = function createMaintenanceMiddleware(...)` → `export default function createMaintenanceMiddleware(...)`

### 6. Controllers

All controller files converted from `exports.functionName` to `export const functionName`:

#### `controllers/homeController.js`
- Changed: `exports.getHomePage` → `export const getHomePage`
- Changed: `exports.getHomePagePaginated` → `export const getHomePagePaginated`

#### `controllers/userController.js`
- Changed: All `exports.*` → `export const *`
- Updated imports: `crypto`, `uuid`, `db`

#### `controllers/topicController.js`
- Changed: All `exports.*` → `export const *`
- Updated imports: `crypto`, `uuid`, `otplib`, `db`

#### `controllers/commentController.js`
- Changed: `exports.postComment` → `export const postComment`
- Updated imports

#### `controllers/captchaController.js`
- Changed: `exports.getCaptcha` → `export const getCaptcha`

### 7. CLI Utilities

#### `cli.js`
- Changed: All `require()` to `import`
- Changed: `require('./server.js')` → `await import('./server.js')`
- Added: `__dirname` polyfill

#### `captcha-util.js`
- Changed: All `require()` to `import` statements
- Updated: File extensions to include `.js`

#### `site-config.js`
- Changed: `const fs = require('fs')` → `import fs from 'fs'`
- Changed: `const path = require('path')` → `import path from 'path'`

## Important Notes

### File Extensions Required

**CRITICAL**: All import statements must now include the `.js` file extension:

```javascript
// ✅ Correct
import db from './db.js';
import createCaptchaModel from './models/captchaModel.js';

// ❌ Wrong (will cause MODULE_NOT_FOUND error)
import db from './db';
import createCaptchaModel from './models/captchaModel';
```

### __dirname Replacement

Since `__dirname` is not available in ES modules, we use this pattern:

```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### Import Types

Three types of imports are now used:

1. **Default imports**: `import express from 'express'`
2. **Named imports**: `import { v4 as uuidv4 } from 'uuid'`
3. **Namespace imports**: `import * as homeController from './controllers/homeController.js'`

## Testing Results

All components have been tested and verified working:

### ✅ Server Startup
```bash
$ node server.js
[Captcha Service] Starting cleanup service (interval: 600000ms, expiry: 300000ms)
Studious Adventure Forum running on http://0.0.0.0:3000
```

### ✅ CLI Commands
```bash
$ node cli.js config
# Successfully displays configuration

$ node cli.js init
# Successfully creates config.json
```

### ✅ Captcha Utilities
```bash
$ node captcha-util.js stats
📊 Captcha Statistics
══════════════════════════════════════════════════
Total captchas in database: 0
Expiry time: 5 minutes
Cleanup interval: 10 minutes
══════════════════════════════════════════════════
```

### ✅ Site Configuration
```bash
$ node site-config.js status
🔧 Site Configuration Status
════════════════════════════════════════════════════════════
Site Title: Studious Adventure Forum
Registration: ❌ CLOSED
Maintenance Mode: ✅ INACTIVE
════════════════════════════════════════════════════════════
```

### ✅ NPM Scripts
```bash
$ npm run captcha:stats
$ npm run site:status
$ npm start
$ npm run dev
```

All npm scripts work correctly with ES modules.

## Migration Benefits

1. **Modern JavaScript**: Uses current ECMAScript standards
2. **Better Tree Shaking**: Bundlers can optimize better with ES modules
3. **Static Analysis**: IDEs and tools can analyze imports more effectively
4. **Future Proof**: ES modules are the future of JavaScript
5. **Consistency**: Single module system throughout the codebase

## Backwards Compatibility

**⚠️ Breaking Change**: This is a breaking change if:
- Other projects depend on this as a CommonJS module
- You're using Node.js < 12 (ES modules support)
- You have custom scripts using `require()`

**Migration Path**: If you need to support CommonJS consumers:
1. Remove `"type": "module"` from package.json
2. Revert all imports/exports back to require/module.exports
3. OR use a dual package setup (advanced)

## Common Issues and Solutions

### Issue: "Cannot find module" errors

**Cause**: Missing `.js` extension in import statement

**Solution**: Add `.js` to all relative imports:
```javascript
import db from './db.js';  // Not './db'
```

### Issue: "__dirname is not defined"

**Cause**: `__dirname` doesn't exist in ES modules

**Solution**: Add polyfill at top of file:
```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### Issue: "Class constructors cannot be invoked without 'new'"

**Cause**: Incorrect sqlite3 initialization

**Solution**: Use proper constructor pattern:
```javascript
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(dbPath);
```

## Files Modified

Total files converted: **13**

### Core
- `package.json` - Added `"type": "module"`
- `db.js` - Database initialization
- `server.js` - Main application entry

### Models
- `models/captchaModel.js`

### Services
- `services/captchaService.js`

### Middleware
- `middleware/maintenanceMiddleware.js`

### Controllers (5 files)
- `controllers/homeController.js`
- `controllers/userController.js`
- `controllers/topicController.js`
- `controllers/commentController.js`
- `controllers/captchaController.js`

### CLI Utilities (3 files)
- `cli.js`
- `captcha-util.js`
- `site-config.js`

## Verification Checklist

- [x] Package.json updated with `"type": "module"`
- [x] All `require()` replaced with `import`
- [x] All `module.exports` replaced with `export`
- [x] All imports include `.js` extension
- [x] `__dirname` polyfills added where needed
- [x] SQLite initialization fixed
- [x] Server starts successfully
- [x] CLI commands work
- [x] Captcha utilities work
- [x] Site config utilities work
- [x] NPM scripts work
- [x] No ESLint/compilation errors

## Next Steps

1. ✅ Test all features through the web interface
2. ✅ Verify captcha generation works
3. ✅ Verify user registration works
4. ✅ Verify topic creation works
5. ✅ Verify maintenance mode works
6. ✅ Update documentation if needed

## Rollback Instructions

If you need to rollback to CommonJS:

1. Remove `"type": "module"` from `package.json`
2. Checkout previous commit: `git checkout HEAD~1`
3. Or manually revert each file's imports/exports

## Support

If you encounter any issues after migration:

1. Check that Node.js version is >= 12
2. Verify all imports have `.js` extensions
3. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
4. Check for any custom scripts that use `require()`

---

**Migration Date**: November 17, 2025  
**Node.js Version**: v22.20.0  
**Status**: ✅ Complete and Verified
