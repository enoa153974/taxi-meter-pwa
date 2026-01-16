
const sales = await fetchSales();

// 日別売上
const grouped = groupByDate(sales);

// ログ（今は未表示でもOK）
const logsByDate = groupLogsByDate(sales);