// note: incCategoryDesc, min 3 chars, unique
// in incident_status, status and incidentID should be primary keys instead of an id

export default (sequelize, DataTypes) => sequelize.define("incident_status", {
    incidentId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status: { 
        type: DataTypes.ENUM("in_analysis", "unsolved", "in_resolution", "solved", "rejected"), 
        allowNull: false
    }}, {
    timestamps: true,
    primaryKey: true,
    indexes: [{ fields: ["incidentId", "status"], unique: true }]
});
