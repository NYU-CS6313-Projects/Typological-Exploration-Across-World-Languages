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
		 * selection of svg group that all highlighted links are supposed to be in
		 */
		link_group:null,

		/**
		 * the d3 selection of highlighted links (mouse over node effect)
		 */
		highlighted_link_group:null,

		/**
		 * the d3 selection of selected links
		 */
		selected_link_group:null,

		/**
		 * the d3 selection of selected nodes
		 */
		selected_node_group:null,

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
		 *links that are being highlighted
		 */
		highlighted_links:[],

		/**
		 * the d3 selection of links
		 */
		link_selection:null,

		/**
		 * the d3 selection of highlighted links
		 */
		highlighted_link_selection: null,

		/**
		 * the d3 selection of selected links
		 */
		selected_link_selection: null,

		/**
		 * the d3 selection of nodes
		 */
		node_selection:null,

		/**
		 * the d3 selection of selected nodes
		 */
		selected_node_selection:null,

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
		gravity_ring_radius: 0,

		/**
		 * boolean flag telling us if we should draw links or not
		 */
		draw_links: false
	}


	/*******************\
	|* PRIVATE METHODS *|
	\*******************/

	/**
	 *get a gravity ring point for the given group
	 */
	function getGravityRingPoint(node){
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
	}

	/**
	 *calculate a impulse for a node
	 */
	function getGravityImpulse(node){
		var center = getGravityRingPoint(node); //where the node wants to be
		var to_center = {x:center.x-node.x, y:center.y-node.y} //displacement to center

		return to_center;
	}

	/**
	 * adds new, removes old nodes
	 */
	function bookKeepNode(node_selection){

		//remove missing nodes
		node_selection.exit()
			.remove();

		//add the group
		var new_node_group = node_selection.enter()
			.append('g')
			.attr("class", "node");

		//add the circle for the group
		new_node_group
			.append("circle")
			.attr("r", 100)
			.attr("class", "node")
			.call(P.layout.drag)
			.on("click", function(d) {
				Application.toggleNodeSelection(d)
			})
			.on("mouseover.force", null)
			.on("mouseover", function(d){
				Application.highlightNode(d);
			})
			.on("mouseout", function(d){
				Application.highlightNode(null);
			});

		//add the text
		new_node_group
			.append('text')
			.attr('x',130);

		updateNode(node_selection);
	}

	/**
	 * all of the stuff that needs to happen for drawing a selection of nodes
	 */
	function updateNode(node_selection){
		//update the circle
		node_selection.select('circle')
			.style("fill", function(d) {
				var colors = ['red','green','blue','yellow','cyan','magenta'];
				return colors[d.group%colors.length]
			});

		//update the text
		node_selection.select('text')
			.text(function(d){
				return d.name;
			});

		//update location
		node_selection
			.attr("transform", function(d){
				return "translate("+d.x+","+d.y+")";
			});

	}

	/**
	 * adds new, removes old links
	 */
	function bookKeepLink(link_selection, link_class){

		//remove missing links
		link_selection.exit()
			.remove();

		//add new links
		link_selection.enter()
			.append("line")
			.attr("class", link_class)
			.on("click", function(d) {
				Application.toggleLinkSelection(d)
			})
			.on("mouseover", function(d){
				Application.highlightLink(d);
			})
			.on("mouseout", function(d){
				Application.highlightLink(null);
			});

		updateLink(link_selection);
	}

	/**
	 *all of the stuff that needs to happen for a selection of links
	 */
	function updateLink(link_selection){
		//update properties
		link_selection
			.attr("x1", function(d) { return d.source.x; })
			.attr("y1", function(d) { return d.source.y; })
			.attr("x2", function(d) { return d.target.x; })
			.attr("y2", function(d) { return d.target.y; })
			.attr("stroke-width", function(d) { return d.total_strength/100; });
	}

	/**
	 * given a set of links to highlight highlight them
	 */
	function setHighlightedLinks(links){
		P.highlighted_links = links;

		//regrab the links
		P.highlighted_link_selection = P.highlighted_link_group.selectAll(".highlighted-link")
			.data(
				P.highlighted_links,
				function(d){
					return d.source.id+','+d.target.id;
				}
			);

		P.highlighted_link_selection.enter()
			.append("line")
			.attr("class", "highlighted-link")
			.attr("stroke-width", function(d) { return (d.total_strength/100)*1.5; });

		P.highlighted_link_selection.exit()
			.remove();

		bookKeepLink(P.highlighted_link_selection, "highlighted-link");
	}

	/******************\
	|* PUBLIC METHODS *|
	\******************/
	return {
		/**
		 * main setup function
		 */
		setSVG: function(svg){
			if(P.svg !== null){
				throw "svg has already been set, no takebacks!";
			}

			var self = this;

			P.svg = svg;

			P.main_group = svg.append("svg:g");
			P.link_group = P.main_group.append("svg:g");
			P.selected_link_group = P.main_group.append("svg:g");
			P.highlighted_link_group = P.main_group.append("svg:g");
			P.node_group = P.main_group.append("svg:g");
			P.selected_node_group = P.main_group.append("svg:g");

			//setup the force directed layout 
			P.layout = d3.layout.force()
				.friction(0.1)
				.linkStrength(0.5)
				.gravity(0)
				.linkDistance(function(d){
					return (P.max_link_strength/Math.max(d.total_strength,0.0001))*100;
				});

			//do the initial link up with empty data
			self.setData(P.data);

			//the graph animation
			P.layout.on("tick", function(event) {

				//do the custom physics
				//calculate group center of mass
				var com = Array.apply(null, new Array(P.group_count)).map(function(){return {x:0,y:0,count:0};});
				P.data.nodes.forEach(function(d){
					if('group' in d){
						com[d.group].x += d.x;
						com[d.group].y += d.y;
						com[d.group].count++;
					}
				});
				//calculate group impulse
				var impulse = Array.apply(null, new Array(P.group_count)).map(function(){return {x:0,y:0};});
				com.forEach(function(d,i){
					d.x /= d.count;
					d.y /= d.count;
					d.group = i;
					impulse[i] = getGravityImpulse(d);
				});
				P.data.nodes.forEach(function(d){
					d.x += event.alpha*impulse[d.group].x;
					d.y += event.alpha*impulse[d.group].y;
				});

				//update the selections
				updateNode(P.node_selection);

				//I love how d3 has no apparent mechanism for unioning selections
				updateLink(P.highlighted_link_selection);
				updateLink(P.link_selection);

				updateLink(P.selected_link_selection);
				P.selected_node_selection
					.attr('cx',function(d){return d.x;})
					.attr('cy',function(d){return d.y;});
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
				if(d3.event.which == 2){
					mouse_handler.call(this);
				}
			});

		},

		/**
		 * set the highlighted links to the links that have the given node as a source or target
		 */
		setHighlightedNode: function(node){
			P.highlighted_links = [];

			links = [];
			if(node !== null){
				P.data.links.forEach(function(d){
					if(d.source.id === node.id || d.target.id === node.id){
						links.push(d);
					}
				});
			}
			setHighlightedLinks(links);
		},

		/**
		 * highlight the given link
		 */
		setHighlightedLink: function(link){
			if(link !== null){
				setHighlightedLinks([link]);
			}
			else{
				setHighlightedLinks([]);
			}
		},

		/**
		 * apply a new set of data to the visualization
		 */
		setData: function(data){
			var self = this;

			P.data = data;

			P.max_link_strength = 0;
			P.data.links.forEach(function(d){
				P.max_link_strength = Math.max(P.max_link_strength, d.total_strength);
			});
			P.group_count = 0;
			P.data.nodes.forEach(function(d){
				if('group' in d){
					P.group_count = Math.max(P.group_count, d.group);
				}
			});
			P.group_count++;

			P.layout.charge(-P.max_link_strength*2)

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
					P.data.links,
					function(d){
						return d.source.id+','+d.target.id;
					}
				);

			if(P.draw_links){
				P.link_selection.enter()
					.append("line")
					.attr("class", "link")
					.attr("stroke-width", function(d) { return d.total_strength/1000; })
					.on("click", function(d) {
						Application.toggleLinkSelection(d)
					})
					.on("mouseover", function(d){
						Application.highlightLink(d);
					})
					.on("mouseout", function(d){
						Application.highlightLink(null);
					});
			}
			P.link_selection.exit()
				.remove();

			//regrab the nodes
			P.node_selection = P.node_group.selectAll("g.node")
				.data(
					P.data.nodes
						.filter(function(d){
							return d.group != null;
						}),
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

			bookKeepNode(P.node_selection);
		},

		/**
		 *sets the size of the ring that the different groups will be attracted to
		 */
		setGroupRingSize: function(size){
			P.gravity_ring_radius = size;
			P.layout.resume();
		},

		/**
		 *turn the drawing of links on or off
		 *this could have a better name
		 */
		setDrawLinks: function(draw_links){
			P.draw_links = draw_links;
			if(!draw_links){
				P.link_selection.remove();
			}
			this.setData(P.data);
		},

		/**
		 * notify this view that the selection has changed
		 */
		selectionChanged: function(selected_data){
			//update the links
			P.selected_link_selection = P.selected_link_group.selectAll(".selected-link")
				.data(
					selected_data.links,
					function(d){
						return d.source.id+','+d.target.id;
					}
				);

			P.selected_link_selection.enter()
				.append("line")
				.attr("class", "selected-link")
				.attr("stroke-width", function(d) { return (d.total_strength/100)*1.25; });

			P.selected_link_selection.exit()
				.remove();

			bookKeepLink(P.selected_link_selection, "selected-link");

			//update the nodes
			P.selected_node_selection = P.selected_node_group.selectAll(".selected-node")
				.data(
					selected_data.nodes,
					function(d){
						return d.id;
					}
				);

			//remove missing nodes
			P.selected_node_selection.exit()
				.remove();

			//add the group
			var new_node_group = P.selected_node_selection.enter()
				.append('circle')
				.attr("class", "selected-node")
				.attr("r", 100)
				.attr('cx',function(d){return d.x;})
				.attr('cy',function(d){return d.y;});
		}
	}
})();
