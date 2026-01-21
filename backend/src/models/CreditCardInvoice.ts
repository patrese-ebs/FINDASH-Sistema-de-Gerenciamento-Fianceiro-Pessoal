import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import CreditCard from './CreditCard';

interface CreditCardInvoiceAttributes {
    id: string;
    creditCardId: string;
    month: number;
    year: number;
    amount: number;
    isPaid: boolean;
    paymentDate?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

interface CreditCardInvoiceCreationAttributes extends Optional<CreditCardInvoiceAttributes, 'id' | 'paymentDate' | 'isPaid'> { }

class CreditCardInvoice extends Model<CreditCardInvoiceAttributes, CreditCardInvoiceCreationAttributes> implements CreditCardInvoiceAttributes {
    public id!: string;
    public creditCardId!: string;
    public month!: number;
    public year!: number;
    public amount!: number;
    public isPaid!: boolean;
    public paymentDate?: Date;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

CreditCardInvoice.init(
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
        month: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        year: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        isPaid: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        paymentDate: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'credit_card_invoices',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['creditCardId', 'month', 'year'],
            },
        ],
    }
);

// Associations
CreditCardInvoice.belongsTo(CreditCard, { foreignKey: 'creditCardId', as: 'creditCard' });
CreditCard.hasMany(CreditCardInvoice, { foreignKey: 'creditCardId', as: 'invoices' });

export default CreditCardInvoice;
