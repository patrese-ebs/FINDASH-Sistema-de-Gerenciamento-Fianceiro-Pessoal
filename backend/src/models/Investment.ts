import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

interface InvestmentAttributes {
    id: string;
    userId: string;
    name: string;
    type: string;
    amountInvested: number;
    currentValue: number;
    purchaseDate: Date;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface InvestmentCreationAttributes extends Optional<InvestmentAttributes, 'id' | 'notes'> { }

class Investment extends Model<InvestmentAttributes, InvestmentCreationAttributes> implements InvestmentAttributes {
    public id!: string;
    public userId!: string;
    public name!: string;
    public type!: string;
    public amountInvested!: number;
    public currentValue!: number;
    public purchaseDate!: Date;
    public notes?: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Investment.init(
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
        type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        amountInvested: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        currentValue: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        purchaseDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'investments',
        timestamps: true,
    }
);

// Associations
Investment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Investment, { foreignKey: 'userId', as: 'investments' });

export default Investment;
