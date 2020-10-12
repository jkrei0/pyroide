function dragElement(ele) {
      var pos1 = 0,
      pos2 = 0,
      pos3 = 0,
      pos4 = 0;
      if (document.getElementById(ele.id + "header")) {
         document.getElementById(
            ele.id + "header"
         ).onmousedown = dragMouseDown;
		 console.log("header");
      }
      else {
         ele.onmousedown = dragMouseDown;
      }
      function dragMouseDown(e) {
         e = e || window.event;
         e.preventDefault();
         pos3 = e.clientX;
         pos4 = e.clientY;
         document.onmouseup = closeDragElement;
         document.onmousemove = elementDrag;
      }
      function elementDrag(e) {
         e = e || window.event;
         e.preventDefault();
         pos1 = pos3 - e.clientX;
         pos2 = pos4 - e.clientY;
         pos3 = e.clientX;
         pos4 = e.clientY;
         ele.style.top = ele.offsetTop - pos2 + "px";
         ele.style.left = ele.offsetLeft - pos1 + "px";
      }
      function closeDragElement() {
         document.onmouseup = null;
         document.onmousemove = null;
      }
   }
   
function cPrompt(options, callback) {
	let rng = Math.floor(Math.random() * 100);
	let div = document.createElement("div");
	div.classList.add("prompt-box");
	div.id = "popup-" + rng;
	
	let header = document.createElement("div");
	header.id = "popup-" + rng + "header";
	header.innerText = options.text || "Enter a value:";
	header.classList.add("prompt-box-header");
	div.appendChild(header);
	
	let inputbox = document.createElement("input");
	inputbox.placeholder = options.placeholder || "Enter a value..."
	div.appendChild(inputbox);
	
	let okay = document.createElement("button");
	okay.innerText = options.okay || "Okay"
	okay.classList.add("button-primary");
	div.appendChild(okay);
	okay.addEventListener("click", function() {
		callback(inputbox.value);
		div.parentElement.removeChild(div);
	});
	
	inputbox.addEventListener("keyup", function(event) {
		if (event.keyCode === 13) {
			event.preventDefault();
			okay.focus();
		}
	}); 
	
	let cancel = document.createElement("button");
	cancel.innerText = options.cancel || "Cancel"
	div.appendChild(cancel);
	cancel.classList.add("button-unimportant")
	cancel.addEventListener("click", function() {
		callback(null);
		div.parentElement.removeChild(div);
	});
	
	document.body.appendChild(div);
	
	div.style.top = window.innerHeight / 2 - div.offsetHeight + "px";
	div.style.left = (window.innerWidth/2) - div.offsetWidth + "px";
	inputbox.focus();
	
	dragElement(div);
}
//cPrompt({text:"Enter a filename", okay:"Create", cancel:"cancel"}, (val)=>{console.log(val)});
function cAlert(options, callback) {
	let rng = Math.floor(Math.random() * 100);
	let div = document.createElement("div");
	div.classList.add("prompt-box");
	div.id = "popup-" + rng;
	
	let header = document.createElement("div");
	header.id = "popup-" + rng + "header";
	header.innerText = options.text || "Enter a value:";
	header.classList.add("prompt-box-header");
	div.appendChild(header);
	
	let content = document.createElement("p");
	if (options.rawHTML) {
		content.innerHTML = options.description || "";
	} else {
		content.innerText = options.description || "";
	}
	content.classList.add("prompt-box-content");
	div.appendChild(content);
	
	let okay = document.createElement("button");
	okay.innerText = options.okay || "Okay"
	okay.classList.add("button-primary");
	div.appendChild(okay);
	okay.addEventListener("click", function() {
		callback(true);
		div.parentElement.removeChild(div);
	});
	
	if(options.cancel !== false) {
		let cancel = document.createElement("button");
		cancel.innerText = options.cancel || "close"
		div.appendChild(cancel);
		cancel.classList.add("button-unimportant")
		cancel.addEventListener("click", function() {
			callback(false);
			div.parentElement.removeChild(div);
		});
	}
	
	document.body.appendChild(div);
	
	div.style.top = Math.max((window.innerHeight / 2) - div.offsetHeight, 0) + "px";
	div.style.left = Math.max((window.innerWidth/2) - (div.offsetWidth/2), 0) + "px";
	
	dragElement(div);
}