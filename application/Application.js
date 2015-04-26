var Application = (function(){
	/**
	 * Holds parsed json data for nodes/links
	 * is constant
	 */
	var source_data = new Object();

	/**
	 * holds a secondary copy of the data, this is the data in the form that the application is using during run time
	 * it is source data after filtering and transformations that happen from user input
	 */
	var application_data = new Object();

	/**
	 * list of links and nodes that are currently selected
	 */
	var selected_data = {
		links: [],
		nodes: []
	}; 

	/**
	 * Number of custom features created by collapsing features
	 */
	var custom_feature_count = 0;

	/**
	 * main function, entry point for the application,
	 * sets up D3,
	 * starts up other event handlers that drive the rest of the application
	 */
	function main(){
		//load the default data
		source_data = loadData(PreprocessedData);

		ForceGraph.setSVG(d3.select(".ForceGraph").append("svg"));
		MatrixView.setTable($(".MatrixView table"));

		//this should be done in an ajax call if we end up with non-static data

		//ForceGraph.setData(JSON.parse(JSON.stringify(test_data)));
		setFlooredData(0);
		ForceGraph.setGroupRingSize(5000);

		//reset the highlighted links
		Application.highlightNode(null);
	}

	/**
	 * load json data into appropriate node/link format
	 */
	function loadData(input_data) {
		var built_data = new Object();

		built_data.languages = JSON.parse(JSON.stringify(input_data.languages));
		built_data.nodes = buildFeatureNodes(input_data);
		built_data.links = buildLinks(built_data.nodes,built_data.languages);

		return built_data;
	}

	/**
	 * Build data feature nodes from given json data
	 */
	function buildFeatureNodes(data) {
		var nodes = [];
		var features = JSON.parse(JSON.stringify(data.features));

		//populate nodes with feature data
		for(feature in features) {
			nodes.push({
				"id":features[feature].id,
				"name":features[feature].name,
				"type":features[feature].type,
				"values":features[feature].values
			});
		}

		return nodes;
	}

	/**
	 * Build data links from existing language data and node data
	 */
	function buildLinks(nodes, languages) {
		//need an efficient intersection function for sorted arrays
		function intersection(a, b) {
			var x=0,y=0,ret=[];
			while (x<a.length && y<b.length) {
				if (a[x] === b[y]){
					ret.push(a[x]);
					x++;
					y++;
		 
				//if current element of `a` is smaller than current element of `b`
				//then loop through `a` until we found an element that is equal or greater
				//than the current element of `b`.
				} else if (a[x]<b[y]){
					x++;
				//same but for `b`
				} else {
					y++;
				}
			}
			return ret;
		}

		var links = [];
		var feature1;
		var feature2;
		var value1;
		var value2;
		var total_strength = 0;
		var interfamily_strength = 0;
		var intersubfamily_strength = 0;
		var intergenus_strength = 0;
		var interlanguage_strength = 0;
		var intersecting_languages;
		//loop through every feature
		for(var feature1 = 0; feature1 < nodes.length; feature1++) {
			//compare to every OTHER feature
			for(var feature2 = feature1+1; feature2 < nodes.length; feature2++) {
				//reset
				total_strength = interfamily_strength = intersubfamily_strength = intergenus_strength = interlanguage_strength = 0;
				//every value for first feature
				for(value1 in nodes[feature1]["values"]) {
					//every value for second fature
					for(value2 in nodes[feature2]["values"]) {
						intersecting_languages = intersection(
								nodes[feature1]["values"][value1],
								nodes[feature2]["values"][value2]
								);
						//strength = # of intersecting languages
						if(intersecting_languages.length > 1) {
							total_strength += intersecting_languages.length*(intersecting_languages.length-1)/2;
						}
						for(var i = 0; i < intersecting_languages.length; i++)
						{
							for(var j = i+1; j < intersecting_languages.length; j++)
							{
								if(languages[intersecting_languages[i]].family != languages[intersecting_languages[j]].family) {
									interfamily_strength++;
								} else if(languages[intersecting_languages[i]].subfamily != languages[intersecting_languages[j]].subfamily) {
									intersubfamily_strength++;
								} else if(languages[intersecting_languages[i]].genus != languages[intersecting_languages[j]].genus) {
									intergenus_strength++;
								} else {
									interlanguage_strength++;
								}
							}
						}
						//do some magic here if you want to create links from value-to-value
						//instead of feature-to-feature
					}
				}
				if(total_strength > 0) {
					//populate links with intersection data
					links.push({
						"source":nodes[feature1],
						"target":nodes[feature2],
						"total_strength":total_strength,
						"interfamily_strength":interfamily_strength,
						"intersubfamily_strength":intersubfamily_strength,
						"intergenus_strength":intergenus_strength,
						"interlanguage_strength":interlanguage_strength
					});
				}
			}
		}
		return links;
	}

	/**
	 * Collapse the given list of features into one
	 */
	function collapseFeatures(data, features){
		//sorting in reverse makes for easier removal
		features.sort();
		features.reverse();
		custom_feature_count++;
		var data = JSON.parse(JSON.stringify(data));
		var new_id = "custom_feature_"+custom_feature_count;
		var new_name = "Custom Feature: ";
		var new_type = "custom_feature_"+custom_feature_count;
		var new_values = new Object();
		for(i in features) {
			new_name += data.nodes[features[i]].name + " / ";
			for(value in data.nodes[features[i]]["values"]) {
				new_values[data.nodes[features[i]].id+"-"+value] = data.nodes[features[i]]["values"][value];
			}
			data.nodes.splice(features[i],1);
		}
		data.nodes.push({
			"id":new_id,
			"name":new_name.slice(0,-3),
			"type":new_type,
			"values":new_values
		});

		data.links = buildLinks(data.nodes, data.languages);
		data = makeSubgraphs(data);
		return data;
	}

	/**
	 *UI callable function for collapsing features and setting it into the visualization
	 */
	function callCollapseFeatures() {
		var features = [];
		for(selected_node in selected_data.nodes) {
			for(application_node in application_data.nodes) {
				if(application_data.nodes[application_node].id == selected_data.nodes[selected_node].id) {
					features.push(application_node);
				}
			}
		}
		application_data = collapseFeatures(application_data, features);
		clearSelection();
		ForceGraph.setData(application_data);
		MatrixView.setData(application_data);
	}

	/**
	 * cuts out all links less than the specified amount, subtracts that from what's left
	 */
	function floorData(data, threshold){
		data = JSON.parse(JSON.stringify(data))
		for(var i = 0; i<data.links.length; i++){
			if(data.links[i].total_strength <=threshold){
				data.links.splice(i, 1);
				i--;
			}
			else{
				data.links[i].total_strength -= threshold;
			}
		}

		data = makeSubgraphs(data);
	
		return data;
	}


	/**
	 *UI callable function for flooring the data and setting it into the visualization
	 */
	function setFlooredData(threshold){
		application_data = floorData(source_data, threshold);
		clearSelection();
		ForceGraph.setData(application_data);
		MatrixView.setData(application_data);
	}

	/**
	 * Forms nodes into groups
	 * deletes any single nodes
	 * operates directly on the reference passed to it!
	 */
	function makeSubgraphs(data){
		var data = JSON.parse(JSON.stringify(data));
		var group_counter = 0;
		function findNodeIndexById(node_id) {
			for(i in data.nodes) {
				if(data.nodes[i].id == node_id) {
					return i;
				}
			}
			throw "could not find node with id: "+node_id;
		}
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
		for (var i = 0; i<data.nodes.length; i++){
			source = data.nodes[i];
			//only mark for deletion if we aren't in a group and never find one
			if(source.group == null){
				visit_neighbors(source)
			}
		}
		//now actually delete things
		for(var i = 0; i<data.nodes.length; i++){
			if(data.nodes[i].group == null || data.nodes[i].group == undefined) {
				data.nodes.splice(i, 1);
				i--;
			}
		}
		//rebuild the links
		data.links = buildLinks(data.nodes, data.languages);

		return data;
	}

	/**
	 * give it a node to highlight
	 * give it null to unhighlight the node
	 * highlighting a new node without first unhighlighting the previous node is undefined
	 * highlighting a new node without first unhighlighting a previous link is also undefined
	 */
	function highlightNode(node){
		ForceGraph.setHighlightedNode(node);
		MatrixView.setHighlightedNode(node)
	}

	/**
	 * give it a link to highlight
	 * give it null to unhighlight the link
	 * highlighting a new link without first unhighlighting the previous link is undefined
	 * highlighting a new link without first unhighlighting a previous node is also undefined
	 */
	function highlightLink(node){
		ForceGraph.setHighlightedLink(node);
		MatrixView.setHighlightedLink(node)
	}

	function selectionChanged(){
		ForceGraph.selectionChanged(selected_data);
		MatrixView.selectionChanged(selected_data)
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
	 * unselects everything
	 */
	function clearSelection(){
		selected_data.nodes = [];
		selected_data.links = [];
		selectionChanged();
	}

	/**
	 * selects everything unselected and unselects everything selected
	 */
	function invertSelection(){
		var new_nodes = [];
		var new_links = [];
		//yeah, this is _horribly_ inefficent, does it really matter? is this function a performance nottleneck?
		selected_data.links.forEach(function(cur_link){
			if(!linkIsSelected(cur_link)){
				new_links.push(cur_link);
			}
		});
		selected_data.nodes.forEach(function(cur_node){
			if(!nodeIsSelected(cur_node)){
				new_node.push(cur_node);
			}
		});
		selected_data.links = new_links;
		selected_data.nodes = new_nodes;
		selectionChanged();
	}

	/**
	 * if the link is selected unselect it, if it isn't select it select it
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
	 * if the node is selected unselect it, if it isn't select it select it
	 */
	function toggleNodeSelection(node){
		if(nodeIsSelected(node)){
			unselectNode(node);
		}
		else{
			selectNode(node);
		}
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
	 * searches on features
	 * @param id string
	 * @param name string
	 * @param language_count number
	 * @param area string
	 * @param values [string]
	 * @return [features] -- references to features in application_data
	 */
	function searchFeature(id, name, author, language_count, area, values){
		var results = [];
		application_data.nodes.forEach(function(d){
			var has_all_values = true;
			for(var i = 0; i<values.length; i++){
				if(d.values.indexOf(values[i]) ==-1){
					has_all_values = false;
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
					has_all_values
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
		setDrawLinks:function(d){ForceGraph.setDrawLinks(d);},
		setDrawMatrixLabels:function(d){MatrixView.setDrawLabels(d)},
		highlightNode:highlightNode,
		highlightLink:highlightLink,
		loadData:loadData,
		collapseFeatures:callCollapseFeatures,
		/*selection related functions*/
		selectLink:selectLink,
		selectNode:selectNode,
		unselectLink:unselectLink,
		unselectNode:unselectNode,
		clearSelection:clearSelection,
		invertSelection:invertSelection,
		toggleNodeSelection:toggleNodeSelection,
		toggleLinkSelection:toggleLinkSelection,
		/*data access functions*/
		getNode:getNode,
		getLink:getLink,
		/*search related functions*/
		searchFeature:searchFeature
	};
}());



















































