export default (sequelize, DataTypes) => sequelize.define("incident_categories", {
    incidentId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    incCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
}, {
  timestamps: false, // remove createdAt and updatedAt fields
  primaryKey: true,
  indexes: [{ fields: ["incidentId", "incCategoryId"], unique: true }]
});
