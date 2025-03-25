const { Schema, default: mongoose } = require("mongoose");
const userSchema = new Schema({
    username: String,
    email: { type: String, unique: true },
    hashedPassword: String,
    rooms: [[String]],
    userpfp: String
})

const roomSchema = new Schema({
    roomID: { type: String, unique: true, required: true },
    participants: [String],
    messages: [{ sender: String, message: String, imgUrl: String, timestamp: String }]
})



export const userModel = mongoose.model("user", userSchema);
export const roomModel = mongoose.model("room", roomSchema);




