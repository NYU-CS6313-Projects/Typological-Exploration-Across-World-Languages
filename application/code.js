/************************\
|* singleton object for *|
|* managing all of the  *|
|* commonly needed high *|
|* level d3 data/objects*|
|* for the force        *|
|* directed graph       *|
\************************/
var ForceGraph = (function(){
	var private_data = {
		/**
		 * selection of the base SVG element
		 */
		svg:null,

		/**
		 * selection of svg group that everytyhing is supposed to be in
		 */
		main_group:null,

		/**
		 * the force directed layout object
		 */
		layout:null,

		/**
		 * the raw data
		 */
		data:{
			nodes:[],
			links:[]
		},

		/**
		 * the d3 selection of links
		 */
		link_selection:null,

		/**
		 * the d3 selection of nodes
		 */
		node_selection:null,

		/**
		 *info about how we have zoomed/panned
		 */
		zoom:{
			/**
			 * d3.zoomBehaviour
			 */
			behavior:null,

			/**
			 * how far we have zoomed in or out
			 */
			scale:1,

			/**
			 * x and y offset
			 */
			x:0,
			y:0
		},

		/**
		 *lower bound for a link to be displaied
		 */
		minimum_display_link:1,

		/**
		 * this only needs to be recalculated every now and then
		 */
		max_link_strength:0,

		/**
		 * number of disconnected subgraphs in the collection of nodes
		 */
		group_count: 0
	}

	//public interface
	return {
		/**
		 * main setup function
		 */
		setSVG: function(svg, height, width){
			if(private_data.svg !== null){
				throw "svg has already been set, no takebacks!";
			}

			var self = this;

			private_data.svg = svg;

			private_data.main_group = svg.append("svg:g");

			//setup the force directed layout 
			private_data.layout = d3.layout.force()
				/*.friction(.5)*/
				.linkStrength(0.5)
				.linkDistance(function(d){
					return (private_data.max_link_strength/Math.max(d.strength,0.0001))*100;
				});

			//do the initial link up with empty data
			self.setData(private_data.data);

			//the graph animation
			private_data.layout.on("tick", function() {
				private_data.link_selection
					.attr("x1", function(d) { return d.source.x; })
					.attr("y1", function(d) { return d.source.y; })
					.attr("x2", function(d) { return d.target.x; })
					.attr("y2", function(d) { return d.target.y; });

				screen_size = self.screenToSimulation(width,height);
				private_data.node_selection
					.attr("cx", function(d) { return d.x; })
					.attr("cy", function(d) { return d.y; });
//					.attr("cx", function(d) { return d.x = Math.max(0, Math.min(screen_size.x, d.x)); })
//					.attr("cy", function(d) { return d.y = Math.max(0, Math.min(screen_size.y, d.y)); });
			});

			self.setSize(height, width);

			//setup zooming
			private_data.zoom.behavior = d3.behavior.zoom();
			private_data.zoom.behavior.on("zoom", function(){
				private_data.zoom.scale = d3.event.scale;
				private_data.zoom.x = d3.event.translate[0];
				private_data.zoom.y = d3.event.translate[1];
				private_data.main_group
					.attr("transform", "translate("+private_data.zoom.x+","+private_data.zoom.y+") scale("+private_data.zoom.scale+")");
//					.attr("transform", "translate("+private_data.zoom.x+","+private_data.zoom.y+")");
//					.attr("transform", "scale("+private_data.zoom.scale+")");
			});
			var zoom_selection = svg.call(private_data.zoom.behavior);
			var mouse_handler = zoom_selection.on("mousedown.zoom");
			zoom_selection.on("mousedown.zoom", function(){
				if(d3.event.ctrlKey){
					mouse_handler.call(this);
				}
			});
		},

		/**
		 *sets the size of the visualization
		 */
		setSize: function(height, width){
			private_data.svg
				.attr("width", width)
				.attr("height", height);

			private_data.layout
				.size([width, height]);
		},

		/**
		 * getter for size
		 */
		getSize: function(){
			return{
				width: private_data.svg.attr('width'),
				height: private_data.svg.attr('height')
			}
		},

		/**
		 * apply a new set of data to the visualization
		 */
		setData: function(data){
			var self = this;
			private_data.max_link_strength = 0;

			private_data.data = data;

			private_data.max_link_strength = 0;
			private_data.data.links.forEach(function(d){
				private_data.max_link_strength = Math.max(private_data.max_link_strength, d.strength);
			});
			private_data.group_count = 0;
			private_data.data.nodes.forEach(function(d){
				private_data.group_count = Math.max(private_data.group_count, d.group);
			});

			private_data.layout.charge(-private_data.max_link_strength)

			//update the layout with the new data
			private_data.layout
				.nodes(private_data.data.nodes)
				.links(
					private_data.data.links
				)
				.start();
			
			//regrab the links
			private_data.link_selection = private_data.main_group.selectAll(".link")
				.data(
					private_data.data.links
						.filter(function(d){
							return d.strength > private_data.minimum_display_link;
						}),
					function(d){
						return d.source.id+','+d.target.id;
					}
				);

			private_data.link_selection.enter()
				.append("line")
				.attr("class", "link")
				.attr("stroke-width", function(d) { return d.strength/1000; });

			private_data.link_selection.exit()
				.remove();

			//regrab the nodes
			private_data.node_selection = private_data.main_group.selectAll(".node")
				.data(
					private_data.data.nodes,
					function(d){
						return d.id;
					}
				)
				.style("fill", function(d) {
					var colors = ['red','green','blue','yellow','cyan','magenta'];
					return colors[d.group%colors.length]
				});

			private_data.node_selection.enter()
				.append("circle")
				.attr("r", private_data.max_link_strength/10)
				.attr("class", "node")
				.call(private_data.layout.drag)
				.style("fill", function(d) {
					var colors = ['red','green','blue','yellow','cyan','magenta'];
					return colors[d.group%colors.length]
				});

			private_data.node_selection.exit()
				.remove();
		},

		/**
		 * set the minimum link value, less then this and it will be like it doesn't even exsist
		 */
		setMinimumDisplayLink: function(min){
			private_data.minimum_display_link = min;
			this.setData(private_data.data);
		},

		/**
		 * given screen coords return visualization coords
		 */
		screenToSimulation :function(x,y){
			x /= private_data.zoom.scale;
			y /= private_data.zoom.scale;
			x += private_data.zoom.x;
			y += private_data.zoom.y;
			return {x:x,y:y};
		}
	}
})();

