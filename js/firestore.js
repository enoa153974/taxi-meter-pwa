// firestore.js
// Firestoreとの通信（読み書き）を担当するモジュール

import { collection, getDocs, addDoc } from
    "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase.js";

/**
 * Firestore から売上データを取得する
 * @returns {Promise<Array<{id: string, amount: number, memo: string, createdAt: any}>>}
 */
export async function fetchSales() {
    const snapshot = await getDocs(collection(db, "sales"));

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,          // ← 将来の更新・削除用
            amount: data.amount,
            memo: data.memo,
            createdAt: data.createdAt ?? null

        };
    });
}

/**
 * Firestore に売上データを追加する
 * @param {{amount: number, memo?: string, createdAt?: Date}} data
 * @returns {Promise<any>}
 */
export async function addSale(data) {
    return addDoc(collection(db, "sales"), {
        ...data,
        createdAt: data.createdAt ?? new Date()
    });
}

// Firestore にログデータと追加する
export async function addDriverLog(note) {
    return addDoc(collection(db, "driverLogs"), {
        note,
        createdAt: new Date()
    });
}
