import mongoose, { Schema } from "mongoose";

// Ensure the model doesn't get overwritten when reloading
const userSchema = new Schema({
    username: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    hashedPassword: { type: String, required: true },
    rooms: { type: [[String]], default: [] },  // Ensure valid type
    userpfp: { type: String, default: "" }
});

const roomSchema = new Schema({
    roomID: { type: String, unique: true, required: true },
    participants: [{ type: String }],  // Ensure an array of strings
    messages: [
        {
            sender: { type: String, required: true },
            message: { type: String },
            imgUrl: { type: String, default: null },
            timestamp: { type: Date, default: Date.now }
        }
    ]
});

const models = {
    userModel: mongoose.models.user || mongoose.model("user", userSchema),
    roomModel: mongoose.models.room || mongoose.model("room", roomSchema),


}

export default models