import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import CreditCard from './CreditCard';

interface CreditCardTransactionAttributes {
    id: string;
    creditCardId: string;
    description: string;
    totalAmount: number;
    installments: number;
    currentInstallment: number;
    installmentAmount: number;
    purchaseDate: Date;
    category: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface CreditCardTransactionCreationAttributes extends Optional<CreditCardTransactionAttributes, 'id' | 'currentInstallment'> { }

class CreditCardTransaction extends Model<CreditCardTransactionAttributes, CreditCardTransactionCreationAttributes> implements CreditCardTransactionAttributes {
    public id!: string;
    public creditCardId!: string;
    public description!: string;
    public totalAmount!: number;
    public installments!: number;
    public currentInstallment!: number;
    public installmentAmount!: number;
    public purchaseDate!: Date;
    public category!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

CreditCardTransaction.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        creditCardId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'credit_cards',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        description: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        totalAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        installments: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 1,
                max: 48,
            },
        },
        currentInstallment: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: {
                min: 1,
            },
        },
        installmentAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        purchaseDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        category: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'credit_card_transactions',
        timestamps: true,
    }
);

// Associations
CreditCardTransaction.belongsTo(CreditCard, { foreignKey: 'creditCardId', as: 'creditCard' });
CreditCard.hasMany(CreditCardTransaction, { foreignKey: 'creditCardId', as: 'transactions' });

export default CreditCardTransaction;
