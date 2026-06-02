// things to consider: title between 3-50 chars, building min 2 chars, coordinates, min 4 chars. priority: possible values "Low", "Medium", "High", photo should be jpeg, png or webp
// incidents doesn't have commentID and incCategoryID as foreign keys

export default (sequelize, DataTypes) => sequelize.define("incidents", {
  title: { type: DataTypes.STRING, allowNull: false,
    validate: { len: { args: [3, 50], msg: "Title must be between 3 and 50 characters"}} 
  },
  description: { type: DataTypes.STRING},
  registrationDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  building: { type: DataTypes.STRING, allowNull: false,
    validate: { len: { args: [2, 100], msg: "Building must be between 2 and 100 characters"}} 
  },
  coordinates: { type: DataTypes.STRING, allowNull: false,
    validate: { len: { args: [4, 30], msg: "Coordinates must be between 4 and 30 characters"}} 
  },
  priority: { type: DataTypes.ENUM("low", "medium", "high"), allowNull: false },
  status: { type: DataTypes.ENUM("in_analysis", "unsolved", "in_resolution", "solved", "rejected"), allowNull: false },
  userId:{
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "users",
      key: "id"
    }
  },

}, {
  timestamps: false
});
