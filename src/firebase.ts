import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, CACHE_SIZE_UNLIMITED, enableIndexedDbPersistence } from 'firebase/firestore';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Initialize Firestore with standard settings. Wrap in try/catch to handle errors with Web Storage/IndexedDB blocking inside iframes.
let db;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    localCache: {
      kind: 'persistent',
    }
  }, firebaseConfig.firestoreDatabaseId);
} catch (error) {
  console.warn("Persistent cache not supported or blocked in this environment (such as an iframe). Falling back to memory cache.", error);
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, firebaseConfig.firestoreDatabaseId);
}

export { db };

// Initialize Auth
export const auth = getAuth(app);

export default app;
