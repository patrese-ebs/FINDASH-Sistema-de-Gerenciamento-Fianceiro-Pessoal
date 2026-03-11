import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

interface ExpenseAttributes {
    id: string;
    userId: string;
    description: string;
    amount: number;
    category: string;
    date: Date;
    month: number;
    year: number;
    paymentMethod: 'cash' | 'debit' | 'credit' | 'transfer' | 'pix';
    creditCardId?: string;
    creditCardTransactionId?: string;
    isRecurring: boolean;
    recurrenceFrequency?: string;
    recurrenceEndDate?: Date;
    recurrenceId?: string;
    isPaid: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ExpenseCreationAttributes extends Optional<ExpenseAttributes, 'id' | 'creditCardId' | 'creditCardTransactionId' | 'isRecurring' | 'recurrenceFrequency' | 'recurrenceEndDate' | 'recurrenceId'> { }

class Expense extends Model<ExpenseAttributes, ExpenseCreationAttributes> implements ExpenseAttributes {
    public id!: string;
    public userId!: string;
    public description!: string;
    public amount!: number;
    public category!: string;
    public date!: Date;
    public month!: number;
    public year!: number;
    public paymentMethod!: 'cash' | 'debit' | 'credit' | 'transfer' | 'pix';
    public creditCardId?: string;
    public creditCardTransactionId?: string;
    public isRecurring!: boolean;
    public recurrenceFrequency?: string;
    public recurrenceEndDate?: Date;
    public recurrenceId?: string;
    public isPaid!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Expense.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        description: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        category: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        month: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        year: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        paymentMethod: {
            type: DataTypes.ENUM('cash', 'debit', 'credit', 'transfer', 'pix'),
            allowNull: false,
        },
        creditCardId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'credit_cards',
                key: 'id',
            },
            onDelete: 'SET NULL',
        },
        creditCardTransactionId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'credit_card_transactions',
                key: 'id',
            },
            onDelete: 'SET NULL',
        },
        isRecurring: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        recurrenceFrequency: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        recurrenceEndDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        recurrenceId: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        isPaid: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    },
    {
        sequelize,
        tableName: 'expenses',
        timestamps: true,
    }
);

// Associations
Expense.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Expense, { foreignKey: 'userId', as: 'expenses' });

export default Expense;
