# Dungeon Command - Desktop Application Guide

## Running the Desktop Application

### Development Mode (with live reload)

1. **Start the dev server and Electron app together:**
   ```bash
   # Terminal 1: Start Vite dev server
   npm run dev

   # Terminal 2: Start Electron desktop app
   npm start
   ```

2. The Electron window will open showing your game
3. Changes to your React code will hot-reload automatically
4. DevTools are open by default for debugging

### Quick Start (All-in-One)
Just run:
```bash
npm run dev
```
Then in a separate terminal:
```bash
npm start
```

## Building a Standalone Windows Executable

To create a `.exe` file you can distribute:

```bash
npm run make
```

This will:
1. Build your React app
2. Package it with Electron
3. Create a Windows installer in the `out/` folder

The installer will be at: `out/make/squirrel.windows/x64/dungeon_command-0.0.1 Setup.exe`

## How to Distribute Your Game

After running `npm run make`, you'll get:
- **Windows**: A Setup.exe installer file
- Users can install and run your game like any other desktop application
- No browser needed!
- Works offline

## Application Features

✅ **Desktop Application** - Runs as a native Windows app
✅ **No Browser UI** - Clean gaming interface without browser chrome
✅ **Offline Ready** - No internet connection required
✅ **Full Screen Option** - Press F11 for full screen
✅ **Dev Tools** - Press F12 to open developer tools (development mode only)

## File Structure

```
DungeonCommandGame/
├── electron/
│   ├── main.mjs          # Electron main process
│   └── preload.mjs       # Electron preload script
├── src/                  # Your React game code
├── dist/                 # Built React app (created by npm run build)
├── out/                  # Built Electron app (created by npm run make)
└── package.json          # Project configuration
```

## Troubleshooting

**Problem: Electron window doesn't open**
- Make sure Vite dev server is running first (`npm run dev`)
- Check it's running on http://localhost:5173
- Then run `npm start` in a separate terminal

**Problem: Game doesn't load in Electron**
- Verify Vite is running and accessible at http://localhost:5173
- Check the Electron console (DevTools) for errors

**Problem: Build fails**
- Run `npm run build` first to test if React builds successfully
- Check for any errors in the console
- Make sure all dependencies are installed (`npm install`)

## Next Steps

Now that you have a working desktop application, you can:
1. Continue adding features (AI opponent, deck building, etc.)
2. Test the game in the desktop environment
3. Create builds to share with friends for testing
4. Eventually create an installer for distribution

## Keyboard Shortcuts (Development)

- **F11** - Toggle full screen
- **F12** - Open DevTools
- **Ctrl+R** - Reload the app
- **Ctrl+Q** - Quit the app
