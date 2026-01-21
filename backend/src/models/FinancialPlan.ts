import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

interface FinancialPlanAttributes {
    id: string;
    userId: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline: Date;
    category: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface FinancialPlanCreationAttributes extends Optional<FinancialPlanAttributes, 'id' | 'currentAmount'> { }

class FinancialPlan extends Model<FinancialPlanAttributes, FinancialPlanCreationAttributes> implements FinancialPlanAttributes {
    public id!: string;
    public userId!: string;
    public name!: string;
    public targetAmount!: number;
    public currentAmount!: number;
    public deadline!: Date;
    public category!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

FinancialPlan.init(
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
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        targetAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        currentAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
        },
        deadline: {
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
        tableName: 'financial_plans',
        timestamps: true,
    }
);

// Associations
FinancialPlan.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(FinancialPlan, { foreignKey: 'userId', as: 'financialPlans' });

export default FinancialPlan;
