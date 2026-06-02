// things to note: treatentDesc, min 3 chars

export default (sequelize, DataTypes) => sequelize.define("treatments", {
    incidentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
            model: "incidents",
            key: "id"
        }
    },
    treatmentDesc: { type: DataTypes.STRING, allowNull: false,
        validate: { len: { min: 3, msg: "Treatment description must be at least 3 characters long."}} 
    }
}, {
  timestamps: false
});
