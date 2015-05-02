var UI = (function(){
	$(document).ready(
		function() {
			setUpPanels();
			setUpTabs();
			setupFormHandlers();
			makeTheDamnedSearchResultsScroll();
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
	 * templates for drawing nodes, links and languages
	 */
	TEMPLATES = {
		node: function(feature){
			var is_selected = Application.nodeIsSelected(feature);
			return '<div class="feature_search_result search_result feature feature_'+feature.id+(is_selected?' selected':'')+'" data-feature_id="'+feature.id+'">'
				+'<h2>'+feature.name+' ('+feature.id+')</h2>'
				+'<table>'
					+'<tr><th>Id</th><td>'+feature.id+'</td></tr>'
					+'<tr><th>Name</th><td>'+feature.name+'</td></tr>'
					+'<tr><th>Language Count</th><td>'+feature.language_count+'</td></tr>'
					+'<tr><th>Area</th><td>'+feature.area+'</td></tr>'
					+'<tr><th>Author</th><td>'+feature.author+'</td></tr>'
				+'</table>'
			+'</div>';
		},

		link: function(link){
			var is_selected = Application.nodeIsSelected(link);
			return '<div class="link_search_result search_result link feature_'+link.source.id+' feature_'+link.target.id+(is_selected?' selected':'')+'" data-link_id="'+link.source.id+','+link.target.id+'">'
				+'<h2>'+link.source.id+' - '+link.target.id+'</h2>'
				+'Correlation Confidence'
				+'<table>'
					+'<tr><th>Interfamily:</th><td>'+link.interfamily_strength+'</td></tr>'
					+'<tr><th>Intersubfamily:</th><td>'+link.intersubfamily_strength+'</td></tr>'
					+'<tr><th>Intergenus:</th><td>'+link.intergenus_strength+'</td></tr>'
					+'<tr><th>Interlanguage:</th><td>'+link.interlanguage_strength+'</td></tr>'
					+'<tr><th>Total:</th><td>'+link.total_strength+'</td></tr>'
				+'</table>'
			+'</div>';
		},

		language: function(language){
			var is_selected = Application.languageIsSelected(language);
			return '<div class="language_search_result search_result language language_name_'+language.name+(is_selected?' selected':'')+'" data-language_name="'+language.name+'">'
				+'<h2>'+language.name+'</h2>'
				+'<table>'
					+'<tr><th>Family</th><td>'+language.family+'</td></tr>'
					+'<tr><th>Subfamily</th><td>'+language.subfamily+'</td></tr>'
					+'<tr><th>Genus</th><td>'+language.genus+'</td></tr>'
					+'<tr><th>Family</th><td>'+language.family+'</td></tr>'
					+'<tr><th>Name</th><td>'+language.name+'</td></tr>'
					+'<tr><th>Latitude</th><td>'+language.latitude+'</td></tr>'
					+'<tr><th>Longitude</th><td>'+language.longitude+'</td></tr>'
				+'</table>'
			+'</div>';
		}
	};

	

	/**
	 * read the function name >:(
	 */
	function makeTheDamnedSearchResultsScroll(){
		setInterval(
			function fixBrokenStuff(){
				$('.search_results, .UI_resize_right').each(function(i,element){
					var element_bottom = $(element).offset().top + $(element).height();
					var screen_bottom = $(window).height();
					var difference = element_bottom - screen_bottom;
					$(element).height($(element).height() - difference);
					//fuck you css, was that so fucking hard?
					//how many hours css? how many hours of my life did you waist?
					//was it worth it? was it? was it worth breaking my spirit and forcing me to script simple fucking layout?
					//I hope it was. and I hope you can live with yourself at night, but I know you can.
					//I know CSS. I've worked with you long enough to know what a depraved sadistic standard you are
					//but just remember this, I can abandon you any time you get in my way, your exsistence is mearly
					//an extention of my desire to do the right thing, but I can break out tables or scripting any time you hurt me
					//you owe me those hours back
				});
			},
			500
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
	 * for some reason we've just been informed that our search results are now invalid
	 */
	function clearSearchResults(){
		$('.search_results').empty();
	}

	/**
	 * sets up the form handlers
	 */
	function setupFormHandlers(){
		setupFeatureSearchForm();
		setupLinkSearchForm();
		setupLanguageSearchForm();
	}

	function setupFeatureSearchForm(){
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
					TEMPLATES.node,
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

	function setupLinkSearchForm(){
		$("#link_search_form").bind('submit', function(event){
			try{
				
				var link_search_feature = getSearchStringRegex('link_search_feature');
				var link_search_total_strength_min = parseInt($('#link_search_total_strength_min').val(),10);
				var link_search_total_strength_max = parseInt($('#link_search_total_strength_max').val(),10);
				var link_search_interfamily_strength_min = parseInt($('#link_search_interfamily_strength_min').val(),10);
				var link_search_interfamily_strength_max = parseInt($('#link_search_interfamily_strength_max').val(),10);
				var link_search_intersubfamily_strength_min = parseInt($('#link_search_intersubfamily_strength_min').val(),10);
				var link_search_intersubfamily_strength_max = parseInt($('#link_search_intersubfamily_strength_max').val(),10);
				var link_search_intergenus_strength_min = parseInt($('#link_search_intergenus_strength_min').val(),10);
				var link_search_intergenus_strength_max = parseInt($('#link_search_intergenus_strength_max').val(),10);
				var link_search_interlanguage_strength_min = parseInt($('#link_search_interlanguage_strength_min').val(),10);
				var link_search_interlanguage_strength_max = parseInt($('#link_search_interlanguage_strength_max').val(),10);
			
				var results = Application.searchLink(
					link_search_feature,
					link_search_total_strength_min,
					link_search_total_strength_max,
					link_search_interfamily_strength_min,
					link_search_interfamily_strength_max,
					link_search_intersubfamily_strength_min,
					link_search_intersubfamily_strength_max,
					link_search_intergenus_strength_min,
					link_search_intergenus_strength_max,
					link_search_interlanguage_strength_min,
					link_search_interlanguage_strength_max
				);

				displaySearchResults(
					'#link_search_results', 
					results,
					TEMPLATES.link,
					function onclick(){
						var link_ids = $(this).data('link_id').split(',');
						var link = Application.getLink(link_ids[0], link_ids[1]);
						Application.toggleLinkSelection(link);
					},
					function onhover(is_in){
						var link_ids = $(this).data('link_id').split(',');
						var link = Application.getLink(link_ids[0], link_ids[1]);
						Application.highlightLink(is_in?link:null);
					}
				);
			}
			catch(err){
				//please just don't submit the form, even if there is an error
			}
			return false;
		});
	}

	function setupLanguageSearchForm(){
		$("#language_search_form").bind('submit', function(event){
			try{
				var family = getSearchStringRegex('language_search_family');
				var subfamily = getSearchStringRegex('language_search_subfamily');
				var genus = getSearchStringRegex('language_search_genus');
				var name = getSearchStringRegex('language_search_name');

				var latitude = parseFloat($('#language_search_latitude').val());
				var longitude = parseFloat($('#language_search_longitude').val());
				var distance = parseFloat($('#language_search_distance').val());
			
				var results = Application.searchLanguage(family, subfamily, genus, name, latitude, longitude, distance);

				displaySearchResults(
					'#language_search_results', 
					results,
					TEMPLATES.language,
					function onclick(){
						var language = Application.getLanguage($(this).data('language_name'));
						Application.toggleLanguageSelection(language);
					},
					function onhover(is_in){
						//don't do anything
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
	 * the user has changed their UI selection
	 */
	function selectionChanged(selected_data){
		var anything_selected = false;
		['node','link','language'].forEach(function(type){
			var output = "";
			if(selected_data[type+'s'].length < 1){
				$('.data_panel .selected_'+type+'s .null_selection').show();
			}
			else{
				anything_selected = true
				$('.data_panel .selected_'+type+'s .null_selection').hide();
				selected_data[type+'s'].forEach(function(selected){
					output += TEMPLATES[type](selected);
				});
			}
			$('.data_panel .selected_'+type+'s .selection_list').html(output);
		});

		if(anything_selected){
			$('.data_panel>.null_selection').hide();
		}
		else
		{
			$('.data_panel>.null_selection').show();
		}

		selectSearchResults(selected_data);
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
	 * the user has decided to change the weakest links to draw
	 */
	function onMinimumDrawStrengthChange(){
		var minimum = parseFloat($('#UI_minimum_draw_strength').val());
		Application.setMinimumDrawStrength(minimum);
	}

	/**
	 * the user has decided to change what type of strength to show in the matrix
	 */
	function onCorrelationTypeChange(){
		var type = $('#UI_correlation_type').val();
		Application.setCorrelationType(type);
	}

	/**
	 *the user has changed the minimum corelation
	 */
	function onCollapseSelectedFeatures(){
		Application.collapseFeatures();
	}

	/**
	 * update displayed highlighted search results
	 */
	function highlightNodeSearchResults(node){
		$('.search_result.highlighted').removeClass('highlighted');
		if(node !== null){
			$('.feature_search_result.feature_'+node.id).addClass('highlighted');
		}
	}

	/**
	 * update displayed highlighted search results
	 */
	function highlightLinkSearchResults(link){
		$('.search_result.highlighted').removeClass('highlighted');
		if(link !== null){
			$('.link_search_result.feature_'+link.source.id+'.feature_'+link.target.id).addClass('highlighted');
		}
	}

	/**
	 * update displayed selected search results
	 */
	function selectSearchResults(selection_data){
		$('.search_result.selected').removeClass('selected');
		selection_data.nodes.forEach(function(node){
			$('.feature_search_result.feature_'+node.id).addClass('selected');
		});
		selection_data.links.forEach(function(link){
			$('.link_search_result.feature_'+link.source.id+'.feature_'+link.target.id).addClass('selected');
		});
		selection_data.languages.forEach(function(language){
			$('.language_search_result.language_name_'+language.name).addClass('selected');
		});
	}

	/**
	 * selects all of the currently visible search results
	 */
	function selectAllSearchResults(){
		$('.UI_tab_content:visible .search_result').each(function(i,result){
			var feature = $(result).data('feature_id');
			var link = $(result).data('link_id');
			if(feature){
				Application.selectNode(Application.getNode(feature));
			}
			if(link){
				var link_ids = $(this).data('link_id').split(',');
				Application.selectLink(Application.getLink(link_ids[0],link_ids[1]));
			}
		});
	}

	/**
	 * selects all of the currently visible search results
	 */
	function unselectAllSearchResults(){
		$('.UI_tab_content:visible .search_result').each(function(i,result){
			var feature = $(result).data('feature_id');
			var link = $(result).data('link_id');
			if(feature){
				Application.unselectNode(Application.getNode(feature));
			}
			if(link){
				var link_ids = $(this).data('link_id').split(',');
				Application.unselectLink(Application.getLink(link_ids[0],link_ids[1]));
			}
		});
	}

	return {
		onCorrelationChange:onCorrelationChange,
		onSeparationChange:onSeparationChange,
		onDrawLinkChange:onDrawLinkChange,
		onDrawMatrixLabelsChange:onDrawMatrixLabelsChange,
		onCollapseSelectedFeatures:onCollapseSelectedFeatures,
		onMinimumDrawStrengthChange:onMinimumDrawStrengthChange,
		onCorrelationTypeChange:onCorrelationTypeChange,
		highlightNodeSearchResults:highlightNodeSearchResults,
		highlightLinkSearchResults:highlightLinkSearchResults,
		selectionChanged:selectionChanged,
		selectAllSearchResults:selectAllSearchResults,
		unselectAllSearchResults:unselectAllSearchResults,
		clearSearchResults:clearSearchResults
	};
}());
