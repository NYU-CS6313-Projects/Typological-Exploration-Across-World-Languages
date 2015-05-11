var Application = (function(){
	/**
	 * Holds parsed json data for nodes/links
	 * is constant
	 */
	var source_data = new Object();

	/**
	 * 
	 */
	var scaling_mode = 'linear';

	/**
	 * should we normalize strengths that have few languages
	 */
	var normalize_strengths = true;

	/**
	 * holds a secondary copy of the data, this is the data in the form that the application is using during run time
	 * it is source data after filtering and transformations that happen from user input
	 */
	var application_data = {
		nodes:[],
		links:[]
	};

	/**
	 * list of links and nodes that are currently selected
	 */
	var selected_data = {
		links: [],
		nodes: [],
		languages: []
	}; 

	/**
	 * Number of custom features created by collapsing features
	 */
	var custom_node_count = 0;

	/**
	 * whether or not to do distance calculations (very slow!)
	 */
	var calculate_distance = false;

	/**
	 *used to give all languages a unique id
	 */
	var last_language_id = 0;

	/**
	 * main function, entry point for the application,
	 * sets up D3,
	 * starts up other event handlers that drive the rest of the application
	 */
	function main(){
		//load the default data

		ForceGraph.setGroupRingSize(parseFloat($('#UI_subgraph_seperation').val()));
		ForceGraph.setDrawNodeLabels($('#UI_draw_node_labels').prop('checked'));
		calculate_distance = $('#UI_calculate_distance').prop('checked');
		ForceGraph.setMinimumDrawStrength(parseFloat($('#UI_minimum_draw_strength').val()));
		setScale($('#UI_scaling').val());
		setNormalizeStrengths($('#UI_draw_node_labels').prop('checked'));

		UI.startLightBox('Loading Data...');
		setTimeout(function(){
			loadData(PreprocessedData, function(source_data){
				ForceGraph.setSVG(d3.select(".ForceGraph").append("svg"));
				MatrixView.setTable($(".MatrixView table"));

				//this should be done in an ajax call if we end up with non-static data

				//reset the highlighted links
				Application.highlightNode(null);

				application_data = source_data;
				setData(application_data);

				UI.stopLightBox();
			});
		},100);
	}

	function setData(data, clear_selection){
		set_data_timer = null;
		application_data = data;
		if(typeof(clear_selection) === 'undefined' || clear_selection){
			clearSelection();
		}
		ForceGraph.setData(application_data);
		MatrixView.setData(application_data);
	}

	/**
	 * load json data into appropriate node/link format
	 */
	function loadData(input_data, finished) {
		var built_data = new Object();

		built_data.languages = JSON.parse(JSON.stringify(input_data.languages));
		built_data.languages.forEach(function(language){
			language.id = ++last_language_id;
		});
		
		built_data.nodes = buildFeatureNodes(input_data);
		built_data.nodes.forEach(function(node){
			node.group = 0;	//I think it's safe to assume that the initial graph is fully connected, because it seems to be every time we load it
		});
		/*
		//old serial method
		built_data.links = buildLinks(built_data);
		finished(built_data);
		*/
		//newfangled parallel method
		UI.startLightBox('Building Correlations...');
		buildLinksParallel(
			built_data,
			function(links){
				built_data.links = links;
				finished(built_data);
			}
		);
	}

	/**
	 * Build data feature nodes from given json data
	 */
	function buildFeatureNodes(data) {

		var nodes = [];
		var features = JSON.parse(JSON.stringify(data.nodes));

		//populate nodes with feature data
		for(feature in features) {
			nodes.push({
				"id":features[feature].id,
				"name":features[feature].name,
				"type":features[feature].type,
				"author":features[feature].author,
				"area":features[feature].area,
				"language_count":features[feature].language_count,
				"values":features[feature].values
			});
		}
		return nodes;
	}

	/**
	 * given two sorted lists of primitives calculate a list that is their intersection
	 */
	function intersection(a, b){
		var x=0,y=0,ret=[];
		while (x<a.length && y<b.length){
			if (a[x] === b[y]){
				ret.push(a[x]);
				x++;
				y++;
	 
			//if current element of `a` is smaller than current element of `b`
			//then loop through `a` until we found an element that is equal or greater
			//than the current element of `b`.
			}else if (a[x]<b[y]){
				x++;
			//same but for `b`
			}else{
				y++;
			}
		}
		return ret;
	}

	/**
	 * Given some feature's values object, flattens to a single array of languages
	 */
	function flattenValues(valuesObj) {
		return Object.keys(valuesObj) //get keys for the values
			.map(function(key){return valuesObj[key]}) //get the arrays matched to those keys
			.reduce(function(a,b){return a.concat(b)}); //flatten the arrays down to a single arrray
	}

	/**
	 * fast approximation of lat/lon distance
	 * using dot product
	 */
	function fastDistLatLon(x1, y1, z1, x2, y2, z2) {
		return x1*x2 + y1*y2 + z1*z2;
	}

	/**
	 * Given two features, calculate the strength values
	 */
	function calculateStrength(feature1, feature2, data){
		var value1;
		var value2;
		var interfamily_strength = 0;
		var intersubfamily_strength = 0;
		var intergenus_strength = 0;
		var interlanguage_strength = 0;
		var intersecting_languages = [];
		var f1_v1_langs = [];
		var f2_v2_langs = [];
		var expected_probability = 0;
		var actual_probability = 0;
		var correlation = 0;
		var distance = 1.0; //dot product
		var distance_threshold = 0.9;
		//flatten values
		var feature1_langs = flattenValues(data.nodes[feature1]["values"]).sort(function(a,b){return a-b});
		var feature2_langs = flattenValues(data.nodes[feature2]["values"]).sort(function(a,b){return a-b});
		var shared_langs = intersection(feature1_langs, feature2_langs);
		if(shared_langs.length <= 1) {
			return null;
		}

		//using object keys provides a little performance boost
		var keys1 = Object.keys(data.nodes[feature1]["values"]);
		var keys2 = Object.keys(data.nodes[feature2]["values"]);
		//every value for first feature
		for(var a = 0; a < keys1.length; a++) {
			f1_v1_langs = intersection(shared_langs, data.nodes[feature1]["values"][keys1[a]]);
			//every value for second fature
			for(var b = 0; b < keys2.length; b++) {
				f2_v2_langs = intersection(shared_langs, data.nodes[feature2]["values"][keys2[b]]);
				intersecting_languages = intersection(f1_v1_langs, f2_v2_langs);
				expected_probability = (f1_v1_langs.length) * ((f2_v2_langs.length) / (shared_langs.length*shared_langs.length));
				actual_probability = intersecting_languages.length/shared_langs.length;
				var current_correlation = actual_probability - expected_probability;
				//only account for positive correlations
				if(current_correlation > 0) {
					correlation += current_correlation;
				}

				for(var i = 0; i < intersecting_languages.length; i++)
				{
					for(var j = i+1; j < intersecting_languages.length; j++)
					{
						if(calculate_distance) {
							distance = fastDistLatLon(
								data.languages[intersecting_languages[i]].x,
								data.languages[intersecting_languages[i]].y,
								data.languages[intersecting_languages[i]].z,
								data.languages[intersecting_languages[j]].x,
								data.languages[intersecting_languages[j]].y,
								data.languages[intersecting_languages[j]].z
							);
							if(distance > distance_threshold) {
								interlanguage_strength += 1;
								continue;
							}
						}
						if(data.languages[intersecting_languages[i]].family != data.languages[intersecting_languages[j]].family) {
							interfamily_strength += 1;
						}
						if(data.languages[intersecting_languages[i]].subfamily != data.languages[intersecting_languages[j]].subfamily) {
							intersubfamily_strength += 1;
						}
						if(data.languages[intersecting_languages[i]].genus != data.languages[intersecting_languages[j]].genus) {
							intergenus_strength += 1;
						}
						interlanguage_strength += 1;
					}
				}
			}
		}

		return calculateScale({
			correlation:correlation,
			"original_strengths":{
				interfamily_strength:interfamily_strength,
				intersubfamily_strength:intersubfamily_strength,
				intergenus_strength:intergenus_strength,
				interlanguage_strength:interlanguage_strength
			},
			"scaled_strengths":{ //this will get calculated via a call to calculateScale
				interfamily_strength:0,
				intersubfamily_strength:0,
				intergenus_strength:0,
				interlanguage_strength:0
			}
		});
	}

	/**
	 * do the same thing as the regular buildLinks, but do it using the magic of PARALLELISM!!!
	 * rather than returning it's result it passes it to the given callback
	 */
	function buildLinksParallel(data, done){
		console.time('calc str parallel');

		//first off, if we are building links, then we don't need the links, so if they are there, kill them
		if('links' in data){
			delete data.links;
		}

		var batches = [];

		//arbitrarily deciding to use 4 batches
		for(var i = 0; i<4; i++){
			batches.push([]);
		}

		for(var i = 0; i<data.nodes.length; i++){
			batches[i%batches.length].push(i);
		}

		//make a new parallel processor that will operate on the batches
		var processor = new Parallel(
			batches,
			{
				env:{
					data:data,					//give all threads a copy of all the data
					calculate_distance:calculate_distance,		//we need to inject this and we can apparently only have one global imported object
					scaling_mode:scaling_mode,			//calculate scaling needs this
					normalize_strengths:normalize_strengths		//and this also
				},
				envNamespace:'application'
			}
		);

		//give our threads access to the functions they will need
		processor.require({fn:calculateStrength, name:'calculateStrength'});
		processor.require({fn:intersection, name:'intersection'});
		processor.require({fn:flattenValues, name:'flattenValues'});
		processor.require({fn:calculateScale, name:'calculateScale'});

		//hold on to your buts we're going to do stuff
		processor.map(function (features){

			//look at me making global variables here
			calculate_distance = global.application.calculate_distance;
			scaling_mode = global.application.scaling_mode;
			normalize_strengths = global.application.normalize_strengths;

			var links = [];
			//loop through every feature
			for(var i = 0; i < features.length; i++) {
				feature1 = features[i];
				//compare to every OTHER feature
				for(var feature2 = feature1+1; feature2 < global.application.data.nodes.length; feature2++) {
					var strength = calculateStrength(feature1, feature2, global.application.data);
					if(strength != null && strength.original_strengths.interlanguage_strength > 0){
						links.push({
							"source":feature1,
							"target":feature2,
							"correlation":strength.correlation,
							"original_strengths":strength.original_strengths,
							"scaled_strengths":strength.scaled_strengths
						});
					}
				}
			}
			return links;
		})
		.then(function(result){
			var links = [];
			result.forEach(function(link_subset){
				links = links.concat(link_subset);
			});
			links.forEach(function(link){
				link.source = data.nodes[link.source];
				link.target = data.nodes[link.target];
			});
			console.timeEnd('calc str parallel');
			done(links);
		});
	}

	/**
	 * Build data links from existing language data and node data
	 */
	function buildLinks(data) {
		console.time('calc str');
		var links = [];
		var feature1;
		var feature2;
		//loop through every feature
		for(var feature1 = 0; feature1 < data.nodes.length; feature1++) {
			//compare to every OTHER feature
			for(var feature2 = feature1+1; feature2 < data.nodes.length; feature2++) {
				var strength = calculateStrength(feature1, feature2, data);
				if(strength != null && strength.original_strengths.interlanguage_strength > 0){
					links.push({
						"source":data.nodes[feature1],
						"target":data.nodes[feature2],
						"correlation":strength.correlation,
						"original_strengths":strength.original_strengths,
						"scaled_strengths":strength.scaled_strengths
					});
				}
			}
		}

		console.timeEnd('calc str');
		return links;
	}

	/**
	 * Collapse the given list of features into one
	 */
	function collapseFeatures(data, features, onDone){
		//sorting in reverse makes for easier removal
		features.sort(function(a,b){return b-a;});
		custom_node_count++;
		var new_id = "custom_feature_"+custom_node_count;
		var new_name = "Custom Feature: ";
		var new_type = "custom_feature_"+custom_node_count;
		var new_values = new Object();
		var new_language_count = 0;
		for(i in features) {
			new_name += data.nodes[features[i]].name + " / ";
			for(value in data.nodes[features[i]]["values"]) {
				new_values[data.nodes[features[i]].id+"-"+value] = data.nodes[features[i]]["values"][value];
			}
			data.nodes.splice(features[i],1);
			for(var j = features[i]; j < data.nodes.length; j++) {
				data.nodes[j].index--;
			}
		}
		data.nodes.push({
			"id":new_id,
			"name":new_name.slice(0,-3),
			"type":new_type,
			"index":data.nodes.length-1, //required for d3
			"values":new_values
		});

		buildLinksParallel(data, function(links){
			data.links = links;
			makeSubgraphs(application_data);
			onDone();
		});
		/*
		data.links = buildLinks(data);
		makeSubgraphs(application_data);
		*/
	}

	/**
	 *UI callable function for collapsing features and setting it into the visualization
	 */
	function callCollapseFeatures() {
		UI.startLightBox('Collapsing Features...');

		if(selected_data.nodes.length < 1){
			return;
		}
		var features = [];
		for(selected_node in selected_data.nodes) {
			for(application_node in application_data.nodes) {
				if(application_data.nodes[application_node].id == selected_data.nodes[selected_node].id) {
					features.push(application_node);
				}
			}
		}
		collapseFeatures(
			application_data,
			features,
			function(){
				setData(application_data, true);
				UI.stopLightBox();
			}
		);
	}

	/**
	 * cuts out all links less than the specified amount, subtracts that from what's left
	 */
	function floorData(data, threshold){
		data = JSON.parse(JSON.stringify(data))
		for(var i = 0; i<data.links.length; i++){
			if(data.links[i].scaled_strengths.interlanguage_strength <=threshold){
				data.links.splice(i, 1);
				i--;
			}
			else{
				data.links[i].scaled_strengths.interlanguage_strength -= threshold;
			}
		}

		makeSubgraphs(data);
	
		return data;
	}


	/**
	 *UI callable function for flooring the data and setting it into the visualization
	 */
	function setFlooredData(threshold){
		application_data = floorData(source_data, threshold);
		setData(application_data);
	}

	/**
	 * removes a bunch of nodes
	 */
	function removeNodes(nodes_to_remove){
		var removed_nodes = [];
		//convert to a list of ids
		for(var i = 0; i<nodes_to_remove.length; i++){
			nodes_to_remove[i] = nodes_to_remove[i].id;
		}
		for(var i = application_data.nodes.length-1; i>=0; i--){
			var cur_node = application_data.nodes[i];
			if(nodes_to_remove.indexOf(cur_node.id) !== -1){
				removed_nodes.push(cur_node.id);
				application_data.nodes.splice(i,1);
			}
		};
		//update index
		for(var i = application_data.nodes.length-1; i>=0; i--){
			application_data.nodes[i].index = i;
		};
		for(var i = application_data.links.length-1; i>=0; i--){
			var cur_link = application_data.links[i];
			if(removed_nodes.indexOf(cur_link.source.id) !== -1 || removed_nodes.indexOf(cur_link.target.id) !== -1){
				application_data.links.splice(i,1);
			}
		};		
	}

	/**
	 * Forms nodes into groups
	 * deletes any single nodes
	 */
	function makeSubgraphs(data){
		console.time('makeSubgraphs');
		var group_counter = 0;
		var nodes_removed = false;
		function findNodeIndexById(node_id) {
			for(i in data.nodes) {
				if(data.nodes[i].id == node_id) {
					return i;
				}
			}
			throw "could not find node with id: "+node_id;
		}
		//TODO: this can be greatly optimized by giving nodes adjacency lists during preprocessing!
		function visit_neighbors(source) {
			var target;
			for(var j = 0; j<data.links.length; j++) {
				if(data.links[j].source.id == source.id) {
					target = data.nodes[findNodeIndexById(data.links[j].target.id)];
					if(target.group != null){
						if(target.group == source.group) {
							continue;
						}
						//target has a group, this is a problem
						throw "Target has different group than source!"
					} else if(source.group != null){
						//we have a group, add target to it
						target.group = source.group;
						visit_neighbors(target);
					} else {
						//make a new group for ourselves and target
						source.group = target.group = group_counter;
						group_counter++;
						visit_neighbors(target);
					}
				}else if(data.links[j].target.id == source.id) {
					target = data.nodes[findNodeIndexById(data.links[j].source.id)];
					if(target.group != null){
						if(target.group == source.group) {
							continue;
						}
						//target has a group, this is a problem
						throw "Target has different group than source!"
					} else if(source.group != null){
						//we have a group, add target to it
						target.group = source.group;
						visit_neighbors(target);
					} else {
						//make a new group for ourselves and target
						source.group = target.group = group_counter;
						group_counter++;
						visit_neighbors(target);
					}
				}
			}
		}
		//reset all groups to null
		for (var i = 0; i<data.nodes.length; i++){
			data.nodes[i].group = null;
		}
		for (var i = 0; i<data.nodes.length; i++){
			source = data.nodes[i];
			//only mark for deletion if we aren't in a group and never find one
			if(source.group == null){
				visit_neighbors(source)
			}
		}
		//now actually delete things
		var nodes_to_remove = []
		for(var i = 0; i<data.nodes.length; i++){
			if(data.nodes[i].group == null || data.nodes[i].group == undefined) {
				nodes_to_remove.push(data.nodes[i]);
			}
		}
		removeNodes(nodes_to_remove);

		console.timeEnd('makeSubgraphs');

		return data;
	}

	/**
	 * calculate a scale for a given link
	 */
	function calculateScale(link){
		switch(scaling_mode){
			case 'linear':
				for(type in link.original_strengths){
					link.scaled_strengths[type] = link.original_strengths[type];
				}
			break;

			case 'logorithmic':
				for(type in link.original_strengths){
					link.scaled_strengths[type] = Math.log(link.original_strengths[type]+1);
				}
			break;

			case	'quadratic':
				for(type in link.original_strengths){
					link.scaled_strengths[type] = Math.pow(link.original_strengths[type], 2);
				}
			break;

			case	'4th_pow':
				for(type in link.original_strengths){
					link.scaled_strengths[type] = Math.pow(link.original_strengths[type], 4);
				}
			break;

			case	'root':
				for(type in link.original_strengths){
					link.scaled_strengths[type] = Math.sqrt(link.original_strengths[type]);
				}
			break;

			case	'language':
				for(type in link.original_strengths){
					link.scaled_strengths[type] = Math.sqrt(link.original_strengths[type]*8)/2;
				}
			break;

			default:
				throw "invalid scaling mode '"+scaling_mode+"'";
		}

		var interlanguage_strength = link.scaled_strengths.interlanguage_strength;
		for(type in link.original_strengths){
			if(normalize_strengths){
				link.scaled_strengths[type] /= interlanguage_strength;
			}
			link.scaled_strengths[type] *= link.correlation;
		}

		return link;
	}

	/**
	 *change the scale mode
	 */
	function setScale(mode, data){
		if(typeof(data) === 'undefined'){
			data = application_data;
		}

		scaling_mode = mode;

		data.links.forEach(function(link){
			link = calculateScale(link);
		});
	}

	/**
	 *change the scale mode
	 */
	function setNormalizeStrengths(normalize){

		normalize_strengths = normalize;

		application_data.links.forEach(function(link){
			link = calculateScale(link);
		});
	}



	/**
	 * give it a node to highlight
	 * give it null to unhighlight the node
	 * highlighting a new node without first unhighlighting the previous node is undefined
	 * highlighting a new node without first unhighlighting a previous link is also undefined
	 */
	function highlightNode(node){
		ForceGraph.setHighlightedNode(node);
		MatrixView.setHighlightedNode(node);
		UI.highlightNodeSearchResults(node);
	}

	/**
	 * give it a link to highlight
	 * give it null to unhighlight the link
	 * highlighting a new link without first unhighlighting the previous link is undefined
	 * highlighting a new link without first unhighlighting a previous node is also undefined
	 */
	function highlightLink(node){
		ForceGraph.setHighlightedLink(node);
		MatrixView.setHighlightedLink(node);
		UI.highlightLinkSearchResults(node);
	}

	function selectionChanged(){
		if(typeof(selectionChanged.selection_timmer) === 'undefined'){
			selectionChanged.selection_timmer = null;
		}
		if(selectionChanged.selection_timmer){
			clearTimeout(selectionChanged.selection_timmer);
		}
		selectionChanged.selection_timmer = setTimeout(function(){
			selection_timmer = null;
			ForceGraph.selectionChanged(selected_data);
			MatrixView.selectionChanged(selected_data);
			UI.selectionChanged(selected_data);
		}, 100);
	}

	/**
	 * adds a link to the set of selected
	 */
	function selectLink(link){
		selected_data.links.push(link);
		selectionChanged();
	}

	/**
	 * adds a node to the set of selected
	 */
	function selectNode(node){
		selected_data.nodes.push(node);
		selectionChanged();
	}

	/**
	 * adds a node to the set of selected
	 */
	function selectLanguage(language){
		selected_data.languages.push(language);
		selectionChanged();
	}

	/**
	 * removes a link from the set of selected
	 */
	function unselectLink(link){
		for(var i = selected_data.links.length-1; i>-1; i--){
			var cur_link = selected_data.links[i]
			if(cur_link.source.id === link.source.id && cur_link.target.id === link.target.id){
				selected_data.links.splice(i, 1);
			}
		}
		selectionChanged();
	}

	/**
	 * removes a node from the set of selected
	 */
	function unselectNode(node){
		for(var i = selected_data.nodes.length-1; i>-1; i--){
			var cur_node = selected_data.nodes[i]
			if(cur_node.id === node.id){
				selected_data.nodes.splice(i, 1);
			}
		}
		selectionChanged();
	}

	/**
	 * removes a language from the set of selected
	 */
	function unselectLanguage(language){
		for(var i = selected_data.languages.length-1; i>-1; i--){
			var cur_language = selected_data.languages[i]
			if(cur_language.id === language.id){
				selected_data.languages.splice(i, 1);
			}
		}
		selectionChanged();
	}

	/**
	 *returns true if the passed link is selected
	 */
	function linkIsSelected(link){
		var is_selected = false;
		selected_data.links.forEach(function(cur_link){
			if(cur_link.source.id === link.source.id && cur_link.target.id === link.target.id){
				is_selected = true;
			}
		});
		return is_selected;
	}

	/**
	 *returns true if the passed node is selected
	 */
	function nodeIsSelected(node){
		var is_selected = false;
		selected_data.nodes.forEach(function(cur_node){
			if(cur_node.id === node.id){
				is_selected = true;
			}
		});
		return is_selected;
	}

	/**
	 *returns true if the passed language is selected
	 */
	function languageIsSelected(language){
		var is_selected = false;
		selected_data.languages.forEach(function(cur_language){
			if(cur_language.id === language.id){
				is_selected = true;
			}
		});
		return is_selected;
	}

	/**
	 * unselects everything
	 */
	function clearSelection(type){
		if(typeof(type) === 'undefined' || type === 'node'){
			selected_data.nodes = [];
		}
		if(typeof(type) === 'undefined' || type === 'link'){
			selected_data.links = [];
		}
		if(typeof(type) === 'undefined' || type === 'language'){
			selected_data.languages = [];
		}
		selectionChanged();
	}

	/**
	 * selects everything
	 */
	function selectAll(type){
		if(typeof(type) === 'undefined' || type === 'node'){
			selected_data.nodes = [];
			application_data.nodes.forEach(function(node){
				selected_data.nodes.push(node);
			});
		}
		if(typeof(type) === 'undefined' || type === 'link'){
			selected_data.links = [];
			application_data.links.forEach(function(link){
				selected_data.links.push(link);
			});
		}
		if(typeof(type) === 'undefined' || type === 'language'){
			selected_data.languages = [];
			application_data.languages.forEach(function(language){
				selected_data.languages.push(language);
			});
		}
		selectionChanged();
	}

	/**
	 * selects everything unselected and unselects everything selected
	 * @param type optional string, link, node, language, if ont given inverts everything
	 */
	function invertSelection(type){
		var new_nodes = [];
		var new_links = [];
		var new_languages = [];
		//yeah, this is _horribly_ inefficent, does it really matter? is this function a performance nottleneck?
		if(typeof(type) === 'undefined' || type === 'link'){
			application_data.links.forEach(function(cur_link){
				if(!linkIsSelected(cur_link)){
					new_links.push(cur_link);
				}
			});			
			selected_data.links = new_links;
		}
		if(typeof(type) === 'undefined' || type === 'node'){
			application_data.nodes.forEach(function(cur_node){
				if(!nodeIsSelected(cur_node)){
					new_nodes.push(cur_node);
				}
			});
			selected_data.nodes = new_nodes;
		}
		if(typeof(type) === 'undefined' || type === 'language'){
			application_data.languages.forEach(function(cur_language){
				if(!languageIsSelected(cur_language)){
					new_languages.push(cur_language);
				}
			});
			selected_data.languages = new_languages;
		}
		selectionChanged();
	}

	/**
	 * if the link is selected unselect it, if it isn't select it
	 */
	function toggleLinkSelection(link){
		if(linkIsSelected(link)){
			unselectLink(link);
		}
		else{
			selectLink(link);
		}
	}

	/**
	 * if the node is selected unselect it, if it isn't select it
	 */
	function toggleNodeSelection(node){
		if(nodeIsSelected(node)){
			unselectNode(node);
		}
		else{
			selectNode(node);
		}
	}

	/**
	 * if the language is selected unselect it, if it isn't select it
	 */
	function toggleLanguageSelection(language){
		if(languageIsSelected(language)){
			unselectLanguage(language);
		}
		else{
			selectLanguage(language);
		}
	}

	/**
	 *removes selected things from the graph
	 */
	function removeSelected(type, do_unselected){
		do_unselected = !!do_unselected;//booleanify this
		//remove selected links
		if(typeof(type) === 'undefined' || type === 'link'){
			for(var i = application_data.links.length-1; i>=0; i--){
				var cur_link = application_data.links[i];
				if(do_unselected != linkIsSelected(cur_link)){
					application_data.links.splice(i,1);
				}
			};
		}
		//remove selected nodes, and remove associated links
		if((typeof(type) === 'undefined' || type === 'node') && selected_data.nodes.length > 0){
			removeNodes(selected_data.nodes);
		}
		//remove selected languages, and update/remove links
		if((typeof(type) === 'undefined' || type === 'language') && selected_data.languages.length > 0){
			//remove selected languages
			for(var i = application_data.languages.length-1; i>=0; i--){
				var cur_language = application_data.languages[i];
				if(do_unselected != languageIsSelected(cur_language)){
					application_data.languages.splice(i,1);
					for(var k = 0; k<application_data.nodes.length; k++){
						for(value in application_data.nodes[k].values){
							for(var j = application_data.nodes[k].values[value].length-1; j>=0; j--){
								if(application_data.nodes[k].values[value][j] === i){
									application_data.nodes[k].values[value].splice(j,1);
								}
								else if(application_data.nodes[k].values[value][j] > i){
									application_data.nodes[k].values[value][j]--;
								}
							}
						}
					}
				}
			};
			//recalculate link strength
			//remove 0 strength links
			for(var i = application_data.links.length-1; i>=0; i--){
				var cur_link = application_data.links[i];
				var strength = calculateStrength(cur_link.source.index, cur_link.target.index, application_data);
				if(!strength || !strength.scaled_strengths.interlanguage_strength){
					application_data.links.splice(i,1);
				}
				else{
					cur_link.correlation = strength.correlation;
					cur_link.original_strengths = strength.original_strengths;
					cur_link.scaled_strengths = strength.scaled_strengths;
				}
			};
		}
		UI.clearSearchResults();
		clearSelection();
		//application_data = makeSubgraphs(application_data);
		setData(application_data);
	}

	/**
	 *removes unselected things from the graph
	 */
	function removeUnselected(type){
		removeSelected(type, true);
	}

	/*************************\
	|* data access utilities *|
	\*************************/

	/**
	 * gets the node with the specified id from the application_data
	 * returns null if no node has that id
	 */
	function getNode(id){
		for(var i = 0; i<application_data.nodes.length; i++){
			if(application_data.nodes[i].id === id){
				return application_data.nodes[i];
			}
		}
		return null;
	}

	/**
	 * gets the link with the specified ids from the application_data
	 * returns null if no link has that set of ids
	 */
	function getLink(id_a, id_b){
		for(var i = 0; i<application_data.links.length; i++){
			if(
				application_data.links[i].source.id === id_a && application_data.links[i].target.id === id_b
				||
				application_data.links[i].source.id === id_b && application_data.links[i].target.id === id_a
			){
				return application_data.links[i];
			}
		}
		return null;
	}

	/**
	 * gets a language by it's name (we can probably make some sort of id)
	 */
	function getLanguage(id){
		for(var i = 0; i<application_data.languages.length; i++){
			if(application_data.languages[i].id === id){
				return application_data.languages[i];
			}
		}
		return null;
	}

	/**
	 * gets a language by it's position in the language array
	 */
	function getLanguageByIndex(idx){
		return application_data.languages[idx];
	}

	/**
	 * searches on features
	 * @param id regex
	 * @param name regex
	 * @param language_count number
	 * @param area regex
	 * @param values [regex]
	 * @return [features] -- references to features in application_data
	 */
	function searchFeature(id, name, author, language_count, area, values){
		var results = [];
		application_data.nodes.forEach(function(d){
			var has_values = false;
			for(val in d.values){
				if(values.test(val)){
					has_values = true;
					break;
				}
			};
			if(
					id.test(d.id)
				&&
					name.test(d.name)
				&&
					author.test(d.author)
				&&
					(Number.isNaN(language_count) || d.language_count == language_count)
				&&
					area.test(d.area)
				&&
					has_values
			){
				results.push(d);
			}
		});
		return results;
	}



	/**
	 * searches on links
	 * @param feature regex
	 * @param total_strength_min number
	 * @param total_strength_max number
	 * @param interfamily_strength_min number
	 * @param interfamily_strength_max number
	 * @param intersubfamily_strength_min number
	 * @param intersubfamily_strength_max number
	 * @param intergenus_strength_min number
	 * @param intergenus_strength_max number
	 * @param interlanguage_strength_min number
	 * @param interlanguage_strength_max number
	 * @return [features] -- references to features in application_data
	 */
	function searchLink(
		feature,
		total_strength_min,
		total_strength_max,
		interfamily_strength_min,
		interfamily_strength_max,
		intersubfamily_strength_min,
		intersubfamily_strength_max,
		intergenus_strength_min,
		intergenus_strength_max,
		interlanguage_strength_min,
		interlanguage_strength_max
	){
		var results = [];
		application_data.links.forEach(function(d){
			if(
					(feature.test(d.source.id) || feature.test(d.target.id))
				&&
					(Number.isNaN(total_strength_min) || d.scaled_strengths.interlanguage_strength >= total_strength_min)
				&&
					(Number.isNaN(total_strength_max) || d.scaled_strengths.interlanguage_strength <= total_strength_max)
				&&
					(Number.isNaN(interfamily_strength_min) || d.scaled_strengths.interfamily_strength >= interfamily_strength_min)
				&&
					(Number.isNaN(interfamily_strength_max) || d.scaled_strengths.interfamily_strength <= interfamily_strength_max)
				&&
					(Number.isNaN(intersubfamily_strength_min) || d.scaled_strengths.intersubfamily_strength >= intersubfamily_strength_min)
				&&
					(Number.isNaN(intersubfamily_strength_max) || d.scaled_strengths.intersubfamily_strength <= intersubfamily_strength_max)
				&&
					(Number.isNaN(intergenus_strength_min) || d.scaled_strengths.intergenus_strength >= intergenus_strength_min)
				&&
					(Number.isNaN(intergenus_strength_max) || d.scaled_strengths.intergenus_strength <= intergenus_strength_max)
				&&
					(Number.isNaN(interlanguage_strength_min) || d.scaled_strengths.interlanguage_strength >= interlanguage_strength_min)
				&&
					(Number.isNaN(interlanguage_strength_max) || d.scaled_strengths.interlanguage_strength <= interlanguage_strength_max)
			){
				results.push(d);
			}
		});
		return results;
	}




	/**
	 * searches on languages
	 * for lat/lon search if distance is nan, then exact values are expected for lat/lon
	 * if lat or lon is nan only non-nan values will be tested, 
	 * @param family regex
	 * @param subfamily regex
	 * @param genus regex
	 * @param name regex
	 * @param latitude number
	 * @param longitude number
	 * @param distance number
	 * @return [features] -- references to features in application_data
	 */
	function searchLanguage(family, subfamily, genus, name, latitude, longitude, distance){

		function distLatLon(lat1, lon1, lat2, lon2){
			var R = 6371; //earth radius, Km
			var d_lat = lat2-lat1;
			var d_lon = lon2-lon1;
			var angle = 0.5 - Math.cos(d_lat)/2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*(1-Math.cos(d_lon))/2;

			return Math.asin(Math.sqrt(angle))*2*R;
		}

		var results = [];
		
		application_data.languages.forEach(function(d){

			var dist_check_clear = true;

			//if either lat or lon is set to a search on position
			if(!Number.isNaN(latitude) || !Number.isNaN(longitude)){
				var lat = latitude;
				var lon = longitude;
				if(Number.isNaN(lat)){
					lat = d.latitude;
				}
				if(Number.isNaN(lon)){
					lon = d.longitude;
				}
			
				//do a full distance check
				var language_distance = distLatLon(lat, lon, d.latitude, d.longitude);
				if(language_distance > distance){
					dist_check_clear = false;
				}
			}

			if(
					dist_check_clear
				&&
					family.test(d.family)
				&&
					subfamily.test(d.subfamily)
				&&
					genus.test(d.genus)
				&&
					name.test(d.name)
			){
				results.push(d);
			}
		});
		return results;
	}

	return {
		main:main,
		setMinimumCorrelation:setFlooredData,
		setSubgraphSeparation:function(d){ForceGraph.setGroupRingSize(d);},
		setDrawNodeLabels:function(d){ForceGraph.setDrawNodeLabels(d);},
		setCalculateDistance:function(d){calculate_distance = d;},
		setMinimumDrawStrength:function(d){ForceGraph.setMinimumDrawStrength(d);},
		setDrawMatrixLabels:function(d){MatrixView.setDrawLabels(d);},
		setCorrelationType:function(d){MatrixView.setCorrelationType(d);},
		setScale:function(d){setScale(d); setData(application_data, false);},
		setNormalizeStrengths:function(d){setNormalizeStrengths(d); setData(application_data, false);},
		sortMatrix:MatrixView.sortMatrix,
		highlightNode:highlightNode,
		highlightLink:highlightLink,
		loadData:loadData,
		collapseFeatures:callCollapseFeatures,
		intersection:intersection,
		flattenValues:flattenValues,
		/*selection related functions*/
		selectLink:selectLink,
		selectNode:selectNode,
		unselectLink:unselectLink,
		unselectNode:unselectNode,
		clearSelection:clearSelection,
		selectAll:selectAll,
		invertSelection:invertSelection,
		toggleNodeSelection:toggleNodeSelection,
		toggleLinkSelection:toggleLinkSelection,
		toggleLanguageSelection:toggleLanguageSelection,
		nodeIsSelected:nodeIsSelected,
		linkIsSelected:linkIsSelected,
		languageIsSelected:languageIsSelected,
		selectLanguage:selectLanguage,
		unselectLanguage:unselectLanguage,
		getLanguage:getLanguage,
		getLanguageByIndex:getLanguageByIndex,
		removeSelected:removeSelected,
		removeUnselected:removeUnselected,
		/*data access functions*/
		getNode:getNode,
		getLink:getLink,
		/*search related functions*/
		searchFeature:searchFeature,
		searchLink:searchLink,
		searchLanguage:searchLanguage,
		calculateStrength:calculateStrength //exposed to allow for parallel processing
	};
}());



















































