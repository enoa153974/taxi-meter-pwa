// firestore.js
// Firestoreとの通信（読み書き）を担当するモジュール

import {
    collection, getDocs, addDoc, query,
    orderBy, where,
    limit, serverTimestamp
} from
    "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase.js";

// ------------------------------
// ◆ 売上データの取得関数
// ------------------------------

/**
 * Firestore から売上データを取得する
 * @returns {Promise<Array<{id: string, amount: number, memo: string, createdAt: any}>>}
 */
//一覧表示用の売上取得（直近10件）
export async function fetchSales() {
    const q = query(
        collection(db, "sales"),
        orderBy("createdAt", "desc"),
        limit(10)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnap => {
        const data = docSnap.data();

        return {
            id: docSnap.id,
            amount: data.amount ?? 0,
            memo: data.memo ?? "",
            createdAt: data.createdAt?.toDate() ?? null
        };
    });
}

//集計用の売上取得関数
export async function fetchSalesByPeriod(start, end) {
    const q = query(
        collection(db, "sales"),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end),
        orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnap => {
        const data = docSnap.data();

        return {
            id: docSnap.id,
            amount: data.amount ?? 0,
            memo: data.memo ?? "",
            createdAt: data.createdAt ?? null,

            // 👇 これ追加
            workStartAt: data.workStartAt ?? null,
            workEndAt: data.workEndAt ?? null,
            workMinutes: data.workMinutes ?? null
        };
    });
}

// ------------------------------
// ◆ driverlogの取得関数
// ------------------------------

/* 最新10件のドライバーログ取得 */
export async function fetchDriverLogs() {
    const q = query(
        collection(db, "driverLogs"),
        orderBy("createdAt", "desc"),
        limit(10)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => {
        const data = docSnap.data();

        return {
            id: docSnap.id,
            note: data.note ?? "",
            createdAt: data.createdAt?.toDate() ?? null
        };
    });
}

//集計用のログ取得関数
export async function fetchDriverLogsByPeriod(start, end) {
    const q = query(
        collection(db, "driverLogs"),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end),
        orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnap => {
        const data = docSnap.data();

        return {
            id: docSnap.id,
            note: data.note ?? "",
            createdAt: data.createdAt?.toDate() ?? null
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
        createdAt: serverTimestamp()
    });
}

// Firestore にログデータと追加する
export async function addDriverLog(note) {
    return addDoc(collection(db, "driverLogs"), {
        note,
        createdAt: serverTimestamp()
    });
}
