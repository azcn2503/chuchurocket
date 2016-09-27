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

		this.settings = {};
		this.AddGameSetting('wallThickness', 5);
		this.AddGameSetting('animationDelay', 16);
		this.AddGameSetting('catsMoveInterval', 30);
		this.AddGameSetting('miceMoveInterval', 20);
	}

	AppendToTarget (target) {
		$(target).html('');
		$(target).append(this.gamedata.dom);
	}

	AddCollisionEvent (obj1, obj2, event) {
		this.gamedata.collisionEvents[obj1] = this.gamedata.collisionEvents[obj1] || {};
		this.gamedata.collisionEvents[obj1][obj2] = event || function() { console.log(`No collision event provided for ${obj1} -> ${obj2}`); };
	}

	AddGameSetting (name, value) {
		if (typeof(name) !== 'string') { return false; }
		this.settings[name] = value;
	}

	Init (gamedata) {
		if (!gamedata) { return false; }

		const createArrows = () => {
			let available = {};
			let placed = {};
			if (typeof(gamedata.arrows.available) === 'undefined') { gamedata.arrows.available = {}; }
			if (typeof(gamedata.arrows.placed) === 'undefined') { gamedata.arrows.placed = {}; }
			for (let i = 0; i < 4; i += 1) {
				available[i] = typeof(gamedata.arrows.available[i]) !== 'undefined' ? gamedata.arrows.available[i] : 0;
				placed[i] = typeof(gamedata.arrows.placed[i]) !== 'undefined' ? gamedata.arrows.placed[i] : [];
			}
			return { available, placed };
		};

		const createGrid = () => {
			return {
				data: {},
				x: 12,
				y: 9
			};
		};

		const createItems = () => {
			return {
				cats: [],
				goals: [],
				holes: [],
				mice: [],
				walls: []
			};
		};

		this.initData = gamedata;

		// Create the gamedata
		this.gamedata = {
			arrows: createArrows(),
			collisions: {},
			dom: null,
			collisionEvents: {},
			grid: createGrid(),
			items: createItems(),
		};

		// Set up some default collision events
		this.AddCollisionEvent('cat', 'hole', () => { console.log('Laugh at silly cat!'); });
		this.AddCollisionEvent('cat', 'goal', () => { console.log('You is fail'); });
		this.AddCollisionEvent('cat', 'mouse', () => { console.log('The cat ate the mouse'); });
		this.AddCollisionEvent('mouse', 'cat', () => { console.log('The mouse went in to the cat'); });
		this.AddCollisionEvent('mouse', 'hole', () => { console.log('Poor little mouse'); });
		this.AddCollisionEvent('mouse', 'hole', () => { console.log('You are win'); });

		this.frame = {
			master: 0,
			cats: 0,
			mice: 0
		};

		this.state = 'stopped';
	}

	InitDOM() {
		// Create wrapper
		const _ccr_wrapper = ce("div")
		.css("width", this.gamedata.grid.x * 50 + "px")
		.css("height", this.gamedata.grid.y * 50 + 50 + "px")
		.prop("class", "ccr_wrapper");

		// Create grid wrapper
		const _grid_wrapper = ce("div")
		.prop("class", "grid_wrapper");

		// Populate grid
		for (let i = 0; i < this.gamedata.grid.x; i ++){
			for (let j = 0; j < this.gamedata.grid.y; j ++){
				this.AddItem("grid", {x: i, y: j}, _grid_wrapper);
			}
		}

		// Create wall wrapper
		const _wall_wrapper = ce("div")
		.prop("class", "wall_wrapper");

		// Create wall boundaries
		for (let i = 0; i < this.gamedata.grid.x; i ++){
			for (let j = 0; j < this.gamedata.grid.y; j ++){
				if(!this.gamedata.grid.data["x" + i + "y" + (j-1)]){ // No grid square above
					this.AddItem("walls", {x: i, y: j, d: 0, t: 1}, _wall_wrapper);
				}
				if(!this.gamedata.grid.data["x" + i + "y" + (j+1)]){ // No grid square below
					this.AddItem("walls", {x: i, y: j, d: 2, t: 1}, _wall_wrapper);
				}
				if(!this.gamedata.grid.data["x" + (i+1) + "y" + (j)]){ // No grid square to right
					this.AddItem("walls", {x: i, y: j, d: 1, t: 1}, _wall_wrapper);
				}
				if(!this.gamedata.grid.data["x" + (i-1) + "y" + (j)]){ // No grid square to left
					this.AddItem("walls", {x: i, y: j, d: 3, t: 1}, _wall_wrapper);
				}
			}
		}

		const items = [
			{ container: _grid_wrapper, type: 'cats' },
			{ container: _grid_wrapper, type: 'goals' },
			{ container: _grid_wrapper, type: 'holes' },
			{ container: _grid_wrapper, type: 'mice' },
			{ container: _wall_wrapper, type: 'walls' }
		];

		for (let i in items) {
			for (let j in this.initData[items[i].type]) {
				this.AddItem(items[i].type, this.initData[items[i].type][j], items[i].container);
			}
		}

		// Create toolbar
		const _toolbar = ce("div")
		.prop("class", "toolbar")
		.css("margin-top", this.gamedata.grid.y * 50 + "px")
		.css("position", "absolute");

		// Create arrows
		const _arrows = ce("div");
		for (let i in this.gamedata.arrows.available){
			const _arrow = ce("div")
			.prop("class", "arrow")
			.addClass("dir" + i);
			const _label = ce("div")
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
		// this.gamedata.active = JSON.parse(JSON.stringify(this.gamedata.original));
		// console.log('this.gamedata.original: ', this.gamedata.original);
		// console.log('this.gamedata.active: ', this.gamedata.active);
		this.AppendToTarget(this.initData.target);
	}

	AddGameData(type, obj, originalProperties = null) {
		// Duplicate some properties from obj if originalProperties is populated
		if (typeof(originalProperties) === 'object') {
			obj.original = obj.original || {};
			for (let i in originalProperties) {
				obj.original[originalProperties[i]] = obj[originalProperties[i]];
			}
		}
		// Add the object to the gamedata items
		this.gamedata.items[type].push(obj);
		// Add the object to the collisions object using its coordinates as the key (fast lookup)
		this.gamedata.collisions[type][`x${obj.x}y${obj.y}`] = obj;
	}

	PositionItem (el, data) {
		// Position an item according to its x, y and d properties
		el.css('margin-left', `${data.x * 50}px`).css('margin-top', `${data.y * 50}px`);
		return true;
	}

	AddItem (type, data, target) {
		let _el = null;

		if (target) {
			// Create an element only if a target is specified
			// this lets us run the game headless if omitted
			_el = ce("div")
			.css("position", "absolute");
			this.PositionItem(_el, data);
		}

		// Create a collisions object for this type if it doesn't exist
		this.gamedata.collisions[type] = this.gamedata.collisions[type] || {};

		switch (type) {
			case 'cats':
				if (target) {
					_el.prop('class', 'cat')
					.css("width", "50px")
					.css("height", "50px");
				}
				this.AddGameData(type, { x: data.x, y: data.y, d: data.d, obj: _el }, ['x', 'y', 'd']);
			break;
			case 'holes':
				if (target) {
					_el.prop('class', 'hole')
					.css("width", "50px")
					.css("height", "50px");
				}
				this.AddGameData(type, {x: data.x, y: data.y, obj: _el});
				//this.gamedata.collisions.holes['x' + data.x + 'y' + data.y] = 1;
			break;
			case 'goals':
				if (target) {
					_el.prop('class', 'goal')
					.css("width", "50px")
					.css("height", "50px");
				}
				this.AddGameData(type, {x: data.x, y: data.y, obj: _el});
				//this.gamedata.collisions.goals['x' + data.x + 'y' + data.y] = 1;
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
				this.AddGameData(type, {x: data.x, y: data.y, d: data.d, obj: _el }, ['x', 'y', 'd']);
			break;
			case 'walls':
				if (target) {
					_el.prop('class', 'wall')
					.css("margin-left", (data.d == 1 ? data.x * 50 + (50 - this.settings.wallThickness / 2) : data.d == 3 ? data.x * 50 - this.settings.wallThickness / 2 : data.x * 50) + "px")
					.css("margin-top", (data.d == 0 ? data.y * 50 - this.settings.wallThickness / 2 : data.d == 2 ? data.y * 50 + (50 - this.settings.wallThickness / 2) : data.y * 50) + "px")
					.css("width", (data.d == 0 || data.d == 2 ? 50 : this.settings.wallThickness) + "px")
					.css("height", (data.d == 1 || data.d == 3 ? 50 : this.settings.wallThickness) + "px")
					.prop('title', `x${data.x} y${data.y} d${data.d}`);
				}
				data.t = data.t || 1;
				this.gamedata.collisions.walls["x" + data.x + "y" + data.y + "d" + data.d] = data.t;
			break;
		}

		if (target && _el) {
			target.append(_el);
		}
	}

	Animate (a, frame) {
		// Update the DOM with new gamedata movements and smooth things out
		frame = frame % 10;
		if (frame == 0){ frame = 10; }
		let i = 0;
		let al = a.length;
		for (i = 0; i < al; i++){
			if (!a[i] || !a[i].obj || !a[i].obj.css) { continue; }
			// TODO: Make this use PositionItem somehow to reuse that code
			a[i].obj
			.css("margin-left", a[i].x * 50 + (a[i].d == 1 ? frame * 5 : a[i].d == 3 ? - frame * 5 : 0) + "px")
			.css("margin-top", a[i].y * 50 + (a[i].d == 0 ? - frame * 5 : a[i].d == 2 ? frame * 5 : 0) + "px");
		}
	}

	DetectCollisions (obj1, obj2) {
		for (let i in obj1){
			if (obj2.hasOwnProperty(i)){
				//console.log(obj1[i], obj2[i]);
				//console.log(`Collision occurred at: ${obj1[i].x}x${obj1[i].y}, between ${obj1[i].obj[0].className} and ${obj2[i].obj[0].className}`);
				const class1 = obj1[i].obj[0].className;
				const class2 = obj2[i].obj[0].className;
				console.log(`Collision detected: ${class1} -> ${class2}`);
				if (!this.gamedata.collisionEvents.hasOwnProperty(class1)) {
					console.log(`No collision event for ${class1}`);
					continue;
				}
				if (!this.gamedata.collisionEvents[class1].hasOwnProperty(class2)) {
					console.log(`No collision event for ${class1}.${class2}`);
					continue;
				}
				this.gamedata.collisionEvents[class1][class2](obj1, obj2);
			}
		}
	}

	CheckCollidibleWalls (x, y, d) {
		// Checks for walls directly in front of us.
		// Given 2,2,0 it will check 2,2,0 and 2,1,2 for example.
		if (this.gamedata.collisions.walls['x' + x + 'y' + y + 'd' + d]) {
			return true;
		}
		const nextX = x + (d == 1 ? 1 : d == 3 ? -1 : 0);
		const nextY = y + (d == 0 ? -1 : d == 2 ? 1 : 0);
		const nextD = this.directions.opp[d];
		if (this.gamedata.collisions.walls['x' + nextX + 'y' + nextY + 'd' + nextD]) {
			return true;
		}
		return false;
	}

	UpdateDirection (x, y, d) {
		// Check if there is a wall directly in front of us (check the current grid square, and the grid square ahead of us)
		if (this.CheckCollidibleWalls(x, y, d)){
			const checkd = this.directions.check[d];
			const checkdl = checkd.length;
			let hits = 0;
			let i = 0;
			// Find out how many walls we will hit
			for (i = 0; i < checkdl; i++) {
				if (this.CheckCollidibleWalls(x, y, checkd[i])) {
					hits++;
				}
				else { break; }
			}
			// Return the new direction based on the number of walls we hit
			return this.directions.hits[d][hits];
		}
		return d;
	}

	Move (a, friendlyName) {
		// Move gamedata, but don't animate them.

		this.gamedata.collisions[friendlyName] = {};

		for (let i = 0, al = a.length; i < al; i++){

			// Update coordinate
			a[i].x += (a[i].d == 1 ? 1 : a[i].d == 3 ? -1 : 0);
			a[i].y += (a[i].d == 0 ? -1 : a[i].d == 2 ? 1 : 0);

			// Update direction
			a[i].d = this.UpdateDirection(a[i].x, a[i].y, a[i].d);

			// Update collisions
			this.gamedata.collisions[friendlyName]["x" + a[i].x + "y" + a[i].y] = a[i];

			//console.log('Collision data: ', JSON.stringify(this.gamedata.collisions));

		}
	}

	ResetItems (a) {
		// Reset game items to their original position if they have one
		for (let i in a) {
			if (!a[i].hasOwnProperty('original') || typeof(a[i].original) !== 'object' || !a[i].hasOwnProperty('obj')) { continue; }
			this.PositionItem(a[i].obj, a[i].original);
			for (let j in a[i].original) {
				if (!a[i].original.hasOwnProperty(j)) { continue; }
				a[i][j] = a[i].original[j];
			}
		}
	}

	Play () {
		this.frame.master++;

		// Animate mice
		if(this.frame.master % (this.settings.miceMoveInterval / 10) == 0){
			this.frame.mice++;
			this.Animate(this.gamedata.items.mice, this.frame.mice);
		}
		// Animate cats
		if(this.frame.master % (this.settings.catsMoveInterval / 10) == 0){
			this.frame.cats++;
			this.Animate(this.gamedata.items.cats, this.frame.cats);
		}

		// Move mice
		if(this.frame.master % this.settings.miceMoveInterval == 0){
			this.Move(this.gamedata.items.mice, 'mice');
			this.DetectCollisions(this.gamedata.collisions.mice, this.gamedata.collisions.cats);
			this.DetectCollisions(this.gamedata.collisions.mice, this.gamedata.collisions.holes);
			this.DetectCollisions(this.gamedata.collisions.mice, this.gamedata.collisions.goals);
		}
		// Move cats
		if(this.frame.master % this.settings.catsMoveInterval == 0){
			this.Move(this.gamedata.items.cats, 'cats');
			this.DetectCollisions(this.gamedata.collisions.cats, this.gamedata.collisions.mice);
			this.DetectCollisions(this.gamedata.collisions.cats, this.gamedata.collisions.holes);
			this.DetectCollisions(this.gamedata.collisions.cats, this.gamedata.collisions.goals);
		}

		setTimeout( () => {
			if (this.state == 'started') {
				this.Play();
			}
		}, this.animationDelay);
	}

	Pause () {
		this.state = 'paused';
	}

	Start () {
		console.log(this.gamedata);
		if (this.state == 'stopped' || this.state == 'paused') {
			this.animationDelay = 16;
			this.Play();
		}
		if (this.state == 'started') {
			this.Dash();
		}
		this.state = 'started';
	}

	Dash () {
		this.animationDelay = 6;
	}

	Stop (status) {
		if (this.state == 'stopped') {
			this.Reset();
		}

		this.state = 'stopped';
	}

	Reset () {
		this.ResetItems(this.gamedata.items.mice);
		this.ResetItems(this.gamedata.items.cats);
		this.frame.master = 0;
		this.frame.cats = 0;
		this.frame.mice = 0;
	}

};

if (Meteor.isClient) {

	Session.set('gameIsReady', false);

	function ce(s){
		return $(document.createElement(s));
	}

	let test = new CCRGame();
	test.Init(
		{
			target: '#game',
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
		'gameIsReady': () => {
			return Session.get('gameIsReady');
		}
	});

	Template.playback.events({
		'click input[name=play]': () => {
			test.Start();
		},
		'click input[name=stop]': () => {
			test.Stop();
		}
	});

	window.addEventListener('load', () => {
		test.InitDOM();
		Session.set('gameIsReady', true);
	});

}