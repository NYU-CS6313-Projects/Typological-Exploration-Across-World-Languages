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
	 * generates a random color from a string
	 */
	function colorHash(str){
		//hash stolen from stack overflow
		var hash = 0, i, chr, len;
		if (str.length != 0){
			for (i = 0, len = str.length; i < len; i++) {
				chr   = str.charCodeAt(i);
				hash  = ((hash << 5) - hash) + chr;
				hash |= 0; // Convert to 32bit integer
			}
		}

		return '#'+("000000"+(hash&0xffffff).toString(16)).substr(-6,6);
	}

	/**
	 * gets a color that is safe to use in contrast with the given color
	 */
	function getSafeInverseColor(in_col){
		in_col = parseInt(in_col.replace(/#0*(.*)/, '$1'), 16);
		var r = ((in_col&0xff0000)>>16)>128?1:0;
		var g = ((in_col&0xff00)>>8)>128?1:0;
		var b = (in_col&0xff)>128?1:0;

		if(r+g+b > 1){
			return '#000';
		}
		else{
			return '#fff';
		}
	}

	/**
	 * the heat color used in the mini-matrix
	 */
	function getHeatColor(count, total, hue){

		if(typeof(hue) === 'undefined'){
			hue == 'red';
		}
		
		var a = Math.round((count/total*0.75+0.25)*255);
		var b = Math.round((count/total/2)*255);

		if(hue === 'red'){
			return 'rgb('+a+','+b+','+b+')';
		}
		else if(hue === 'blue'){
			return 'rgb('+b+','+b+','+a+')';
		}
		else if(hue === 'green'){
			return 'rgb('+b+','+a+','+b+')';
		}
		else{
			return getHeatColor(count, total, 'red');
		}
	}

	/**
	 * used by the link template for generating the table of feature values
	 */
	function generateLinkFeatureValueTable(link){
		var output = '<table class="link_feature_value_matrix">'
			output += '<tr>'
				+'<td></td>'
				+'<td></td>'
				+'<th class="target_label" colspan="'+(Object.keys(link.target.values).length+1)+'">'+link.target.name+'</th>'
			+'</tr>';
			var col_idx = Object.keys(link.target.values).length+1;
			for(value in link.target.values){
				output += '<tr>'
					+'<td></td>'
					+'<td rowspan="'+col_idx+'"></td>'
					+'<th colspan="'+(col_idx+1)+'" class="target_value_header">'+value.replace(/\s+/g,'&nbsp;')+'</th>';
				output += '</tr>'
				col_idx--;
			}
			output += '<tr><td></td><td></td><th colspan="2" class="total target_value_header">Any</th></tr>';
			var first = false;
			var all_source = Application.flattenValues(link.source.values);
			all_source.sort(function(a,b){return a-b});
			var all_target = Application.flattenValues(link.target.values);
			all_target.sort(function(a,b){return a-b});
			var shared_languages = Application.intersection(all_source,all_target);
			for(source_value in link.source.values){
				output += '<tr>';					//row for source value
					if(!first){
						first = true;
						output += '<th class="source_label" rowspan="'+(Object.keys(link.source.values).length+1)+'"><div>'+link.source.name+'</div></th>';
					}
					output += '<th class="source_value_header">'+source_value.replace(/\s+/g,'&nbsp;')+'</th>';		//header for source value
					for(target_value in link.target.values){
						//number of languages with the intersection of both
						var combo_value_languages = Application.intersection(link.source.values[source_value], link.target.values[target_value]);
						output += '<td class="data" '
							+'data-languages="['+combo_value_languages.join(',')+']" '
							+'style="background-color:'+getHeatColor(combo_value_languages.length, shared_languages.length)+'" '
							+'onclick="UI.linkMiniMatrixClicked(this);" '
							+'>'+combo_value_languages.length+'</td>';
					};
					//number of languages with the source value (not caring about target)
					var total = Application.intersection(shared_languages, link.source.values[source_value]);
					output += '<td class="data" '
						+'data-languages="['+total.join(',')+']" '
						+'style="background-color:'+getHeatColor(total.length, shared_languages.length, 'blue')+'" '
						+'onclick="UI.linkMiniMatrixClicked(this);" '
						+'>'+total.length+'</td>';
				output += '<td></td></tr>';
			}

			output += '<tr><th class="total source_value_header">Any</th>';
				var total_total = [];
				for(value in link.target.values){
					var total = Application.intersection(shared_languages, link.target.values[value]);
					total_total = total_total.concat(total);
					output += '<td class="data" '
						+'data-languages="['+total.join(',')+']" '
						+'style="background-color:'+getHeatColor(total.length, shared_languages.length, 'blue')+'" '
						+'onclick="UI.linkMiniMatrixClicked(this);" '
						+'>'+total.length+'</td>';
				}
			
			output += '<td class="data" '
					+'data-languages="['+total_total.join(',')+']" '
					+'style="background-color:'+getHeatColor(total_total.length, shared_languages.length, 'blue')+'"'
					+'onclick="UI.linkMiniMatrixClicked(this);" '
					+'>'+total_total.length+'</td></tr>';

		output += '</table>';
		return output;
	}
	

	/**
	 * templates for drawing nodes, links and languages
	 */
	TEMPLATES = {
		node: function(feature){
			var is_selected = Application.nodeIsSelected(feature);
			return '<div class="feature_search_result search_result feature feature_'+feature.id+(is_selected?' selected':'')+'" data-feature_id="'+feature.id+'">'
				+'<h2>'+feature.name+' ('+feature.id+')</h2>'
				+'<input type="button" value="Toggle Detail" onclick="UI.toggleDetail(this);event.stopPropagation();">'
				+'<div class="detail" style="display:none">'
					+'<table>'
						+'<tr><th>Id</th><td>'+feature.id+'</td></tr>'
						+'<tr><th>Name</th><td>'+feature.name+'</td></tr>'
						+'<tr><th>Language Count</th><td>'+feature.language_count+'</td></tr>'
						+'<tr><th>Area</th><td>'+feature.area+'</td></tr>'
						+'<tr><th>Author</th><td>'+feature.author+'</td></tr>'
					+'</table>'
				+'</div>'
			+'</div>';
		},

		link: function(link){
			var is_selected = Application.nodeIsSelected(link);
			return '<div class="link_search_result search_result link feature_'+link.source.id+' feature_'+link.target.id+(is_selected?' selected':'')+'" data-link_id="'+link.source.id+','+link.target.id+'">'
				+'<h2>'+link.source.id+' - '+link.target.id+'</input></h2>'
				+'<input type="button" value="Toggle Detail" onclick="UI.toggleDetail(this);event.stopPropagation();">'
				+'<div class="detail" style="display:none">'
					+'<table>'
						+'<tr>'
							+'<td>'
								+'<table>'
									+'<tr><th colspan="2">Correlation Confidence</th></tr>'
									+'<tr><th>Interfamily:</th><td>'+link.scaled_strengths.interfamily_strength+'</td></tr>'
									+'<tr><th>Intersubfamily:</th><td>'+link.scaled_strengths.intersubfamily_strength+'</td></tr>'
									+'<tr><th>Intergenus:</th><td>'+link.scaled_strengths.intergenus_strength+'</td></tr>'
									+'<tr><th>Interlanguage:</th><td>'+link.scaled_strengths.interlanguage_strength+'</td></tr>'
								+'</table>'
							+'</td>'
							+'<td style="width:100%">'
								+generateLinkFeatureValueTable(link)
							+'</td>'
						+'</tr>'
						+'<tr>'
							+'<td colspan="2">'
								+'<div class="language_list"></div>'
							+'</td>'
						+'</tr>'
					+'</table>'
				+'</div>'
			+'</div>';
		},

		language: function(language){
			var is_selected = Application.languageIsSelected(language);
			var f_col = colorHash(language.family);
			var s_col = colorHash(language.subfamily);
			var g_col = colorHash(language.genus);
			var f_text_col = getSafeInverseColor(f_col);
			var s_text_col = getSafeInverseColor(s_col);
			var g_text_col = getSafeInverseColor(g_col);

			return '<div class="language_search_result search_result language language_name_'+language.name+(is_selected?' selected':'')+'" data-language_name="'+language.name+'">'
				+'<span class="language_badge" style="background-color:'+f_col+'; color:'+f_text_col+';">F</span>'
				+'<span class="language_badge" style="background-color:'+s_col+'; color:'+s_text_col+';">S</span>'
				+'<span class="language_badge" style="background-color:'+g_col+'; color:'+g_text_col+';">G</span>'
				+'<h2>'+language.name+'</h2>'
				+'<input type="button" value="Toggle Detail" onclick="UI.toggleDetail(this);event.stopPropagation();">'
				+'<div class="detail" style="display:none">'
					+'<table>'
						+'<tr><th>Family:</th><td><span class="language_badge" style="background-color:'+f_col+'; color:'+f_text_col+';">'+language.family+'</span></td></tr>'
						+'<tr><th>Subfamily:</th><td><span class="language_badge" style="background-color:'+s_col+'; color:'+s_text_col+';">'+language.subfamily+'</span></td></tr>'
						+'<tr><th>Genus:</th><td><span class="language_badge" style="background-color:'+g_col+'; color:'+g_text_col+';">'+language.genus+'</span></td></tr>'
						+'<tr><th>Name:</th><td>'+language.name+'</td></tr>'
						+'<tr><th>Latitude:</th><td>'+language.latitude+'</td></tr>'
						+'<tr><th>Longitude:</th><td>'+language.longitude+'</td></tr>'
					+'</table>'
				+'</div>'
			+'</div>';
		}
	};

	/**
	 * function used by the templates for showing/hiding detail
	 */
	function toggleDetail(clicked_element){
		$(clicked_element).closest('.search_result').find('.detail').toggle();
	}	

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
			if(val.match(/\/([\\]\/|[^\/])*\/\w*/)){
				flags = val.replace(/.+?[^\\]\/(\w*)/, "$1");
				val = val.replace(/^\/(.*?)\/\w*$/, "$1");
			}
		}
		return new RegExp(val, flags);
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
				var values = getSearchStringRegex('feature_search_values');
			
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

		//highlighting
		$('.data_panel .selected_links .selection_list .search_result').on('mouseover', function(){
			var link_ids = $(this).data('link_id').split(',');
			var link = Application.getLink(link_ids[0], link_ids[1]);
			Application.highlightLink(link);
		});
		$('.data_panel .selected_links .selection_list .search_result').on('mouseout', function(){
			var link_ids = $(this).data('link_id').split(',');
			var link = Application.getLink(link_ids[0], link_ids[1]);
			Application.highlightLink(null);
		});

		$('.data_panel .selected_nodes .selection_list .search_result').on('mouseover', function(){
			var feature = Application.getNode($(this).data('feature_id'));
			Application.highlightNode(feature);
		});
		$('.data_panel .selected_nodes .selection_list .search_result').on('mouseout', function(){
			var feature = Application.getNode($(this).data('feature_id'));
			Application.highlightNode(null);
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
		//UI.startLightBox('Flooring Data...');
		//setTimeout(function(){
			var new_corelation = parseFloat($('#UI_minimum_corelation').val(),10);
			Application.setMinimumCorrelation(new_corelation);
		//	UI.stopLightBox();
		//},100);
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
	function onDrawNodeLabelsChange(){
		var is_checked = $('#UI_draw_node_labels').prop('checked');
		Application.setDrawNodeLabels(is_checked);
	}

	/**
	 * the user has decided to change the link scaling mode
	 */
	function onScaleChange(){
		var mode = $('#UI_scaling').val();
		Application.setScale(mode);
	}

	/**
	 * the user has decided to change the calculating of distance
	 */
	function onCalculateDistanceChange(){
		var is_checked = $('#UI_calculate_distance').prop('checked');
		Application.setCalculateDistance(is_checked);
	}

	/**
	 * the user has decided to change showing of labels on the matrix
	 */
	function onDrawMatrixLabelsChange(){
		var is_checked = $('#UI_draw_matrix_labels').prop('checked');
		Application.setDrawMatrixLabels(is_checked);
	}

	function onNormalizeChange(){
		var is_checked = $('#UI_normalize').prop('checked');
		Application.setNormalizeStrengths(is_checked);
	}

	/**
	 * the user wants to resort something on the matrix somehow
	 */
	function onSortMatrix(){
		UI.startLightBox('Sorting...');
		setTimeout(function(){
			var sort_dimention = $("#matrix_sort_dimention").val();
			var sort_direction = $("#matrix_sort_direction").val();
			var sort_mode = $("#matrix_sort_mode").val();
			Application.sortMatrix(sort_dimention, sort_mode, sort_direction);
			UI.stopLightBox();
		},100);
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
	 * the user has clicked on a minimatrix
	 */
	function linkMiniMatrixClicked(clicked_element){
		var common_ancestor = $(clicked_element);
		var language_list = [];
		while(language_list.length < 1 && common_ancestor.length > 0){
			common_ancestor = $(common_ancestor.parent());
			language_list = common_ancestor.find('.language_list');
		}
		var output = '';
		if(language_list.length > 0){
			output += '<input type="button" value="Hide Languages" onclick="$(this).parent().html(\'\');event.stopPropagation();"></input>';
			var languages = $(clicked_element).data('languages');
			languages.sort(function(l1, l2){
				var language1 = Application.getLanguageByIndex(l1);
				var language2 = Application.getLanguageByIndex(l2);
				if(language1.family > language2.family){
					return 1;
				}
				if(language1.family < language2.family){
					return -1;
				}
				if(language1.subfamily > language2.subfamily){
					return 1;
				}
				if(language1.subfamily < language2.subfamily){
					return -1;
				}
				if(language1.genus > language2.genus){
					return 1;
				}
				if(language1.genus < language2.genus){
					return -1;
				}
				if(language1.name > language2.name){
					return 1;
				}
				if(language1.name < language2.name){
					return -1;
				}
				return 0;
			});
			languages.forEach(function(language_idx){
				var language = Application.getLanguageByIndex(language_idx);
				output += TEMPLATES.language(language);
			});
		}
		language_list.html(output);
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

	/**
	 * user wants to remove the things they have selected
	 */
	function removeSelected(type){
		UI.startLightBox('Removing Selectied Items...');
		setTimeout(function(){
			Application.removeSelected(type);
			UI.stopLightBox();
		},100);
	}

	/**
	 * user wants to remove the things they have not selected
	 */
	function removeUnselected(type){
		UI.startLightBox('Removing Unselected Items...');
		setTimeout(function(){
			Application.removeUnselected(type);
			UI.stopLightBox();
		},100);
	}
	
	/*
	  /----------\
	  | lightbox |
	  \----------/
	*/

	/**
	 * method that brings up a lightbox with an appropriate message in it
	 */
	function lightBox(message) {
		return {
			appendTo:"html>body",
			containerCss:{
				width: 'auto',
				height: 'auto'
			},
			onShow:function() {
				$('#simplemodal-container').css('height', 'auto');
				$('#simplemodal-container').css('width', 'auto');
				$('#UI_DLG_light_box_dialog .template_light_box_message').text(message);
				$(document).resize();//this is so the dialog centers it's self properly
			}
		};
	};

	/**
	 * shows a message to the user and prevents them from doing anything on the page
	 * @param string message -- what to tell them to explain why they are not allowed to mess with the page
	 */
	function startLightBox(message){
		$('#UI_DLG_light_box_dialog').modal(lightBox(message));
	}
	
	/**
	 * give the user their UI back
	 */
	function stopLightBox(){
		$.modal.close();
	}

	return {
		onCorrelationChange:onCorrelationChange,
		onSeparationChange:onSeparationChange,
		onDrawNodeLabelsChange:onDrawNodeLabelsChange,
		onScaleChange:onScaleChange,
		onCalculateDistanceChange:onCalculateDistanceChange,
		onDrawMatrixLabelsChange:onDrawMatrixLabelsChange,
		onNormalizeChange:onNormalizeChange,
		onCollapseSelectedFeatures:onCollapseSelectedFeatures,
		onMinimumDrawStrengthChange:onMinimumDrawStrengthChange,
		onCorrelationTypeChange:onCorrelationTypeChange,
		highlightNodeSearchResults:highlightNodeSearchResults,
		highlightLinkSearchResults:highlightLinkSearchResults,
		selectionChanged:selectionChanged,
		selectAllSearchResults:selectAllSearchResults,
		unselectAllSearchResults:unselectAllSearchResults,
		clearSearchResults:clearSearchResults,
		onSortMatrix:onSortMatrix,
		startLightBox:startLightBox,
		stopLightBox:stopLightBox,
		removeUnselected:removeUnselected,
		removeSelected:removeSelected,
		linkMiniMatrixClicked:linkMiniMatrixClicked,
		toggleDetail:toggleDetail
	};
}());


