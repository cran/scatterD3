(function() {

    // File-global variables
    var data;
    var margin, legend_width, width, height, total_width, total_height;
    var point_size, labels_size, point_opacity;
    var xlab, ylab, col_lab, symbol_lab, fixed;
    var color_legend, symbol_legend, has_legend, has_labels, has_tooltips, has_custom_tooltips;

    // First setup : initialization    
    function setup(obj, init) {
	
	// data
	data = obj.data;
	// text labels coordinates
	data.labx = data.x;
	data.laby = data.y;
	data = HTMLWidgets.dataframeToD3(data);

	// options
	labels_size = obj.settings.labels_size;
	point_size = obj.settings.point_size;
	point_opacity = obj.settings.point_opacity;
	fixed = obj.settings.fixed;
	has_color_legend = !(data[0].col_var === undefined);
	has_symbol_legend = !(data[0].symbol_var === undefined); 
	has_legend = has_color_legend || has_symbol_legend;
	has_labels = !(data[0].lab === undefined);
	has_tooltips = obj.settings.tooltips;
	has_custom_tooltips = !(data[0].tooltip_text === undefined);
	xlab = obj.settings.xlab;
	ylab = obj.settings.ylab;
	col_lab = obj.settings.col_lab;
	symbol_lab = obj.settings.symbol_lab;

	html_id = obj.settings.html_id;
	
	setup_size(init.width, init.height);
	
    }

    
    // Figure size    
    function setup_size(init_width, init_height) {

	margin = {top: 0, right: 10, bottom: 20, left: 20};
	legend_width = 0;
	if (has_legend) legend_width = 150;

	width = init_width - legend_width;
	height = init_height;

	// Fixed ratio
	if (fixed) {
	    height = Math.min(height, width);
	    width = height;
	}

	height = height - margin.top - margin.bottom;
	width = width - margin.left - margin.right;
	total_width = width + margin.left + margin.right + legend_width;
	total_height = height + margin.top + margin.bottom;
    }

    // Main drawing function
    function draw(el) {

	var min_x, min_y, max_x, max_y, gap_x, gap_y;
	var x, y, color_scale, symbol_scale, xAxis, yAxis, zoom;
	var svg, tooltip, tooltip_text;

	// Drawing init
	function init_draw() {

	    // recreate SVG root element
	    d3.select(el).select("svg").remove();

	    svg = d3.select(el).append("svg")
	        .attr("class", "scatterD3")
		.attr("id", html_id)
		.attr("width", total_width)
		.attr("height", total_height);

	    css = svg.append("style")
		.text(".scatterD3 {font: 10px sans-serif;} " +
		      ".scatterD3 .axis line, .axis path { stroke: #000; fill: none; shape-rendering: CrispEdges;} " +
		      ".scatterD3 .axis .tick line { stroke: #ddd;} " +
		      ".scatterD3 .axis text { fill: #000;} " + 
		      ".scatterD3 .zeroline { stroke-width: 1; stroke: #444; stroke-dasharray: 5,5;} "
		     );
	    
	    // tooltips placeholder and function
	    if (has_tooltips) {
		tooltip = d3.select("body").append("div").attr("class", "tooltip hidden");
		if (has_custom_tooltips) { tooltip_text = function(d) { return d.tooltip_text; }}
		else {
		    tooltip_text = function(d) {
			var text = Array();
			if (has_labels) text.push("<b>"+d.lab+"</b>");
			text.push("<b>"+xlab+":</b> "+d.x.toFixed(3));
			text.push("<b>"+ylab+":</b> "+d.y.toFixed(3));
			if (has_color_legend) text.push("<b>"+col_lab+":</b> "+d.col_var);
			if (has_symbol_legend) text.push("<b>"+symbol_lab+":</b> "+d.symbol_var);
			return text.join("<br />");
		    }
		    
		};
		    
	    }

	    // scales and zomm
	    x = d3.scale.linear().range([0, width]);
	    y = d3.scale.linear().range([height, 0]);

	    color_scale = d3.scale.category10();

	    symbol_scale = d3.scale.ordinal().range(d3.range(d3.svg.symbolTypes.length));
	    
	    zoom = d3.behavior.zoom()
		.x(x)
		.y(y)
		.scaleExtent([1, 32])
		.on("zoom", zoomed);

	    if (fixed) {
		min_x = min_y = d3.min(data, function(d) { return Math.min(d.x,d.y);} );
		max_x = max_y = d3.max(data, function(d) { return Math.max(d.x,d.y);} );
	    } else {
		min_x = d3.min(data, function(d) { return Math.min(d.x);} );
		max_x = d3.max(data, function(d) { return Math.max(d.x);} );
		min_y = d3.min(data, function(d) { return Math.min(d.y);} );
		max_y = d3.max(data, function(d) { return Math.max(d.y);} );
	    }
	    gap_x = (max_x - min_x) * 0.2;
	    gap_y = (max_y - min_y) * 0.2;
	    x.domain([min_x - gap_x, max_x + gap_x]);
	    y.domain([min_y - gap_y, max_y + gap_y]);
	    zoom.x(x);
	    zoom.y(y);

	}

	// Zoom function
	function zoomed(reset) {

	    if (!reset) {
		var t = d3.event.translate;
		var s = d3.event.scale;
    		zscale = s;
    		t[0] = Math.min(
    		    (width/height)  * (s - 1),
    		    Math.max( width * (1 - s), t[0] )
    		);
    		t[1] = Math.min(
    		    (width/height)  * (s - 1),
    		    Math.max( width * (1 - s), t[1] )
    		);
    		zoom.translate(t);
	    }

	    root.select(".x.axis").call(xAxis);
	    root.select(".y.axis").call(yAxis);
	    root.selectAll(".dot").attr("transform", transform);
	    root.selectAll(".point-label").attr("transform", transform_text);
	    root.selectAll(".zeroline").remove();
	    add_zerolines();
	}

	// Coordinates transformation for zoom and pan
	function transform(d) {
	    return "translate(" + x(d.x) + "," + y(d.y) + ")";
	}

	function transform_text(d) {
	    return "translate(" + x(d.labx) + "," + y(d.laby) + ")";
	}

	// Draw 0 horizontal and vertical lines
	function add_zerolines() {
	    var zeroline = d3.svg.line()
    		.x(function(d) {return x(d.x)})
    		.y(function(d) {return y(d.y)});
	    chartBody.append("path")
    		.attr("class", "zeroline hline")
	        .attr("d", zeroline([{x:x.domain()[0], y:0}, {x:x.domain()[1], y:0}]));
	    chartBody.append("path")
    		.attr("class", "zeroline vline")
    		.attr("d", zeroline([{x:0, y:y.domain()[0]}, {x:0, y:y.domain()[1]}]));
	}

	// Create and draw x and y axis
	function add_axis() {

	    xAxis = d3.svg.axis()
		.scale(x)
		.orient("bottom")
		.tickSize(-height);

	    yAxis = d3.svg.axis()
		.scale(y)
		.orient("left")
		.tickSize(-width);

	    root.append("g")
    		.attr("class", "x axis")
    		.attr("transform", "translate(0," + height + ")")
    		.call(xAxis)
    		.append("text")
    		.attr("class", "label")
    		.attr("x", width - 5)
    		.attr("y", -6)
    		.style("text-anchor", "end")
    		.text(xlab);

	    root.append("g")
    		.attr("class", "y axis")
    		.call(yAxis)
    		.append("text")
    		.attr("class", "label")
    		.attr("transform", "rotate(-90)")
    		.attr("x", -5)
       		.attr("y", 6)
    		.attr("dy", ".71em")
    		.style("text-anchor", "end")
    		.text(ylab);

	}

	// Add color legend
	function add_color_legend() {

	    var color_legend_y = 20
	    
	    root.append("g")
    		.append("text")
    		.attr("x", total_width - margin.right - legend_width)
    		.attr("y", color_legend_y)
    		.style("text-anchor", "beginning")
    		.style("fill", "#000")
    		.style("font-weight", "bold")
    		.text(col_lab);


	    var color_legend = root.selectAll(".color-legend")
    		.data(color_scale.domain().sort())
    		.enter().append("g")
    		.attr("class", "color-legend")
    		.attr("transform", function(d, i) { return "translate(0," + (color_legend_y + 10 + i * 20) + ")"; });

	    // Color rectangles
	    color_legend.append("rect")
    		.attr("x", total_width - margin.right - legend_width )
    		.attr("width", 18)
    		.attr("height", 18)
    		.attr("class", function(d,i) { return "colorleg color color-" + color_scale(d,i).substring(1)})
    		.style("fill", color_scale)
    		.on("mouseover", function(d,i) {
    		    var nsel = ".color:not(.color-" + color_scale(d,i).substring(1) + ")";
    		    var sel = ".color-" + color_scale(d,i).substring(1);
    		    svg.selectAll(nsel)
			.transition()
			.style("opacity", 0.2);
		    svg.selectAll(sel)
			.transition()
			.style("opacity", 1);
    		})
    		.on("mouseout", function(d,i) {
    		    var sel = ".color";
		    var legsel = ".colorleg, .point-label";
    		    svg.selectAll(sel)
			.transition()
			.style("opacity", point_opacity);
		    svg.selectAll(legsel)
			.transition()
			.style("opacity", 1);
    		});

	    // Labels
	    color_legend.append("text")
    		.attr("x", total_width - margin.right - legend_width + 24)
    		.attr("y", 9)
    		.attr("dy", ".35em")
    		.style("text-anchor", "beginning")
    		.style("fill", "#000")
    		.attr("class", function(d,i) { return "colorleg color color-" + color_scale(d,i).substring(1)})
    		.text(function(d) { return d; });
	}

	// Add symbol legend
	function add_symbol_legend() {

	    // Height of color legend
	    var color_legend_height = color_scale.domain().length * 20 + 30;
	    var symbol_legend_y = color_legend_height + 50;

	    root.append("g")
    		.append("text")
    		.attr("x", total_width - margin.right - legend_width)
    		.attr("y", symbol_legend_y)
    		.style("text-anchor", "beginning")
    		.style("fill", "#000")
    		.style("font-weight", "bold")
    		.text(symbol_lab);

	    var symbol_legend = root.selectAll(".symbol-legend")
    		.data(symbol_scale.domain().sort())
    		.enter().append("g")
    		.attr("class", "symbol-legend")
    		.attr("transform", function(d, i) { return "translate(0," + (symbol_legend_y + 10 + i * 20) + ")"; });

	    var x_trans = total_width - margin.right - legend_width + 9;
	    // Symbols
	    symbol_legend.append("path")
	        .attr("transform","translate(" + x_trans + ",9)")
    		.attr("class", function(d,i) { return "symbleg symbol symbol-" + symbol_scale(d)})
	        .style("fill", "#000")
	       	.attr("d", d3.svg.symbol()
		  .type(function(d) {return d3.svg.symbolTypes[symbol_scale(d)]})
		  .size(point_size))
    		.on("mouseover", function(d,i) {
    		    var nsel = ".symbol:not(.symbol-" + symbol_scale(d) + ")";
    		    var sel = ".symbol-" + symbol_scale(d);
    		    svg.selectAll(nsel)
			.transition()
			.style("opacity", 0.2);
		    svg.selectAll(sel)
			.transition()
			.style("opacity", 1);
    		})
    		.on("mouseout", function(d,i) {
    		    var sel = ".symbol";
		    var legsel = ".symbleg, .point-label";
    		    svg.selectAll(sel)
			.transition()
			.style("opacity", point_opacity);
		    svg.selectAll(legsel)
			.transition()
			.style("opacity", 1);
    		});

	    // Labels
	    symbol_legend.append("text")
    		.attr("x", total_width - margin.right - legend_width + 24)
    		.attr("y", 9)
    		.attr("dy", ".35em")
    		.style("text-anchor", "beginning")
    		.style("fill", "#000")
    		.attr("class", function(d,i) { return "symbleg symbol symbol-" + symbol_scale(d)})
    		.text(function(d) { return d; });
	}


	init_draw();

	// Text labels dragging
	var drag = d3.behavior.drag()
	    .origin(function(d) { return {x:x(d.labx), y:y(d.laby)}; })
    	    .on('dragstart', function(d) { d3.select(this).style('fill', '#000'); })
    	    .on('drag', function(d) {
    		d3.select(this).attr('transform', "translate("+d3.event.x+","+d3.event.y+")");
    		d.labx = x.invert(d3.event.x);
    		d.laby = y.invert(d3.event.y);
    	    })
    	    .on('dragend', function(d) { d3.select(this).style('fill', color_scale(d.col_var)); });

	var root = svg.append("g")
	    .style("fill", "#FFF")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// clipping rectangle
	root.append("clipPath")
	    .attr('id', 'clip')
	    .append('rect')
	    .style("stroke-width", 0)
	    .attr('width', width)
	    .attr('height', height);

	add_axis();

	root.append("rect")
    	    .attr("class", "pane")
    	    .attr("width", width)
    	    .attr("height", height)
    	    .style("fill", "none")
    	    .style("pointer-events", "all")
    	    .call(zoom);

	var chartBody = root.append("g")
    	    .attr("width", width)
    	    .attr("height", height)
    	    .attr("clip-path", "url(#clip)");

	add_zerolines();

	// Add points
	var dot = chartBody
	    .selectAll(".dot")
	    .data(data);

	dot.enter().append("path")
    	    .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; })
	    .attr("id", function(d,i) { return "point-id" + i;})
    	    .attr("class", function(d,i) { return "dot color color-" + color_scale(d.col_var).substring(1) + " symbol symbol-" + symbol_scale(d.symbol_var); })
    	    .style("fill", function(d) { return color_scale(d.col_var); })
	    .style("opacity", point_opacity)
    	    .attr("d", d3.svg.symbol()
		  .type(function(d) {return d3.svg.symbolTypes[symbol_scale(d.symbol_var)]})
		  .size(point_size));

	// tooltips when hovering points 
	if (has_tooltips) {
	    dot.on("mousemove", function(d,i) {
    		var mouse = d3.mouse(root.node()).map( function(d) { return parseInt(d); } );
    		tooltip.classed("hidden", false)
    		    .attr("style", "left:"+(mouse[0]+el.offsetLeft+40)+"px;top:"+(mouse[1]+el.offsetTop+40)+"px")
    		    .html(tooltip_text(d));})
    		.on("mouseout",  function(d,i) {
    		    tooltip.classed("hidden", true);
    		})
	}
	
	// Add text labels
	if (has_labels) {
	    chartBody.selectAll(".point-label")
    		.data(data)
    		.enter().append("text")
    		.attr("class", function(d,i) { return "point-label color color-" + color_scale(d.col_var).substring(1) + " symbol symbol-" + symbol_scale(d.symbol_var); })
    		.attr("transform", function(d) { return "translate(" + x(d.labx) + "," + y(d.laby) + ")"; })
    		.style("fill", function(d) { return color_scale(d.col_var); })
    		.style("font-size", labels_size + "px")
	    	.style("opacity", point_opacity)
    		.attr("text-anchor", "middle")
    		.attr("dy", "-1.3ex")
    		.text(function(d) {return(d.lab)})
    		.call(drag);
	}

	if (has_color_legend) { add_color_legend() };
	if (has_symbol_legend) { add_symbol_legend() };


	// Reset zoom handler must be inside draw() (to fix)
	function reset_zoom() {
	    d3.transition().duration(750).tween("zoom", function() {
	    	var ix = d3.interpolate(x.domain(), [min_x - gap_x, max_x + gap_x]),
	    	    iy = d3.interpolate(y.domain(), [min_y - gap_y, max_y + gap_y]);
	    	return function(t) {
	    	    zoom.x(x.domain(ix(t))).y(y.domain(iy(t)));
	    	    zoomed(reset=true);
	    	};
	    });
	}

	d3.select("#scatterD3-resetzoom").on("click", reset_zoom);
	
    }

    function add_controls_handlers() {
	
	d3.select("#scatterD3-size").on("change", function() {
	    labels_size = this.value;
	    d3.selectAll(".point-label").transition().style("font-size", labels_size + "px");
	});

	d3.select("#scatterD3-opacity").on("change", function() {
	    point_opacity = this.value;
	    d3.selectAll(".dot").transition().style("opacity", point_opacity);
	});
	
	d3.select("#scatterD3-download")
    	    .on("click", function(){
		var svg = d3.select("svg#"+html_id)
    		    .attr("xmlns", "http://www.w3.org/2000/svg")
    		    .attr("version", 1.1)
		    .node().parentNode
		    .innerHTML;
		var imageUrl = "data:image/octet-stream;base64,\n" + btoa(svg);
    		d3.select(this)
		    .attr("download", "scatterD3.svg")
    		    .attr("href", imageUrl);
    	    });
    }


    HTMLWidgets.widget({

	name: 'scatterD3',

	type: 'output',

	initialize: function(el, width, height) {
	    var init = {width: width, height: height};
	    return init;
	},

	resize: function(el, width, height, instance) {
	    setup_size(width, height);
	    draw(el);
	},

	renderValue: function(el, obj, init) {
	    setup(obj, init);
	    draw(el);
	    add_controls_handlers();
	}

    });

})();
