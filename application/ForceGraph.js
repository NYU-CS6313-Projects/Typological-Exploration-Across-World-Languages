/************************\
|* singleton object for *|
|* managing all of the  *|
|* commonly needed high *|
|* level d3 data/objects*|
|* for the force        *|
|* directed graph       *|
\************************/
var ForceGraph = (function(){

	//P is for private
	var P = {
		/**
		 * selection of the base SVG element
		 */
		svg:null,

		/**
		 * selection of svg group that everytyhing is supposed to be in
		 */
		main_group:null,

		/**
		 * selection of svg group that all nodes are supposed to be in
		 */
		node_group:null,

		/**
		 * selection of svg group that all links are supposed to be in
		 */
		link_group:null,

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
			scale:0.05,

			/**
			 * x and y offset
			 */
			x:500,
			y:200
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
		group_count: 0,

		/**
		 *radius of the gravity ring
		 */
		gravity_ring_radius: 0
	}

	//public interface
	return {
		/**
		 * main setup function
		 */
		setSVG: function(svg, height, width){
			if(P.svg !== null){
				throw "svg has already been set, no takebacks!";
			}

			var self = this;

			P.svg = svg;

			P.main_group = svg.append("svg:g");
			P.link_group = P.main_group.append("svg:g");
			P.node_group = P.main_group.append("svg:g");

			//setup the force directed layout 
			P.layout = d3.layout.force()
				/*.friction(.5)*/
				.linkStrength(0.5)
				.gravity(0)
				.linkDistance(function(d){
					return (P.max_link_strength/Math.max(d.strength,0.0001))*100;
				});

			//do the initial link up with empty data
			self.setData(P.data);

			//the graph animation
			P.layout.on("tick", function(event) {

				P.node_selection
					.attr("transform", function(d){
						var impulse = self.getGravityImpulse(d);
						d.x += event.alpha*impulse.x;
						d.y += event.alpha*impulse.y;
						return "translate("+d.x+","+d.y+")";
					})

				P.link_selection
					.attr("x1", function(d) { return d.source.x; })
					.attr("y1", function(d) { return d.source.y; })
					.attr("x2", function(d) { return d.target.x; })
					.attr("y2", function(d) { return d.target.y; });
			});

			//setup zooming

			P.zoom.behavior = d3.behavior.zoom();
			P.zoom.behavior.scale(P.zoom.scale);
			P.zoom.behavior.translate([P.zoom.x,P.zoom.y]);
			P.main_group
				.attr("transform", "translate("+P.zoom.x+","+P.zoom.y+") scale("+P.zoom.scale+")");
			P.zoom.behavior.on("zoom", function(){
				P.zoom.scale = d3.event.scale;
				P.zoom.x = d3.event.translate[0];
				P.zoom.y = d3.event.translate[1];
				P.main_group
					.attr("transform", "translate("+P.zoom.x+","+P.zoom.y+") scale("+P.zoom.scale+")");
			});
			var zoom_selection = svg.call(P.zoom.behavior);
			var mouse_handler = zoom_selection.on("mousedown.zoom");
			zoom_selection.on("mousedown.zoom", function(){
				if(d3.event.ctrlKey){
					mouse_handler.call(this);
				}
			});
		},

		/**
		 * apply a new set of data to the visualization
		 */
		setData: function(data){
			var self = this;
			P.max_link_strength = 0;

			P.data = data;

			P.max_link_strength = 0;
			P.data.links.forEach(function(d){
				P.max_link_strength = Math.max(P.max_link_strength, d.strength);
			});
			P.group_count = 0;
			P.data.nodes.forEach(function(d){
				if('group' in d){
					P.group_count = Math.max(P.group_count, d.group);
				}
			});
			P.group_count++;

			P.layout.charge(-P.max_link_strength)

			//update the layout with the new data
			P.layout
				.nodes(P.data.nodes)
				.links(
					P.data.links
				)
				.start();
			
			//regrab the links
			P.link_selection = P.link_group.selectAll(".link")
				.data(
					P.data.links
						.filter(function(d){
							return d.strength > P.minimum_display_link;
						}),
					function(d){
						return d.source.id+','+d.target.id;
					}
				);

			P.link_selection.enter()
				.append("line")
				.attr("class", "link")
				.attr("stroke-width", function(d) { return d.strength/100; });

			P.link_selection.exit()
				.remove();

			//regrab the nodes
			P.node_selection = P.node_group.selectAll("g.node")
				.data(
					P.data.nodes,
					function(d){
						return d.id;
					}
				);

			P.node_selection
				.select('circle.node')
				.style("fill", function(d) {
					var colors = ['red','green','blue','yellow','cyan','magenta'];
					return colors[d.group%colors.length]
				});

			var new_node_group = P.node_selection.enter()
				.append('g')
				.attr("class", "node");

			new_node_group
				.append("circle")
				.attr("r", 10)
				.attr("class", "node")
				.call(P.layout.drag)
				.style("fill", function(d) {
					var colors = ['red','green','blue','yellow','cyan','magenta'];
					return colors[d.group%colors.length]
				});

			new_node_group
				.append('text')
				.attr('x',13)
				.text(function(d){
					return d.name;
				});

			P.node_selection.exit()
				.remove();
		},

		/**
		 * set the minimum link value, less then this and it will be like it doesn't even exsist
		 */
		setMinimumDisplayLink: function(min){
			P.minimum_display_link = min;
			this.setData(P.data);
		},

		/**
		 *get a gravity ring point for the given group
		 */
		getGravityRingPoint: function(node){
			if('group' in node){
				var a  = (node.group/P.group_count)*Math.PI*2;
				var r = P.gravity_ring_radius;
				return {
					x:r*Math.sin(a), 
					y:r*Math.cos(a)
				};
			}
			else{
				return {x:0,y:0};
			}
		},

		/**
		 *calculate a impulse for a node
		 */
		getGravityImpulse: function(node){
			var center = this.getGravityRingPoint(node); //where the node wants to be
			var to_center = {x:center.x-node.x, y:center.y-node.y} //displacement to center

			return to_center;
		},

		/**
		 *sets the size of the ring that the different groups will be attracted to
		 */
		setGroupRingSize: function(size){
			P.gravity_ring_radius = size;
			P.layout.resume();
		}
	}
})();
