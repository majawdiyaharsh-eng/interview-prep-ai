const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const TestResult = sequelize.define(
  "TestResult",
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
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "sessions", key: "id" },
      onDelete: "CASCADE",
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    difficulty: {
      type: DataTypes.ENUM("easy", "medium", "hard"),
      defaultValue: "medium",
    },
    totalQuestions: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    correctCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    percentage: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    timeTaken: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    timerEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    results: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
  },
  {
    timestamps: true,
    tableName: "test_results",
  }
);

module.exports = TestResult;
