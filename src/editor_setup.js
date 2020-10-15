

let editor = ace.edit("editor");
let ace_Range = ace.require("ace/range").Range;

editor.setTheme("ace/theme/tomorrow_night_eighties");
editor.session.setMode("ace/mode/python");
editor.session.setUseSoftTabs(false);
editor.session.setUseWrapMode(true);

let setLanguage = function(){}

function setTheme(lang) {
	editor.setTheme("ace/theme/" + lang.toLowerCase());
}

function isArrayEqual(arr1, arr2) {
	for(id in arr1) {
		if (arr1[id] !== arr2[id]) {
			return false;
		}
	}
	return true;
}

function hashCode(str) { // java String#hashCode
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
       hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
} 

function intToRGB(i){
    var c = (i & 0x00FFFFFF)
        .toString(16)
        .toUpperCase();

    return "00000".substring(0, 6 - c.length) + c;
}

function createStyleRules(rules) {
	var style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = rules;
	document.getElementsByTagName('head')[0].appendChild(style);
}
function setSidebarMenu(display, editorsize) {
	document.getElementById("menu-panel").style.display = display;
	document.getElementById("editor").style.right = editorsize;
}

let downloadCurrentFile = function() {}
let createFile = function() {}
let deleteFile = function() {}
let loadFile = function() {}
let uploadFile = function() {}
let downloadProjectFile = function() {}
let runProject = function() {}
let openProjectFile = function() {}

if (window.electronEnabled) {
	for (elem of document.getElementsByClassName('electron-inline')) {
		elem.style.display = 'inline';
	}
	for (elem of document.getElementsByClassName('electron-inline-block')) {
		elem.style.display = 'inline-block';
	}
	for (elem of document.getElementsByClassName('electron-block')) {
		elem.style.display = 'block';
	}
	
	let open_project = document.getElementById("electron-open-all");
	let save_project = document.getElementById("electron-download-all");
	let project_manager = document.getElementById("electron-project-manager");
	open_project.style.display = "inline-block";
	save_project.style.display = "inline-block";
	project_manager.style.display = "block";
}