/**
 * main function, entry point for the application,
 * sets up D3,
 * starts up other event handlers that drive the rest of the application
 */
function main(){
	ForceGraph.setSVG(d3.select(".ForceGraph").append("svg"), window.innerHeight, window.innerWidth);

	//this should be done in an ajax call if we end up with non-static data
	//ForceGraph.setData(JSON.parse(JSON.stringify(test_data)));
	setFlooredData(50);
}

/**
 * cuts out all links less than the specified amount, subtracts that from what's left
 */
function floorData(data, threshold){
	data = JSON.parse(JSON.stringify(data))
	for(var i = 0; i<data.links.length; i++){
		if(data.links[i].strength <=threshold){
			data.links.splice(i, 1);
			i--;
		}
		else{
			data.links[i].strength -= threshold;
		}
	}

	makeSubgraphs(data);
	
	return data;
}


/**
 *UI callable function for flooring the data and setting it into the visualization
 */
function setFlooredData(threshold){
	var data = floorData(test_data, threshold);
	ForceGraph.setData(data);
}

/**
 * Forms nodes into groups
 * deletes any single nodes
 */
function makeSubgraphs(data){
	var group_counter = 0;
	var marked_for_deletion;
	var deletion_group = [];
	var target;
	for (var i = 0; i<data.nodes.length; i++){
		//only mark for deletion if we aren't in a group and never find one
		if(data.nodes[i].group == null){
			marked_for_deletion=1;
		}
		//look for any node we connect to
		for (var j = 0; j<data.links.length; j++){
			if(data.links[j].source == i){
				marked_for_deletion=0;
				target = data.links[j].target;
				if(data.nodes[target].group != null){
					//target has a group, join it
					data.nodes[i].group = data.nodes[target].group;
				} else if(data.nodes[i].group != null){
					//we have a group, add target to it
					data.nodes[target].group = data.nodes[i].group;
				} else {
					//make a new group for ourselves and target
					data.nodes[i].group = data.nodes[target].group = group_counter;
					group_counter++;
				}
			}
		}
		//mark node for deletion if nothing found
		if(marked_for_deletion == 1){
			deletion_group.push(i);
		}
	}
	//now actually delete things
	for(var i = 0; i<deletion_group.length; i++){
		data.nodes.splice(deletion_group[i], 1);
		for(var j = 0; j<data.links.length; j++){
			if(data.links[j].source > deletion_group[i]){
				data.links[j].source--;
			}
			if(data.links[j].target > deletion_group[i]){
				data.links[j].target--;
			}
		}
	}
	
	return data;
}























































