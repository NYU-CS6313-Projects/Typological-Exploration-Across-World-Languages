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

		column_order:[],
		row_order:[],

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
	 * sorting comparator function for the data
	 */
	function featureSort(feature){
		//lookup table
		var lookup = {};
		
		for(var i = 0; i<P.raw_data.links.length; i++){
			var source = P.raw_data.links[i].source;
			var target = P.raw_data.links[i].target;
			if(target.id == feature){
				lookup[source.id] = P.raw_data.links[i];
			}
			else if(source.id == feature){
				lookup[target.id] = P.raw_data.links[i];
			}
		}

		//sort by feature value
		return function(a,b){
			//find the link that has our feature as one end and the specified feature as the other end
			a = (a && 'feature' in a)?a.feature:a;
			b = (b && 'feature' in b)?b.feature:b;

			a = (!a)?a:('id' in a)?a.id:((a.source.id == feature)?a.target.id:a.source.id);
			b = (!b)?b:('id' in b)?b.id:((b.source.id == feature)?b.target.id:b.source.id);

			a = (a in lookup)?lookup[a].strength:-1;
			b = (b in lookup)?lookup[b].strength:-1;

			a = (a === null)?-1:a;
			b = (b === null)?-1:b;

			if(a>b || b===null){
				return -1;
			}
			else if(a<b || a===null){
				return 1;
			}
			return 0;
		}
	};

	/**
	 *the data has been changed in some way, redraw the table
	 */
	function redrawData(){
		$(P.table).empty();

		//do the header row
		var header_row = $('<tr/>');
		header_row.addClass('header');

		$(P.table).append(header_row);
		header_row.append($('<th/>'));//spacer for the label on the data rows

		$.each(P.column_order, function(i, column_id){
			var feature = P.processed_data.nodes[column_id];
			var header_cell = $('<th/>');
			header_cell.addClass('header');
			if(P.draw_labels){
				header_cell.text(feature.id);
			}
			header_cell.addClass('feature_'+feature.id);
			header_cell.on( "mouseover", function(){
				Application.highlightNode(feature);
			} );
			header_cell.on( "mouseout", function(){
				Application.highlightNode(null);
			} );			
			header_row.append(header_cell);
		});

		//do the data rows
		$.each(P.row_order, function(i, row_id){
			var row_feature = P.processed_data.nodes[row_id];

			//header column
			var data_row = $('<tr/>');
			data_row.addClass('data');
			$(P.table).append(data_row);

			var header_cell = $('<th/>');
			header_cell.addClass('header');
			if(P.draw_labels){
				header_cell.text(row_feature.name.replace(/\s+/g, '&nbsp;')+' ('+row_feature.id+')');
			}
			header_cell.addClass('feature_'+row_id);
			header_cell.on( "mouseover", function(){
				Application.highlightNode(row_feature);
			} );
			header_cell.on( "mouseout", function(){
				Application.highlightNode(null);
			} );
			data_row.append(header_cell);

			$.each(P.column_order, function(j, column_id){
				var link = P.processed_data.links[row_id][column_id];

				var bg_color = 'rgb(0,0,128)';
				var strength = '';
				if(link){
					strength = link.strength;
					bg_color = 'rgb('+Math.round((strength/P.max_link_strength)*255)+',0,0)';
				}

				var data_cell = $('<td/>');
				data_cell.addClass('data');
				data_cell.css('background-color', bg_color);
				if(P.draw_labels){
					data_cell.text(strength);
				}
				data_cell.addClass('feature_'+row_id+' feature_'+column_id);
				data_cell.on( "mouseover", function(){
					Application.highlightLink(link);
				} );
				data_cell.on( "mouseout", function(){
					Application.highlightLink(null);
				} );
				data_row.append(data_cell);
			});
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

		P.column_order = [];
		P.row_order = [];

		P.processed_data = {
			nodes:{},
			links:{}
		};
		P.raw_data.nodes.forEach(function(a){
			P.column_order.push(a.id);
			P.row_order.push(a.id);
			P.processed_data.nodes[a.id] = a;
			var row = {};
			P.raw_data.nodes.forEach(function(b){
				row[b.id] = null;
			});
			P.processed_data.links[a.id] = row;
		});

		P.max_link_strength = 0;
		P.raw_data.links.forEach(function(l){
			P.processed_data.links[l.source.id][l.target.id] = l;
			P.processed_data.links[l.target.id][l.source.id] = l;
			if(P.max_link_strength < l.strength){
				P.max_link_strength = l.strength;
			}
		});
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

			self.setData(P.raw_data);
		},

		/**
		 * apply a new set of data to the visualization
		 */
		setData: function(data){
			var self = this;

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
				$('.feature_'+node.id).addClass('highlighted');
			}
			else{
				$('.highlighted').removeClass('highlighted');
			}
		},

		/**
		 * set which nodes are highlighted
		 */
		setHighlightedLink: function(link){
			if(link){
				//select everything that has both source and target, and all th that have either
				var selector = '.feature_'+link.source.id+'.feature_'+link.target.id+', th.feature_'+link.source.id+', th.feature_'+link.target.id;
				$(selector).addClass('highlighted');
			}
			else{
				$('.highlighted').removeClass('highlighted');
			}
		}
	}
})();