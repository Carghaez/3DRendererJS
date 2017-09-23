/*========================================|Global Variables|======================================*/
var Xr = 0;
var Yr = 0;
var auto_Xr = 0;
var auto_Yr = 0;
var auto_Zr = 0;
var Xt = 0;
var Yt = 0;
var Zt = 0;
var artistic_mode = 0;

var KEYS = {
	RIGHT : {keyCode: 37, value: 1},
	UP : {keyCode: 38, value: 1},
	LEFT : {keyCode: 39, value: -1},
	DOWN : {keyCode: 40, value: -1},
	W : {keyCode: 87, value: -0.04},
	A : {keyCode: 65, value: -0.04},
	S : {keyCode: 83, value: 0.04},
	D : {keyCode: 68, value: 0.04},
	E : {keyCode: 69, value: 0.1},
	Q : {keyCode: 81, value: -0.1}
};
/*====================================|Matrix class definitions|==================================*/
function Matrix(m, color)
{
	this.vertex = m;
	this.rows = m.length;
	this.cols = m[0].length;
	this.color = color;
}
Matrix.prototype.toString = function()
{
	var s = []
	s.push("color: "+this.color);
	for (var i = 0; i < this.rows; i++)
		s.push(this.vertex[i].join(" - ") );
	return s.join("\n");
}
Matrix.prototype.multiply = function(other)
{
	if (this.cols != other.rows) throw "error: incompatible sizes";
	var ans = [];
	for (var i = 0; i < this.rows; ++i) {
		ans[i] = [];
		for (var j = 0; j < other.cols; ++j) {
			var sum = 0;
			for (var k = 0; k < this.cols; ++k)
				sum += this.vertex[i][k] * other.vertex[k][j];
			ans[i][j] = sum;
		}
	}
	return new Matrix(ans, this.color);
}
function cos(d){ return Math.cos(d * Math.PI / 180); } // d = Degrees
function sin(d){ return Math.sin(d * Math.PI / 180); } // d = Degrees
Matrix.prototype.rotate = function(angle, x, y, z)
{
	var c = cos(angle);
	var s = sin(angle);
	var M_rotate = new Matrix([[x*x*(1-c)+c, x*y*(1-c)-z*s, x*z*(1-c)+y*s, 0],
		[y*x*(1-c)+z*s, y*y*(1-c)+c, y*z*(1-c)-x*s, 0],
		[z*x*(1-c)-y*s, z*y*(1-c)+x*s, z*z*(1-c)+c, 0],
		[0,0,0,1]], this.color);

	/* La trasposta inverte il senso di rotazione */
	var M_Trotate = new Matrix([[x*x*(1-c)+c, y*x*(1-c)+z*s, z*x*(1-c)-y*s, 0],
		[x*y*(1-c)-z*s, y*y*(1-c)+c, z*y*(1-c)+x*s, 0],
		[x*z*(1-c)+y*s, y*z*(1-c)-x*s, z*z*(1-c)+c, 0],
		[0,0,0,1]], this.color);
	return this.multiply(M_Trotate);
}
Matrix.prototype.translate = function (Tx, Ty, Tz)
{
	var M_translate =new Matrix([[1, 0, 0, 0],
								 [0, 1, 0, 0],
								 [0, 0, 1, 0],
								 [Tx, Ty, Tz, 1]], this.color);
	return this.multiply(M_translate);
}
Matrix.prototype.scale = function (Sx, Sy, Sz)
{
	var M_scale = new Matrix([[Sx, 0, 0, 0],
							  [0, Sy, 0, 0],
							  [0, 0, Sz, 0],
							  [0, 0, 0, 1]], this.color);
	return this.multiply(M_scale);
}
Matrix.prototype.perspective = function()
{
	var M_perspective= new Matrix([ [1, 0, 0, 0],
									[0, 1, 0, 0],
									[0, 0, 1, 1/canvas.pDistance],
									[0, 0, 0, 0]], this.color);
	return this.multiply(M_perspective.scale(canvas.c.width/2, canvas.c.height/2, 1));
}
/*==============================|Canvas plane class definitions|==================================*/
var canvas; // Global Variables
function CPlane(ca)
{
	// Distanza dal piano di proiezione
	this.pDistance = 4;
	this.wireframe = 1;
	this.c = ca;
	if(this.c.getContext)
		this.context = this.c.getContext('2d');
	else
		alert('Il tuo browser non supporta HTML5 - Canvas');
	this.width = this.c.width;
	this.height = this.c.height;
	this.colorbuffer= this.context.createImageData(this.width, this.height);
	this.depthbuffer = [];
	this.clipFar = 10000000; // TEMP
	for (var i = 0; i < this.width * this.height; ++i)
		this.depthbuffer[i] = this.clipFar;
}
CPlane.prototype.__setPixel = function(x, y, z, r, g, b)
{
	if(x < canvas.width && y < canvas.height && x >= 0 && y >= 0)
	{
		var i = x + y * this.colorbuffer.width;
		if (z >= this.depthbuffer[i])
			return;
		this.depthbuffer[i] = z;
		i *= 4;
		this.colorbuffer.data[i++] = r;
		this.colorbuffer.data[i++] = g;
		this.colorbuffer.data[i++] = b;
	}
}
CPlane.prototype.drawFaces = function(Faces2D)
{
	for(var i = 0; i < Faces2D.length; ++i)
	{
		var half_w = this.width / 2;
		var half_h = this.height / 2;
		if(canvas.wireframe)
		{
			// wireframe
			this.context.beginPath();
			this.context.strokeStyle=Faces2D[i].color;
			this.context.moveTo(Faces2D[i].vertex[0][0]+half_w, Faces2D[i].vertex[0][1]+half_h);
			for(var j = 1; j < Faces2D[i].rows; ++j)
				this.context.lineTo(Faces2D[i].vertex[j][0]+half_w, Faces2D[i].vertex[j][1]+half_h);
			this.context.lineTo(Faces2D[i].vertex[0][0]+half_w, Faces2D[i].vertex[0][1]+half_h);
			this.context.stroke();
		}else{
			var x0 = Math.round(Faces2D[i].vertex[0][0]+half_w);
			var y0 = Math.round(Faces2D[i].vertex[0][1]+half_h);
			var z0 = Faces2D[i].vertex[0][2];
			var x1 = Math.round(Faces2D[i].vertex[1][0]+half_w);
			var y1 = Math.round(Faces2D[i].vertex[1][1]+half_h);
			var z1 = Faces2D[i].vertex[1][2];
			var x2 = Math.round(Faces2D[i].vertex[2][0]+half_w);
			var y2 = Math.round(Faces2D[i].vertex[2][1]+half_h);
			var z2 = Faces2D[i].vertex[2][2];

			// Calcola bounding box
			var min_x = Math.min(x0, x1, x2);
			var max_x = Math.max(x0, x1, x2);
			var min_y = Math.min(y0, y1, y2);
			var max_y = Math.max(y0, y1, y2);

			// Parsing colore ##RRGGBB
			var r = parseInt(Faces2D[i].color.substr(1, 2), 16);
			var g = parseInt(Faces2D[i].color.substr(3, 2), 16);
			var b = parseInt(Faces2D[i].color.substr(5, 2), 16);

			var boh = 1/((x1-x0)*y2+(x0-x2)*y1+(x2-x1)*y0);
			for (var x = min_x; x <= max_x; ++x)
			{
				for (var y = min_y; y <= max_y; ++y)
				{
					// Controlla che il punto sia interno ai tre lati del triangolo
					var prodscal01 = (x1-x0)*(y-y0) - (y1-y0)*(x-x0);
					var prodscal12 = (x2-x1)*(y-y1) - (y2-y1)*(x-x1);
					var prodscal20 = (x0-x2)*(y-y2) - (y0-y2)*(x-x2);
					if ( (prodscal01 <= 0 && prodscal12 <= 0 && prodscal20 <= 0) ||
						(prodscal01 >= 0 && prodscal12 >= 0 && prodscal20 >= 0) )
					{
						// wxmaxima power!
						var z = (((x0-x)*y1+(x-x1)*y0+(x1-x0)*y)*z2+((x-x0)*y2+(x2-x)*y0+(x0-x2)*y)*z1+((x1-x)*y2+(x-x2)*y1+(x2-x1)*y)*z0)*boh;
						this.__setPixel(x, y, z, r, g, b);
					}
				}
			}
		}
	}
}
CPlane.prototype.clearPlane = function()
{
	if(canvas.wireframe && !artistic_mode)
		this.context.clearRect(0, 0, this.width, this.height);
	else
	{
		var i = this.width * this.height * 4;
		while (i != 0)
		{
			this.colorbuffer.data[--i] = 255;
			this.colorbuffer.data[--i] = 255;
			this.colorbuffer.data[--i] = 255;
			this.colorbuffer.data[--i] = 255;
		}

		for (i = 0; i < this.width * this.height; i++)
			this.depthbuffer[i] = this.clipFar;
	}
}
CPlane.prototype.showBuffer = function()
{
	this.context.putImageData(this.colorbuffer, 0, 0);
}
/*==============================|Canvas Object class definitions|=================================*/
function CObject(name, faces)
{
	this.faces = faces;
	this.name = name;
	this.selected = 1;
	this.hidden = 0;
	// Scale
	this.Sx = 1;
	this.Sy = 1;
	this.Sz = 1;
	// Degrees Angle
	this.Ax = 0;
	this.Ay = 0;
	this.Az = 0;
	// Translate
	this.Tx = 0;
	this.Ty = 0;
	this.Tz = 25;
}
CObject.prototype.tick = function()
{
	if(this.selected == 1)
	{
		// Rotation tick
		this.Ax += Xr;
		this.Ay += Yr;
		if(Xr == 0 && auto_Xr == 1)
			this.Ax +=1;
		if(Yr == 0 && auto_Yr == 1)
			this.Ay += 1;
		if(auto_Zr == 1)
			this.Az +=1;
		// Traslation tick
		this.Tx += Xt;
		this.Ty += Yt;
		this.Tz += Zt;
	}
}
CObject.prototype.scale = function(x, y, z)
{
	this.Sx = x;
	this.Sy = y;
	this.Sz = z;
}
CObject.prototype.draw = function()
{
	// Applicazione delle matrici di Scala - Rotazione - Traslazione
	// Trasformazione dai punti 3D a 2D
	var to2Dfaces = [];
	var faces2D = [];
	for (var i = 0; i < this.faces.length; ++i)
	{
		to2Dfaces[i] = new Matrix(this.faces[i].vertex, this.faces[i].color);
		to2Dfaces[i] = to2Dfaces[i].scale(this.Sx, this.Sy, this.Sz);
		to2Dfaces[i] = to2Dfaces[i].rotate(this.Ax, 1, 0, 0);
		to2Dfaces[i] = to2Dfaces[i].rotate(this.Ay, 0, 1, 0);
		to2Dfaces[i] = to2Dfaces[i].rotate(this.Az, 0, 0, 1);
		to2Dfaces[i] = to2Dfaces[i].translate(this.Tx, this.Ty, this.Tz);
		to2Dfaces[i] = to2Dfaces[i].perspective();

		faces2D[i] = new Array();
		for(var j = 0; j < to2Dfaces[i].rows; ++j)
		{
			faces2D[i].push([to2Dfaces[i].vertex[j][0] / to2Dfaces[i].vertex[j][3], // x' = x/t
										 to2Dfaces[i].vertex[j][1] / to2Dfaces[i].vertex[j][3], // y' = y/t
										 to2Dfaces[i].vertex[j][2]]); // z
		}
		faces2D[i] = new Matrix(faces2D[i], to2Dfaces[i].color);
	}
	canvas.drawFaces(faces2D);
}
/*================================================================================================*/

