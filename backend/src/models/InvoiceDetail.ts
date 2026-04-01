import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import CreditCard from './CreditCard';

interface InvoiceDetailAttributes {
    id: string;
    creditCardId: string;
    month: number;
    year: number;
    description: string;
    amount: number;
    owner: string;
    installmentInfo?: string | null;
    category?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface InvoiceDetailCreationAttributes extends Optional<InvoiceDetailAttributes, 'id' | 'installmentInfo' | 'category'> { }

class InvoiceDetail extends Model<InvoiceDetailAttributes, InvoiceDetailCreationAttributes> implements InvoiceDetailAttributes {
    public id!: string;
    public creditCardId!: string;
    public month!: number;
    public year!: number;
    public description!: string;
    public amount!: number;
    public owner!: string;
    public installmentInfo!: string | null;
    public category!: string | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

InvoiceDetail.init(
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
            validate: {
                min: 1,
                max: 12,
            },
        },
        year: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 2000,
                max: 2100,
            },
        },
        description: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        owner: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        installmentInfo: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        category: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'invoice_details',
        timestamps: true,
        indexes: [
            {
                fields: ['creditCardId', 'month', 'year'],
            },
        ],
    }
);

// Associations
InvoiceDetail.belongsTo(CreditCard, { foreignKey: 'creditCardId', as: 'creditCard' });
CreditCard.hasMany(InvoiceDetail, { foreignKey: 'creditCardId', as: 'invoiceDetails' });

export default InvoiceDetail;
