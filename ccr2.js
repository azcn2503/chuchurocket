var CCRGame = function(){

	var self = this;

	self.gamedata = {};
	self.initData = {};

	this.init = function(gamedata){

		if(!gamedata){ return false; }

		self.initData = gamedata;

		// Create the gamedata
		self.gamedata = {
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
			},
			active: {
				cats: [],
				goals: [],
				holes: [],
				mice: [],
				walls: []
			}
		};

		this.directions = {

			// 0 = Up, 1 = Right, 2 = Down, 3 = Left

			// When processing wall collisions, check walls in these directions
			// { current_direction: [ direction_1, direction_2, direction_3 ] }
			check: {0: [0, 1, 3], 1: [1, 2, 0], 2: [2, 3, 1], 3: [3, 0, 2]},

			// Calculate the new direction based on number of wall collisions
			// { current_direction: { number_of_hits: new_direction }
			hits: {0: {1: 1, 2: 3, 3: 2}, 1: {1: 2, 2: 0, 3: 3}, 2: {1: 3, 2: 1, 3: 0}, 3: {1: 0, 2: 2, 3: 1}},

			// Next directions
			// { current_direction: next_direction }
			next: {0: 1, 1: 2, 2: 3, 3: 0},

			// Opposite directions
			// { current_direction: opposite_direction }
			opp: {0: 2, 1: 3, 2: 0, 3: 1},

			// Previous directions
			// { current_direction: previous_direction }
			prev: {0: 3, 1: 0, 2: 1, 3: 2}

		};

		self.frame = {
			master: 0,
			cats: 0,
			mice: 0
		};

		self.state = 0;

	};

	this.initDOM = function() {

		// Create wrapper
		var _ccr_wrapper = ce("div")
		.css("width", self.gamedata.grid.x * 50 + "px")
		.css("height", self.gamedata.grid.y * 50 + 50 + "px")
		.prop("class", "ccr_wrapper");

		// Create grid wrapper
		var _grid_wrapper = ce("div")
		.prop("class", "grid_wrapper");

		// Populate grid
		for(var i = 0; i < self.gamedata.grid.x; i ++){
			for(var j = 0; j < self.gamedata.grid.y; j ++){
				this.addItem("grid", {x: i, y: j}, _grid_wrapper);
			}
		}

		// Create wall wrapper
		var _wall_wrapper = ce("div")
		.prop("class", "wall_wrapper");

		// Create wall boundaries
		for(var i = 0; i < self.gamedata.grid.x; i ++){
			for(var j = 0; j < self.gamedata.grid.y; j ++){
				if(!self.gamedata.grid.data["x" + i + "y" + (j-1)]){ // No grid square above
					self.addItem("walls", {x: i, y: j, d: 0, t: 1}, _wall_wrapper);
				}
				if(!self.gamedata.grid.data["x" + i + "y" + (j+1)]){ // No grid square below
					self.addItem("walls", {x: i, y: j, d: 2, t: 1}, _wall_wrapper);
				}
				if(!self.gamedata.grid.data["x" + (i+1) + "y" + (j)]){ // No grid square to right
					self.addItem("walls", {x: i, y: j, d: 1, t: 1}, _wall_wrapper);
				}
				if(!self.gamedata.grid.data["x" + (i-1) + "y" + (j)]){ // No grid square to left
					self.addItem("walls", {x: i, y: j, d: 3, t: 1}, _wall_wrapper);
				}
			}
		}

		var items = [
			{ container: _grid_wrapper, type: 'cats' },
			{ container: _grid_wrapper, type: 'goals' },
			{ container: _grid_wrapper, type: 'holes' },
			{ container: _grid_wrapper, type: 'mice' },
			{ container: _wall_wrapper, type: 'walls' }
		];

		for (var i in items) {
			for (var j in self.initData[items[i].type]) {
				self.addItem(items[i].type, self.initData[items[i].type][j], items[i].container);
			}
		}

		// Create toolbar
		var _toolbar = ce("div")
		.prop("class", "toolbar")
		.css("margin-top", self.gamedata.grid.y * 50 + "px")
		.css("position", "absolute");

		// Create arrows
		var _arrows = ce("div");
		for(var i in self.gamedata.arrows.available){
			var _arrow = ce("div")
			.prop("class", "arrow")
			.addClass("dir" + i);
			var _label = ce("div")
			.prop("class", "label")
			.addClass("shadowtext")
			.text(self.gamedata.arrows.available[i]);
			_arrow.append(_label);
			_arrows.append(_arrow);
		}
		_toolbar.append(_arrows);

		_ccr_wrapper.append(_grid_wrapper);
		_ccr_wrapper.append(_wall_wrapper);
		_ccr_wrapper.append(_toolbar);
		self.gamedata.dom = _ccr_wrapper;

		// Clone the gamedata
		//self.gamedata.active = JSON.parse(JSON.stringify(self.gamedata.original));
		console.log('self.gamedata.original: ', self.gamedata.original);
		console.log('self.gamedata.active: ', self.gamedata.active);

	};

	this.add = function(target){

		$(target).append(self.gamedata.dom);

	};

	this.addGameData = function(type, obj) {

		self.gamedata.original[type].push(obj);
		self.gamedata.active[type].push(obj);

	};

	this.addItem = function(type, data, target){

		console.log('Adding item: ', type, data, target);

		var el = null;

		if (target) {
			_el = ce("div")
			.css("margin-left", data.x * 50 + "px")
			.css("margin-top", data.y * 50 + "px")
			.css("position", "absolute");
		}

		switch (type) {
			case 'cats':
				if (target) {
					_el.prop('class', 'cat')
					.css("width", "50px")
					.css("height", "50px");
				}
				self.addGameData(type, { x: data.x, y: data.y, d: data.d, obj: _el });
			break;
			case 'holes':
				if (target) {
					_el.prop('class', 'hole')
					.css("width", "50px")
					.css("height", "50px");
				}
				self.addGameData(type, {x: data.x, y: data.y, obj: _el});
				self.gamedata.collisions.holes['x' + data.x + 'y' + data.y] = 1;
			break;
			case 'goals':
				if (target) {
					_el.prop('class', 'goal')
					.css("width", "50px")
					.css("height", "50px");
				}
				self.addGameData(type, {x: data.x, y: data.y, obj: _el});
				self.gamedata.collisions.goals['x' + data.x + 'y' + data.y] = 1;
			break;
			case 'grid':
				if (target) {
					_el.prop('class', 'grid')
					.css("width", "50px")
					.css("height", "50px")
					.addClass((data.x + data.y) % 2 == 0 ? "col1" : "col2")
					.text(data.x + "x" + data.y);
				}
				self.gamedata.grid.data["x" + data.x + "y" + data.y] = 1;
			break;
			case 'mice':
				if (target) {
					_el.prop('class', 'mouse')
					.css("width", "50px")
					.css("height", "50px");
				}
				self.addGameData(type, {x: data.x, y: data.y, d: data.d, obj: _el});
			break;
			case 'walls':
				if (target) {
					_el.prop('class', 'wall')
					.css("margin-left", (data.d == 1 ? data.x * 50 + 49 : data.d == 3 ? data.x * 50 -2 : data.x * 50) + "px")
					.css("margin-top", (data.d == 0 ? data.y * 50 - 2 : data.d == 2 ? data.y * 50 + 49 : data.y * 50) + "px")
					.css("width", (data.d == 0 || data.d == 2 ? 50 : 3) + "px")
					.css("height", (data.d == 1 || data.d == 3 ? 50 : 3) + "px");
				}
				self.gamedata.collisions.walls["x" + data.x + "y" + data.y + "d" + data.d] = data.t;
			break;
		}

		if (target && _el) {
			target.append(_el);
		}

	};

	this.animate = function(a, frame){

		// Update the DOM with new gamedata movements and smooth things out

		frame = frame % 10;

		if(frame == 0){ frame = 10; }

		for(var i = 0, al = a.length; i < al; i++){

			if (!a[i] || !a[i].obj || !a[i].obj.css) { continue; }

			a[i].obj
			.css("margin-left", a[i].x * 50 + (a[i].d == 1 ? frame * 5 : a[i].d == 3 ? - frame * 5 : 0) + "px")
			.css("margin-top", a[i].y * 50 + (a[i].d == 0 ? - frame * 5 : a[i].d == 2 ? frame * 5 : 0) + "px");

		}

	};

	this.detectCollisions = function(){

		for(var i in self.gamedata.collisions.mice){

			if(self.gamedata.collisions.cats[i]){

				console.log("wip");

			}

		}

	};

	this.move = function(a, friendlyName){

		// Move gamedata, but don't animate them.

		var checkCollidibleWalls = function(x, y, d) {

			// Checks for walls directly in front of us.
			// Given 2,2,0 it will check 2,2,0 and 2,1,2 for example.

			if (self.gamedata.collisions.walls['x' + x + 'y' + y + 'd' + d]) {
				return true;
			}

			var nextX = x + (d == 1 ? 1 : d == 3 ? -1 : 0);
			var nextY = y + (d == 0 ? -1 : d == 2 ? 1 : 0);
			var nextD = self.directions.opp[d];

			if (self.gamedata.collisions.walls['x' + nextX + 'y' + nextY + 'd' + nextD]) {
				return true;
			}

		};

		var parent = this;

		self.gamedata.collisions[friendlyName] = {};

		for(var i = 0, al = a.length; i < al; i++){

			// Update coordinate
			a[i].x += (a[i].d == 1 ? 1 : a[i].d == 3 ? -1 : 0);
			a[i].y += (a[i].d == 0 ? -1 : a[i].d == 2 ? 1 : 0);

			// Update direction
			a[i].d = (function(x, y, d) {
				// Check if there is a wall directly in front of us (check the current grid square, and the grid square ahead of us)
				if (checkCollidibleWalls(x, y, d)){
					var checkd = parent.directions.check[d];
					var hits = 0;
					// Find out how many walls we will hit
					for(var i = 0, checkdl = checkd.length; i < checkdl; i++) {
						if (checkCollidibleWalls(x, y, checkd[i])) {
							hits++;
						}
						else { break; }
					}
					// Return the new direction based on the number of walls we hit
					return parent.directions.hits[d][hits];
				}
				return d;
			})(a[i].x, a[i].y, a[i].d);

			// Update collisions
			self.gamedata.collisions[friendlyName]["x" + a[i].x + "y" + a[i].y + "d" + a[i].d] = 1;

			// Detect hole collision
			if(self.gamedata.collisions.holes['x' + a[i].x + 'y' + a[i].y]){ self.gamedata.events[friendlyName].holes(a); }

			// Detect goal collision
			if(self.gamedata.collisions.goals['x' + a[i].x + 'y' + a[i].y]){ self.gamedata.events[friendlyName].goals(a); }

		}

	};

	this.play = function(){

		//console.log('self.gamedata.active: ', self.gamedata.active);

		if(self.frame.master > 10000){ self.pause(); } // prevent infinite looping during debugging

		if(self.state == 0){ return false; }

		self.frame.master++;

		//console.log(self.frame.master);

		if(self.frame.master % 2 == 0){
			self.frame.mice++;
			self.animate(self.gamedata.active.mice, self.frame.mice);
		}
		if(self.frame.master % 3 == 0){
			self.frame.cats++;
			self.animate(self.gamedata.active.cats, self.frame.cats);
		}

		if(self.frame.master % 20 == 0){
			self.move(self.gamedata.active.mice, 'mice');
		}
		if(self.frame.master % 30 == 0){
			self.move(self.gamedata.active.cats, 'cats');
		}
		if(self.frame.master % 20 == 0 || self.frame.master % 30 == 0){
			self.detectCollisions();
		}

	};

	this.pause = function(){

		this.state = 0;

	};

	this.processCollision = function(a, friendlyName, type){

	};

	this.start = function(){

		this.state = 1;

		(function animloop(){
			requestAnimFrame(animloop);
			self.play();
		})();

	};

	this.stop = function(status){

		this.state = 2;

	};

};

if(Meteor.isClient) {

	Session.set('gameIsReady', false);

	function ce(s){
		return $(document.createElement(s));
	}

	window.requestAnimFrame = (function(){
		return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function(callback){
			window.setTimeout(callback, 1000 / 60);
		};
	})();

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
			grid: {x: 12, y: 9},
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
				{x: 5, y: 0, d: 1, t: 1},
				{x: 4, y: 8, d: 3, t: 1},
				{x: 4, y: 2, d: 0, t: 1}
			]
		}
	);

	Template.playback.helpers({
		'gameIsReady': function() {
			return Session.get('gameIsReady');
		}
	});

	Template.playback.events({
		'click input[name=play]': function() {
			test.start();
		},
		'click input[name=stop]': function() {
			test.stop();
		}
	});

	window.onload = function() {

		test.initDOM();
		test.add("#game");
		Session.set('gameIsReady', true);
		test.start();

	}

}