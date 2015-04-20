var Application = (function(){
	/**
	 * Holds parsed json data for nodes/links
	 */
	var source_data = new Object();

	/**
	 * main function, entry point for the application,
	 * sets up D3,
	 * starts up other event handlers that drive the rest of the application
	 */
	function main(){
		ForceGraph.setSVG(d3.select(".ForceGraph").append("svg"));
		MatrixView.setTable(d3.select(".MatrixView").append("table"));

		//this should be done in an ajax call if we end up with non-static data

		//ForceGraph.setData(JSON.parse(JSON.stringify(test_data)));
		setFlooredData(0);
		ForceGraph.setGroupRingSize(5000);

		//reset the highlighted links
		Application.highlightNode(null);
	}

	/**
	 * load preprocessed data into appropriate node/link format
	 */
	function loadSourceData(src_data) {
		console.time("loadtime");
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

		source_data.nodes = [];
		source_data.links = [];

		var features = JSON.parse(JSON.stringify(src_data.features));
		var feature1;
		var feature2;
		var value1;
		var value2;
		var strength = 0;
		//loop through every feature
		for(var feature1 = 0; feature1 < features.length; feature1++) {
			//take the opportunity to populate nodes with feature data
			source_data.nodes.push({"id":features[feature1].id,"name":features[feature1].name});
			//every value for this feature
			for(value1 in features[feature1]["values"]) {
				//compare to every OTHER feature
				for(var feature2 = feature1+1; feature2 < features.length; feature2++) {
					//reset
					strength = 0;
					//every value for every OTHER fature
					for(value2 in features[feature2]["values"]) {
						//strength = # of intersecting languages
						strength += intersection(
								features[feature1]["values"][value1],
								features[feature2]["values"][value2]
								).length;
					}
					if(strength > 0) {
						//populate links with intersection data
						source_data.links.push({
							"source":feature1,
							"target":feature2,
							"strength":strength
						});
					}
				}
			}
		}
		console.timeEnd("loadtime");
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
		var data = floorData(source_data, threshold);
		ForceGraph.setData(data);
		MatrixView.setData(data);
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
		deletion_group.reverse();//needed because if you remove items [0,1], after you remove 0, 1 is now 0, but if you remove 1 first 0 doesn't change
		for(var i = 0; i<deletion_group.length; i++){
			data.nodes.splice(deletion_group[i], 1);
			for(var j = 0; j<data.links.length; j++){
				if(data.links[j].source >= deletion_group[i]){
					data.links[j].source--;
				}
				if(data.links[j].target >= deletion_group[i]){
					data.links[j].target--;
				}
			}
		}
	
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


	return {
		setMinimumCorrelation:setFlooredData,
		setSubgraphSeparation:function(d){ForceGraph.setGroupRingSize(d);},
		setDrawLinks:function(d){ForceGraph.setDrawLinks(d);},
		setDrawMatrixLabels:function(d){MatrixView.setDrawLabels(d)},
		highlightNode:highlightNode,
		highlightLink:highlightLink,
		loadSourceData:loadSourceData,
		main:main
	};
}());



















































