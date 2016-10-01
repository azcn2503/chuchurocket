class CCRGame {

	constructor() {
		this.gamedata = {};
		this.initData = {};

		this.directions = {
			// Directions are: 0 = Up, 1 = Right, 2 = Down, 3 = Left, -1 = None (stationary)
			// Next directions
			//  { current_direction: next_direction }
			next: {0: 1, 1: 2, 2: 3, 3: 0},
			// Opposite directions
			//  { current_direction: opposite_direction }
			opp: {0: 2, 1: 3, 2: 0, 3: 1},
			// Previous directions
			//  { current_direction: previous_direction }
			prev: {0: 3, 1: 0, 2: 1, 3: 2}
		};

		// Generate check and hits directions
		this.directions.check = {};
		this.directions.hits = {};
		for (let i = 0; i < 4; i += 1) {
            this.directions.check[i] = [ i, this.directions.next[i], this.directions.prev[i], this.directions.opp[i] ];
            this.directions.hits[i] = { 1: this.directions.next[i], 2: this.directions.prev[i], 3: this.directions.opp[i], 4: -1 };
        }

		this.settings = {};
		this.AddGameSetting('wallThickness', 5);
		this.AddGameSetting('animationDelay', 16);
		this.AddGameSetting('catMoveInterval', 30);
		this.AddGameSetting('catAnimationFrames', 8);
		this.AddGameSetting('mouseMoveInterval', 20);
		this.AddGameSetting('mouseAnimationFrames', 12);
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
				cat: [],
				goal: [],
				hole: [],
				mouse: [],
				wall: []
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

		const placeholderCollisionEvent = (message) => {
			console.log(`GAME SHOULD END NOW: ${message}`);
		};

		// Set up some default collision events
		this.AddCollisionEvent('cat', 'hole', () => { console.log('Laugh at silly cat!'); });
		this.AddCollisionEvent('cat', 'goal', () => { placeholderCollisionEvent('You is fail'); });
		this.AddCollisionEvent('cat', 'mouse', () => { placeholderCollisionEvent('The cat ate the mouse'); });
		this.AddCollisionEvent('mouse', 'cat', () => { placeholderCollisionEvent('The mouse went in to the cat'); });
		this.AddCollisionEvent('mouse', 'hole', () => { placeholderCollisionEvent('Poor little mouse'); });
		this.AddCollisionEvent('mouse', 'goal', () => { console.log('You are win'); });

		this.frame = {
			master: 0,
			cat: 0,
			mouse: 0
		};

		this.SetState('stopped');
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
					this.AddItem("wall", {x: i, y: j, d: 0, t: 1}, _wall_wrapper);
				}
				if(!this.gamedata.grid.data["x" + i + "y" + (j+1)]){ // No grid square below
					this.AddItem("wall", {x: i, y: j, d: 2, t: 1}, _wall_wrapper);
				}
				if(!this.gamedata.grid.data["x" + (i+1) + "y" + (j)]){ // No grid square to right
					this.AddItem("wall", {x: i, y: j, d: 1, t: 1}, _wall_wrapper);
				}
				if(!this.gamedata.grid.data["x" + (i-1) + "y" + (j)]){ // No grid square to left
					this.AddItem("wall", {x: i, y: j, d: 3, t: 1}, _wall_wrapper);
				}
			}
		}

		const items = [
			{ container: _grid_wrapper, type: 'cat' },
			{ container: _grid_wrapper, type: 'goal' },
			{ container: _grid_wrapper, type: 'hole' },
			{ container: _grid_wrapper, type: 'mouse' },
			{ container: _wall_wrapper, type: 'wall' }
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

	PositionItem (el, data, xMod = 0, yMod = 0) {
		// Position an item according to its x, y and d properties
		el.css('margin-left', `${(data.x * 50) + xMod}px`).css('margin-top', `${(data.y * 50) + yMod}px`);
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
			case 'cat':
				if (target) {
					_el.prop('class', `cat sprite dir${data.d} frame0`)
					.css("width", "50px")
					.css("height", "50px");
				}
				this.AddGameData(type, { x: data.x, y: data.y, d: data.d, obj: _el }, ['x', 'y', 'd']);
			break;
			case 'hole':
				if (target) {
					_el.prop('class', 'hole')
					.css("width", "50px")
					.css("height", "50px");
				}
				this.AddGameData(type, {x: data.x, y: data.y, obj: _el});
				//this.gamedata.collisions.hole['x' + data.x + 'y' + data.y] = 1;
			break;
			case 'goal':
				if (target) {
					_el.prop('class', 'goal')
					.css("width", "50px")
					.css("height", "50px");
				}
				this.AddGameData(type, {x: data.x, y: data.y, obj: _el});
				//this.gamedata.collisions.goal['x' + data.x + 'y' + data.y] = 1;
			break;
			case 'grid':
				if (target) {
					_el.prop('class', 'grid')
					.css("width", "50px")
					.css("height", "50px")
					.addClass((data.x + data.y) % 2 == 0 ? "col1" : "col2")
					.html(`<span>${data.x}x${data.y}</span>`)
					.on('click', null, data, (e) => {
						this.PlaceArrow(e.data);
					});
				}
				this.gamedata.grid.data["x" + data.x + "y" + data.y] = 1;
			break;
			case 'mouse':
				if (target) {
					_el.prop('class', `mouse sprite dir${data.d} frame0`)
					.css("width", "50px")
					.css("height", "50px");
				}
				this.AddGameData(type, {x: data.x, y: data.y, d: data.d, obj: _el }, ['x', 'y', 'd']);
			break;
			case 'wall':
				if (target) {
					_el.prop('class', 'wall')
					.css("margin-left", (data.d == 1 ? data.x * 50 + (50 - this.settings.wallThickness / 2) : data.d == 3 ? data.x * 50 - this.settings.wallThickness / 2 : data.x * 50) + "px")
					.css("margin-top", (data.d == 0 ? data.y * 50 - this.settings.wallThickness / 2 : data.d == 2 ? data.y * 50 + (50 - this.settings.wallThickness / 2) : data.y * 50) + "px")
					.css("width", (data.d == 0 || data.d == 2 ? 50 : this.settings.wallThickness) + "px")
					.css("height", (data.d == 1 || data.d == 3 ? 50 : this.settings.wallThickness) + "px")
					.prop('title', `x${data.x} y${data.y} d${data.d}`);
				}
				data.t = data.t || 1;
				this.gamedata.collisions.wall["x" + data.x + "y" + data.y + "d" + data.d] = data.t;
			break;
		}

		if (target && _el) {
			target.append(_el);
		}
	}

	PlaceArrow (data) {

		this.gamedata.arrows.placed[`x${data.x}y${data.y}`] = 0;

	}

	Animate (a, frame, spriteFrame = 0) {
		// Update the DOM with new gamedata movements and smooth things out
		let useFrame = frame % 10;
		let i = 0;
		let al = a.length;
		for (i = 0; i < al; i++){
			if (!a[i] || !a[i].obj || !a[i].obj.css) { continue; }
			const xMod = a[i].d == 1 ? -50 + (useFrame * 5) : a[i].d == 3 ? 50 - (useFrame * 5) : 0;
			const yMod = a[i].d == 0 ? 50 - (useFrame * 5) : a[i].d == 2 ? -50 + (useFrame * 5) : 0;
			this.PositionItem(a[i].obj, a[i], xMod, yMod);
			a[i].obj.removeClass((i, css) => {
				if (!/frame[0-9]+/.test(css)) { return; }
				return css.match(/frame[0-9]+/)[0];
			})
			.removeClass((i, css) => {
				if (!/dir[0-9]/.test(css)) { return; }
				return css.match(/dir[0-9]+/)[0];
			})
			.addClass(`dir${a[i].d} frame${spriteFrame}`);
		}
	}

	DetectCollisions (type1, type2) {
		let obj1 = this.gamedata.collisions[type1];
		let obj2 = this.gamedata.collisions[type2];
		if (typeof(obj1) === 'undefined' || typeof(obj2) === 'undefined') { return false; }
		for (let i in obj1){
			if (obj2.hasOwnProperty(i)){
				//console.log(obj1[i], obj2[i]);
				//console.log(`Collision occurred at: ${obj1[i].x}x${obj1[i].y}, between ${obj1[i].obj[0].className} and ${obj2[i].obj[0].className}`);
				console.log(`Collision detected: ${type1} -> ${type2}`);
				if (!this.gamedata.collisionEvents[type1][type2]) { continue; }
				this.gamedata.collisionEvents[type1][type2](obj1, obj2);
			}
		}
	}

	CheckCollidibleWalls (x, y, d) {
		// Checks for wall directly in front of us.
		// Given 2,2,0 it will check 2,2,0 and 2,1,2 for example.
		if (this.gamedata.collisions.wall['x' + x + 'y' + y + 'd' + d]) {
			return true;
		}
		const nextX = x + (d == 1 ? 1 : d == 3 ? -1 : 0);
		const nextY = y + (d == 0 ? -1 : d == 2 ? 1 : 0);
		const nextD = this.directions.opp[d];
		if (this.gamedata.collisions.wall['x' + nextX + 'y' + nextY + 'd' + nextD]) {
			return true;
		}
		return false;
	}

	UpdateDirection (x, y, d) {
		// Check if there is an arrow here
		const checkArrow = this.gamedata.arrows.placed[`x${x}y${y}`];
		if (typeof(checkArrow) !== 'undefined') {
			return checkArrow;
		}
		// Check if there is a wall directly in front of us (check the current grid square, and the grid square ahead of us)
		if (this.CheckCollidibleWalls(x, y, d)){
			const checkd = this.directions.check[d];
			const checkdl = checkd.length;
			let hits = 0;
			let i = 0;
			// Find out how many wall we will hit
			for (i = 0; i < checkdl; i++) {
				if (this.CheckCollidibleWalls(x, y, checkd[i])) {
					hits++;
				}
				else { break; }
			}
			// Return the new direction based on the number of wall we hit
			return this.directions.hits[d][hits];
		}
		return d;
	}

	Move (a, type) {
		// Move gamedata, but don't animate them.

		this.gamedata.collisions[type] = {};

		for (let i = 0, al = a.length; i < al; i++){

			// Update direction
			a[i].d = this.UpdateDirection(a[i].x, a[i].y, a[i].d);

			// Update coordinate
			a[i].x += (a[i].d == 1 ? 1 : a[i].d == 3 ? -1 : 0);
			a[i].y += (a[i].d == 0 ? -1 : a[i].d == 2 ? 1 : 0);

			// Update collisions
			this.gamedata.collisions[type]["x" + a[i].x + "y" + a[i].y] = a[i];

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
		this.Animate(a);
	}

	Play () {

		//console.log(`frame: ${this.frame.master}`);

		// Move mouse
		if (this.frame.master % this.settings.mouseMoveInterval == 0){
			this.Move(this.gamedata.items.mouse, 'mouse');
			this.DetectCollisions('mouse', 'cat');
			this.DetectCollisions('mouse', 'hole');
			this.DetectCollisions('mouse', 'goal');
		}
		// Move cat
		if (this.frame.master % this.settings.catMoveInterval == 0){
			console.log(`Moving cat`);
			this.Move(this.gamedata.items.cat, 'cat');
			//this.DetectCollisions('cat', 'mouse');
			this.DetectCollisions('cat', 'hole');
			this.DetectCollisions('cat', 'goal');
		}

		// Animate mouse
		if(this.frame.master % (this.settings.mouseMoveInterval / 10) == 0){
			this.Animate(this.gamedata.items.mouse, this.frame.mouse, this.frame.mouse % this.settings.mouseAnimationFrames);
			this.frame.mouse++;
		}
		// Animate cat
		if(this.frame.master % (this.settings.catMoveInterval / 10) == 0){
			this.Animate(this.gamedata.items.cat, this.frame.cat, this.frame.cat % this.settings.catAnimationFrames);
			this.frame.cat++;
		}

		this.frame.master++;

		requestAnimationFrame( () => {
			if (this.state == 'started') {
				this.Play();
			}
		});
	}

	Pause () {
		this.SetState('paused');
	}

	Start () {
		console.log(this.gamedata);
		if (this.state == 'stopped' || this.state == 'paused') {
			this.settings.animationDelay = 16;
			this.Play();
		}
		if (this.state == 'started') {
			this.Dash();
		}
		this.SetState('started');
	}

	Dash () {
		this.settings.animationDelay = 6;
	}

	Stop (preventReset = false) {
		if (this.state == 'stopped' && !preventReset) {
			this.Reset();
		}

		this.SetState('stopped');
	}

	Reset () {
		this.ResetItems(this.gamedata.items.mouse);
		this.ResetItems(this.gamedata.items.cat);
		this.frame.master = 0;
		this.frame.cat = 0;
		this.frame.mouse = 0;
	}

	SetState (state) {

		this.state = state;
		Session.set('gameState', state);

	}

};

