var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { WebSocketServer, WebSocket } from "ws";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import models from "./db.js";
const { userModel, roomModel } = models;
dotenv.config();
const wss = new WebSocketServer({ port: 8080 });
let socketToUsernameMap = new Map();
const dbConnect = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-expect-error: do not know what do here
        yield mongoose.connect(process.env.MONGO_URL);
    }
    catch (error) {
        console.error(error);
    }
});
dbConnect();
try {
    wss.on("connection", (socket) => {
        socket.on("message", (message) => __awaiter(void 0, void 0, void 0, function* () {
            const parsedMessage = JSON.parse(message.toString());
            const { type, payload } = parsedMessage;
            const { username, roomID: clientRoomID, message: clientMessage, usernames, imgUrl } = payload;
            if (username && !socketToUsernameMap.has(socket)) {
                socketToUsernameMap.set(socket, username);
            }
            if (type === "startChat") { // as this is a startChat message, the user will send the roomID he wants to join.
                socketToUsernameMap.set(socket, username);
                const roomID = clientRoomID || uuidv4();
                const foundUsername = yield userModel.findOne({
                    username
                });
                let currentRooms = []; // for every ws connection we will first initialize this array and then check ki username pehle se hai ki nahi.
                if (foundUsername) { // if user found in this data, it means it has some prior rooms, hence we need ot update(put)
                    currentRooms = foundUsername.rooms;
                    if (!foundUsername.rooms.flat().includes(roomID)) {
                        const arr = ["roomName", roomID];
                        currentRooms.push(arr);
                        yield foundUsername.save();
                    }
                    else {
                        foundUsername.rooms = currentRooms;
                        yield foundUsername.save();
                    }
                }
                // it will update all the rooms of the already entried users, and if any of them isnt created yet, it will create with the room.
                usernames.forEach((p) => __awaiter(void 0, void 0, void 0, function* () {
                    const foundUser = yield userModel.findOne({
                        username: p
                    });
                    if (foundUser) {
                        const arr = ["roomName", roomID];
                        foundUser.rooms.push(arr);
                        yield foundUser.save();
                    }
                    else {
                        console.log("Unexpected error, can't find the user in db");
                    }
                }));
                const room = yield roomModel.findOne({ roomID });
                if (!room) {
                    yield roomModel.create({
                        roomID, // this participants array will include the user himself who created the group and the other members whom he clicked on he wanted in his group 
                        participants: [username, ...usernames],
                        messages: []
                    });
                }
                else {
                    if (!room.participants.includes(username)) {
                        // console.log("Pushing...")
                        room.participants.push(username);
                    }
                    usernames.forEach((user) => {
                        if (!room.participants.includes(user)) {
                            room.participants.push(user);
                        }
                    });
                    yield room.save();
                    // console.log("Room: ", room)
                }
                const requestMessage = {
                    type: "requestMessage",
                    payload: {
                        text: "User1 wants you to join their chatRoom",
                        roomID: roomID,
                        usernames: parsedMessage.payload.usernames
                    }
                };
                const roomAck = {
                    type: "roomAck",
                    payload: {
                        text: "Room is created",
                        roomID: roomID
                    }
                };
                usernames.forEach((p) => {
                    var _a;
                    const participantSocket = (_a = Array.from(socketToUsernameMap.entries()).find(([_, user]) => user === p)) === null || _a === void 0 ? void 0 : _a[0];
                    if (participantSocket) {
                        participantSocket.send(JSON.stringify(requestMessage));
                        participantSocket.send(JSON.stringify(roomAck));
                        console.log("Request sent");
                    }
                });
                socket.send(JSON.stringify(roomAck));
            }
            if (type === "chat") { // as soon as the sender sends the message 
                console.log("Users wants to chat"); // we will need the current user room 
                const currentUserRoom = yield roomModel.findOne({ roomID: clientRoomID });
                if (!currentUserRoom) {
                    console.log("Room not found");
                    return;
                }
                const messageObject = {
                    sender: username,
                    message: clientMessage,
                    imgUrl: imgUrl,
                    timestamp: new Date().toISOString()
                };
                if (clientMessage !== "") {
                    currentUserRoom.messages.push(messageObject);
                    yield currentUserRoom.save();
                }
                currentUserRoom.participants.forEach((p) => {
                    var _a;
                    const participantSocket = (_a = Array.from(socketToUsernameMap.entries()).find(([_, user]) => user === p)) === null || _a === void 0 ? void 0 : _a[0];
                    if (participantSocket && participantSocket.readyState === WebSocket.OPEN) {
                        const messagePayload = {
                            type: "chat",
                            payload: {
                                username: username,
                                roomID: clientRoomID,
                            },
                            messageObject: {
                                sender: username,
                                message: clientMessage,
                                imgUrl: imgUrl,
                                timestamp: new Date().toISOString(),
                            }
                        };
                        participantSocket.send(JSON.stringify(messagePayload));
                    }
                });
            }
            if (type === "Nothing") {
                socketToUsernameMap.set(socket, username);
            }
        }));
        socket.on("error", (err) => {
            console.error("Socket error:", err);
        });
        socket.on("close", () => __awaiter(void 0, void 0, void 0, function* () {
            const username = socketToUsernameMap.get(socket);
            if (!username) {
                console.log("Username not found to be deleted");
                return;
            }
            const rooms = roomModel.find({ participants: username });
            socketToUsernameMap.delete(socket);
            try {
                if (rooms) {
                    //@ts-expect-error: don't know what to do 
                    for (const room of rooms) {
                        room.participants = room.participants.filter((p) => p !== username);
                        if (room.participants.length === 0) {
                            yield room.delete();
                            console.log(`Room ${room.roomID} deleted as it is empty.`);
                        }
                        else {
                            room.save();
                        }
                    }
                }
            }
            catch (error) {
                console.log("Error: ", error);
            }
        }));
    });
}
catch (error) {
    console.error("Error in ws backend: ", error);
}