if (online) {
	
	let socket = io();
	let permission_level = 1;
	//let booted = false;
	let conn_users = []
	let currentFileName = "index.py";
	let userlistloaded = false;
	let silent = false;
	let fileTypes = {
		data: 0,
		program: 1,
		image: 3,
		typeFromExt: {
			// programs
			".py": 1,
			".js": 1,
			".html": 1,
			".css": 1,
			".php": 1,
			".cpp": 1,
			".h": 1,
			".c": 1,
			".java": 1,
			// data
			".json": 0,
			".xml": 0,
			".txt": 0,
			// images
			".png": 3,
			".jpg": 3,
			".jpeg": 3,
			".gif": 3,
			".svg": 3,
		},
		syntaxFromExt: {
			// programs
			".py": "python",
			".js": "javascript",
			".html": "html",
			".css": "css",
			".php": "php",
			".cpp": "cpp",
			".h": "cpp",
			".c": "c",
			".java": "java",
			// data
			".json": "json",
			".xml": "xml",
			".txt": "text",
			// images
			".png": null,
			".jpg": null,
			".jpeg": null,
			".gif": null,
			".svg": null,
		},
		mimeFromExt: {
			// programs
			".py": "text/python",
			".js": "text/javascript",
			".html": "text/html",
			".css": "text/css",
			".php": "text/php",
			".cpp": "text/cpp",
			".h": "text/cpp",
			".c": "text/c",
			".java": "text/java",
			// data
			".json": "application/json",
			".xml": "text/xml",
			".txt": "text/plain",
			// images
			".png": null,
			".jpg": null,
			".jpeg": null,
			".gif": null,
			".svg": null,
		}
	}
	let filesList = [];
	let pendingEdits = [];
	let userPositions = [];
	
	setLanguage = function(lang) {
		editor.session.setMode("ace/mode/" + lang.toLowerCase());
		document.getElementById("syntaxmode").value = lang;
	}
	
	function kickUser(id) {
		let username = conn_users.find((item) => {
			return (item.id == id);
		}).name;
		cAlert({text:"Are you sure?", description: "Are you sure you want to kick '" + username + "'?"}, (value) => {
			if (!value) {return;}
			cAlert({text:"User kicked", description: "User '" + username + "' was kicked.", okay:"Okay", cancel:false}, (val)=> {
				console.log(val);
			});
			socket.emit('kick', id, false);
		});
	}
	function muteUser(id) {
		let username = conn_users.find((item) => {
			return (item.id == id);
		}).name;
		cAlert({text:"Are you sure?", description: "Are you sure you want to change '" + username + "' to viewer?"}, (value) => {
			if (!value) {return;}
			cAlert({text:"User muted", description: "User '" + username + "' was muted.", okay:"Okay", cancel:false}, (val)=> {
				console.log(val);
			});
			socket.emit('setperms', id, 0, false);
		});
	}
	function promoteUser(id) {
		let username = conn_users.find((item) => {
			return (item.id == id);
		}).name;
		cAlert({text:"Are you sure?", description: "Are you sure you want to promote '" + username + "' to admin?"}, (value) => {
			if (!value) {return;}
			cAlert({text:"User promoted", description: "User '" + username + "' was promoted to admin.", okay:"Okay", cancel:false}, (val)=> {
				console.log(val);
			});
			socket.emit('setperms', id, 2, false);
		});
	}
	function manageUser(id) {
		let username = conn_users.find((item) => {
			return (item.id == id);
		}).name;
		cAlert({text:"User manager", rawHTML:true, description: `
			<b>You are editing user '${username}'</b><br><br>
			<button onclick="kickUser('${id}')">None (Kick)</button>
			<button onclick="promoteUser('${id}')">Admin</button>
			<button onclick="resetUserPerms('${id}')">Editor</button>
			<button onclick="muteUser('${id}')">Viewer</button>
			<br><br>
		`, cancel:false, okay:"Done"}, (value) => {});
	}
	function resetUserPerms(id) {
		let username = conn_users.find((item) => {
			return (item.id == id);
		}).name;
		cAlert({text:"Are you sure?", description: "Are you sure you want to change '" + username + "' to editor?"}, (value) => {
			if (!value) {return;}
			cAlert({text:"User permission changed.", description: "User '" + username + "' was changed to editor.", okay:"Okay", cancel:false}, (val)=> {
				console.log(val);
			});
			socket.emit('setperms', id, 1, false);
		});
	}
	
	loadFile = function(fileName) {
		file = filesList.find((item) => {
			return (item.name + item.extension == fileName);
		});
		if (!file) {
			console.warn(fileName, filesList);
			return;
		}
		document.getElementById("syntaxmode").value = file.syntax;
		editor.setSession(file.session);
		currentFileName = fileName;
		
		for (element of document.getElementsByClassName('file-tab')) {
			element.classList.remove('active');
		}
		document.getElementById(`file-tab-${fileName}`).classList.add('active');
	}
	
	function onEditorChange(delta) {
		if (silent) {silent = false; return;}
		socket.emit("text " + delta.action, delta, currentFileName);
		pos = editor.getCursorPosition();
		socket.emit("move", pos, currentFileName);
	}
	
	function updateFilesList(list, silent, recreate_sessions) {
		if (list) {
			filesList = list;
		}
		filesSelect = document.getElementById("fileslistselector");
		fileTabBar = document.getElementById("menu-file-tabs");
		selectContent = "";
		tabsContent = ""
		for (file in filesList) {
			file = filesList[file];
			selectContent += `<option`;
			tabsContent += `<button onclick="loadFile('${file.name + file.extension}')" id="file-tab-${file.name + file.extension}" class="file-tab`;
			if (file.name + file.extension == currentFileName) {
				selectContent += " selected";
				tabsContent += " active";
			}
			selectContent += `>${file.name + file.extension}</option>`
			tabsContent += `">${file.name + file.extension}</button>`
		}
		filesSelect.innerHTML = selectContent;
		fileTabBar.innerHTML = tabsContent;
		for (file in filesList) {
			if (recreate_sessions) {
				fileSyntax = fileTypes.syntaxFromExt[filesList[file].extension];
				content = filesList[file].content;
				newSession = new ace.createEditSession(content, undefined);
				
				newSession.setMode("ace/mode/" + fileSyntax);
				newSession.setUseSoftTabs(false);
				newSession.setUseWrapMode(true);
				newSession.on('change', (delta) => {
					onEditorChange(delta)
				});
				filesList[file].session = newSession;
			}
		}
		
		if (permission_level >= 2 && !silent && !recreate_sessions) {
			FLWC = [];
			for (file in filesList) {
				let umc = filesList[file];
				FLWC.push({
					name: umc.name,
					type: umc.type,
					syntax: umc.syntax,
					extension: umc.extension,
					content: umc.session.getValue(),
					session: null
				});
			}
			socket.emit("update files", FLWC);
		}
		loadFile(currentFileName);
	}
	
	createFile = function(name, ext, fileContent) {
		if (permission_level < 2 && !fileContent) {
			cAlert({text:"You can't create this file", description:"You are not allowed to create files!", cancel:false}, ()=>{});
			return;
		}
		let fileName = name;
		let extension = ext;
		if (name == undefined) {
			cPrompt({text:"Name your new file", okay:"Create File", cancel:"Cancel"}, (fileName)=> {
				console.log(fileName);
				extension = ext || document.getElementById("newfiletype").value;
				if (fileName === undefined || fileName === "") {
					cAlert({text:"Error creating file.", description:"You must enter a valid filename", cancel:false}, ()=>{});
					return;
				}
				if (filesList.findIndex(item => item.name + item.extension === fileName + extension) >= 0) {
					cAlert({text:"Error creating file.", description:"There is already a file named this!", cancel:false}, ()=>{});
					return;
				}
				if(fileName === null) {
					return;
				}
				if (fileName.endsWith(extension)) {
					fileName = fileName.replace(extension, '');
				}
				createFile(fileName, extension);
			});
			return;
		}
		
		if (filesList.findIndex(item => item.name + item.extension === fileName + extension) >= 0) {
			cAlert({text:"Duplicate File!", description:"There is already a file named this.", cancel:"Delete and try again", okay:"Don't create file"}, (result)=>{
				if (!result) {
					deleteFile(name + ext, () => {
						createFile(fileName, ext, fileContent);
					});
				}
			});
			return;
		}
		
		fileName = fileName.replace(/\n/g," ").replace(/[<>:"|?*\x00-\x1F]| +$/g,"").replace(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/,x=>x+"_");
		
		fileType = fileTypes.typeFromExt[extension];
		fileSyntax = fileTypes.syntaxFromExt[extension];
		content = fileContent || "Welcome to your new file!";
		newSession = new ace.createEditSession(content, this.syntax);
		
		newSession.setMode("ace/mode/" + fileSyntax);
		newSession.setUseSoftTabs(false);
		newSession.setUseWrapMode(true);
		newSession.on('change', (delta) => {
			onEditorChange(delta);
		});
		
		filesList.push({
			name: fileName,
			type: fileType,
			syntax: fileSyntax,
			extension: extension,
			content: content,
			session: newSession
		});
		
		updateFilesList();
		if(!fileContent) {
			cAlert({text:"File created!", description:"Your file '" + fileName + extension + "' was created.", cancel:false}, ()=>{})
		}
		loadFile(fileName + extension);
	}
	createFile("config", ".json", `
{
	"name":"PROJECT NAME",
	"author":"AUTHOR NAME",
	"main file":"index.py",
	"language":"python",
	"description":"This is a new project",
	
	"command": "C:\\\\Python38\\\\python.exe __projectPath__\\\\index.py",
	
	"advanced options": {
		"python3 path": "C:\\\\Python38\\\\python.exe",
		"python2 path": "C:\\\\Python27\\\\python.exe",
		"node.js path": "C:\\\\Program Files\\\\nodejs\\\\node.exe",
		"node-static HTML":false
	}
}
	`);

	createFile("index", ".py", `
# Welcome to your new python project.
# If you need to use another language, create a new file in that language, and set the "main file", "language", and "command" values in the config.json file to match.

# If you're making a python project you don't have to do anything. This is already your main file, and all set up for you.
`);
	
	loadFile("index.py");
	
	deleteFile = function(fileName, callback) {
		if (permission_level < 2) {
			cAlert({text:"You can't delete this file", description:"You are not allowed to delete files!", cancel:false}, ()=>{});
			return;
		}
		if (!fileName) {
			fileName = currentFileName;
		}
		index = filesList.findIndex(item => item.name + item.extension === fileName)
		if (fileName == "config.json") {
			cAlert({text:"You can't delete this file.", description:"You cannot delete the 'config.json' file.", cancel:false}, ()=>{});
			return;
		}
		cAlert({text:"Are you sure?", description:"Are you sure you want to delete " + fileName + "?", cancel:"Cancel"}, (value) => {
			if(!value) {return;}
			filesList.splice(index, 1);
			updateFilesList();
			if (fileName == currentFileName) {
				loadFile("config.json");
			}
			if(callback) {
				callback();
			}
			
		});
		
	}
	
	uploadFile = function() {
		if (permission_level < 2) {
			cAlert({text:"You can't upload this file", description:"You are not allowed to upload files!", cancel:false}, ()=>{});
			return;
		}
		let fileInput = document.getElementById("file-input");
		let file = fileInput.files[0];
		if (file) {
			let reader = new FileReader();
			reader.readAsText(file, "UTF-8");
			reader.onload = function (evt) {
				//document.getElementById("fileContents").innerHTML = evt.target.result;
				let ext = file.name.split('.').pop().replace(/\.$/g, "");
				let name_regex = new RegExp("\\." + ext + "$", 'g');
				let raw_name = file.name.replace(name_regex, "")
				console.log(raw_name, ext);
				createFile(raw_name, "." + ext, evt.target.result);
			}
			reader.onerror = function (evt) {
				document.getElementById("fileContents").innerHTML = "error reading file";
			}
		}
	}
	
	function updateUsers() {
		usersDiv = document.getElementById("users");
		userlistloaded = true;
		let HTML = "";
		for (user in conn_users) {
			user = conn_users[user]
			console.log(user);
			HTML += `<div class='user ${user.permission}'><span class='name'>${user.name}</span>`;
			if (permission_level >= 2) {
				HTML += `<button onclick="manageUser('${user.id}')">Manage</button>`;
			}
			HTML += `</div>`;
		}
		usersDiv.innerHTML = HTML;
	}
	
	updateUsers();
	
	downloadCurrentFile = function() {
		let text = editor.session.getValue();
		let filename = currentFileName;
		let mime = fileTypes.mimeFromExt[filesList.find(item => item.name + item.extension === currentFileName).extension];
		
		let element = document.createElement('a');
		element.setAttribute('href', 'data:' + mime + ';charset=utf-8,' + encodeURIComponent(text));
		element.setAttribute('download', filename);

		element.style.display = 'none';
		document.body.appendChild(element);

		element.click();

		document.body.removeChild(element);
	}
	
	console.log(window.electronEnabled);
	if (window.electronEnabled) {
		console.log("electron");
		downloadProjectFile = function() {
			let FLWC = [];
			for (file in filesList) {
				let umc = filesList[file];
				FLWC.push({
					name: umc.name + umc.extension,
					extension: umc.extension,
					content: umc.session.getValue()
				});
			}
			let configFileData = JSON.parse(FLWC.find((x) => { return x.name == "config.json" }).content);
			sendCommunication("download project", {files:FLWC, command:configFileData.command, otherData:configFileData});
		}
		runProject = function() {
			let FLWC = [];
			for (file in filesList) {
				let umc = filesList[file];
				FLWC.push({
					name: umc.name + umc.extension,
					extension: umc.extension,
					content: umc.session.getValue()
				});
			}
			/*console.log(FLWC.find((x) => { return x.name == "config.json" }));
			console.log(JSON.parse(FLWC.find((x) => { return x.name == "config.json" }).content).command);
			console.log(FLWC);*/
			let configFileData = JSON.parse(FLWC.find((x) => { return x.name == "config.json" }).content);
			sendCommunication("run project", {files:FLWC, command:configFileData.command, otherData:configFileData});
		}
		openProjectFile = function() {
			if (permission_level < 2) {
				cAlert({text:"You can't open this file", description:"You are not allowed to open project files!", cancel:false}, ()=>{});
				return;
			}
			sendCommunication("open project file", undefined);
		}
		
		registerCommListener("open project", (event, data) => {
			console.log(data);
			updateFilesList([], true, true);
			for (let file of data) {
				let name = file.name.replace(/\.[^.]+$/g, "");
				let extension = file.name.replace(name, "");
				createFile(name, extension, file.content);
			}
			updateFilesList(undefined, false, true);
		});
		
		function shortcut_check(e) {
			// Ctrl+S
			if (e.ctrlKey && !e.shiftKey && e.keyCode == 83) {
				e.preventDefault();
				downloadProjectFile()
			// Ctrl+O
			} else if (e.ctrlKey && !e.shiftKey && e.keyCode == 79) {
				e.preventDefault();
				openProjectFile()
			// Ctrl+R
			} else if (e.ctrlKey && !e.shiftKey && e.keyCode == 82) {
				e.preventDefault();
				runProject()
			}
		}
		// register the handler 
		document.addEventListener('keyup', shortcut_check, false);
		
		for (elem of document.getElementsByClassName('electron-inline')) {
			elem.style.display = 'inline';
		}
		for (elem of document.getElementsByClassName('electron-inline-block')) {
			elem.style.display = 'inline-block';
		}
		for (elem of document.getElementsByClassName('electron-block')) {
			elem.style.display = 'block';
		}
		
		let open_project = document.getElementById("electron-open-all");
		let save_project = document.getElementById("electron-download-all");
		let project_manager = document.getElementById("electron-project-manager");
		open_project.style.display = "inline-block";
		save_project.style.display = "inline-block";
		project_manager.style.display = "block";
	}
	
	cPrompt({text:"Choose a username", okay:"Join", cancel:"Back"}, (name)=> {
		console.log(name)
		if (name == "" || name == null) {
			window.location.href = "/";
			return;
		}
		socket.emit('set name', name);
		socket.emit('connect to space', spaceID);
	});
	
	editor.onCursorChange(() => {
		pos = editor.getCursorPosition();
		socket.emit("move", pos, currentFileName);
	})
	
	window.setInterval(() => {
		pos = editor.getCursorPosition();
		socket.emit("move", pos, currentFileName);
	}, 2000)
	
	socket.on("confirm space", (space) => {
		if (space !== spaceID) {
			cAlert({text:"You were disconnected.", description:"The server cannot verify your connection to this room.", cancel:false}, () => {window.location.reload()});
		}
	});
	
	socket.on("move", (data, name, file, id) => {
		session = filesList.find((x) => x.name + x.extension == file).session;
		if (!userPositions[id]) {
			userColorHash = intToRGB(hashCode(id));
			
			createStyleRules(`
.user-${id} {
	position: absolute;
	background-color: #${userColorHash};
	min-width: 3px;
	max-width: 3px;
	margin-top: -3px;
	margin-left: -1px;
	padding-top: 3px;
	padding-bottom: 3px;
	pointer-events:auto;
}
.user-${id}:hover:after {
	top: -5px;
	z-index: 9;
	color: white;
	position: absolute;
}
.user-${id}:hover {
	position: relative;
	padding: 3px;
	margin-left: -3px;
	margin-top: -3px;
}
			`);
			userPositions[id] = session.addMarker(new ace_Range(data.row, data.column, data.row, data.column + 1), "user-" + id, "text");
			return;
		}
		session.removeMarker(userPositions[id])
		userPositions[id] = session.addMarker(new ace_Range(data.row, data.column, data.row, data.column + 1), "user-" + id, "text");
		if (document.getElementsByClassName("user-" + id)[0]) {
			let marker = document.getElementsByClassName("user-" + id)[0];
			marker.addEventListener("mouseover", function(event) {
				let position = editor.renderer.$cursorLayer.getPixelPosition({row:data.row, column:data.column});
				let div = document.createElement("div");
				div.style.position = "fixed";
				div.style.top = position.top + "px";
				div.style.left = (position.left + 50) + "px";
				div.classList.add("userNameIndicator");
				div.innerText = name;
				document.body.appendChild(div);
				setTimeout(() => {
					div.parentNode.removeChild(div)
				}, 1500);
			}, {once:true});
		}
	});
	
	socket.on("text insert", (delta, file) => {
		newText = delta.lines.join(`
`);
		silent = true;
		filesList.find((x) => x.name + x.extension == file).session.insert({row: delta.start.row, column: delta.start.column}, newText);
		pendingEdits.push(delta);
	});
	
	socket.on("text remove", (delta, file) => {
		newText = delta.lines.join(`
`);
		silent = true;
		filesList.find((x) => x.name + x.extension == file).session.remove({
			start: {row: delta.start.row, column: delta.start.column},
			end: {row: delta.end.row, column: delta.end.column}
		});
		pendingEdits.push(delta);
	});
	
	socket.on("user joined", (user) => {
		if (permission_level >= 2) {
			//socket.emit("update master", editor.session.getValue());
			
			updateFilesList(undefined, false);
			
			/*if (permission_level >= 2) {
				FLWC = [];
				for (file in filesList) {
					let fileCopy = filesList[file];
					fileCopy.content = file.session.getValue();
					fileCopy.session = null;
					FLWC.push(fileCopy);
				}
				socket.emit("update files", FLWC);
			}*/
		}
		conn_users.push({
			name: user.name,
			id: user.id,
			status: "online",
			permission: 1
		});
		if (permission_level >= 2) {
			socket.emit("update user list", conn_users);
		}
		updateUsers();
	});
	
	socket.on("user left", (user) => {
		session.removeMarker(userPositions[user.id])
		if (permission_level >= 2) {
			//socket.emit("update master", editor.session.getValue());
		}
		const index = conn_users.findIndex((item) => {
			return (item.id == user.id);
		});
		if (index > -1) {
			conn_users.splice(index, 1);
		}
		if (permission_level >= 2) {
			socket.emit("update user list", conn_users);
		}
		updateUsers();
	});
	
	socket.on("update user list", (users) => {
		conn_users = users;
		updateUsers();
	});
	
	socket.on("update master", (data) => {
		//if (booted) { return; }
		//booted = true;
		editor.session.setValue(data, editor.getCursorPosition());
	});
	
	socket.on("update files", (list) => {
		filesList = list;
		updateFilesList(list, true, true);
	});
	
	socket.on("permission change", (data) => {
		permission_level = data;
		updateUsers();
		if(data >= 2) {
			document.getElementById('admin-panel').style.display = "block";
			cAlert({text:"You were promoted.", description:"You are now a workspace administrator.", cancel:false}, ()=>{});
		}else {
			document.getElementById('admin-panel').style.display = "none";
		}
		if(data >= 1) {
			editor.setReadOnly(false);
			if(data == 1) {
				cAlert({text:"You are now an editor.", description:"You can make changes to documents in this workspace.", cancel:false}, ()=>{});
			}
		}
	});
	
	socket.on("kick", (data) => {
		cAlert({text:"You were kicked.", description:"You were kicked from workspace '" + spaceID + "' by the host.", cancel:false}, ()=>{window.location.href="/";});
	});
	
	socket.on("mute", (data) => {
		editor.setReadOnly(true);
		cAlert({text:"You were muted.", description:"You can no longer make changes to files in this workspace.", cancel:false}, ()=>{});
	});
	
	socket.on("disconnect", () => {
		cAlert({text:"You were disconnected.", description:"Connection to the server was lost or forcibly closed.", cancel:false}, ()=>{
			if (!window.location.href.includes("_testing")) {
				window.location.href="/";
			}else {
				location.reload();
			}
		});
	});
	
} else {
	if (window.location.href.includes("/join/")) {
		cAlert({text:"This workspace does not exist", description:"The workspace you tried to join does not exist.", cancel:false}, ()=>{window.location.href="/";});
	}
}