if (Meteor.isClient) {

	Session.set('gameIsReady', false);

	function ce(s){
		return $(document.createElement(s));
	}

	let test = new CCRGame();
	test.Init( {
		target: '#game',
		arrows: {
			available: { 0: 1 }
		},
		cat: [
			{ x: 0, y: 1, d: 1 },
		],
		mouse: [
			{ x: 0, y: 0, d: 1 },
			{ x: 1, y: 0, d: 1 },
			{ x: 2, y: 0, d: 1 },
			{ x: 3, y: 0, d: 1 },
			{ x: 4, y: 0, d: 1 },
			{ x: 5, y: 0, d: 1 },
			{ x: 6, y: 0, d: 1 },
			{ x: 7, y: 0, d: 1 },
			{ x: 8, y: 0, d: 1 },
			{ x: 9, y: 0, d: 1 },
			{ x: 10, y: 0, d: 1 },
			{ x: 11, y: 0, d: 1 },
			{ x: 1, y: 1, d: 1 },
			{ x: 2, y: 1, d: 1 },
			{ x: 3, y: 1, d: 1 },
			{ x: 4, y: 1, d: 1 },
			{ x: 5, y: 1, d: 1 },
			{ x: 6, y: 1, d: 1 },
			{ x: 7, y: 1, d: 1 },
			{ x: 8, y: 1, d: 1 },
			{ x: 9, y: 1, d: 1 },
			{ x: 10, y: 1, d: 1 },
			{ x: 0, y: 2, d: 1 },
			{ x: 1, y: 2, d: 1 },
			{ x: 2, y: 2, d: 1 },
			{ x: 3, y: 2, d: 1 },
			{ x: 4, y: 2, d: 1 },
			{ x: 5, y: 2, d: 1 },
			{ x: 6, y: 2, d: 1 },
			{ x: 7, y: 2, d: 1 },
			{ x: 8, y: 2, d: 1 },
			{ x: 9, y: 2, d: 1 },
		],
		wall: [
			{ x: 1, y: 1, d: 2 },
			{ x: 11, y: 1, d: 1 },
			{ x: 2, y: 2, d: 2 },
			{ x: 9, y: 2, d: 1 },
			{ x: 4, y: 3, d: 2 },
			{ x: 5, y: 3, d: 2 },
			{ x: 6, y: 3, d: 2 },
			{ x: 5, y: 4, d: 2 },
			{ x: 6, y: 4, d: 2 },
			{ x: 7, y: 4, d: 2 },
			{ x: 2, y: 5, d: 1 },
			{ x: 8, y: 5, d: 2 },
			{ x: 1, y: 6, d: 1 },
			{ x: 9, y: 6, d: 2 },
			{ x: 0, y: 7, d: 1 },
			{ x: 10, y: 7, d: 2 },
		],
		goal: [
			{ x: 4, y: 4 },
			{ x: 5, y: 4 },
			{ x: 6, y: 4 },
			{ x: 7, y: 4 }
		]
	});

	Template.playback.helpers({
		'gameIsReady': () => {
			return Session.get('gameIsReady');
		},
		'playButtonValue': () => {
			let state = Session.get('gameState');
			if (state == 'stopped') { return 'Play'; }
			// if (state == 'started') { return 'Dash'; }
			return 'Play';
		},
		'stopButtonValue': () => {
			let state = Session.get('gameState');
			if (state == 'stopped') { return 'Reset'; }
			if (state == 'started') { return 'Stop'; }
		}
	});

	Template.playback.events({
		'click input[name=play]': (e) => {
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