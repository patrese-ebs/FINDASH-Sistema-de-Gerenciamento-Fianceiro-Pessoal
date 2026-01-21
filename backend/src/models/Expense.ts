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
    paymentMethod: 'cash' | 'debit' | 'credit' | 'transfer';
    creditCardId?: string;
    isRecurring: boolean;
    recurrenceFrequency?: string;
    recurrenceEndDate?: Date;
    isPaid: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ExpenseCreationAttributes extends Optional<ExpenseAttributes, 'id' | 'creditCardId' | 'isRecurring' | 'recurrenceFrequency' | 'recurrenceEndDate'> { }

class Expense extends Model<ExpenseAttributes, ExpenseCreationAttributes> implements ExpenseAttributes {
    public id!: string;
    public userId!: string;
    public description!: string;
    public amount!: number;
    public category!: string;
    public date!: Date;
    public month!: number;
    public year!: number;
    public paymentMethod!: 'cash' | 'debit' | 'credit' | 'transfer';
    public creditCardId?: string;
    public isRecurring!: boolean;
    public recurrenceFrequency?: string;
    public recurrenceEndDate?: Date;
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
            type: DataTypes.ENUM('cash', 'debit', 'credit', 'transfer'),
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
