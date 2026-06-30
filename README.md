# Space Real Estate Web App

This is a static real estate app based on the Space product notes: Active for commercial spaces, Haven for residential rentals, and Sleep for affordable rooms.

## Run

Open `index.html` in a browser, or serve the folder with any static server.

```powershell
cd outputs/space-real-estate-app
start-server.cmd
```

Then open `http://localhost:5173`.

## Firebase setup

1. Create a Firebase project.
2. Enable Firestore Database.
3. Create a web app in Firebase project settings.
4. Paste the SDK config into `config.js`.
5. Use these Firestore collections:
   - `spaceListings`
   - `spaceInquiries`

Example development rules:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /spaceListings/{document} {
      allow read, write: if true;
    }
    match /spaceInquiries/{document} {
      allow create, read: if true;
    }
  }
}
```

For production, replace open rules with authenticated admin writes and validated inquiry creation.

## Publish to GitHub Pages

This folder is ready to publish as a GitHub Pages site.

```powershell
git init
git branch -M main
git add .
git commit -m "Publish Space real estate app"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

In GitHub, open the repository settings, go to Pages, and set the source to GitHub Actions. The included `.github/workflows/pages.yml` workflow deploys the site after each push to `main`.

## Publish to Firebase Hosting

1. Copy `.firebaserc.example` to `.firebaserc`.
2. Replace `your-firebase-project-id` with your Firebase project ID.
3. Install Firebase CLI if needed:

```powershell
npm install
```

4. Log in and deploy:

```powershell
npx firebase login
npx firebase deploy --only hosting
```

## Google Maps

The location panel uses Google Maps embed URLs generated from each listing latitude and longitude, so it works without a separate Maps API key. If you later need Places search, geocoding, or draggable map pins, add a Google Maps JavaScript API key and extend `app.js`.
