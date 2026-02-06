// auth.js
import {
    getAuth,
    signInAnonymously,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

import { app } from "./firebase.js";

const auth = getAuth(app);

export async function initAuth() {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log("🔐 Auth OK:", user.uid);
                resolve(user);
            } else {
                try {
                    await signInAnonymously(auth);
                } catch (e) {
                    console.error("❌ Auth failed", e);
                    reject(e);
                }
            }
        });
    });
}
