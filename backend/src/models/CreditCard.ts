import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

interface CreditCardAttributes {
    id: string;
    userId: string;
    name: string;
    lastFourDigits: string;
    brand: string;
    imageUrl?: string;
    creditLimit: number;
    closingDay: number;
    dueDay: number;
    sharedLimitCardId?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface CreditCardCreationAttributes extends Optional<CreditCardAttributes, 'id'> { }

class CreditCard extends Model<CreditCardAttributes, CreditCardCreationAttributes> implements CreditCardAttributes {
    public id!: string;
    public userId!: string;
    public name!: string;
    public lastFourDigits!: string;
    public brand!: string;
    public imageUrl!: string;
    public creditLimit!: number;
    public closingDay!: number;
    public dueDay!: number;
    public sharedLimitCardId?: string | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

CreditCard.init(
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
        lastFourDigits: {
            type: DataTypes.STRING(4),
            allowNull: false,
        },
        brand: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        imageUrl: {
            type: DataTypes.STRING,
            allowNull: true,
        },

        creditLimit: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        closingDay: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 1,
                max: 31,
            },
        },
        dueDay: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 1,
                max: 31,
            },
        },
        sharedLimitCardId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'credit_cards',
                key: 'id',
            },
            onDelete: 'SET NULL',
        },
    },
    {
        sequelize,
        tableName: 'credit_cards',
        timestamps: true,
    }
);

// Associations
CreditCard.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(CreditCard, { foreignKey: 'userId', as: 'creditCards' });

// Self-referencing association for shared limit
CreditCard.belongsTo(CreditCard, { foreignKey: 'sharedLimitCardId', as: 'parentCard' });
CreditCard.hasMany(CreditCard, { foreignKey: 'sharedLimitCardId', as: 'childCards' });

export default CreditCard;
