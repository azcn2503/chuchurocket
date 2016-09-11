class CCRGame {

	constructor() {

		this.gamedata = {};
		this.initData = {};

		this.directions = {

			// 0 = Up, 1 = Right, 2 = Down, 3 = Left, -1 = None

			// When processing wall collisions, check walls in these directions
			// { current_direction: [ direction_1, direction_2, direction_3 ] }
			check: {0: [0, 1, 3], 1: [1, 2, 0], 2: [2, 3, 1], 3: [3, 0, 2]},

			// Calculate the new direction based on number of wall collisions
			// { current_direction: { number_of_hits: new_direction }
			hits: {0: {1: 1, 2: 3, 3: 2, 4: -1}, 1: {1: 2, 2: 0, 3: 3, 4: -1}, 2: {1: 3, 2: 1, 3: 0, 4: -1}, 3: {1: 0, 2: 2, 3: 1, 4: -1}},

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

		this.frame = {
			master: 0,
			cats: 0,
			mice: 0
		};

		this.wallThickness = 5;

		this.state = 0;

	}

	appendTo(target) {

		$(target).append(this.gamedata.dom);

	};

	init(gamedata) {

		if(!gamedata){ return false; }

		this.initData = gamedata;

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
					holes: (a) => { console.log('Laugh at silly cat'); },
					goals: (a) => { console.log('You is fail'); }
				},
				mice: {
					holes: (a) => { console.log('Poor little mouse'); },
					goals: (a) => { console.log('You are win'); }
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

	};

	initDOM() {

		// Create wrapper
		let _ccr_wrapper = ce("div")
		.css("width", this.gamedata.grid.x * 50 + "px")
		.css("height", this.gamedata.grid.y * 50 + 50 + "px")
		.prop("class", "ccr_wrapper");

		// Create grid wrapper
		let _grid_wrapper = ce("div")
		.prop("class", "grid_wrapper");

		// Populate grid
		for(let i = 0; i < this.gamedata.grid.x; i ++){
			for(let j = 0; j < this.gamedata.grid.y; j ++){
				this.addItem("grid", {x: i, y: j}, _grid_wrapper);
			}
		}

		// Create wall wrapper
		let _wall_wrapper = ce("div")
		.prop("class", "wall_wrapper");

		// Create wall boundaries
		for(let i = 0; i < this.gamedata.grid.x; i ++){
			for(let j = 0; j < this.gamedata.grid.y; j ++){
				if(!this.gamedata.grid.data["x" + i + "y" + (j-1)]){ // No grid square above
					this.addItem("walls", {x: i, y: j, d: 0, t: 1}, _wall_wrapper);
				}
				if(!this.gamedata.grid.data["x" + i + "y" + (j+1)]){ // No grid square below
					this.addItem("walls", {x: i, y: j, d: 2, t: 1}, _wall_wrapper);
				}
				if(!this.gamedata.grid.data["x" + (i+1) + "y" + (j)]){ // No grid square to right
					this.addItem("walls", {x: i, y: j, d: 1, t: 1}, _wall_wrapper);
				}
				if(!this.gamedata.grid.data["x" + (i-1) + "y" + (j)]){ // No grid square to left
					this.addItem("walls", {x: i, y: j, d: 3, t: 1}, _wall_wrapper);
				}
			}
		}

		let items = [
			{ container: _grid_wrapper, type: 'cats' },
			{ container: _grid_wrapper, type: 'goals' },
			{ container: _grid_wrapper, type: 'holes' },
			{ container: _grid_wrapper, type: 'mice' },
			{ container: _wall_wrapper, type: 'walls' }
		];

		for (let i in items) {
			for (let j in this.initData[items[i].type]) {
				this.addItem(items[i].type, this.initData[items[i].type][j], items[i].container);
			}
		}

		// Create toolbar
		let _toolbar = ce("div")
		.prop("class", "toolbar")
		.css("margin-top", this.gamedata.grid.y * 50 + "px")
		.css("position", "absolute");

		// Create arrows
		let _arrows = ce("div");
		for(let i in this.gamedata.arrows.available){
			let _arrow = ce("div")
			.prop("class", "arrow")
			.addClass("dir" + i);
			let _label = ce("div")
			.prop("class", "label")
			.addClass("shadowtext")
			.text(this.gamedata.arrows.available[i]);
			_arrow.append(_label);
			_arrows.append(_arrow);
		}
		_toolbar.append(_arrows);

		_ccr_wrapper.append(_grid_wrapper);
		_ccr_wrapper.append(_wall_wrapper);
		_ccr_wrapper.append(_toolbar);
		this.gamedata.dom = _ccr_wrapper;

		// Clone the gamedata
		//this.gamedata.active = JSON.parse(JSON.stringify(this.gamedata.original));
		console.log('this.gamedata.original: ', this.gamedata.original);
		console.log('this.gamedata.active: ', this.gamedata.active);

	};

	addGameData(type, obj) {

		this.gamedata.original[type].push(obj);
		this.gamedata.active[type].push(obj);

	};

	addItem(type, data, target) {

		console.log('Adding item: ', type, data, target);

		let _el = null;

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
				this.addGameData(type, { x: data.x, y: data.y, d: data.d, obj: _el });
			break;
			case 'holes':
				if (target) {
					_el.prop('class', 'hole')
					.css("width", "50px")
					.css("height", "50px");
				}
				this.addGameData(type, {x: data.x, y: data.y, obj: _el});
				this.gamedata.collisions.holes['x' + data.x + 'y' + data.y] = 1;
			break;
			case 'goals':
				if (target) {
					_el.prop('class', 'goal')
					.css("width", "50px")
					.css("height", "50px");
				}
				this.addGameData(type, {x: data.x, y: data.y, obj: _el});
				this.gamedata.collisions.goals['x' + data.x + 'y' + data.y] = 1;
			break;
			case 'grid':
				if (target) {
					_el.prop('class', 'grid')
					.css("width", "50px")
					.css("height", "50px")
					.addClass((data.x + data.y) % 2 == 0 ? "col1" : "col2")
					.html(`<span>${data.x}x${data.y}</span>`);
				}
				this.gamedata.grid.data["x" + data.x + "y" + data.y] = 1;
			break;
			case 'mice':
				if (target) {
					_el.prop('class', 'mouse')
					.css("width", "50px")
					.css("height", "50px");
				}
				this.addGameData(type, {x: data.x, y: data.y, d: data.d, obj: _el});
			break;
			case 'walls':
				if (target) {
					_el.prop('class', 'wall')
					.css("margin-left", (data.d == 1 ? data.x * 50 + (50 - this.wallThickness / 2) : data.d == 3 ? data.x * 50 - this.wallThickness / 2 : data.x * 50) + "px")
					.css("margin-top", (data.d == 0 ? data.y * 50 - this.wallThickness / 2 : data.d == 2 ? data.y * 50 + (50 - this.wallThickness / 2) : data.y * 50) + "px")
					.css("width", (data.d == 0 || data.d == 2 ? 50 : this.wallThickness) + "px")
					.css("height", (data.d == 1 || data.d == 3 ? 50 : this.wallThickness) + "px")
					.prop('title', `x${data.x} y${data.y} d${data.d}`);
				}
				data.t = data.t || 1;
				this.gamedata.collisions.walls["x" + data.x + "y" + data.y + "d" + data.d] = data.t;
			break;
		}

		if (target && _el) {
			target.append(_el);
		}

	};

	animate(a, frame) {

		// Update the DOM with new gamedata movements and smooth things out

		frame = frame % 10;

		if(frame == 0){ frame = 10; }

		for(let i = 0, al = a.length; i < al; i++){

			if (!a[i] || !a[i].obj || !a[i].obj.css) { continue; }

			a[i].obj
			.css("margin-left", a[i].x * 50 + (a[i].d == 1 ? frame * 5 : a[i].d == 3 ? - frame * 5 : 0) + "px")
			.css("margin-top", a[i].y * 50 + (a[i].d == 0 ? - frame * 5 : a[i].d == 2 ? frame * 5 : 0) + "px");

		}

	};

	detectCollisions() {

		for(let i in this.gamedata.collisions.mice){

			if(this.gamedata.collisions.cats[i]){

				console.log("wip");

			}

		}

	};

	move(a, friendlyName) {

		// Move gamedata, but don't animate them.

		let checkCollidibleWalls = (x, y, d) => {

			// Checks for walls directly in front of us.
			// Given 2,2,0 it will check 2,2,0 and 2,1,2 for example.

			if (this.gamedata.collisions.walls['x' + x + 'y' + y + 'd' + d]) {
				return true;
			}

			let nextX = x + (d == 1 ? 1 : d == 3 ? -1 : 0);
			let nextY = y + (d == 0 ? -1 : d == 2 ? 1 : 0);
			let nextD = this.directions.opp[d];

			if (this.gamedata.collisions.walls['x' + nextX + 'y' + nextY + 'd' + nextD]) {
				return true;
			}

		};

		let updateDirection = (x, y, d) => {

			// Check if there is a wall directly in front of us (check the current grid square, and the grid square ahead of us)
			if (checkCollidibleWalls(x, y, d)){
				let checkd = this.directions.check[d];
				let hits = 0;
				// Find out how many walls we will hit
				for(let i = 0, checkdl = checkd.length; i < checkdl; i++) {
					if (checkCollidibleWalls(x, y, checkd[i])) {
						hits++;
					}
					else { break; }
				}
				// Return the new direction based on the number of walls we hit
				return this.directions.hits[d][hits];
			}
			return d;

		};

		this.gamedata.collisions[friendlyName] = {};

		for(let i = 0, al = a.length; i < al; i++){

			// Update coordinate
			a[i].x += (a[i].d == 1 ? 1 : a[i].d == 3 ? -1 : 0);
			a[i].y += (a[i].d == 0 ? -1 : a[i].d == 2 ? 1 : 0);

			// Update direction
			a[i].d = updateDirection(a[i].x, a[i].y, a[i].d);

			// Update collisions
			this.gamedata.collisions[friendlyName]["x" + a[i].x + "y" + a[i].y] = a[i];

			// Detect hole collision
			if(this.gamedata.collisions.holes['x' + a[i].x + 'y' + a[i].y]){ this.gamedata.events[friendlyName].holes(a); }

			// Detect goal collision
			if(this.gamedata.collisions.goals['x' + a[i].x + 'y' + a[i].y]){ this.gamedata.events[friendlyName].goals(a); }

			//console.log('Collision data: ', JSON.stringify(this.gamedata.collisions));

		}

	};

	play() {

		//console.log('this.gamedata.active: ', this.gamedata.active);

		if(this.state == 0 || this.state == 2){ return false; }

		this.frame.master++;

		//console.log(this.frame.master);

		// Animate mice
		if(this.frame.master % 2 == 0){
			this.frame.mice++;
			this.animate(this.gamedata.active.mice, this.frame.mice);
		}
		// Animate cats
		if(this.frame.master % 3 == 0){
			this.frame.cats++;
			this.animate(this.gamedata.active.cats, this.frame.cats);
		}

		// Move mice
		if(this.frame.master % 20 == 0){
			this.move(this.gamedata.active.mice, 'mice');
			this.detectCollisions();
		}
		// Move cats
		if(this.frame.master % 30 == 0){
			this.move(this.gamedata.active.cats, 'cats');
			this.detectCollisions();
		}

	};

	pause() {

		this.state = 0;

	};

	processCollision(a, friendlyName, type) {

	};

	start() {

		if (!this.state) {

			let animloop = () => {
				requestAnimFrame(animloop);
				this.play();
			};
			animloop();

		}

		this.state = 1;

	};

	stop(status) {

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

	let test = new CCRGame();
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
				{x: 2, y: 0, d: 1},
				{x: 11, y: 3, d: 3}
			],
			walls: [
				{x: 0, y: 0, d: 2},
				{x: 2, y: 1, d: 1},
				{x: 2, y: 4, d: 2},
				{x: 1, y: 4, d: 3},
				{x: 11, y: 6, d: 2},
				{x: 2, y: 6, d: 3},
				{x: 2, y: 5, d: 1},
				{x: 2, y: 5, d: 3},
				{x: 5, y: 0, d: 1},
				{x: 4, y: 8, d: 3},
				{x: 4, y: 2, d: 0},
				{x: 2, y: 7, d: 2},
				{x: 8, y: 2, d: 1},
				{x: 8, y: 7, d: 2},
				{x: 6, y: 7, d: 3},
				{x: 6, y: 4, d: 0}
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
		test.appendTo("#game");
		Session.set('gameIsReady', true);

	}

}