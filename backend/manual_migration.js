require('dotenv').config();
const db = require('./dist/models/index');

(async () => {
    try {
        console.log('Starting manual migration...');

        // Verifica conexão
        await db.sequelize.authenticate();
        console.log('Database connected.');

        // Adiciona coluna enabled se não existir
        await db.sequelize.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='credit_cards' AND column_name='enabled') THEN
                    ALTER TABLE "credit_cards" ADD COLUMN "enabled" BOOLEAN DEFAULT true NOT NULL;
                END IF;
            END
            $$;
        `);
        console.log('Migration successful! Column "enabled" added.');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await db.sequelize.close();
    }
})();
