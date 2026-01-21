import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

interface IncomeAttributes {
    id: string;
    userId: string;
    description: string;
    amount: number;
    category: string;
    date: Date;
    month: number;
    year: number;
    isRecurring: boolean;
    recurrenceFrequency?: string;
    recurrenceEndDate?: Date;
    isPaid: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IncomeCreationAttributes extends Optional<IncomeAttributes, 'id' | 'isRecurring' | 'recurrenceFrequency' | 'recurrenceEndDate'> { }

class Income extends Model<IncomeAttributes, IncomeCreationAttributes> implements IncomeAttributes {
    public id!: string;
    public userId!: string;
    public description!: string;
    public amount!: number;
    public category!: string;
    public date!: Date;
    public month!: number;
    public year!: number;
    public isRecurring!: boolean;
    public recurrenceFrequency?: string;
    public recurrenceEndDate?: Date;
    public isPaid!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Income.init(
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
        tableName: 'incomes',
        timestamps: true,
    }
);

// Associations
Income.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Income, { foreignKey: 'userId', as: 'incomes' });

export default Income;
