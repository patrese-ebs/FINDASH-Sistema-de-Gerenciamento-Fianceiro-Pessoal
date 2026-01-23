const initialDate = new Date('2026-01-31');
const isRecurring = true;
const recurrenceEndDate = null;

console.log('--- Simulation Start ---');

const incomesToCreate = [];

// Initial
incomesToCreate.push({
    date: new Date(initialDate),
    month: initialDate.getMonth() + 1,
});

if (isRecurring) {
    let endDate = new Date(initialDate);
    endDate.setFullYear(endDate.getFullYear() + 1); // Just 1 year for test

    let nextDate = new Date(initialDate);
    nextDate.setMonth(nextDate.getMonth() + 1);

    while (nextDate <= endDate) {
        console.log(`Date: ${nextDate.toISOString().split('T')[0]} | Month Field: ${nextDate.getMonth() + 1}`);
        nextDate.setMonth(nextDate.getMonth() + 1);
    }
}
