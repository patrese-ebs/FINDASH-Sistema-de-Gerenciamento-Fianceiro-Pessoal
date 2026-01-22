import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

interface PasswordResetTokenAttributes {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

interface PasswordResetTokenCreationAttributes extends Optional<PasswordResetTokenAttributes, 'id'> { }

class PasswordResetToken extends Model<PasswordResetTokenAttributes, PasswordResetTokenCreationAttributes> implements PasswordResetTokenAttributes {
    public id!: string;
    public userId!: string;
    public token!: string;
    public expiresAt!: Date;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    public user?: User;
}

PasswordResetToken.init(
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
        token: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'password_reset_tokens',
        timestamps: true,
    }
);

PasswordResetToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(PasswordResetToken, { foreignKey: 'userId', as: 'resetTokens' });

export default PasswordResetToken;
