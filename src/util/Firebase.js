import "firebase/auth";
import "firebase/firestore";
import "firebase/functions";
import "firebase/storage";
import "firebase/analytics";

import app from "firebase/app";

const config = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

class Firebase {
  constructor() {
    app.initializeApp(config);

    var db = app.firestore();
    if (config.projectId === "customerdb-development") {
      db.settings({
        host: "localhost:8080",
        ssl: false,
      });
    }

    window.analyticsPromise.then(() => {
      app.analytics();
    });

    this.auth = app.auth;
    this.firestore = app.firestore;
    this.storage = app.storage;
    this.analytics = app.analytics;
    this.functions = app.functions;
  }
}

export default Firebase;
