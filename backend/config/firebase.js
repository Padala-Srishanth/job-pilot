const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin SDK
// Option 1: Service account JSON file (local development)
// Option 2: FIREBASE_SERVICE_ACCOUNT env var (deployed — paste full JSON as env var)
// Option 3: FIREBASE_PROJECT_ID only (limited — can't verify auth tokens)

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (fs.existsSync(serviceAccountPath)) {
  // Local development — use file
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
  });
  console.log('Firebase Admin initialized (from file)');
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Deployed — parse JSON from env var
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
  });
  console.log('Firebase Admin initialized (from env var)');
} else if (process.env.FIREBASE_PROJECT_ID) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`
  });
  console.log('Firebase Admin initialized (project ID only — auth verification limited)');
} else {
  admin.initializeApp();
  console.log('Firebase Admin initialized (default)');
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

module.exports = { admin, db, auth, storage };
