<?php
/**
 * Store ordered language data into json array
 * to be paired with feature information
 */

$language_data = array_map(
			"str_getcsv", 
			file("../wals_data/lab_table.csv")
	);

//get rid of the header
array_shift($language_data);

$R = 1; //radius of the unit circle
$output = "\"languages\":[";
foreach($language_data as $language) {
	$output .= "\n\t{ ";
	$output .= "\"name\": \"$language[0]\", ";
	$output .= "\"family\": \"$language[2]\", ";
	//use family for subfamily if missing
	if($language[3] == "__") $output .= "\"subfamily\": \"$language[2]\", ";
	else $output .= "\"subfamily\": \"$language[3]\", ";
	$output .= "\"genus\": \"$language[1]\", ";
	$output .= "\"latitude\": \"".deg2rad($language[4])."\", ";
	$output .= "\"longitude\": \"".deg2rad($language[5])."\", ";
	$output .= "\"x\": \"".$R * cos(deg2rad($language[4])) * cos(deg2rad($language[5]))."\", ";
	$output .= "\"y\": \"".$R * cos(deg2rad($language[4])) * sin(deg2rad($language[5]))."\", ";
	$output .= "\"z\": \"".$R * sin(deg2rad($language[4]))."\"";
	$output .= " },";
}
$output = rtrim($output,",");
$output .= "\n]";
file_put_contents("../wals_data/language_data_json",$output);
