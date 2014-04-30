if(Meteor.isClient) {

	window.requestAnimFrame = (function(){
		return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function(callback){
			window.setTimeout(callback, 1000 / 60);
		};
	})();

	function ce(s){
		return $(document.createElement(s));
	}

	window.onload = function(){

		var test = new CCRGame();
		test.init(
			{
				arrows: {
					available: {0: 2, 1: 3, 2: 1, 3: 1}
				},
				cats: [
					{x: 1, y: 1, d: 1}
				],
				goals: [
					{x: 10, y: 1}
				],
				grid: {x: 12,y: 9},
				holes: [
					{x: 1, y: 2}
				],
				mice: [
					{x: 0, y: 0, d: 1},
					{x: 1, y: 0, d: 1},
					{x: 2, y: 0, d: 1}
				],
				walls: [
					{x: 0, y: 0, d: 2, t: 1},
					{x: 2, y: 1, d: 1, t: 1},
					{x: 2, y: 4, d: 2, t: 1},
					{x: 1, y: 4, d: 3, t: 1},
					{x: 11, y: 6, d: 2, t: 1},
					{x: 2, y: 6, d: 3, t: 1},
					{x: 2, y: 5, d: 1, t: 1},
					{x: 2, y: 5, d: 3, t: 1},
				]
			}
		);
		test.add("#game");
		test.start();

	};

}

