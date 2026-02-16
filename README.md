# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## 📖 Reading Plans Feature

This app includes a full-stack reading plans feature with database persistence and progress tracking!

### Quick Start for Reading Plans

1. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

2. **Start the backend and app**
   ```bash
   ./start-with-backend.sh
   ```
   
   Or manually:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm start
   
   # Terminal 2 - App
   npm start
   ```

3. **Use the features**
   - Navigate to "Create Reading Plan"
   - Create a named reading plan
   - View all your saved plans
   - Click any plan to load it
   - Read chapters and track progress automatically

### Features

✅ **Create & Manage Plans** - Save multiple reading plans to database
✅ **Progress Tracking** - Automatically track reading progress as you read
✅ **Reading Streaks** - Monitor consecutive days of reading
✅ **Statistics** - View completion percentages and chapter counts
✅ **Resume Reading** - Pick up where you left off in any chapter

📚 **Documentation:**
- `QUICK_START.md` - Fast setup guide
- `QUICK_REFERENCE.md` - Quick reference for progress tracking
- `PROGRESS_TRACKING_GUIDE.md` - Complete progress tracking guide
- `READING_PLANS_SETUP.md` - Detailed documentation
- `ARCHITECTURE.md` - System architecture
- `CHECKLIST.md` - Step-by-step checklist
- `IMPLEMENTATION_SUMMARY.md` - Complete feature overview

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
