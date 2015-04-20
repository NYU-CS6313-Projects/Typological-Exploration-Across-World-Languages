var UI = (function(){
	$(document).ready(
		function() {
			setUpPanels();
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
						if(panel.is('.UI_resize_left, .UI_resize_right')){
							panel.width(panel.width() - center_relitive_position.x);
						}
					}
				);
			}
		);
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

	return {
		onCorrelationChange:onCorrelationChange,
		onSeparationChange:onSeparationChange,
		onDrawLinkChange:onDrawLinkChange,
		onDrawMatrixLabelsChange:onDrawMatrixLabelsChange
	};
}());
