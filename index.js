
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
		} else if (request.url.startsWith("/changelog")) {
			response.writeHead(200, {'Content-Type': 'text/html'});
			response.end(`
				<head>
					<link rel="stylesheet" href="/src/style.css">
					<title>PyroIDE Changelog</title>
				</head>
				<body>
					<div id="menu-panel-fullsize">
						<b class="panel-header">PyroIDE Changelog</b>
						<details>
							<summary id="wa-v1.0.2"  class="panel-header"><a href="#wa-v1.0.2" title="permalink">#</a> Webapp version 1.0.2</summary>
							wa-v1.0.2
							<ul>
								<li>Fixed crash when administrators change user permissions</li>
								<li>Added changelog page to server</li>
								<li>Modified package.json</li>
							</ul>
						</details>
						<details>
							<summary id="dl-v1.0.1"  class="panel-header"><a href="#dl-v1.0.1" title="permalink">#</a> Desktop <b>Launcher</b> Version 1.0.1</summary>
							dl-v1.0.1
							<ul>
								<li>Fixed system for detecting active & valid servers.</li>
								<li>Added changelog page to launcher</li>
								<li>Nested development servers within the collapsed server list</li>
							</ul>
						</details>
						<details>
							<summary id="wd-v1.0.0"  class="panel-header"><a href="#wd-v1.0.0" title="permalink">#</a> Webapp <b>desktop</b> Version 1.0.0</summary>
							wd-v1.0.0
							<ul>
								<li>Added the ability to open, download, projects</li>
								<li>Added the ability to run projects (exact command chosen in the config.json file)</li>
							</ul>
						</details>
						<details>
							<summary id="wa-v1.0.0"  class="panel-header"><a href="#wa-v1.0.0" title="permalink">#</a> Webapp Version 1.0.0</summary>
							wa-v1.0.0
							<ul>
								<li>Initial version. Includes all other unlisted features.</li>
							</ul>
						</details>
					</div>
				</body>
			`);
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
				
				allSockets[id].socket._data.permission = perms;
				allSockets[id].socket.emit("permission change", perms);
			}
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