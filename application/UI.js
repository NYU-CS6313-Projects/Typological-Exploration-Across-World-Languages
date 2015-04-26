var UI = (function(){
	$(document).ready(
		function() {
			setUpPanels();
			setUpTabs();
			setupFormHandlers();
		}
	);


	/**
	 *does the code for resizable pannels
	 */
	function setUpPanels(){
		$('.UI_resize *').on(
			'mousedown',
			function(event){
				$('.UI_resize').removeClass('selected');
				$(event.currentTarget).parents('.UI_resize').addClass('selected');
			}
		);
		$('.UI_resize .UI_tab').on(
			'mousedown',
			function(event){
				event.currentTarget.dragging = true;
			}
		);
		$('.UI_resize .UI_tab').on(
			'mouseup',
			function(event){
				event.currentTarget.dragging = false;
			}
		);
		$('*').on(
			'mousemove',
			function(event){
				$('.UI_resize .UI_tab').each(
					function(i, element){
						if(!element.dragging){
							return;
						}
						if(!event.which){
							element.dragging = false;
							return;
						}

						element = $(element);
						var element_position = {x:element.offset().left, y:element.offset().top};
						var element_size = {x:element.outerWidth(true), y:element.outerHeight(true)};
						var mouse_position = {x: event.pageX, y: event.pageY};
						var center_relitive_position = 
							{
								x: mouse_position.x - (element_position.x+Math.floor(element_size.x/2)),
								y: mouse_position.y - (element_position.y+Math.floor(element_size.y/2))
							};
						var panel = element.parent();
						if(panel.is('.UI_resize_bottom, .UI_resize_top')){
							panel.height(panel.height() - center_relitive_position.y);
						}
						if(panel.is('.UI_resize_right')){
							panel.width(panel.width() - center_relitive_position.x);
						}
						if(panel.is('.UI_resize_left')){
							panel.width(panel.width() + center_relitive_position.x);
						}
					}
				);
			}
		);
	}

	/**
	 *utility function that gets a regular expression to test against for a given form string identified by it's form element's id
	 */
	function getSearchStringRegex(id){
		var use_regex = $('#UI_search_regex').prop('checked');
		var val = $('#'+id).val();
		flags = 'i';
		if(!use_regex){
			//escape regex characters
			val = val.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
		}
		else{
			//if the user entered / / style regular expression with flags, split the string up to get the body of the regular expression and flags
			if(val.test(/^\/.*(?<!\\)\/\w*$/)){
				flags = val.replace(/.+?[^\\]\/(\w*)/, "$1");
				val = val.replace(/^\/(.*?)\/\w*$/, "$1");
			}
		}
		return new RegExp(val, flags);
	}

	/**
	 *utility function that gets an array of regular expressions to test against for a given form string identified by it's form element's id
	 */
	function getSearchStringRegexArray(id){
		var use_regex = $('#UI_search_regex').prop('checked');
		var vals = [];
		if(use_regex){
			vals = $('#'+id).val().match(/(?<!\\)\/.*?(?<!\\)\//);
		}
		else{
			vals = $('#'+id).val().match(/[^\s]/);
		}
		if(vals === null){
			return [];
		}
		for(var i = 0; i<vals.length; i++){
			var val = vals[i];
			flags = 'i';
			if(!use_regex){
				//escape regex characters
				val = val.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
			}
			else{
				//if the user entered / / style regular expression with flags, split the string up to get the body of the regular expression and flags
				if(val.test(/^\/.*(?<!\\)\/\w*$/)){
					flags = val.replace(/.+?[^\\]\/(\w*)/, "$1");
					val = val.replace(/^\/(.*?)\/\w*$/, "$1");
				}
			}
			vals[i] = new RegExp(val, flags);
		};
		return vals;
	}

	/**
	 * sets up the form handlers
	 */
	function setupFormHandlers(){
		$("#feature_search_form").bind('submit', function(event){
			try{
				
				var id = getSearchStringRegex('feature_search_id');
				var name = getSearchStringRegex('feature_search_name');
				var author = getSearchStringRegex('feature_search_author');
				var language_count = parseInt($('#feature_search_language_count').val(),10);
				var area = getSearchStringRegex('feature_search_area');
				var values = getSearchStringRegexArray('feature_search_values');
			
				var results = Application.searchFeature(id, name, author, language_count, area, values);

				displaySearchResults(
					'#feature_search_results', 
					results, 
					function template(feature){
						return '<div class="feature_search_result search_result feature feature_'+feature.id+'" data-feature_id="'+feature.id+'">'+feature.name+' ('+feature.id+')</div>';
					},
					function onclick(){
						var feature = Application.getNode($(this).data('feature_id'));
						Application.toggleNodeSelection(feature);
					},
					function onhover(is_in){
						var feature = Application.getNode($(this).data('feature_id'));
						Application.highlightNode(is_in?feature:null);
					}
				);
			}
			catch(err){
				//please just don't submit the form, even if there is an error
			}
			return false;
		});
	}

	/**
	 * display search results
	 */
	function displaySearchResults(target,results,resultTemplateFunction,clickHandler,hoverHandler){
		$(target).empty();
		results.forEach(function(d){
			var new_result = $(resultTemplateFunction(d));
			$(target).append(new_result);
			new_result.on('click', function(){clickHandler.apply(this)});
			new_result.on('mouseover', function(){hoverHandler.apply(this,[true])});
			new_result.on('mouseout', function(){hoverHandler.apply(this,[false])});
		});
	}

	/**
	 *sets up the onclick handlers for tab triggers
	 */
	function setUpTabs(){
		$("[data-show_tab]").bind('click', function(event){
			showTab($(this).data('show_tab'));
		});
	}

	/**
	 *switch tabs
	 *@param string id -- id of the tab to show
	 */
	function showTab(id){
		//get the tab to show
		var active_tab = $('#'+id);

		//hide the sibling tabs
		active_tab.siblings().filter('.UI_tab_content').hide();

		//show this tab
		active_tab.show();

		//mark the correct tabl label as selected
		$("[data-show_tab='"+id+"']").siblings().filter('[data-show_tab]').removeClass('UI_tab_selected');
		$("[data-show_tab='"+id+"']").addClass('UI_tab_selected');
	}

	/**
	 *the user has changed the minimum corelation
	 */
	function onCorrelationChange(){
		var new_corelation = parseInt($('#UI_minimum_corelation').val(),10);
		Application.setMinimumCorrelation(new_corelation);
	}

	/**
	 *the user has changed the subgraph seperation
	 */
	function onSeparationChange(){
		var new_seperation = parseFloat($('#UI_subgraph_seperation').val());
		Application.setSubgraphSeparation(new_seperation);
	}

	/**
	 * the user has decided to change the drawing of links
	 */
	function onDrawLinkChange(){
		var is_checked = $('#UI_draw_links').prop('checked');
		Application.setDrawLinks(is_checked);
	}

	/**
	 * the user has decided to change showing of labels on the matrix
	 */
	function onDrawMatrixLabelsChange(){
		var is_checked = $('#UI_draw_matrix_labels').prop('checked');
		Application.setDrawMatrixLabels(is_checked);
	}

	/**
	 *the user has changed the minimum corelation
	 */
	function onCollapseSelectedFeatures(){
		Application.collapseFeatures();
	}

	return {
		onCorrelationChange:onCorrelationChange,
		onSeparationChange:onSeparationChange,
		onDrawLinkChange:onDrawLinkChange,
		onDrawMatrixLabelsChange:onDrawMatrixLabelsChange,
		onCollapseSelectedFeatures:onCollapseSelectedFeatures
	};
}());
