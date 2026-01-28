require('dotenv').config();
const { Sequelize } = require('sequelize');

console.log("DB_HOST:", process.env.DB_HOST);

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: 'postgres',
        port: process.env.DB_PORT || 5432,
        logging: false
    }
);

(async () => {
    try {
        console.log('Connecting...');
        await sequelize.authenticate();
        console.log('Connected.');

        console.log('Executing query...');
        await sequelize.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='credit_cards' AND column_name='enabled') THEN
                    ALTER TABLE "credit_cards" ADD COLUMN "enabled" BOOLEAN DEFAULT true NOT NULL;
                END IF;
            END
            $$;
        `);
        console.log('Migration OK');
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
})();
