// using sequelize with MySQL
// create a connection to the database using environment variables for configuration
import { Sequelize, DataTypes } from "sequelize";

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT
    }
);

// test the database connection
try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");
} catch (error) {
    console.error("Unable to connect to the database:", error);
    process.exit(1);
}

// add models

import CategoriesModel from "./categories.model.js";
const Category = CategoriesModel(sequelize, DataTypes);

import IncidentStatusModel from "./incidentstatus.model.js";
const IncidentStatus = IncidentStatusModel(sequelize, DataTypes);

import TreatmentModel from "./treatments.model.js";
const Treatment = TreatmentModel(sequelize, DataTypes);

import CommentsModel from "./comments.model.js";
const Comment = CommentsModel(sequelize, DataTypes);

import IncidentPhotosModel from "./incidentphotos.model.js";
const IncidentPhoto = IncidentPhotosModel(sequelize, DataTypes);

import IncidentModel from "./incidents.model.js";
const Incident = IncidentModel(sequelize, DataTypes);

import UserModel from "./users.model.js";
const User = UserModel(sequelize, DataTypes);

import IncCategoriesModel from "./inccategories.model.js";
const IncCategories = IncCategoriesModel(sequelize, DataTypes);


// relationships

// INCIDENTS N:M CATEGORIES (allow categories to not have an incident)
Incident.belongsToMany(Category,{through: IncCategories, onDelete: "CASCADE", foreignKey: "incidentId"});
Category.belongsToMany(Incident, { through: IncCategories, onDelete: "CASCADE", foreignKey: "incCategoryId", allowNull: true });

// INCIDENTS 1:N INCIDENT_PHOTO
Incident.hasMany(IncidentPhoto, { foreignKey: "incidentId", allowNull: true  });
IncidentPhoto.belongsTo(Incident, { foreignKey: "incidentId" });

// INCIDENTS 1:N INCIDENT_STATUS
Incident.hasMany(IncidentStatus, { foreignKey: "incidentId" });
IncidentStatus.belongsTo(Incident, { foreignKey: "incidentId" });

// INCIDENTS 1:N COMMENTS
Incident.hasMany(Comment, { foreignKey: "incidentId", allowNull: true  });
Comment.belongsTo(Incident, { foreignKey: "incidentId" });

// INCIDENTS 1:1 TREATMENTS
Incident.hasOne(Treatment, { foreignKey: "incidentId", onDelete: "CASCADE" });
Treatment.belongsTo(Incident, { foreignKey: "incidentId" });

// INCIDENTS N:1 USERS
Incident.belongsTo(User, { foreignKey: "userId" });
User.hasMany(Incident, { foreignKey: "userId", allowNull: true  });

// COMMENTS N:1 USERS
User.hasMany(Comment, { foreignKey: "userId", allowNull: true  });
Comment.belongsTo(User, { foreignKey: "userId" });


// Sync the models with the database
try {
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
    await sequelize.sync({ alter: true }); 
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("All models were synchronized successfully.");
} catch (error) {
    console.error("Error synchronizing models:", error);
    process.exit(1);
}   

// export the models for use in other modules
export { Incident, Category, IncidentStatus, Treatment, Comment, IncidentPhoto, User, IncCategories };




// things to fix tomorrow:
// fix the relationship incidents-comments, idk why but it gets related twice. maybe because of the id shenanigans