<?php
/**********************************************************************************
* Subs-DragDrop.php                                                               *
***********************************************************************************
* This mod is licensed under the 2-clause BSD License, which can be found here:   *
*	http://opensource.org/licenses/BSD-2-Clause                                   *
***********************************************************************************
* This program is distributed in the hope that it is and will be useful, but	  *
* WITHOUT ANY WARRANTIES; without even any implied warranty of MERCHANTABILITY	  *
* or FITNESS FOR A PARTICULAR PURPOSE.											  *
**********************************************************************************/
if (!defined('SMF'))
	die('Hacking attempt...');

/**********************************************************************************
* Hook Function that inserts the new XML function into the array                  *
**********************************************************************************/
function DragDrop_Hook(&$subactions)
{
	$subActions['boardorder'] = 'DragDrop_XML';
}

/**********************************************************************************
* Function that reorders the boards in response to an ajax sortable request       *
**********************************************************************************/
function DragDrop_XML()
{
	global $context, $txt, $boards, $cat_tree, $sourcedir;

	// Make sure we have proper permission to make these changes:
	isAllowedTo('manage_boards');

	// Start off clean
	$context['xml_data'] = array();
	$errors = array();
	$order = array();
	$board_tree = array();
	$board_moved = null;

	// Chances are we will need these
	loadLanguage('Errors');
	loadLanguage('ManageBoards');
	require_once($sourcedir . '/Subs-Boards.php');

	// No question that we are doing some board reordering
	if (isset($_POST['order']) && $_POST['order'] === 'reorder' && isset($_POST['moved']))
	{
		$list_order = 0;
		$moved_key = 0;

		// What board was drag and dropped?
		list (, $board_moved,) = explode(',', $_POST['moved']);
		$board_moved = (int) $board_moved;

		// The board ids arrive in 1-n view order ...
		foreach ($_POST['cbp'] as $id)
		{
			list ($category, $board, $childof) = explode(',', $id);

			if ($board == -1)
				continue;

			$board_tree[] = array(
				'category' => $category,
				'parent' => $childof,
				'order' => $list_order,
				'id' => $board,
			);

			// Keep track of where the moved board is in the sort stack
			if ($board == $board_moved)
				$moved_key = $list_order;

			$list_order++;
		}

		// Look behind for the previous board and previous sibling
		$board_previous = (isset($board_tree[$moved_key - 1]) && $board_tree[$moved_key]['category'] == $board_tree[$moved_key - 1]['category']) ? $board_tree[$moved_key - 1] : null;
		$board_previous_sibling = null;
		for ($i = $moved_key - 1; $i >= 0; $i--)
		{
			// Sibling must have the same category and same parent tree
			if ($board_tree[$moved_key]['category'] == $board_tree[$i]['category'])
			{
				if ($board_tree[$moved_key]['parent'] == $board_tree[$i]['parent'])
				{
					$board_previous_sibling = $board_tree[$i];
					break;
				}
				// Don't go to another parent tree
				elseif ($board_tree[$i]['parent'] == 0)
					break;
			}
			// Don't go to another category
			else
				break;
		}

		// Retrieve the current saved state, returned in global $boards
		getBoardTree();

		$boardOptions = array();
		$board_current = $boards[$board_moved];
		$board_new = $board_tree[$moved_key];

		// Dropped on a sibling node, move after that
		if (isset($board_previous_sibling))
		{
			$boardOptions = array(
				'move_to' => 'after',
				'target_board' => $board_previous_sibling['id'],
			);
			$order[] = array('value' => $board_current['name'] . ' ' . $txt['mboards_order_after'] . ' ' . $boards[$board_previous_sibling['id']]['name']);
		}
		// No sibling, maybe a new child
		elseif (isset($board_previous))
		{
			$boardOptions = array(
				'move_to' => 'child',
				'target_board' => $board_previous['id'],
				'move_first_child' => true,
			);
			$order[] = array('value' => $board_current['name'] . ' ' . $txt['mboards_order_child_of'] . ' ' . $boards[$board_previous['id']]['name']);
		}
		// Nothing before this board at all, move to the top of the cat
		elseif (!isset($board_previous))
		{
			$boardOptions = array(
				'move_to' => 'top',
				'target_category' => $board_new['category'],
			);
			$order[] = array('value' => $board_current['name'] . ' ' . $txt['mboards_order_in_category'] . ' ' . $cat_tree[$board_new['category']]['node']['name']);
		}

		// If we have figured out what to do
		if (!empty($boardOptions))
			modifyBoard($board_moved, $boardOptions);
		else
			$errors[] = array('value' => $txt['mboards_board_error']);
	}

	// Return the response
	$context['sub_template'] = 'generic_xml';
	$context['xml_data'] = array(
		'orders' => array(
			'identifier' => 'order',
			'children' => $order,
		),
		'errors' => array(
			'identifier' => 'error',
			'children' => $errors,
		),
	);
}

?>