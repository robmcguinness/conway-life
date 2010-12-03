var tzp = tzp || {};

tzp.life = function() {
		
	var grid = {
			numCellsX: 0,
			numCellY: 0,
			visual : {}, // reference to cells, each cell has reference to an organism
			currentGeneration : {}, // reference to live or dead cell, true = live, false = dead
			futureGeneration : {}
	};
	
	var canvas = {
			jCanvas: null,
			width: 0,
			height: 0
	};
	
	var options = {
		debug : true,
		canvasId: "myCanvas",
		animation : "elastic",
		cell : {
			size: 40,
			strokeColor:  "#23819C",
			fillColor: "#DBF0F7",
			hoverColor: "#FFFFAA",
			opacity: 0.5,
			radius : 5
		},
		organism : {
			fill:'#FF0000',
			opacity:0.2
		}
	};
	
	var paper;
	
	var init = function() {
		canvas.jCanvas = $("#"+options.canvasId);	
		bindControls();
		updateGridDimensions();		
		paper = Raphael(options.canvasId, canvas.width, canvas.height);
		drawGrid();
	};
	
	var bindControls = function() {
		$('#next').click(function() {
			simulateLife();
		});
		$("#clear").click(function() {
			clearLife();
		});
	};
	
	/**
	 * 1. Get canvas width height
	 * 2. Calculate number of cells in grid
	 * 3. Initialize grid
	 */
	var updateGridDimensions = function() {
		canvas.width = canvas.jCanvas.width();
		canvas.height = canvas.jCanvas.height();
		
		grid.numCellsX = Math.floor(canvas.width / options.cell.size);
		grid.numCellsY = Math.floor(canvas.height / options.cell.size);
		
		
		grid.visual = matrix(grid.numCellsY, grid.numCellsX, null);
		grid.currentGeneration = matrix(grid.numCellsY, grid.numCellsX, false);
		grid.futureGeneration = matrix(grid.numCellsY, grid.numCellsX, false);
		
	};
	
	var drawGrid = function() {
		var xPixel = 0;
		var yPixel = 0;
		
		for(var y = 0; y < grid.numCellsY; y++) {
    		for(var x = 0; x < grid.numCellsX; x++) {
    			
    			var _cell = drawCell(y, x, yPixel, xPixel);
    			drawOrganism(_cell, y, x);
    			xPixel+=options.cell.size;
    		}
    		xPixel = 0;
    		yPixel+=options.cell.size;
    	};
	};
	
	var drawCell = function(y, x, yPixel, xPixel) {
		var _cell = paper.rect(xPixel, yPixel, options.cell.size, options.cell.size, options.cell.radius).attr({
			fill: options.cell.fillColor,
			stroke: options.cell.strokeColor,
			opacity: options.cell.opacity
		});
		
		// custom Raphael attributes
		_cell._x = x;
		_cell._y = y;
		
		_cell.mouseover(function (event) {
		    this.attr({fill: options.cell.hoverColor});
		});
		_cell.mouseout(function(event) {
			this.attr({fill: options.cell.fillColor});
		});
		_cell.click(function(event) {
			if(grid.currentGeneration[this._y][this._x]) {
				// live
				hideOrganism(this._organism);								
			}else {
				// dead
				showOrganism(this._organism);
			}
			grid.currentGeneration[this._y][this._x] = !(grid.currentGeneration[this._y][this._x]);
		
		});
 
		grid.visual[y][x] = _cell; // add cell to visual grid
		grid.visual[y][x]._organism = drawOrganism(_cell, y, x); // init organism reference to cell
		
		return _cell;
	};
	
	var drawOrganism = function(_cell, y, x) {
		var box = _cell.getBBox();
		var _r = box.width/2;
		var _x = box.x + _r;
		var _y = box.y + _r;
		
		var _organism = paper.circle(_x, _y, 0).attr( {
			fill: options.organism.fill,
			opacity: options.organism.opacity
		});
		
		_organism._x = x;
		_organism._y = y;
		_organism.click(function(event) {
			hideOrganism(this);
			grid.currentGeneration[this._y][this._x] = false;
		});
		
		_organism.hide();
		
		return _organism; 
	};		
	
	var hideOrganism = function(_organism) {
		if(grid.currentGeneration[_organism._y][_organism._x]) {
			_organism.animate({
				r: 0,
				callback: function(event){
					this.hide();
				}
			}, 500, options.animation);
		}
	};
	
	var showOrganism = function(_organism) {
		if(!grid.currentGeneration[_organism._y][_organism._x]) {
			_organism.show();
			_organism.animate({r: options.cell.size/2}, 500, options.animation);
		}
	};
	
	/**
	 * 1. calculate future generation
	 * 2. update current generation visual
	 * 3. copy future generation to current generation
	 * 
	 */
	var simulateLife = function() {
		for(var y = 0; y < grid.numCellsY; y++) {
			for(var x = 0; x < grid.numCellsX; x++) {
				var total = calculateNeighbors(y, x);
				var alive = applyLifeRules(grid.currentGeneration[y][x], total, y, x);
				grid.futureGeneration[y][x] = alive;
				
				alive ? showOrganism(grid.visual[y][x]._organism) : hideOrganism(grid.visual[y][x]._organism);
				
			}
		}
		
		// copy future into current generation
		for(var y = 0; y < grid.numCellsY; y++) {
			for(var x = 0; x < grid.numCellsX; x++) {
				grid.currentGeneration[y][x] = grid.futureGeneration[y][x];
			}
		}
		
	};
	
	var calculateNeighbors = function(y, x) {
		var total = 0;
		
		for (var v = -1; v <= +1; v++) { // vertical direction
            for (var h = -1; h <= +1; h++) { // horizontal direction
            	var offsetY = (grid.numCellsY + (y + v)) % grid.numCellsY;
            	var offsetX = (grid.numCellsX + (x + h)) % grid.numCellsX;
            	
            	if(offsetX == x && offsetY == y) {
            		// ignore self organism
            		continue;
            	}
            	
                if (grid.currentGeneration[offsetY][offsetX]) {
                    total++;
                }
            }
        }
		return total;
	};
	
	/*
	 * Returns true if alive after life rules applied, false otherwise
	 * 
	 * 1. Any live cell with fewer than two live neighbors dies, as if caused by under-population.
	 * 2. Any live cell with more than three live neighbors dies, as if by overcrowding.
	 * 3. Any live cell with two or three live neighbors lives on to the next generation.
	 * 4. Any dead cell with exactly three live neighbors becomes a live cell, as if by reproduction.
	 */
	var applyLifeRules = function(alive, total, y, x) {
		if(total < 2 && alive)
			return false;
		else if(total > 3 && alive)
			return false;
		else if ((total === 2 || total ===3) && alive)
			return true;
		else if(!alive && total === 3)
			return true;
		
		return false;
		
	};
	
	var clearLife = function() {
		debugger;
		for(var y = 0; y < grid.numCellsY; y++) {
    		for(var x = 0; x < grid.numCellsX; x++) {
    			hideOrganism(grid.visual[y][x]._organism);
    			grid.currentGeneration[y][x] = false;
    			grid.futureGeneration[y][x] = false;
    			
    		}
    	}
	};
	
	// http://books.google.com/books?id=PXa2bby0oQ0C&pg=PA63&lpg=PA63&dq=javascript+good+parts+Array.visualMatrix&source=bl&ots=HHtpm5u6eE&sig=NLrhkdpg3oA2UUiOva1JRyH-vSQ&hl=en&ei=fI_HTIC8KYbGlQfA9uW7AQ&sa=X&oi=book_result&ct=result&resnum=2&ved=0CBcQ6AEwAQ#v=onepage&q&f=false
	var matrix = function (m, n, initial) {
		var a, i, j, mat = [];
		for (i = 0; i < m; i += 1) {
			a = [];
			for (j = 0; j < n; j += 1) {
				a[j] = initial;
			}
			mat[i] = a;
		}
		return mat;
    };
    
    /**
     * for debug purposes
     */
    var printCurrentGeneration = function(){
    	var row ="";
    	for(var y = 0; y < grid.numCellsY; y++) {
    		row = "";
    		for(var x = 0; x < grid.numCellsX; x++) {
    			row += grid.currentGeneration[y][x] + " ";
    		}
    		console.log(row);
    	}
    	console.log("\n");
    };
    
    /**
     * for debug purposes
     */
    var printFutureGeneration = function(){
    	var row ="";
    	for(var y = 0; y < grid.numCellsY; y++) {
    		row = "";
    		for(var x = 0; x < grid.numCellsX; x++) {
    			row += grid.futureGeneration[y][x] + " ";
    		}
    		console.log(row);
    	}
    	console.log("\n");
    };
    
	return {
		init : init
	};
	
}();

$(document).ready(function() {
	tzp.life.init();
});