/**********************************************************************************
* drag_drop_boards.js                                                             *
***********************************************************************************
* This JS code was copied & modified from the ElkArte forum software, which is    *
* licensed under the 3-clause BSD License, which can be found here:               *
*	http://opensource.org/licenses/BSD-3-Clause                                   *
***********************************************************************************
* This program is distributed in the hope that it is and will be useful, but      *
* WITHOUT ANY WARRANTIES; without even any implied warranty of MERCHANTABILITY    *
* or FITNESS FOR A PARTICULAR PURPOSE.                                            *
**********************************************************************************/

/**
 * Drag and drop to reorder ID's via UI Sortable
 *
 * @param {object} $
 */
(function($) {
	'use strict';
	$.fn.smfSortable = function(oInstanceSettings) {
		$.fn.smfSortable.oDefaultsSettings = {
			opacity: 0.7,
			cursor: 'move',
			axis: 'y',
			scroll: true,
			containment: 'parent',
			delay: 150,
			handle: '', // Restricts sort start click to the specified element, like category_header
			href: '', // If an error occurs redirect here
			tolerance: 'intersect', // mode to use for testing whether the item is hovering over another item.
			setorder: 'serialize', // how to return the data, really only supports serialize and inorder
			placeholder: '', // css class used to style the landing zone
			preprocess: '', // This function is called at the start of the update event (when the item is dropped) must in in global space
			tag: '#table_grid_sortable', // ID(s) of the container to work with, single or comma separated
			connect: '', // Use to group all related containers with a common CSS class
			sa: '', // Subaction that the xmlcontroller should know about
			title: '', // Title of the error box
			error: '', // What to say when we don't know what happened, like connection error
			token: '' // Security token if needed
		};

		// Account for any user options
		var oSettings = $.extend({}, $.fn.smfSortable.oDefaultsSettings, oInstanceSettings || {});

		// Divs to hold our responses
		var ajax_infobar = document.createElement('div'),
			ajax_errorbox = $("<div id='errorContainer'><div/>").appendTo('body');

		// Prepare the infobar and errorbox divs to confirm valid responses or show an error
		$("body").append(ajax_infobar);
		$(ajax_infobar).slideUp();

		$('#errorContainer').css({'display': 'none'});

		// Find all oSettings.tag and attach the UI sortable action
		$(oSettings.tag).sortable({
			opacity: oSettings.opacity,
			cursor: oSettings.cursor,
			axis: oSettings.axis,
			handle: oSettings.handle,
			containment: oSettings.containment,
			connectWith: oSettings.connect,
			placeholder: oSettings.placeholder,
			tolerance: oSettings.tolerance,
			delay: oSettings.delay,
			scroll: oSettings.scroll,
			helper: function(e, ui) {
				// Fist create a helper container
				var $originals = ui.children(),
					$helper = ui.clone(),
					$clone;

				// Replace the helper elements with spans, normally this is a <td> -> <span>
				// Done to make this container agnostic.
				$helper.children().each(function() {
					$(this).replaceWith(function(){
						return $("<span />", {html: $(this).html()});
					});
				});

				// Set the width of each helper cell span to be the width of the original cells
				$helper.children().each(function(index) {
					// Set helper cell sizes to match the original sizes
					return $(this).width($originals.eq(index).width()).css('display', 'inline-block');
				});

				// Next to overcome an issue where page scrolling does not work, we add the new agnostic helper
				// element to the body, and hide it
				$('body').append('<div id="clone" class="windowbg2 ' + oSettings.placeholder + '">' + $helper.html() + '</div>');
				$clone = $('#clone');
				$clone.hide();

				// Append the clone element to the actual container we are working in and show it
				setTimeout(function() {
					$clone.appendTo(ui.parent());
					$clone.show();
				}, 1);

				// The above append process allows page scrolls to work while dragging the clone element
				return $clone;
			},
			update: function(e, ui) {
				// Called when an element is dropped in a new location
				var postdata = '',
					moved = ui.item.attr('id'),
					order = [],
					receiver = ui.item.parent().attr('id');

				// Calling a pre processing function?
				if (oSettings.preprocess !== '')
					window[oSettings.preprocess]();

				// How to post the sorted data
				if (oSettings.setorder === 'inorder')
				{
					// This will get the order in 1-n as shown on the screen
					$(oSettings.tag).find('li').each(function() {
						var aid = $(this).attr('id').split('_');
						order.push({name: aid[0] + '[]', value: aid[1]});
					});
					postdata = $.param(order);
				}
				// Get all id's in all the sortable containers
				else
				{
					$(oSettings.tag).each(function() {
						// Serialize will be 1-n of each nesting / connector
						if (postdata === "")
							postdata += $(this).sortable(oSettings.setorder);
						else
							postdata += "&" + $(this).sortable(oSettings.setorder);
					});
				}

				// Add in our security tags and additional options
				if (oSettings.token !== '')
					postdata += '&' + oSettings.token.token_var + '=' + oSettings.token.token_id;
				postdata += '&order=reorder';
				postdata += '&moved=' + moved;
				postdata += '&received=' + receiver;

				// And with the post data prepared, lets make the ajax request
				$.ajax({
					type: "POST",
					url: smf_scripturl + "?action=xmlhttp;sa=" + oSettings.sa + ";xml",
					dataType: "xml",
					data: postdata
				})
				.fail(function(jqXHR, textStatus, errorThrown) {
					$(ajax_infobar).attr('class', 'errorbox');
					$(ajax_infobar).html(textStatus).slideDown('fast');
					setTimeout(function() {
						$(ajax_infobar).slideUp();
					}, 3500);
					// Reset the interface?
					if (oSettings.href !== '')
						setTimeout(function() {
							window.location.href = smf_scripturl + oSettings.href;
						}, 1000);
				})
				.done(function(data, textStatus, jqXHR) {
					if ($(data).find("error").length !== 0)
					{
						// Errors get a modal dialog box and redirect on close
						$('#errorContainer').append('<p id="errorContent"></p>');
						$('#errorContent').html($(data).find("error").text());
						$('#errorContent').dialog({
							autoOpen: true,
							title: oSettings.title,
							modal: true,
							close: function(event, ui) {
								// Redirecting due to the error, thats a good idea
								if (oSettings.href !== '')
									window.location.href = smf_scripturl + oSettings.href;
							}
						});
					}
					else if ($(data).find("smf").length !== 0)
					{
						// Valid responses get the unobtrusive slider
						$(ajax_infobar).attr('id', 'ajax_in_progress');
						$(ajax_infobar).html($(data).find('smf > orders > order').text()).slideDown('fast');
						setTimeout(function() {
							$(ajax_infobar).slideUp();
						}, 3500);
					}
					else
					{
						// Something "other" happened ...
						$('#errorContainer').append('<p id="errorContent"></p>');
						$('#errorContent').html(oSettings.error + ' : ' + textStatus);
						$('#errorContent').dialog({
							autoOpen: true, 
							title: oSettings.title, 
							modal: true
						});
					}
				});
			}
		});
	};
})(jQuery);

