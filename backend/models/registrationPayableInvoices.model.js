module.exports = (sequelize, DataTypes) => {
  const RegistrationPayableInvoice = sequelize.define(
    'RegistrationPayableInvoice',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      mc_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      invoice_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      invoice_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      registration_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      period_start: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      period_end: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      due_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      file_no: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      old_file_no: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      new_file_no: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      management_corporation_name: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      fee_rate_per_unit: {
        type: DataTypes.REAL,
        allowNull: true,
      },
      fee_amount: {
        type: DataTypes.REAL,
        allowNull: true,
      },
      sscl_amount: {
        type: DataTypes.REAL,
        allowNull: true,
      },
      vat_amount: {
        type: DataTypes.REAL,
        allowNull: true,
      },
      total_amount: {
        type: DataTypes.REAL,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'Payable',
      },
      created_by: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      modified_by: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      history: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'registration_payable_invoices',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return RegistrationPayableInvoice;
};