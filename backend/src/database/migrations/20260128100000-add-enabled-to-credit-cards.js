'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('credit_cards', 'enabled', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('credit_cards', 'enabled');
    }
};
