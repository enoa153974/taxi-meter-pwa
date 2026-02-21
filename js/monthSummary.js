import {
    groupByDate,
    calcTotal,
    getBillingPeriod,
    getBusinessDateForCalc
} from "./detailCalc.js";


/* =========================================================
 * 月別集計データ生成
 * ---------------------------------------------------------
 * ■役割
 * 指定された月度(baseDate)に属する売上データだけを抽出し
 * UI表示用の集計データをまとめて返す
 *
 * ■この関数がやっていること（処理順）
 * ① 月度期間を取得
 * ② 全売上から対象期間のものだけ抽出
 * ③ 日別に集計
 * ④ 合計算出
 * ⑤ 出勤日数算出
 * ⑥ UI用データ構造で返す
 *
 * ■重要設計思想
 * この関数は「表示ロジックを一切持たない」
 * → 純粋なデータ生成関数
 *
 * つまり
 * UIが変わってもこの関数は触らない
 *
 * ■依存関数の役割
 * getBillingPeriod → 月度の開始終了日を取得
 * getBusinessDateForCalc → 売上データの日付を正規化
 * groupByDate → 日別売上集計
 * calcTotal → 合計算出
 *
 * ========================================================= */


/**
 * 月度売上サマリーを生成
 *
 * @param {Array<Object>} allSales Firestoreから取得した全売上データ
 * @param {Date} baseDate 表示対象の基準日（例：2026-03-15）
 *
 * @returns {Object} 月度サマリー
 * @returns {Date}   start   月度開始日
 * @returns {Date}   end     月度終了日
 * @returns {Object} total   合計売上 { gross, net }
 * @returns {number} workDays 出勤日数
 * @returns {Object} grouped 日別売上データ
 * @returns {Array}  sales   対象期間の売上一覧
 */


export function buildMonthSummary(allSales, baseDate) {

    /* =========================
     * ① 月度期間取得
     * ========================= */
    const { start, end } = getBillingPeriod(baseDate);


    /* =========================
     * ② 対象月度の売上だけ抽出
     * ========================= */
    const sales = allSales.filter(s => {
        const d = getBusinessDateForCalc(s);
        return d >= start && d <= end;
    });


    /* =========================
     * ③ 日別売上集計
     * ========================= */
    const grouped = groupByDate(sales);


    /* =========================
     * ④ 合計計算
     * ========================= */
    const total = calcTotal(grouped);


    /* =========================
     * ⑤ 出勤日数算出
     * =========================
     * groupedのキー数＝営業日数
     */
    const workDays = Object.keys(grouped).length;


    /* =========================
     * ⑥ UI用データとして返却
     * ========================= */
    return {
        start,
        end,
        total,
        workDays,
        grouped,
        sales
    };
}