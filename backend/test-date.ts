import sequelize from './src/config/database';
import { CreditCardTransaction } from './src/models';

async function test() {
    try {
        await sequelize.authenticate();
        const t = await CreditCardTransaction.findOne();
        if (t) {
            console.log('--- TEST RESULT ---');
            console.log('purchaseDate type:', typeof t.purchaseDate);
            console.log('purchaseDate.constructor.name:', t.purchaseDate.constructor ? t.purchaseDate.constructor.name : 'undefined');
            console.log('purchaseDate.toString():', t.purchaseDate.toString());
            console.log('JSON.stringify(purchaseDate):', JSON.stringify(t.purchaseDate));
            console.log('-------------------');
        } else {
            console.log('No transactions found');
        }
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

test();
