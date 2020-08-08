require('dotenv').config();
const express = require("express");
const bodyParser = require('body-parser');
const { Server } = require("http");
const SocketIO = require('socket.io');
const auth = require('./routes/auth');
const listings = require('./routes/listings');
const expoToken = require("./routes/expoPushToken");
const messages = require('./routes/messages');
const upload = require("./routes/upload");

const app = express();
const server = Server(app);
const io = SocketIO(server);

const port = process.env.PORT || 9000;

app.use(bodyParser.json());

app.use('/auth', auth);
app.use('/listings', listings);
app.use('/expo-push-token', expoToken);
app.use('/messages', messages);
app.use('/upload', upload);

io.on('connection', (socket) => {
    console.log("A user connected:", socket);
});

server.listen(port, () => console.log(`App is listening on http://localhost:${port}`));
