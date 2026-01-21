import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

interface PaymentReminderAttributes {
    id: string;
    userId: string;
    description: string;
    amount: number;
    dueDate: Date;
    isPaid: boolean;
    reminderDaysBefore: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface PaymentReminderCreationAttributes extends Optional<PaymentReminderAttributes, 'id' | 'isPaid' | 'reminderDaysBefore'> { }

class PaymentReminder extends Model<PaymentReminderAttributes, PaymentReminderCreationAttributes> implements PaymentReminderAttributes {
    public id!: string;
    public userId!: string;
    public description!: string;
    public amount!: number;
    public dueDate!: Date;
    public isPaid!: boolean;
    public reminderDaysBefore!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

PaymentReminder.init(
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
        dueDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        isPaid: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        reminderDaysBefore: {
            type: DataTypes.INTEGER,
            defaultValue: 3,
        },
    },
    {
        sequelize,
        tableName: 'payment_reminders',
        timestamps: true,
    }
);

// Associations
PaymentReminder.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(PaymentReminder, { foreignKey: 'userId', as: 'paymentReminders' });

export default PaymentReminder;
