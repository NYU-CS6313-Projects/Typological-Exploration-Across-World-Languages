var Application = (function(){

	/**
	 * main function, entry point for the application,
	 * sets up D3,
	 * starts up other event handlers that drive the rest of the application
	 */
	function main(){
		ForceGraph.setSVG(d3.select(".ForceGraph").append("svg"), window.innerHeight, window.innerWidth);

		//this should be done in an ajax call if we end up with non-static data
		//ForceGraph.setData(JSON.parse(JSON.stringify(test_data)));
		setFlooredData(0);
		ForceGraph.setGroupRingSize(500);
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


	return {
		setMinimumCorrelation:setFlooredData,
		setSubgraphSeparation:ForceGraph.setGroupRingSize,
		main:main
	};
}());



















































