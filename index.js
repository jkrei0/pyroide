
/*jslint esnext:true*/

const http = require("http");
const fs = require('fs');
const Mustache = require("mustache");
const nodeStatic = require('node-static');
const socketIo = require('socket.io');
const { exec } = require("child_process");

let PRODUCTION = false;

function send(response, values) {
	response.writeHead(200, {'Content-Type': 'text/html'});
	fs.readFile('./index.html', 'utf8', function(err, data) {
		if (err) { throw err; }
		if(!values.wkDir) {
			values.wkDir = "/";
		}
		response.end(Mustache.render(data, values));
	});
}

function sendSrc(request, response) {
	new(nodeStatic.Server)().serve(request, response);
}

function randomString(length, chars) {
    let mask = '';
	let result = '';
    if (chars.indexOf('6') > -1) { mask += 'abcdef'; }
    if (chars.indexOf('a') > -1) { mask += 'abcdefghijklmnopqrstuvwxyz'; }
    if (chars.indexOf('A') > -1) { mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; }
    if (chars.indexOf('#') > -1) { mask += '0123456789'; }
    if (chars.indexOf('!') > -1) { mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\'; }
    for (let i = length; i > 0; --i) {
		result += mask[Math.floor(Math.random() * mask.length)];
	}
    return result;
}

let datas = {};

let occupied_spaces = {};

let server = http.createServer(function (request, response) {
	
	// response.writeHead(200, {'Content-Type': 'text/html'});
	// response.write('\:P');
	// response.end();
	
	request.url = request.url.replace(/%20/g, ' ');
	
	if(request.url.startsWith('/src/')) {
		sendSrc(request, response);
	} else {
		
		let spaceID = null;
		
		if (request.url === "/" || request.url === "/index.html") {
			send(response, {});
		}else if (request.url.startsWith("/create/")) {
			
			spaceID = randomString(4, 'a#');
			
			while (occupied_spaces[spaceID] !== undefined) {
				spaceID = randomString(4, 'a#');
			}
			
			occupied_spaces[spaceID] = true;
			
			send(response, {redir_spaceID: spaceID, join_redir: true});
			
		}else if (request.url.startsWith("/join/")) {
			
			spaceID = request.url.replace('/join/', '');
			
			if (occupied_spaces[spaceID] === undefined && spaceID !== "_testing") {
				send(response, {});
			} else {
				send(response, {spaceID: spaceID});
			}
			
		} else if (request.url.startsWith("/_electronAppCheck")) {
			response.writeHead(200, {'Content-Type': 'text/html'});
			response.end("true");
		} else {
			response.writeHead(404, {'Content-Type': 'text/html'});
			response.end("This doesn't exist. <a href='/'>Home</a>");
		}
	}
	
}).listen(process.env.PORT || 8080);
 // ooh lookie a new comment
console.log( server.address() );

// Console will print the message
console.log('Server running!');

let io = socketIo(server);

let allSockets = {};

function File(name, type, content) {
	this.name = name;
	this.type = type;
	this.content = content;
}

io.on('connection', (socket) => {
	socket._data = {
		name: "Unnamed User",
		space: null,
		id: 0,
		permission: 0,
		userlist: [],
		filesList: []
	};
	
	let genID = randomString(5, 'a#');
	
	while(allSockets[genID] !== undefined) {
		genID = randomString(5, 'a#');
	}
	
	socket._data.id = genID;
	allSockets[socket._data.id] = {socket:socket};
	
	socket.on("text insert", (delta, file) => {
		if (socket._data.permission >= 1) {
			let rooms = Object.keys(socket.rooms);
			socket.to(socket._data.space).emit('text insert', delta, file);
		}
		if (socket._data.space == null) {
			socket.emit("confirm space", null);
		}
	});
	
	socket.on("text remove", (delta, file) => {
		if (socket._data.permission >= 1) {
			let rooms = Object.keys(socket.rooms);
			socket.to(socket._data.space).emit('text remove', delta, file);
		}
		if (socket._data.space == null) {
			socket.emit("confirm space", null);
		}
	});
	socket.on("move", (pos, file) => {
		if (socket._data.permission >= 1) {
			socket.to(socket._data.space).emit('move', pos, socket._data.name, file, socket._data.id);
		}
	});
	
	socket.on("update files", (delta, file) => {
		if (socket._data.permission >= 2) {
			socket.to(socket._data.space).emit('update files', delta);
		}
	});
	
	socket.on("connect to space", (spaceID) => {
		socket.join(spaceID);
		socket._data.space = spaceID;
		socket._data.permission = 1;
		if (io.sockets.adapter.rooms[socket._data.space].length === 1) {
			socket._data.permission = 2;
			socket.emit("permission change", 2);
		}
		io.in(socket._data.space).emit('user joined', {name:socket._data.name, id:socket._data.id});
		
	});
	
	socket.on("update user list", (users) => {
		if (socket._data.permission >= 2) {
			socket.to(socket._data.space).emit('update user list', users);
			socket._data.userlist = users;
		}
	});
	
	socket.on("update master", (data) => {
		if (socket._data.permission >= 2) {
			socket.to(socket._data.space).emit('update master', data);
		}
	});
	
	socket.on("move", (position) => {
		socket.to(socket._data.space).emit("user move", {name: socket._data.name, id:socket._data.id, pos:position});
	});
	
	socket.on("set name", (name) => {
		if (name === "" || name === undefined || name === null) {
			name = "Anonymous";
		}
		socket._data.name = name;
	});
	
	socket.on("kick", (id, shadow) => {
		if (socket._data.permission >= 2) {
			//allSockets[socket._data.id].socket.emit("kick");
			let kickedUser = allSockets[id];
			if (!shadow) {
				kickedUser.socket.emit("kick");
			}
			kickedUser.socket.disconnect();
			io.in(socket._data.space).emit("user left", {name:kickedUser.socket._data.name, id:kickedUser.socket._data.id});
			//allSockets[id]
		}
	});
	
	socket.on("setperms", (id, perms, shadow) => {
		if (socket._data.permission >= 2) {
			//allSockets[socket._data.id].socket.emit("kick");
			let mutedUser = allSockets[id];
			
			if (mutedUser.socket._data.permission >= 2 && socket._data.userlist.length >= 2 && mutedUser.socket._data.id == socket._data.id) {
				allSockets[socket._data.userlist[1].id].socket._data.permission = 2;
				allSockets[socket._data.userlist[1].id].socket.emit("permission change", 2);
				socket.emit('update user list', socket._data.userlist);
			}
			
			if (!shadow) {
				if (perms == 0) {
					mutedUser.socket.emit("mute");
				}
				
				mutedUser.socket._data.permission = 2;
				mutedUser.socket.emit("permission change", 2);
				socket.emit('update user list', socket._data.userlist);
			}
			mutedUser.socket._data.permission = 0;
			//allSockets[id]
		}
	});
	
	socket.on("run python", () => {
		//exec("")
	});
	
	socket.on('disconnect', () => {
		allSockets[socket._data.id] = undefined;
		if (socket._data.permission >= 2 && socket._data.userlist.length >= 2) {
			if (allSockets[socket._data.userlist[1].id] === undefined) {
				for (let xx = 1; xx < socket._data.userlist.length; xx++) {
					if (allSockets[socket._data.userlist[xx].id] !== undefined) {
						allSockets[socket._data.userlist[xx].id].socket._data.permission = 2;
						allSockets[socket._data.userlist[xx].id].socket.emit("permission change", 2);
						socket.emit('update user list', socket._data.userlist);
						break;
					}
				}
			} else {
				allSockets[socket._data.userlist[1].id].socket._data.permission = 2;
				allSockets[socket._data.userlist[1].id].socket.emit("permission change", 2);
				socket.emit('update user list', socket._data.userlist);
			}
		}
		io.in(socket._data.space).emit("user left", {name:socket._data.name, id:socket._data.id});
	});
});