var CCRGame = function(){

	var parent = this;

	this.init = function(gamedata){

		if(!gamedata){ return false; }
		if(!gamedata.holes){ gamedata.holes = []; }
		if(!gamedata.goals){ gamedata.goals = []; }
		if(!gamedata.grid){ gamedata.grid = {x: 12, y: 9}; }
		if(!gamedata.grid.x){ gamedata.grid.x = this.gamedata.grid.x; }
		if(!gamedata.grid.y){ gamedata.grid.y = this.gamedata.grid.y; }
		if(!gamedata.mice){ gamedata.mice = []; }
		if(!gamedata.walls){ gamedata.walls = []; }

		// Create the gamedata
		this.gamedata = {
			arrows: {
				available: {0: 0, 1: 0, 2: 0, 3: 0},
				placed: {0: [], 1: [], 2: [], 3: []}
			},
			collisions: {
				cats: {},
				goals: {},
				holes: {},
				mice: {},
				walls: {}
			},
			dom: null,
			events: {
				cats: {
					holes: function(a){ console.log('Laugh at silly cat'); },
					goals: function(a){ console.log('You is fail'); }
				},
				mice: {
					holes: function(a){ console.log('Poor little mouse'); },
					goals: function(a){ console.log('You are win'); }
				}
			},
			grid: {
				data: {},
				x: 12,
				y: 9
			},
			original: {
				cats: [],
				goals: [],
				holes: [],
				mice: [],
				walls: []
			}
		}

		// And stuff
		this.directions = {
			check: {0: [0, 1, 3], 1: [1, 2, 0], 2: [2, 3, 1], 3: [3, 0, 2]},
			hits: {0: {1: 1, 2: 3, 3: 2}, 1: {1: 2, 2: 0, 3: 3}, 2: {1: 3, 2: 1, 3: 0}, 3: {1: 0, 2: 2, 3: 1}},
			next: {0: 1, 1: 2, 2: 3, 3: 0},
			opp: {0: 2, 1: 3, 2: 0, 3: 1},
			prev: {0: 3, 1: 0, 2: 1, 3: 2}
		};
		this.frame = {
			master: 0,
			cats: 0,
			mice: 0
		};
		this.state = 0;

		// Create wrapper
		var _ccr_wrapper = ce("div")
		.css("width", gamedata.grid.x * 50 + "px")
		.css("height", gamedata.grid.y * 50 + 50 + "px")
		.prop("class", "ccr_wrapper");

		// Create grid wrapper
		var _grid_wrapper = ce("div")
		.prop("class", "grid_wrapper");

		// Populate grid
		for(var i = 0; i < gamedata.grid.x; i ++){
			for(var j = 0; j < gamedata.grid.y; j ++){
				this.addItem("grid", {x: i, y: j}, _grid_wrapper);
			}
		}

		// Create wall wrapper
		var _wall_wrapper = ce("div")
		.prop("class", "wall_wrapper");

		// Create wall boundaries
		for(var i = 0; i < gamedata.grid.x; i ++){
			for(var j = 0; j < gamedata.grid.y; j ++){
				if(!this.gamedata.grid.data["x" + i + "y" + (j-1)]){ // No grid square above
					this.addItem("wall", {x: i, y: j, d: 0, t: 1}, _wall_wrapper);
				}
				if(!this.gamedata.grid.data["x" + i + "y" + (j+1)]){ // No grid square below
					this.addItem("wall", {x: i, y: j, d: 2, t: 1}, _wall_wrapper);
				}
				if(!this.gamedata.grid.data["x" + (i+1) + "y" + (j)]){ // No grid square to right
					this.addItem("wall", {x: i, y: j, d: 1, t: 1}, _wall_wrapper);
				}
				if(!this.gamedata.grid.data["x" + (i-1) + "y" + (j)]){ // No grid square to left
					this.addItem("wall", {x: i, y: j, d: 3, t: 1}, _wall_wrapper);
				}
			}
		}

		// Add cats
		for(var i in gamedata.cats){
			this.addItem("cats", gamedata.cats[i], _grid_wrapper);
		}

		// Add goals
		for(var i in gamedata.goals){
			this.addItem('goals', gamedata.goals[i], _grid_wrapper);
		}

		// Add holes
		for(var i in gamedata.holes){
			this.addItem('holes', gamedata.holes[i], _grid_wrapper);
		}

		// Add mice
		for(var i in gamedata.mice){
			this.addItem("mice", gamedata.mice[i], _grid_wrapper);
		}

		// Add walls
		for(var i in gamedata.walls){
			this.addItem("wall", gamedata.walls[i], _wall_wrapper);
		}

		// Create toolbar
		var _toolbar = ce("div")
		.prop("class", "toolbar")
		.css("margin-top", gamedata.grid.y * 50 + "px")
		.css("position", "absolute");

		// Create arrows
		var _arrows = ce("div");
		for(var i in gamedata.arrows.available){
			var _arrow = ce("div")
			.prop("class", "arrow")
			.addClass("dir" + i);
			var _label = ce("div")
			.prop("class", "label")
			.addClass("shadowtext")
			.text(gamedata.arrows.available[i]);
			_arrow.append(_label);
			_arrows.append(_arrow);
		}
		_toolbar.append(_arrows);

		_ccr_wrapper.append(_grid_wrapper);
		_ccr_wrapper.append(_wall_wrapper);
		_ccr_wrapper.append(_toolbar);
		this.gamedata.dom = _ccr_wrapper;

		// Clone the gamedata
		this.gamedata.active = $.extend(true, {}, this.gamedata.original);

	};

	this.add = function(target){

		$(target).append(this.gamedata.dom);

	};

	this.addItem = function(type, data, target){

		var _el = ce("div")
		.css("margin-left", data.x * 50 + "px")
		.css("margin-top", data.y * 50 + "px")
		.css("position", "absolute");

		if(type == "cats"){
			_el.prop('class', 'cat')
			.css("width", "50px")
			.css("height", "50px");
			target.append(_el);
			this.gamedata.original.cats.push({x: data.x, y: data.y, d: data.d, obj: _el});
			// this.gamedata.collisions.cats["x" + data.x + "y" + data.y + "d" + data.d] = 1;
		}

		if(type == 'holes'){
			_el.prop('class', 'hole')
			.css("width", "50px")
			.css("height", "50px");
			target.append(_el);
			this.gamedata.original.holes.push({x: data.x, y: data.y, obj: _el});
			this.gamedata.collisions.holes['x' + data.x + 'y' + data.y] = 1;
		}

		if(type == 'goals'){
			_el.prop('class', 'goal')
			.css("width", "50px")
			.css("height", "50px");
			target.append(_el);
			this.gamedata.original.goals.push({x: data.x, y: data.y, obj: _el});
			this.gamedata.collisions.goals['x' + data.x + 'y' + data.y] = 1;
		}

		if(type == "grid"){
			this.gamedata.grid.data["x" + data.x + "y" + data.y] = 1;
			_el.prop('class', 'grid')
			.css("width", "50px")
			.css("height", "50px")
			.addClass((data.x + data.y) % 2 == 0 ? "col1" : "col2")
			.text(data.x + "x" + data.y);
			target.append(_el);
		}

		if(type == "mice"){
			_el.prop('class', 'mouse')
			.css("width", "50px")
			.css("height", "50px");
			target.append(_el);
			this.gamedata.original.mice.push({x: data.x, y: data.y, d: data.d, obj: _el});
			// this.gamedata.collisions.mice["x" + data.x + "y" + data.y + "d" + data.d] = 1;
		}

		if(type == "wall"){
			this.gamedata.collisions.walls["x" + data.x + "y" + data.y + "d" + data.d] = data.t;
			_el.prop('class', 'wall')
			.css("margin-left", (data.d == 1 ? data.x * 50 + 49 : data.d == 3 ? data.x * 50 -2 : data.x * 50) + "px")
			.css("margin-top", (data.d == 0 ? data.y * 50 - 2 : data.d == 2 ? data.y * 50 + 49 : data.y * 50) + "px")
			.css("width", (data.d == 0 || data.d == 2 ? 50 : 3) + "px")
			.css("height", (data.d == 1 || data.d == 3 ? 50 : 3) + "px");
			target.append(_el);
		}

	};

	this.animate = function(a, frame){

		frame = frame % 10;

		if(frame == 0){ frame = 10; }

		for(var i = 0, al = a.length; i < al; i++){

			a[i].obj
			.css("margin-left", a[i].x * 50 + (a[i].d == 1 ? frame * 5 : a[i].d == 3 ? - frame * 5 : 0) + "px")
			.css("margin-top", a[i].y * 50 + (a[i].d == 0 ? - frame * 5 : a[i].d == 2 ? frame * 5 : 0) + "px");

		}

	};

	this.detectCollisions = function(){

		for(var i in this.gamedata.collisions.mice){

			if(this.gamedata.collisions.cats[i]){

				console.log("wip");

			}

		}

	};

	this.move = function(a, friendlyName){

		var parent = this;

		this.gamedata.collisions[friendlyName] = {};

		for(var i = 0, al = a.length; i < al; i++){

			// Update direction
			a[i].d = (function(x, y, d){
				if(parent.gamedata.collisions.walls["x" + x + "y" + y + "d" + d] || parent.gamedata.collisions.walls["x" + (d == 1 ? x+1 : d == 3 ? x-1 : x) + "y" + (d == 0 ? y-1 : d == 2 ? y+1 : y) + "d" + parent.directions.opp[d]]){
					var checkd = parent.directions.check[d];
					var hits = 0;
					for(var i = 0, checkdl = checkd.length; i < checkdl; i++){
						if(parent.gamedata.collisions.walls["x" + x + "y" + y + "d" + checkd[i]] || parent.gamedata.collisions.walls["x" + (checkd[i] == 1 ? x+1 : checkd[i] == 3 ? x-1 : x) + "y" + (checkd[i] == 0 ? y-1 : checkd[i] == 2 ? y+1 : y) + "d" + parent.directions.opp[checkd[i]]]){
							hits++;
						}
						else{ break; }
					}
					return parent.directions.hits[d][hits];
				}
				return d;
			})(a[i].x, a[i].y, a[i].d);

			// Update collisions
			this.gamedata.collisions[friendlyName]["x" + a[i].x + "y" + a[i].y + "d" + a[i].d] = 1;

			// Detect hole collision
			if(this.gamedata.collisions.holes['x' + a[i].x + 'y' + a[i].y]){ this.gamedata.events[friendlyName].holes(a); }

			// Detect goal collision
			if(this.gamedata.collisions.goals['x' + a[i].x + 'y' + a[i].y]){ this.gamedata.events[friendlyName].goals(a); }

			// Update coordinate
			a[i].x += (a[i].d == 1 ? 1 : a[i].d == 3 ? -1 : 0);
			a[i].y += (a[i].d == 0 ? -1 : a[i].d == 2 ? 1 : 0);

		}

	};

	this.play = function(){

		// if(this.frame.master > 1000){ this.pause(); }

		if(this.state == 0){ return false; }

		var parent = this;

		this.frame.master++;

		if(this.frame.master % 2 == 0){
			this.frame.mice++;
			this.animate(this.gamedata.active.mice, this.frame.mice);
		}
		if(this.frame.master % 3 == 0){
			this.frame.cats++;
			this.animate(this.gamedata.active.cats, this.frame.cats);
		}

		if(this.frame.master % 20 == 0){
			this.move(this.gamedata.active.mice, 'mice');
		}
		if(this.frame.master % 30 == 0){
			this.move(this.gamedata.active.cats, 'cats');
		}
		if(this.frame.master % 20 == 0 || this.frame.master % 30 == 0){
			this.detectCollisions();
		}

	};

	this.pause = function(){

		this.state = 0;

	};

	this.processCollision = function(a, friendlyName, type){

	};

	this.start = function(){

		var parent = this;

		this.state = 1;

		(function animloop(){
			requestAnimFrame(animloop);
			parent.play();
		})();

	};

	this.stop = function(status){

		this.state = 2;

	};

};