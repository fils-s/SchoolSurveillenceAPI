// things to consider: username minimum 4 characters, password minimum 10 characters

export default (sequelize, DataTypes) => sequelize.define("users", {
  username: { type: DataTypes.STRING, allowNull: false,
    validate: { len: { args: [4, 100], msg: "Username must be between 4 and 100 characters"}} 
  },
  email: { type: DataTypes.STRING, allowNull: false, unique: true,
    validate: { isEmail: true } // validate it is a valid email format
  },
  password: { type: DataTypes.STRING, allowNull: false,
    validate: { len: { min: 10, msg: "Password must be at least 10 characters long."}} 
  },
  userType: { type: DataTypes.ENUM("student", "professor", "janitor", "admin"), defaultValue: "student" },
  approval: { type: DataTypes.BOOLEAN, defaultValue: false },
  isBanned: { type: DataTypes.BOOLEAN, defaultValue: false }

}, {
  timestamps: false 
});
