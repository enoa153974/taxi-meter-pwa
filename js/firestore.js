// firestore.js
// Firestoreとの通信（読み書き）を担当するモジュール

import {
    collection, getDocs, addDoc, query,
    orderBy, where,
    limit, serverTimestamp
} from
    "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase.js";

import { toBusinessDateKey } from "./detailCalc.js";

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
    const startKey = toBusinessDateKey(start);
    const endKey = toBusinessDateKey(end);

    const q = query(
        collection(db, "sales"),
        where("businessDate", ">=", startKey),
        where("businessDate", "<=", endKey),
        orderBy("businessDate", "desc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnap => {
        const data = docSnap.data();

        return {
            id: docSnap.id,
            amount: data.amount ?? 0,
            memo: data.memo ?? "",
            createdAt: data.createdAt ?? null,
            businessDate: data.businessDate ?? null,
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
            createdAt: data.createdAt?.toDate() ?? null,
            businessDate: data.businessDate ?? null
        };
    });
}

//集計用のログ取得関数
// ❗ IMPORTANT: 2026-06-22現在
// driverLogs は旧データと新データの両形式に対応している。
//
// 【旧形式】
// note.businessDate に businessDate を保持
//
// 【新形式】
// businessDate をトップレベルに保持（sales と同一仕様）
//
// 現在は旧データを表示するため、fetchDriverLogsByPeriod() では
// 両形式を取得・統合している。
//
// TODO:
// 過去ログ（旧形式）を参照する必要がなくなった時点
// （目安：旧データが集計対象期間から外れた頃）に、
// note.businessDate 対応コードを削除し、
// businessDate のみを使用する実装へ移行する。
//
// その際は以下も合わせて削除・整理する。
// - note.businessDate を取得する Firestore クエリ
// - 旧形式データの変換処理
// - 旧形式とのマージ処理

export async function fetchDriverLogsByPeriod(start, end) {
    const newQ = query(
        collection(db, "driverLogs"),
        where("businessDate", ">=", start),
        where("businessDate", "<=", end),
        orderBy("businessDate", "desc")
    );

    const oldQ = query(
        collection(db, "driverLogs"),
        where("note.businessDate", ">=", start),
        where("note.businessDate", "<=", end),
        orderBy("note.businessDate", "desc")
    );

    const [newSnapshot, oldSnapshot] = await Promise.all([
        getDocs(newQ),
        getDocs(oldQ)
    ]);

    const newLogs = newSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            note: data.note ?? "",
            createdAt: data.createdAt ?? null,
            businessDate: data.businessDate ?? null
        };
    });

    const oldLogs = oldSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            note: data.note?.note ?? "",
            createdAt: data.createdAt ?? data.note?.createdAt ?? null,
            businessDate: data.note?.businessDate ?? null
        };
    });

    return [...newLogs, ...oldLogs];
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
export async function addDriverLog(data) {
    return addDoc(collection(db, "driverLogs"), {
        ...data,
        createdAt: serverTimestamp()
    });
}