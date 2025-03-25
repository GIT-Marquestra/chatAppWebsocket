"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomModel = exports.userModel = void 0;
const { Schema, default: mongoose } = require("mongoose");
const userSchema = new Schema({
    username: String,
    email: { type: String, unique: true },
    hashedPassword: String,
    rooms: [[String]],
    userpfp: String
});
const roomSchema = new Schema({
    roomID: { type: String, unique: true, required: true },
    participants: [String],
    messages: [{ sender: String, message: String, imgUrl: String, timestamp: String }]
});
exports.userModel = mongoose.model("user", userSchema);
exports.roomModel = mongoose.model("room", roomSchema);
