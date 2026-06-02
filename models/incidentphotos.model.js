// note: photo, must be jpeg, png or webp, optional

export default (sequelize, DataTypes) => sequelize.define("incident_photos", {
    photo: { type: DataTypes.STRING, allowNull: false, unique: true, primaryKey: true,
        validate: {
            isUrl: { msg: "Photo must be a valid URL." },
            isValidFormat(format) {
                if (format && !/\.(jpg|jpeg|png|webp)$/i.test(format)) {
                    throw new Error("Photo must be in JPEG, PNG, or WebP format.");
                }
            }
        }
    },
    incidentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "incidents",
            key: "id"
        }
    },
}, {
  timestamps: false
});
