/*
FIREBASE PLACEHOLDER — intentionally disabled while the portals use static demo data.

THIS FILE'S PURPOSE
- Initializes the Firebase web application.
- Exposes Firebase Authentication for player email/password login.
- Exposes Firestore for player profiles, productions, achievements, friends, and settings.

HOW TO ENABLE IT LATER
1. Install the `firebase` package.
2. Add the NEXT_PUBLIC_FIREBASE_* values listed in FIREBASE_SETUP.md.
3. Remove this block comment.
4. Replace the demo credential checks in src/app/api/admin/login/route.ts.
5. Verify Firebase ID tokens on the server and create secure HTTP-only session cookies.
6. Replace static portal data with Firestore reads and writes.

import { getApps, initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps()[0] ?? initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
export const firestore = getFirestore(app);

// Call this from the login form, then send the returned ID token to a server
// endpoint that verifies it with the Firebase Admin SDK and sets a secure cookie.
export async function loginPlayer(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
  return credential.user.getIdToken();
}

export function logoutFirebaseUser() {
  return signOut(firebaseAuth);
}
*/

export {};
