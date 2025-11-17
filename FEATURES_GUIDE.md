# Features Overview

## 1. Pagination System

### Before:
- All topics displayed on single page
- Could become slow with many topics
- No way to navigate through historical topics

### After:
- Topics split into pages (configurable size)
- Fast loading with LIMIT/OFFSET queries
- Page navigation at bottom of list
- Current page highlighted
- Auto-redirect for invalid pages

**Routes:**
- `GET /` - Page 1
- `GET /page/:page` - Any page number

**Configuration:**
```json
{
  "pagination": {
    "pageSize": 10
  }
}
```

---

## 2. User Topic Filtering

### Before:
- No way to see all topics by a specific user
- Author information not tracked
- Topics were anonymous

### After:
- Author names displayed on all topics
- Clickable author names
- Dedicated user pages showing all their topics
- User pages support pagination
- Topic view shows creator name

**Routes:**
- `GET /user/:authorName` - User's page 1
- `GET /user/:authorName/page/:page` - User's any page

**UI Elements:**
- Author name shown as "by [Author Name]" on homepage
- Author name shown as "Created by [Author Name]" on topic page
- Both are clickable links to user's topic list

---

## 3. Topic Deletion

### Before:
- No way to delete topics
- Topics were permanent
- No ownership tracking

### After:
- "Delete Topic" link on every topic page
- Confirmation page with warning
- Ownership verification via secret key
- Cascading deletion (removes all comments)
- Error if wrong key provided

**Routes:**
- `GET /topic/:id/delete` - Deletion confirmation form
- `POST /topic/:id/delete` - Process deletion

**Security:**
- Only owner can delete (key_hash comparison)
- Server-side verification (cannot be bypassed)
- Legacy topics (NULL author) cannot be deleted

**UI Flow:**
1. Click "Delete Topic" on topic page
2. See warning and topic preview
3. Enter secret key to verify ownership
4. Confirm deletion or cancel
5. Redirect to homepage on success

---

## Database Schema Changes

### Topics Table - New Columns:

**author** (TEXT NOT NULL)
- Stores the author name from users table
- Used for filtering topics by user
- Displayed on topic lists and pages

**key_hash** (TEXT NOT NULL)
- Stores SHA-256 hash of creator's key
- Used for ownership verification on deletion
- Prevents unauthorized topic deletion

### Database:

The database is automatically created on first server start with the complete schema including all columns. No migration needed.

---

## Styling Updates

### New CSS Classes:

**Pagination:**
- `.pagination` - Container for page links
- `.page-link` - Individual page links
- `.page-current` - Current page indicator

**User Info:**
- `.topic-author` - Author name styling
- `.delete-link` - Delete link styling

**Deletion UI:**
- `.warning-box` - Warning message container
- `.topic-preview` - Topic preview on delete page
- `.button-danger` - Red delete button
- `.button-secondary` - Gray cancel button

---

## Configuration

The configuration is automatically generated from default-config.json on first run.

To reset configuration:

```bash
node cli.js init --force
```

---

## User Workflows

### Browsing Topics:
1. View topics on homepage (page 1)
2. Click page numbers at bottom to navigate
3. Click any author name to see their topics
4. Navigate through user's topics with pagination

### Creating Topic:
1. Sign up to get key (if not already registered)
2. Enter topic title and key on homepage
3. Complete captcha
4. Topic is created with your author name

### Deleting Topic:
1. Navigate to your topic
2. Click "Delete Topic" link
3. Enter your secret key
4. Confirm deletion
5. Topic and all comments are removed

### Finding User's Topics:
1. Click any author name on homepage
2. See all topics by that user
3. Navigate pages if they have many topics
4. Click topic to view details