function defaultCObject(name)
{
	return new CObject(name,new Array(new Matrix([[-1, -1, -1, 1],
		[-1, 1, -1, 1],
		[1, 1, -1, 1]], "#666666"),
	new Matrix([[-1, -1, -1, 1],
		[1, 1, -1, 1],
		[1, -1, -1, 1]], "#666666"),
	new Matrix([[-1, -1, 1, 1],
		[-1, 1, 1, 1],
		[1, 1, 1, 1]], "#000000"),
	new Matrix([[-1, -1, 1, 1],
		[1, 1, 1, 1],
		[1, -1, 1, 1]], "#000000"),
	new Matrix([[-1, -1, -1, 1],
		[-1, 1, -1, 1],
		[-1, 1, 1, 1]], "#FF0000"),
	new Matrix([[-1, -1, -1, 1],
		[-1, 1, 1, 1],
		[-1, -1, 1, 1]], "#FF0000"),
	new Matrix([[1, -1, -1, 1],
		[1, 1, -1, 1],
		[1, 1, 1, 1]], "#0000FF"),
	new Matrix([[1, -1, -1, 1],
		[1, 1, 1, 1],
		[1, -1, 1, 1]], "#0000FF"),
	new Matrix([[-1, -1, -1, 1],
		[1, -1, -1, 1],
		[1, -1, 1, 1]], "#00FF00"),
	new Matrix([[-1, -1, -1, 1],
		[1, -1, 1, 1],
		[-1, -1, 1, 1]], "#00FF00"),
	new Matrix([[-1, 1, -1, 1],
		[1, 1, -1, 1],
		[1, 1, 1, 1]], "#FF00FF"),
	new Matrix([[-1, 1, -1, 1],
		[1, 1, 1, 1],
		[-1, 1, 1, 1]], "#FF00FF")));}
	var cobjects = new Array();

	var myInterval;
	var newEvent = true;
	var running = false;
	var keys_pressed = [];

	/* Codice di rendering 3D to 2D */
	function start()
	{
		canvas = new CPlane(document.getElementById('canvas'))
		cobjects.push(defaultCObject("BigCube"));
		cobjects[0].Sx = 2;
		cobjects[0].Sy = 2;
		cobjects[0].Sz = 2;
		cobjects.push(defaultCObject("LittleCube"));
		cobjects[1].Sx = 3;
		writeCObjects();

		checkRunning();
	}

	function checkRunning()
	{
		if(!running && checkEvents())
		{
			running = true;
			myInterval = setInterval(function()
			{
				if(!checkEvents())
				{
					running = false;
					clearInterval(myInterval);
				}
			// Clear canvas
			canvas.clearPlane();
			for (var i = 0; i < cobjects.length; ++i)
			{
				cobjects[i].tick();
				if(!cobjects[i].hidden)
					cobjects[i].draw();
			}
			if(!canvas.wireframe)
				canvas.showBuffer();
		}, 2);
		}
	}

	function checkEvents(){
		if(keys_pressed.length > 0) return true;
		if(newEvent){
			newEvent = false;
			return true;
		}
		if(auto_Xr || auto_Yr || auto_Zr)
			return true;
		return false;
	}

	function keyup(event) { key(event); }
	function keydown(event) { key(event); }

	function key(event)
	{
	if(!event) event = window.event // IE < 9.0
		switch(event.keyCode)
	{
		case KEYS.RIGHT.keyCode: // Right
		Yr = (event.type == "keydown")? KEYS.RIGHT.value : 0;
		break;
		case KEYS.UP.keyCode: // Up
		Xr = (event.type == "keydown")? KEYS.UP.value : 0;
		break;
		case KEYS.LEFT.keyCode: // Left
		Yr = (event.type == "keydown")? KEYS.LEFT.value : 0;
		break;
		case KEYS.DOWN.keyCode: // Down
		Xr = (event.type == "keydown")? KEYS.DOWN.value : 0;
		break;
		case KEYS.W.keyCode: // W
		Yt = (event.type == "keydown")? KEYS.W.value : 0;
		break;
		case KEYS.A.keyCode: // A
		Xt = (event.type == "keydown")? KEYS.A.value : 0;
		break;
		case KEYS.S.keyCode: // S
		Yt = (event.type == "keydown")? KEYS.S.value : 0;
		break;
		case KEYS.D.keyCode: // D
		Xt = (event.type == "keydown")? KEYS.D.value : 0;
		break;
		case KEYS.E.keyCode: // E
		Zt = (event.type == "keydown")? KEYS.E.value : 0;
		break;
		case KEYS.Q.keyCode: // Q
		Zt = (event.type == "keydown")? KEYS.Q.value : 0;
		break;
	}
	var _i = keys_pressed.indexOf(event.keyCode);
	if(event.type == "keydown")
		if(_i == -1)
			keys_pressed.push(event.keyCode);
		else if(_i != -1)
			keys_pressed.splice(_i, 1);
		checkRunning();
	}

	function setProjectionDistance()
	{
		canvas.pDistance = prompt("Inserisci un valore positivo", canvas.pDistance);
		if(canvas.pDistance < 0)
		{
			alert("il valore dev'essere positivo!");
			canvas.pDistance = 5;
		}
		newEvent = true;
		checkRunning();
	}

	function selectObject(i)
	{
		cobjects[i].selected = !cobjects[i].selected;
	}

	function hideObject(i)
	{
		cobjects[i].hidden = !cobjects[i].hidden;
		newEvent = true;
		checkRunning();
	}

	function exportObject(i)
	{
		window.prompt("Copia nella clipboard: Ctrl+C, Invio", JSON.stringify(cobjects[i]));
	}

	function importObject()
	{
		var newObj = JSON.parse(prompt("Inserisci il codice JSON dell'oggetto:"));

		var vertex = [];
		for (var i = 0; i < newObj.faces.length; ++i)
		{
			var points = [];
			for (var j = 0; j < newObj.faces[i].vertex.length; ++j)
			{
				var c = newObj.faces[i].vertex[j];
				points[j] = new Array(c[0], c[1], c[2], 1);
			}
			vertex[i] = new Matrix(points, newObj.faces[i].color);
		}
		cobjects.push(new CObject(newObj.name, vertex));
		writeCObjects();
		newEvent = true;
		checkRunning();
	}

	function getSelectedObjects()
	{
		var o = [];
		for (var i = 0; i < cobjects.length; ++i)
		{
			if(cobjects[i].selected == 1)
				o.push(cobjects[i]);
		}
		return o;
	}

	function setScale()
	{
		var obj = getSelectedObjects();
		if(obj)
		{
			for (var i = 0; i < obj.length; i++)
			{
				var x = prompt("Scala X di "+obj[i].name, obj[i].Sx);
				if(x < 1)
				{
					alert("Non puoi scalare per < 1!");
					x = 1;
				}
				y = prompt("Scala Y di "+obj[i].name, obj[i].Sy);
				if(y < 1)
				{
					alert("Non puoi scalare per < 1!");
					y = 1;
				}
				z = prompt("Scala Z di "+obj[i].name, obj[i].Sz);
				if(z < 1)
				{
					alert("Non puoi scalare per < 1!");
					z = 1;
				}
				obj[i].scale(x, y, z);
			}
			newEvent = true;
			checkRunning();
		}else alert("Seleziona un oggetto prima!");
	}

	function R_PlayStop(o)
	{
		switch(o)
		{
			case 'x':
			auto_Xr = !auto_Xr;
			break;
			case 'y':
			auto_Yr = !auto_Yr;
			break;
			case 'z':
			auto_Zr = !auto_Zr;
			break;
		}
		checkRunning();
	}

	function createObject()
	{
		var name = prompt("Come lo vuoi chiamare?", "Oggetto"+cobjects.length);
		var num_faces = prompt("imposta il numero di facce");
		var num_vertex = prompt("imposta il numero di vertici per faccia");
		var vertex = [];
		for (var i = 0; i < num_faces; ++i)
		{
			var color = prompt("Inserisci il colore nel formato #XXXXXX", "#000000");
			var points = [];
			for (var j = 0; j < num_vertex; ++j)
			{
				var coord = prompt("Coordinate nel formato X,Y,Z del vertice "+(j+1)+", faccia "+(i+1));
				var c = coord.split(",");
				if(c.length == 3)
					points[j] = new Array(c[0], c[1], c[2], 1);
				else
					throw "Error: formato non adatto";
			}
			vertex[i] = new Matrix(points, color);
		}
		cobjects.push(new CObject(name, vertex));
		writeCObjects();
		newEvent = true;
		checkRunning();
	}

	function writeCObjects()
	{
		var div = document.getElementById("objects-list");
		div.innerHTML = "";
		for (var i = 0; i < cobjects.length; ++i)
		{
			var checkHIDE = (cobjects[i].hidden)?' checked':' ';
			var htmlHIDE = '<br />&nbsp;&nbsp;==></label>&nbsp;<label><input type="checkbox" onclick="hideObject('+i+');"'+checkHIDE+'/>Nascondi</label>';
			var htmlEXPORT ='&nbsp;<button onclick="exportObject('+i+');">Esp. JSON</button><br />';
			var check = (cobjects[i].selected)?' checked':' ';
			div.innerHTML += '<label><input type="checkbox" onclick="selectObject('+i+');"'+check+'/>'+cobjects[i].name+htmlHIDE+htmlEXPORT;
		}
	}

	function enableWireframe()
	{
		canvas.wireframe = !canvas.wireframe;
		document.getElementById("artistic_mode").disabled = !canvas.wireframe;
		newEvent = true;
		checkRunning();
	}

	function enableArtistic()
	{
		artistic_mode= !artistic_mode;
		newEvent = true;
		checkRunning();
	}