/**
 * Helper function used in the preprocess call for drag/drop boards
 * Sets the id of all 'li' elements to cat#,board#,childof# for use in the
 * $_POST back to the xmlcontroller
 */
function setBoardIds() 
{
	// For each category of board
	$("[id^=category_]").each(function() {
		var cat = $(this).attr('id').split('category_'),
			uls = $(this).find("ul");

		// First up add drop zones so we can drag and drop to each level
		if (uls.length === 1)
		{
			// A single empty ul in a category, this can happen when a cat is dragged empty
			if ($(uls).find("li").length === 0)
				$(uls).append('<li id="cbp_' + cat + ',-1,-1"></li>');
			// Otherwise the li's need a child ul so we have a "child-of" drop zone
			else
				$(uls).find("li:not(:has(ul))").append('<ul class="nolist"></ul>');
		}
		// All others normally
		else
			$(uls).find("li:not(:has(ul))").append('<ul class="nolist"></ul>');

		// Next make find all the ul's in this category that have children, update the
		// id's with information that indicates the 1-n and parent/child info
		$(this).find('ul:parent').each(function(i, ul) {

			// Get the (li) parent of this ul
			var parentList = $(this).parent('li').attr('id'),
					pli = 0;

			// No parent, then its a base node 0, else its a child-of this node
			if (typeof (parentList) !== "undefined")
			{
				pli = parentList.split(",");
				pli = pli[1];
			}

			// Now for each li in this ul
			$(this).find('li').each(function(i, el) {
				var currentList = $(el).attr('id');
				var myid = currentList.split(",");

				// Remove the old id, insert the newly computed cat,brd,childof
				$(el).removeAttr("id");
				myid = "cbp_" + cat[1] + "," + myid[1] + "," + pli;
				$(el).attr('id', myid);
			});
		});
	});
}
