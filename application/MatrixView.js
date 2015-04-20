/************************\
|* singleton object for *|
|* managing all of the  *|
|* commonly needed high *|
|* level d3 data/objects*|
|* for the matrix       *|
\************************/
var MatrixView = (function(){

	//P is for private
	var P = {
		/**
		 * selection of the base SVG element
		 */
		table:null,

		header_row:null,

		/**
		 * boolean flag saying if we should draw the labels or not
		 */
		draw_labels:false,

		/**
		 * the raw data
		 */
		raw_data:{
			nodes:[],
			links:[]
		},

		/**
		 * the data processed to be easier to deal with
		 * processed_data[<feature_name>][<feature_name>] : link
		 */
		processed_data:{},

		/**
		 * this only needs to be recalculated every now and then
		 */
		max_link_strength:0,

		/**
		 * list of ids of nodes that have been highlighted
		 */
		highlighted_nodes:[],

		/**
 		 * list of links to highlight
		 */
		highlighted_links:[],

		/**
		 *names of features to sort along, null means use feature id, rather than strength of a particular feature
		 */
		horizontal_sort_feature: null,
		vertical_sort_feature: null
	}


	/*******************\
	|* PRIVATE METHODS *|
	\*******************/

	/**
	 * setup the header row at the top of the matrix
	 */
	function buildHeaderRow(header_cells){
		header_cells.exit()
			.remove();

		var new_header_column = header_cells.enter();

		new_header_column
			.append('th')
			.attr('class','header')
			.on("mouseover", function(d){
				Application.highlightNode(d.feature);
			})
			.on("mouseout", function(d){
				Application.highlightNode(null);
			});

		header_cells
			.sort(dataSort)
			.order()
			.text(function(d){
				if(P.draw_labels){
					return d.feature.id;
				}
				return '';
			})
			.classed('highlighted', function(d){
				return P.highlighted_nodes.indexOf(d.feature.id) != -1;
			});
	}

	/**
	 * setup the data portion of the matrix
	 */
	function buildDataRows(data_rows){
		data_rows.exit()
			.remove();

		var new_data_rows = data_rows.enter();

		var new_rows = new_data_rows
			.append('tr')
			.attr('class','data');

		new_rows
			.append('th')	//always add the label for the row first
			.attr('class','header')
			.on("mouseover", function(d){
				Application.highlightNode(d.feature);
			})
			.on("mouseout", function(d){
				Application.highlightNode(null);
			});

		data_rows
			.selectAll('th.header')
			.html(function(d){
				if(P.draw_labels){
					return d.feature.name.replace(/\s+/g, '&nbsp;')+' ('+d.feature.id+')';
				}
				return ''
			})
			.classed('highlighted', function(d){
				return P.highlighted_nodes.indexOf(d.feature.id) != -1;
			});

		data_rows.order();

		var data_cells = data_rows
			.selectAll('td.data')
			.data(function(d){
				return d;
			});

		//deal with the cells in each row
		data_cells.exit()
			.remove();

		var new_data_cells = data_cells.enter();
		new_data_cells
			.append('td')
			.attr('class','data')
			.on("mouseover", function(d){
				Application.highlightLink(d);
			})
			.on("mouseout", function(d){
				Application.highlightLink(null);
			});


		data_cells.order();

		data_cells
			.style('background-color', function(d){
				if(!d){
					return 'rgb(0,0,128)';
				}
				var strength = d.strength/P.max_link_strength;
				return 'rgb('+Math.round(strength*255)+',0,0)';
			})
			.attr('data-tool_tip_text', function(d){
				if(d){
					var strength = d.strength/P.max_link_strength;
					var color = 'rgb('+Math.round(strength*255)+',0,0)';
					return '<div style=\'background-color: '+color+'\'>'+d.source.name + '<br/>+<br/>' + d.target.name + '<br/>=<br/>' + d.strength+'</div>';
				}
				return 'no data';
			})
			.text(function(d){
				if(d && P.draw_labels){
					return d.strength;
				}
				else{
					return '';
				}
			})
			.classed('highlighted', function(d){
				if(d){
					var in_highlighted_links = 
						P.highlighted_links.some(function(link){
							if(
								d.source.id == link.source.id
								&&
								d.target.id == link.target.id
							){
								return true;
							}
							return false;
						
						});
					return in_highlighted_links || P.highlighted_nodes.indexOf(d.source.id) != -1 || P.highlighted_nodes.indexOf(d.target.id) != -1;
				}
			});
	}

	/**
	 * take the raw data and make it into matrix friendly data
	 */
	function processData(raw_data){
		P.raw_data = raw_data;

		var row_map = {};//maps id to table index
		P.raw_data.nodes.forEach(function(d,i){
			row_map[d.id] = i;
		});


		P.processed_data = [];
		P.raw_data.nodes.forEach(function(a){
			var row = [];
			P.raw_data.nodes.forEach(function(b){
				row.push(null);
			});
			row.feature = a;
			P.processed_data.push(row);
		});
		P.raw_data.links.forEach(function(d){
			P.processed_data[row_map[d.source.id]][row_map[d.target.id]] = d;
			P.processed_data[row_map[d.target.id]][row_map[d.source.id]] = d;
		});
	}

	/**
	 * sorting comparator function for the data
	 */
	function dataSort(a,b){
		//these are unique ids so I'm ignoreing the case of the ids being equal
		a = a.feature.id;
		b = b.feature.id;
		if(a.length > b.length){
			return 1;
		}
		else if(a.length < b.length){
			return -1;
		}
		else{
			if(a > b){
				return 1;
			}
			else{
				return -1;
			}
		}
	};

	/**
	 * utility function for making an update selection
	 */
	function updateRowData(start_selection, selector){
		return start_selection
			.selectAll(selector)
			.data(
				P.processed_data,
				function(d){
					return d.feature.id;
				}
			);
	}

	/**
	 * something about the data changed, redraw it
	 */
	function redrawData(){
			var header_cells = updateRowData(P.header_row, 'th.header');

			//deal with the header
			buildHeaderRow(header_cells);

			var data_rows = updateRowData(P.table, 'tr.data');

			//deal with the data
			buildDataRows(data_rows);
	}

	/******************\
	|* PUBLIC METHODS *|
	\******************/
	return {
		/**
		 * main setup function
		 */
		setTable: function(table){
			if(P.table !== null){
				throw "table has already been set, no takebacks!";
			}

			var self = this;

			P.table = table;

			P.header_row = P.table.append('tr')
				.attr("class", "header");

			P.header_row
				.append('th');//spacer for the row labels

			self.setData(P.raw_data);
		},

		/**
		 * apply a new set of data to the visualization
		 */
		setData: function(data){
			var self = this;

			P.max_link_strength = 0;
			data.links.forEach(function(d){
				P.max_link_strength = Math.max(P.max_link_strength, d.strength);
			});

			processData(data);

			redrawData();
		},

		/**
		 * draw the labels or not
		 */
		setDrawLabels: function(draw){
			P.draw_labels = draw;
			redrawData();
		},

		/**
		 * set which nodes are highlighted
		 */
		setHighlightedNode: function(node){
			if(node){
				P.highlighted_nodes = [node.id];
			}
			else{
				P.highlighted_nodes = [];
			}
			redrawData();
		},

		/**
		 * set which nodes are highlighted
		 */
		setHighlightedLink: function(link){
			if(link){
				P.highlighted_links = [link];
			}
			else{
				P.highlighted_links = [];
			}
			redrawData();
		}
	}
})();
