# Memory Palace Testing Guide

## Overview

The Memory Palace is a 3D visualization system that organizes your notes into themed "rooms" in virtual space. The AI automatically categorizes your notes and arranges them spatially, showing relationships between topics.

---

## How It Works

### Basic Flow:
1. **Add Notes** → Upload text notes via the Upload button
2. **AI Organization** → AI categorizes notes into themed rooms
3. **3D Visualization** → Rooms appear in 3D space with connections
4. **Explore** → Click rooms to view notes, navigate in 3D
5. **Save/Load** → Backup to Google Drive for persistence

---

## What Uploads Are Supported?

### ✅ Currently Implemented: **TEXT NOTES ONLY**

The frontend currently supports:
- **Text notes** with:
  - Title (required)
  - Content (required)
  - Tags (optional, comma-separated)

### ⚠️ Backend Ready (But No UI Yet):
The backend is configured to accept these file types, but there's no frontend UI yet:
- PDF files (`.pdf`)
- Markdown files (`.md`)
- JSON files (`.json`)
- Plain text (`.txt`)

**For now, you can only add notes by typing them in the Upload Modal.**

---

## Step-by-Step Testing Guide

### Step 1: Access the Memory Palace View

1. **Open the app** and log in with Google OAuth
2. **Click "Palace" button** in the top navigation (or it should be the default view)
3. You should see an empty 3D canvas with a message like "No memory palace yet"

### Step 2: Add Your First Note

1. **Click the "Upload" button** in the top navigation bar
   - On mobile: The Upload button might be hidden - check if there's a menu or use desktop view
2. **Fill in the Upload Modal**:
   - **Title**: Enter a title (e.g., "Quantum Computing Basics")
   - **Content**: Enter your note content (e.g., "Quantum computing uses qubits instead of bits. Qubits can be in superposition...")
   - **Tags**: Add tags separated by commas (e.g., "quantum, physics, computing")
3. **Click "Add Note"**
4. The modal will close and the note will be sent to the AI for organization

### Step 3: Wait for AI Organization

1. **AI Processing**: The AI (Claude or your selected model) will:
   - Analyze your note content
   - Determine appropriate room categorization
   - Create room structure with:
     - Room name and description
     - 3D position (x, y, z coordinates)
     - Color (hex code)
     - Connections to other rooms (if multiple notes)
2. **Processing Time**: This can take 10-30 seconds depending on the AI model
3. **Result**: You should see the Memory Palace appear with rooms in 3D space

### Step 4: Navigate the 3D Memory Palace

1. **Mouse Controls** (Desktop):
   - **Click and Drag**: Rotate the camera
   - **Scroll Wheel**: Zoom in/out
   - **Right-click and Drag**: Pan the view

2. **Touch Controls** (Mobile):
   - **Touch and Drag**: Rotate
   - **Pinch**: Zoom in/out
   - **Two-finger Drag**: Pan

3. **Click on a Room**:
   - The room will highlight/scale up
   - A **Room Details Panel** slides in from the right (on desktop)
   - Shows room name, description, and all notes in that room

### Step 5: Add Multiple Notes (Recommended for Testing)

To see the full power of the Memory Palace, add several notes on different topics:

**Example Notes to Test:**

```
Note 1:
Title: "Machine Learning Fundamentals"
Content: "Machine learning is a subset of AI. It uses algorithms to learn from data. Types include supervised, unsupervised, and reinforcement learning."
Tags: "machine learning, AI, algorithms"

Note 2:
Title: "Neural Networks"
Content: "Neural networks are computing systems inspired by biological neural networks. They consist of layers of interconnected nodes (neurons)."
Tags: "neural networks, deep learning, machine learning"

Note 3:
Title: "Quantum Entanglement"
Content: "Quantum entanglement is a phenomenon where particles become correlated. Measuring one particle instantly affects its entangled partner, regardless of distance."
Tags: "quantum, physics, entanglement"

Note 4:
Title: "React Hooks"
Content: "React Hooks allow you to use state and lifecycle features in functional components. Common hooks include useState, useEffect, and useContext."
Tags: "react, javascript, web development"
```

**What to Expect:**
- Notes 1 & 2 should be grouped together (machine learning related)
- Note 3 should be in a separate room (physics/quantum)
- Note 4 should be in another room (web development)
- The AI might create connections between related concepts

### Step 6: Test Room Details Panel

1. **Click on any room** in the 3D view
2. **Verify the panel shows**:
   - Room name
   - Room description
   - List of notes in that room
   - Note titles, content previews
   - Tags for each note
3. **Close the panel** by clicking the X button

### Step 7: Test Adding Notes to Existing Palace

