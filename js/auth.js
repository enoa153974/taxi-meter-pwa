// auth.js
import {
    signInAnonymously,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { auth } from "./firebase.js";

/**
 * Firebase Auth 初期化（匿名ログイン）
 */
export async function initAuth() {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log("✅ Auth OK (uid):", user.uid);
                resolve(user);
                return;
            }

            try {
                const result = await signInAnonymously(auth);
                console.log("✅ 匿名ログイン成功:", result.user.uid);
                resolve(result.user);
            } catch (error) {
                console.error("❌ 匿名ログイン失敗", error);
                reject(error);
            }
        });
    });
}
