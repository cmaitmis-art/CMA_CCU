module.exports = (sequelize, DataTypes) => {
  const McomRecord = sequelize.define(
    'McomRecord',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      // Excel key
      file_no: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      // ── Excel fields (M.Com List) ───────────────────────────────────────────
      reg_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      old_file_no: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      remark: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      new_file_no: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      management_corporation_name: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      units: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      plan_no: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      secretary: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      secretary_unit_no: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      treasurer: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      treasurer_unit_no: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      renewal_period: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      agm_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      agm_minutes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      attendance: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      audited_account: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      building_insurance: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      active_non_active: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      renewal_date_vise: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      agm_date_vise: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      renewal_status: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      agm_status: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // Renewal payment tracking
      renewal_paid: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      renewal_paid_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      renewal_paid_amount: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      renewal_paid_year: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      renewal_paid_years: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      renewal_receipt_no: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      acknowledgement_no: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      acknowledgement_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      renewal_payment_status: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
      },
      next_renewal_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      mc_mcom: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      engineer: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      management_assistant: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      town: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      council: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      certificate_file_no: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email_address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      awareness_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      // For filtering
      category: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      status: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'Active',
      },

      // Audit fields
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
      tableName: 'mcom_records',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return McomRecord;
};

