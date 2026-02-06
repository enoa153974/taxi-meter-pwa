import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth }from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

//firebaseに接続するために必要な情報群
const firebaseConfig = {
    apiKey: "AIzaSyBgBvARs1SFjkJQzRxj843MhrfVvBjaVjY",
    authDomain: "taxi-meter-pwa.firebaseapp.com",
    projectId: "taxi-meter-pwa",
    storageBucket: "taxi-meter-pwa.firebasestorage.app",
    messagingSenderId: "214753560501",
    appId: "1:214753560501:web:d3acf1471098dbe5d2fbfc"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