1. **Add another note** (Click Upload → Add Note)
2. **The AI will**:
   - Analyze the new note
   - Either add it to an existing room (if it matches)
   - Or create a new room (if it's a new topic)
   - Update the palace structure

### Step 8: Test Cloud Storage (Optional)

1. **Click "Storage" button** in the top navigation
2. **Save to Google Drive**:
   - Click "Save" tab
   - Enter a filename (e.g., "my-palace-2024")
   - Click "Save to Google Drive"
   - Authenticate with Google if needed
   - Wait for success message

3. **Load from Google Drive**:
   - Click "Load" tab
   - See list of saved files
   - Click on a file to load it
   - Your Memory Palace should restore

4. **Local Download**:
   - Click "Download" button
   - Saves JSON file to your device
   - You can inspect the structure manually

### Step 9: Clear/Delete Memory Palace (For Testing)

**Option 1: Using the Clear Button (Recommended)**
1. **Click the "Clear" button** (red trash icon) in the top navigation
   - Only visible when a Memory Palace exists
   - Located between "Storage" and "Dark Mode" buttons
2. **Confirm deletion** in the popup dialog
3. **Memory Palace is cleared** immediately
4. **Empty state appears** - you can start fresh

**Option 2: Browser Console (Advanced)**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Run: `localStorage.removeItem('app-storage'); location.reload()`
4. This clears ALL app data (memory palace, research history, etc.)

**Note**: Clearing deletes the palace from browser storage. If you saved to Google Drive, those backups remain and can be loaded again.

---

## What to Test/Verify

### ✅ Basic Functionality

- [ ] Upload modal opens when clicking "Upload" button
- [ ] Can add a note with title, content, and tags
- [ ] Note submission triggers AI organization
- [ ] Memory Palace appears after organization
- [ ] Rooms are visible in 3D space

### ✅ 3D Navigation

- [ ] Can rotate view with mouse drag
- [ ] Can zoom with scroll wheel
- [ ] Can pan with right-click drag
- [ ] Rooms have floating animation
- [ ] Rooms show note count badges

### ✅ Room Interaction

- [ ] Clicking a room highlights it
- [ ] Room details panel slides in
- [ ] Panel shows room name and description
- [ ] Panel shows all notes in the room
- [ ] Can close the panel

### ✅ Multiple Notes

- [ ] Multiple notes create multiple rooms (when topics differ)
- [ ] Related notes are grouped in same room
- [ ] Room connections are visible (lines between rooms)
- [ ] Different rooms have different colors
- [ ] Spatial layout makes sense (related rooms near each other)

### ✅ AI Organization Quality

- [ ] Notes are categorized logically
- [ ] Room names are descriptive
- [ ] Room descriptions are relevant
- [ ] Tags are preserved in notes
- [ ] Note content is accessible

### ✅ State Persistence

- [ ] Memory Palace persists in browser localStorage
- [ ] Refreshing page keeps the palace
- [ ] Can save to Google Drive (if configured)
- [ ] Can load from Google Drive (if configured)

### ✅ Error Handling

- [ ] Error messages show if AI organization fails
- [ ] Empty state shows when no palace exists
- [ ] Loading states appear during processing
- [ ] Network errors are handled gracefully

---

## Troubleshooting

### Problem: Upload button not visible
- **Solution**: Check if you're on mobile - try desktop view or check for a menu
- **Solution**: Make sure you're logged in

### Problem: No Memory Palace appears after adding note
- **Check**: Is the AI API key configured? (Claude API key required)
- **Check**: Check browser console for errors
- **Check**: Check network tab for API call failures
- **Solution**: Try with a simpler note first

### Problem: Rooms appear but no notes visible
- **Check**: Click on a room to open the details panel
- **Check**: Verify notes are in the `notes_index` in browser storage

### Problem: 3D view not rendering
- **Check**: Does your browser support WebGL? (Chrome recommended)
- **Check**: Check browser console for WebGL errors
- **Solution**: Try a different browser

### Problem: Can't click rooms
- **Check**: Make sure you're clicking directly on the room cube
- **Check**: Check if there are any overlay elements blocking clicks

### Problem: AI organization takes too long
- **Normal**: This can take 10-30 seconds depending on model
- **Check**: Verify your API key is valid and has credits
- **Solution**: Try with fewer notes or a faster model (Together, DeepSeek)

---

## Testing Tips

1. **Start Small**: Begin with 1-2 notes to verify basic functionality
2. **Add Variety**: Use notes on different topics to see room creation
3. **Check Console**: Open browser DevTools to see any errors
4. **Test Mobile**: Try on mobile device to test touch controls
5. **Test Persistence**: Refresh page to ensure palace is saved
6. **Test Organization**: Add notes incrementally to see how AI groups them

---

## Expected Data Structure

When a Memory Palace is created, the structure looks like this:

```json
{
  "rooms": [
    {
      "id": "room_1",
      "name": "Machine Learning",
      "description": "Notes about machine learning and AI",
      "notes": ["note_id_1", "note_id_2"],
      "position": {"x": 0, "y": 0, "z": 0},
      "color": "#3B82F6",
      "connections": ["room_2"]
    }
  ],
  "notes_index": {
    "note_id_1": {
      "id": "note_id_1",
      "title": "ML Fundamentals",
      "content": "Machine learning is...",
      "content_type": "text",
      "tags": ["machine learning", "AI"],
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  },
  "metadata": {
    "suggestions": ["Consider connecting X with Y"]
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

## Next Steps After Testing

Once you've verified the Memory Palace works:

1. **Test with your real notes**: Add actual notes you want to organize
2. **Test organization quality**: Verify AI categorization makes sense
3. **Test with many notes**: See how it handles 10+ notes
4. **Test save/load**: Verify cloud storage works (if configured)
5. **Test mobile experience**: Check touch controls and mobile layout
6. **Provide feedback**: Note any issues or improvements needed

---

## Summary

**What the Memory Palace does:**
- ✅ Organizes text notes into themed rooms
- ✅ Creates 3D spatial layout
- ✅ Shows connections between related topics
- ✅ Provides interactive navigation
- ✅ Saves/loads to Google Drive

**What it currently supports:**
- ✅ Text notes (via upload modal)
- ⚠️ PDF/Markdown/JSON (backend ready, no UI yet)

**What you need to test:**
1. Upload button → Add note → Verify AI organization
2. 3D navigation → Click rooms → View notes
3. Multiple notes → Verify room creation and grouping
4. Save/load → Verify persistence

**Most Important Test:**
Start with 3-4 notes on different topics and verify they're organized into appropriate rooms with a logical spatial layout!

