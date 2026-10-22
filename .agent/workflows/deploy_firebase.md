---
description: Deploy the application to Firebase Hosting
---

# Deploy to Firebase Hosting

Follow these steps to deploy your application to Firebase Hosting.

## 1. Install Firebase Tools
If you haven't already, install the Firebase CLI globally:
```bash
npm install -g firebase-tools
```

## 2. Login to Firebase
You need to authenticate with Google. Run this command and follow the browser prompts:
```bash
npx firebase-tools login
```

## 3. Initialize/Configure
I have already created the necessary configuration files (`firebase.json` and `.firebaserc`) for you.
No need to run `firebase init` manually.

## 4. Build the Application
Build the production version of your app (using Vite). I have run this, but you can run it again if you make changes:
```bash
npm run build
```

## 5. Deploy
Deploy to Firebase using npx (avoids path issues):
```bash
npx firebase-tools deploy
```

Your app will be live at the URL provided in the output (e.g., https://cognexis-10dcb.web.app).
