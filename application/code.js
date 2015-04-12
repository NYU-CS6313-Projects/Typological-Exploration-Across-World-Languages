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
		getMaxLinkStrengthCache:0
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
					return (self.getMaxLinkStrength()/Math.max(d.strength,0.0001))*100;
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

				private_data.node_selection
					.attr("cx", function(d) { return d.x; })
					.attr("cy", function(d) { return d.y; });
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
		 * get's the max strength out of the data
		 */
		getMaxLinkStrength:function(){
			var self = this;
			if(!(private_data.getMaxLinkStrengthCache > 0)){
				private_data.getMaxLinkStrengthCache = 0;
				private_data.data.links.forEach(function(d){
					private_data.getMaxLinkStrengthCache = Math.max(private_data.getMaxLinkStrengthCache, d.strength);
				});
			}
			return private_data.getMaxLinkStrengthCache;
		},

		/**
		 * apply a new set of data to the visualization
		 */
		setData: function(data){
			var self = this;
			private_data.getMaxLinkStrengthCache = 0;

			private_data.data = data;

			private_data.layout.charge(-this.getMaxLinkStrength())

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
				.style("fill", function(d) { return 'black'; });

			private_data.node_selection.enter()
				.append("circle")
				.attr("r", self.getMaxLinkStrength()/10)
				.attr("class", "node")
				.call(private_data.layout.drag);

			private_data.node_selection.exit()
				.remove();

			var singles = [];
			private_data.node_selection
				.filter(function(d, i){
					if(d.weight <= 0){
						singles.push(i);
					}
				});
		},

		/**
		 * set the minimum link value, less then this and it will be like it doesn't even exsist
		 */
		setMinimumDisplayLink: function(min){
			private_data.minimum_display_link = min;
			this.setData(private_data.data);
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
	ForceGraph.setData(JSON.parse(JSON.stringify(test_data)));
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

	//remove features that have no connections
	//assume everything is disconnected at first
	var nodes_to_keep = [];

	var groups = [];

	//find groups and disconnected nodes
	for(var i = 0; i<data.links.length; i++){
		var src_idx = data.links[i].source;
		var tar_idx = data.links[i].target;

		//these have been found at least once, so lets keep them
		if(nodes_to_keep.indexOf(src_idx) != -1){
			nodes_to_keep.push(src_idx)
		}
		if(nodes_to_keep.indexOf(tar_idx) != -1){
			nodes_to_keep.push(tar_idx)
		}

		//now calculate group
		var source  = data.nodes[src_idx];
		var target  = data.nodes[tar_idx];

		var group_id = null;

		//if both nodes are in a group already, use the smaller one
		if("group" in source.group && "group" in target.group){
			group_id = Math.min(source.group, target.group);
		}
		else if("group" in source.group){
			group_id = source.group;
		}
		else if("group" in target.group){
			group_id = target.group;
		}
		else{
			group_id = groups.length;
			groups.push([]);
		}

		if(source.group != group_id){
			if("group" in source.group){
				groups
			}
			groups
			source.group != group_id;
		}
	}
	
	return data;
}


/**
 *UI callable function for flooring the data and setting it into the visualization
 */
function setFlooredData(threshold){
	var data = floorData(test_data, threshold);
	ForceGraph.setData(data);
}























































