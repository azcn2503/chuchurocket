class CCRGame {

	constructor() {
		this.gamedata = {};
		this.initData = {};
		this.cursor = {};
		this.queue = [];
		this.reactives = {
			arrows: {
				available: {}
			},
			state: new ReactiveVar('stopped'),
			score: new ReactiveVar(0),
			saved: new ReactiveVar(0),
			required: new ReactiveVar(0),
			message: new ReactiveVar({})
		};
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
				this.reactives.arrows.available[i] = new ReactiveVar(available[i]);
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
		this.AddCollisionEvent('cat', 'goal', () => { this.Stop('The cat went in to the rocket!', 'fail'); });
		this.AddCollisionEvent('cat', 'mouse', () => { this.Stop('The cat ate a mouse!', 'fail'); });
		this.AddCollisionEvent('mouse', 'cat', () => { this.Stop('The cat ate a mouse!', 'fail'); });
		this.AddCollisionEvent('mouse', 'hole', () => { this.Stop('A mouse fell in to a hole!', 'fail'); });
		this.AddCollisionEvent('mouse', 'goal', (obj1, obj2) => { this.SaveMouse(obj1); });

		this.frame = {
			master: 0,
			cat: 0,
			mouse: 0
		};

		this.SetState('stopped');
	}

	SaveMouse (data) {
		const mice = this.gamedata.items.mouse;
		for (let i in mice) {
			if (mice[i].x == data.x && mice[i].y == data.y && mice[i].d != -1) {
				console.log('Saved ' + i);
				mice[i].d = -1;
				this.reactives.saved.set(this.reactives.saved.get() + 1);
				if (this.reactives.saved.get() >= this.reactives.required.get()) {
					this.Stop('You completed the level!', 'success');
				}
			}
		}
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

		this.reactives.required.set(this.gamedata.items.mouse.length);
		console.log(this.reactives);

		_ccr_wrapper.append(_grid_wrapper);
		_ccr_wrapper.append(_wall_wrapper);
		this.gamedata.dom = _ccr_wrapper;

		this.AppendToTarget(this.initData.target);

		document.querySelector('body').addEventListener('mouseup', (e) => { this.HandleMouseUp(e); });
		document.querySelector('body').addEventListener('mousemove', (e) => { this.HandleMouseMove(e); });
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

	HandleMouseDown (e, type) {
		e.preventDefault();
		const data = e.data;
		this.cursor.down = this.GetMouseCoords(e);
		this.GetDirectionFromCursor();
		this.cursor.down.gridX = data.x;
		this.cursor.down.gridY = data.y;
		this.cursor.up = null;
		// Check if there are any arrows here, and remove them
		const checkArrow = this.gamedata.arrows.placed[`x${data.x}y${data.y}`];
		if (typeof(checkArrow) !== 'undefined') {
			this.RemoveArrow(checkArrow);
		}
		this.AddItem('dummyarrow', { x: data.x, y: data.y, health: 1 }, this.gamedata.dom);
	}

	HandleMouseUp (e) {
		this.RemoveItem('dummyarrow');
		this.cursor.up = this.GetMouseCoords(e);
		this.cursor.down = null;
		this.queue.forEach( (fn) => { fn(); } );
		this.queue = [];
	}

	QueueForMouseUp (fn) {
		this.queue.push(fn);
	}

	HandleMouseMove (e) {
		this.cursor.position = this.GetMouseCoords(e);
		this.GetDirectionFromCursor();
		let dummyArrow = this.gamedata.arrows.dummy;
		if (typeof(dummyArrow) !== 'undefined' && dummyArrow) {
			dummyArrow.removeClass( (i, css) => {
				if (!/dir[0-9]/.test(css)) { return; }
				return css.match(/dir[0-9]/)[0];
			})
			.addClass(`dir${this.cursor.dir}`);
		}
	}

	GetMouseCoords (e) {
	    e = e || window.event;
	    if (e.touches) {
	        return {
	            x: e.touches[0].pageX,
	            y: e.touches[0].pageY
	        };
	    } else {
	        return {
	            x: e.clientX - document.body.clientLeft,
	            y: e.clientY - document.body.clientTop
	        };
	    }
	}

	GetDirectionFromCursor () {
		if (!this.cursor.down) { return false; }
		let dir;
		const xMovement = this.cursor.position.x - this.cursor.down.x;
		const yMovement = this.cursor.position.y - this.cursor.down.y;
		const xCheck = xMovement < 0 ? -xMovement : xMovement;
		const yCheck = yMovement < 0 ? -yMovement : yMovement;
		if (xCheck < 5 && yCheck < 5) {
			this.cursor.dir = -1;
			return false;
		}
		if (xCheck > yCheck) {
			dir = xMovement > yMovement ? 1 : 3;
		} else {
			dir = xMovement > yMovement ? 0 : 2;
		}
		this.cursor.dir = dir;
		return dir;
	}

	PositionItem (el, data, xMod = 0, yMod = 0) {
		// Position an item according to its x, y and d properties
		el.css('margin-left', `${(data.x * 50) + xMod}px`).css('margin-top', `${(data.y * 50) + yMod}px`);
		return true;
	}

	AddItem (type, data, target) {
		if (this.state !== 'stopped') { return false; }
		let _el = null;

		if (target) {
			// Create an element only if a target is specified
			// this lets us run the game headless if omitted
			_el = ce("div")
			.css("position", "absolute");
			this.PositionItem(_el, data);
			_el.on('mousedown', null, data, (e) => { this.HandleMouseDown(e, type); });
		}

		// Create a collisions object for this type if it doesn't exist
		this.gamedata.collisions[type] = this.gamedata.collisions[type] || {};

		switch (type) {
			case 'dummyarrow':
				if (target) {
					_el.prop('class', `arrow health${data.health}`)
					.css('width', '50px')
					.css('height', '50px');
				}
				this.gamedata.arrows.dummy = _el;
			break;
			case 'arrow':
				if (target) {
					_el.prop('class', `arrow dir${data.d}`)
					.css('width', '50px')
					.css('height', '50px');
				}
				this.gamedata.arrows.placed[`x${data.x}y${data.y}`] = { x: data.x, y: data.y, d: data.d, obj: _el, health: 2 };
				// this.AddGameData(type, { x: data.x, y: data.y, d: data.d, obj: _el });
			break;
			case 'cat':
				if (target) {
					_el.prop('class', `cat sprite dir${data.d} frame0`)
					.css("width", "50px")
					.css("height", "50px")
					.on('mousedown', null, data, (e) => {
						this.QueueForMouseUp( () => {
							this.PlaceArrow(e.data);
						});
					});
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
					.on('mousedown', null, data, (e) => {
						this.QueueForMouseUp( () => {
							this.PlaceArrow(e.data);
						});
					});
				}
				this.gamedata.grid.data["x" + data.x + "y" + data.y] = 1;
			break;
			case 'mouse':
				if (target) {
					_el.prop('class', `mouse sprite dir${data.d} frame0`)
					.css("width", "50px")
					.css("height", "50px")
					.on('mousedown', null, data, (e) => {
						this.QueueForMouseUp( () => {
							this.PlaceArrow(e.data);
						});
					});
				}
				this.AddGameData(type, {x: data.x, y: data.y, d: data.d, obj: _el }, ['x', 'y', 'd']);
			break;
			case 'wall':
				if (target) {
					_el.prop('class', 'wall')
					//.css("margin-left", (data.d == 1 ? data.x * 50 + (50 - this.settings.wallThickness / 2) : data.d == 3 ? data.x * 50 - this.settings.wallThickness / 2 : data.x * 50) + "px")
					//.css("margin-top", (data.d == 0 ? data.y * 50 - this.settings.wallThickness / 2 : data.d == 2 ? data.y * 50 + (50 - this.settings.wallThickness / 2) : data.y * 50) + "px")
					.css("width", (data.d == 0 || data.d == 2 ? 50 + this.settings.wallThickness : this.settings.wallThickness) + "px")
					.css("height", (data.d == 1 || data.d == 3 ? 50 + this.settings.wallThickness : this.settings.wallThickness) + "px")
					.prop('title', `x${data.x} y${data.y} d${data.d}`);
					const xMod = data.d == 1 ? 50 - (this.settings.wallThickness / 2) : -this.settings.wallThickness / 2;
					const yMod = data.d == 2 ? 50 - (this.settings.wallThickness / 2) : -this.settings.wallThickness / 2;
					this.PositionItem(_el, data, xMod, yMod);
				}
				data.t = data.t || 1;
				this.gamedata.collisions.wall["x" + data.x + "y" + data.y + "d" + data.d] = data.t;
			break;
		}

		if (target && _el) {
			target.append(_el);
		}
	}

	RemoveItem (type, data) {
		let el;
		switch (type) {
			case 'dummyarrow':
				el = this.gamedata.arrows.dummy;
				if (typeof(el) == 'undefined' || !el) { return; }
				el.remove();
				this.gamedata.arrows.dummy = null;
			break;
			case 'arrow': 
				el = this.gamedata.arrows.placed[`x${data.x}y${data.y}`].obj;
				el.remove();
				delete(this.gamedata.arrows.placed[`x${data.x}y${data.y}`]);
				console.log('Removed');
			break;
		}
	}

	PlaceArrow (data) {
		if (this.state == 'started' || this.cursor.dir == -1) { return false; }
		if (this.gamedata.arrows.available[this.cursor.dir] <= 0) { return false; }
		this.AddItem('arrow', { x: data.x, y: data.y, d: this.cursor.dir }, this.gamedata.dom);
		this.gamedata.arrows.available[this.cursor.dir] -= 1;
		this.reactives.arrows.available[this.cursor.dir].set(this.gamedata.arrows.available[this.cursor.dir]);
	}

	RemoveArrow (data) {
		this.RemoveItem('arrow', data);
		this.gamedata.arrows.available[data.d] += 1;
		this.reactives.arrows.available[data.d].set(this.gamedata.arrows.available[data.d]);
	}

	DamageArrow (data, health) {
		// Damage an arrow, or set it to a specific health
		let thisArrow = this.gamedata.arrows.placed[`x${data.x}y${data.y}`];
		thisArrow.health = health || thisArrow.health - 1;
		if (thisArrow.health < 0) { return false; }
		thisArrow.obj.removeClass((i, css) => {
			if (!/health[0-9]+/.test(css)) { return; }
			return css.match(/health[0-9]/)[0];
		})
		.addClass(`health${thisArrow.health}`);
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
		if (typeof(obj1) === 'undefined' || typeof(obj2) === 'undefined' || obj1.d == -1 || obj2.d == -1) { return false; }
		for (let i in obj1){
			if (obj2.hasOwnProperty(i)){
				console.log(`Collision detected: ${type1} -> ${type2}`);
				if (!this.gamedata.collisionEvents[type1][type2]) { continue; }
				this.gamedata.collisionEvents[type1][type2](obj1[i], obj2[i]);
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
		if (typeof(checkArrow) !== 'undefined' && checkArrow.health > 0) {
			d = checkArrow.d;
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
			const origD = a[i].d;

			// Update direction
			a[i].d = this.UpdateDirection(a[i].x, a[i].y, a[i].d);

			// Damage arrows
			if (type == 'cat') {
				const checkArrow = this.gamedata.arrows.placed[`x${a[i].x}y${a[i].y}`];
				if (typeof(checkArrow) !== 'undefined' && checkArrow.d == this.directions.opp[origD]) {
					this.DamageArrow(a[i]);
				}
			}

			// Update coordinate
			a[i].x += (a[i].d == 1 ? 1 : a[i].d == 3 ? -1 : 0);
			a[i].y += (a[i].d == 0 ? -1 : a[i].d == 2 ? 1 : 0);

			// Update collisions
			this.gamedata.collisions[type]["x" + a[i].x + "y" + a[i].y] = a[i];
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

	ResetCollisions (a) {
		for (let i in a) {
			delete(a[i]);
		}
	}

	Play () {
		// Move mouse
		if (this.frame.master % this.settings.mouseMoveInterval == 0){
			this.Move(this.gamedata.items.mouse, 'mouse');
			this.DetectCollisions('mouse', 'cat');
			this.DetectCollisions('mouse', 'hole');
			this.DetectCollisions('mouse', 'goal');
		}
		// Move cat
		if (this.frame.master % this.settings.catMoveInterval == 0){
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

	Stop (message, status) {
		if (this.state == 'stopped') {
			this.Reset();
		}
		this.SetState('stopped');
		if (message) {
			this.reactives.message.set({
				message, status
			});
		}
	}

	Reset () {
		this.reactives.message.set({});
		this.ResetItems(this.gamedata.items.mouse);
		this.ResetItems(this.gamedata.items.cat);
		this.ResetCollisions(this.gamedata.collisions.mouse);
		this.ResetCollisions(this.gamedata.collisions.cat);
		this.frame.master = 0;
		this.frame.cat = 0;
		this.frame.mouse = 0;
		// Reset arrows to their unbroken state
		for (let i in this.gamedata.arrows.placed) {
			if (!this.gamedata.arrows.placed.hasOwnProperty(i)) { continue; }
			this.DamageArrow(this.gamedata.arrows.placed[i], 2);
		}
		this.reactives.saved.set(0);
		console.log(this);
	}

	SetState (state) {

		this.state = state;
		this.reactives.state.set(this.state);

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
			{ x: 10, y: 1, d: 1 },
			{ x: 2, y: 2, d: 2 },
			{ x: 9, y: 2, d: 1 },
			{ x: 4, y: 3, d: 2 },
			{ x: 5, y: 3, d: 2 },
			{ x: 6, y: 3, d: 2 },
			{ x: 8, y: 3, d: 1 },
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
			const state = test.reactives.state.get();
			if (state == 'stopped') { return 'Play'; }
			// if (state == 'started') { return 'Dash'; }
			return 'Play';
		},
		'stopButtonValue': () => {
			const state = test.reactives.state.get();
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

	Template.toolbar_arrows.helpers({
		'arrows': () => {
			return [ { dir: 0 }, { dir: 1 }, { dir: 2 }, { dir: 3 } ];
		},
		'unavailable': (n) => {
			return test.reactives.arrows.available[n].get() <= 0;
		},
		'availableCount': (n) => {
			return test.reactives.arrows.available[n].get();
		}
	});

	Template.score.helpers({
		'saved': () => {
			return test.reactives.saved.get();
		},
		'required': () => {
			return test.reactives.required.get();
		}
	});

	Template.message.helpers({
		'getClasses': () => {
			let classes = [];
			if (test.reactives.message.get().hasOwnProperty('message')) {
				classes.push('visible');
				if (test.reactives.message.get().hasOwnProperty('status')) {
					classes.push(`status-${test.reactives.message.get().status}`);
				}
				return classes.join(' ');
			}
			return classes;
		},
		'message': () => {
			return test.reactives.message.get().message;
		}
	});

	window.addEventListener('load', () => {
		test.InitDOM();
		Session.set('gameIsReady', true);
	});

}