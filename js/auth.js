// auth.js
import {
    signInAnonymously,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { auth } from "./firebase.js";

/**
 * Firebase Auth 初期化
 * - 未ログインなら匿名ログイン
 * - ログイン完了後に uid を返す
 */
export function initAuth() {
    return new Promise((resolve, reject) => {

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // すでにログイン済み
                console.log("Auth OK (already signed in):", user.uid);

                // グローバルに保持（他JSから参照用）
                window.currentUser = user;
                window.currentUserUid = user.uid;


                // uid表示用処理
                const debug = document.querySelector("#debug-uid");
                if (debug) {
                    debug.textContent = user.uid;
                }

                resolve(user);
                return;
            }

            try {
                // 未ログイン → 匿名ログイン
                const result = await signInAnonymously(auth);
                console.log("Auth OK (anonymous):", result.user.uid);

                window.currentUser = result.user;
                window.currentUserUid = result.user.uid;

                resolve(result.user);
            } catch (e) {
                console.error("Auth failed:", e);
                reject(e);
            }
        });
    });
}