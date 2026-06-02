export default (sequelize, DataTypes) => sequelize.define("comment", {
  commentDesc: { type: DataTypes.STRING, allowNull: false}
}, {
  timestamps: {
    createdAt: true,
    updatedAt: false
  }
});
