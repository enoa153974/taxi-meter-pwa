import {
    groupByDate,
    calcTotal,
    getBillingPeriod,
    getBusinessDateForCalc
} from "./detailCalc.js";

export function buildMonthSummary(allSales, baseDate) {
    const { start, end } = getBillingPeriod(baseDate);

    const sales = allSales.filter(s => {
        const d = getBusinessDateForCalc(s);
        return d >= start && d <= end;
    });

    const grouped = groupByDate(sales);
    const total = calcTotal(grouped);
    const workDays = Object.keys(grouped).length;

    return {
        start,
        end,
        total,
        workDays,
        grouped,
        sales
    };
}
