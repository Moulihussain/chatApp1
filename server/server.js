//...
//const io = require("socket.io");

const port = 3000;
const io = require("socket.io")(port);
const socket = "http://localhost:3000";
console.log("Server is listening on port: %d", port);

io.on("connect", () => {
  nickname = "Cherry";
  console.log("[INFO]: Welcome %s", nickname);
});

io.of("/").on("connect", (socket) => {
  console.log("\nA client connected");

  socket.on("disconnect", (reason) => {
    console.log("\nA client disconnected, reason: %s", reason);
    console.log("Number of clients: %d", io.of("/").server.engine.clientsCount);
  });
});

const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
rl.on("line", (input) => {});

//...
rl.on("line", (input) => {
  const nickname = "Cherry";
  if (true === input.startsWith("b;")) {
    var str = input.slice(2);
    io.emit("broadcast", {
      sender: nickname,
      action: "broadcast",
      msg: str,
    });
  }
});

//...
io.of("/").on("connect", (socket) => {
  //...
  socket.on("broadcast", (data) => {
    console.log("%s", data.msg);
  });
});

//...
io.of("/").on("connect", (socket) => {
  //...
  socket.on("join", (data) => {
    // console.log("\n%s", data);
    console.log(`${data.sender} has joined`);
    // console.log("Nickname: ", data.sender, ", ID: ", socket.id);
    // console.log("Number of clients: %d", io.of("/").server.engine.clientsCount);
    socket.nickname = data.sender;
    socket.broadcast.emit("join", data);
  });
});

//...
io.of("/").on("connect", (socket) => {
  //...
  socket.on("list", (data) => {
    console.log("\n%s", data);
    var users = [];
    for (const [key, value] of io.of("/").sockets) {
      users.push(value.nickname);
    }
    socket.emit("list", { sender: data.sender, action: "list", users: users });
  });
});

//...
io.of("/").on("connect", (socket) => {
  //...
  socket.on("quit", (data) => {
    console.log("\n%s", data);
    socket.broadcast.emit("quit", data);
    socket.disconnect(true);
  });
});

//................................

//...
io.of("/").on("connect", (socket) => {
  //...

  socket.on("list_messages_group", (data) => {
    console.log("\n%s", data);
    var msgs = io.of("/").room_messages[data.group];
    socket.emit("list_messages_group", {
      sender: data.sender,
      action: "list_messages_group",
      group: data.group,
      msgs: msgs,
    });
  });
});

//...
io.of("/").on("connect", (socket) => {
  //...

  socket.on("broadcast_group", (data) => {
    console.log("\n%s", data);
    socket.to(data.group).emit("broadcast_group", data);
    if (undefined === io.of("/").room_messages) {
      io.of("/").room_messages = {};
    }
    if (undefined === io.of("/").room_messages[data.group]) {
      io.of("/").room_messages[data.group] = [];
    }
    io.of("/").room_messages[data.group].push(data.msg);
  });
});

//...
function db_save_message(group, sender, msg) {
  db.serialize(() => {
    db.run(
      "CREATE TABLE IF NOT EXISTS room_messages(thegroup TEXT, sender TEXT, msg TEXT)",
      function (err) {
        if (err) {
          throw err;
        }
      }
    );

    db.run(
      "INSERT INTO room_messages(thegroup, sender, msg) VALUES(?,?,?)",
      [group, sender, msg],
      function (err) {
        if (err) {
          throw err;
        }
        console.log("Saved the message to the database, rowid: " + this.lastID);
      }
    );
  });
}

//...
io.of("/").on("connect", (socket) => {
  //...

  socket.on("broadcast_group", (data) => {
    //...
    db_save_message(data.group, data.sender, data.msg);
  });
});

//...
io.of("/").on("connect", (socket) => {
  //...
  socket.on("list_messages_group", () => {
    console.log("\n%s", data);
    db.serialize(() => {
      db.all(
        "SELECT msg FROM room_messages WHERE thegroup = ?",
        [data.group],
        (err, rows) => {
          var msgs = [];

          if (err) {
            throw err;
          }
          rows.forEach((row) => {
            console.log("Got a message from the database: " + row.msg);
            msgs.push(row.msg);
          });

          socket.emit("list_messages_group", {
            sender: data.sender,
            action: "list_messages_group",
            group: data.group,
            msgs: msgs,
          });
        }
      );
    });
  });
});
