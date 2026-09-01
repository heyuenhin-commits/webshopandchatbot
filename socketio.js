import express from "express";
import { createServer } from "http";
import { Server } from 'socket.io';
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*" }
});

let messageHandler = null;
const textListeners = [];
const eventListeners = [];

io.on("connection", (socket) => {
    console.log("Connected client ID:", socket.id);
    socket.on('user_message', (msgData) => {
        if(messageHandler){
            messageHandler(msgData);
        }

        if(msgData.text){
            textListeners.forEach(({regexp, callback})=>{
                const match = regexp.exec(msgData.text);
                if(match){
                    callback(msgData, match);
                }
            })
        }

        if(msgData.location){
            if(eventListeners['location']){
                eventListeners['location'].forEach(callback=>{
                    callback(msgData);
                })
            }
        }
    })
});
const bot = {
    sendMessage: (charId, text) => {
        io.to(charId).emit("bot_message", text);
    },
    on: (event, callback) => {
        if (event === "message") {
            messageHandler = callback;
        }else {
            if(!eventListeners[event]){
                eventListeners[event] = [];
            }
            eventListeners[event].push(callback);
        }
    },

    onText: (regexp, callback) => {
        textListeners.push({ regexp, callback });
    }
}

httpServer.listen(3000, () => {
    console.log("Bot Server is running at: http://localhost:3000")
})

export { bot }