const User = require("./User");
const Session = require("./Session");
const Question = require("./Question");
const TestResult = require("./TestResult");

// User <-> Session
User.hasMany(Session, { foreignKey: "userId", onDelete: "CASCADE" });
Session.belongsTo(User, { foreignKey: "userId" });

// Session <-> Question
Session.hasMany(Question, { foreignKey: "sessionId", onDelete: "CASCADE" });
Question.belongsTo(Session, { foreignKey: "sessionId" });

// User <-> TestResult
User.hasMany(TestResult, { foreignKey: "userId", onDelete: "CASCADE" });
TestResult.belongsTo(User, { foreignKey: "userId" });

// Session <-> TestResult
Session.hasMany(TestResult, { foreignKey: "sessionId", onDelete: "CASCADE" });
TestResult.belongsTo(Session, { foreignKey: "sessionId" });

module.exports = { User, Session, Question, TestResult };
