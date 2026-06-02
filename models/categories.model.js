// note: incCategoryDesc, min 3 chars, unique

export default (sequelize, DataTypes) => sequelize.define("categories", {
    incCategoryDesc: { type: DataTypes.STRING, allowNull: false, unique: true,
        validate: { len: { min: 3, msg: "Incident category name must be at least 3 characters long."}} 
    }
}, {
  timestamps: false
});
