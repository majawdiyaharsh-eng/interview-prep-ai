const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Session = sequelize.define(
  "Session",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      trim: true,
    },
    experience: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: "",
    },
    difficulty: {
      type: DataTypes.ENUM("Easy", "Medium", "Hard"),
      defaultValue: "Medium",
    },
  },
  {
    timestamps: true,
    tableName: "sessions",
  }
);

module.exports = Session;