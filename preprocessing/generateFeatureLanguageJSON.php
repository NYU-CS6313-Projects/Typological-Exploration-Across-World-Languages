<?php
/**
 * Reorganizes language->feature data into
 * feature->value->language format
 * Stores this data as json objects.
 */

//Fill in feature values with blanks
$feature_structures = json_decode(
	file_get_contents("../wals_data/feature_info_json"),
	true
);
$feature_data = array();
foreach($feature_structures as $feature_key => $feature_structure) {
	foreach($feature_structure["Enum"] as $value_key => $feature_value) {
		$feature_data[$feature_key][$value_key] = array();
	}
}

//language => feature_values
$languages = array_map(
		"array_filter",
		array_map(
			"str_getcsv", 
			file("../wals_data/data_orig.csv")
		)
);

//for each language
foreach($languages as $language_id => $language) {
	//for each feature
	foreach($language as $feature => $value) {
		//store language in feature->value set
		$feature_data[$feature][$value][] = $language_id;
	}
}

//build json object from feature_data and feature_structures
$output = "\"features\":[";
foreach($feature_data as $feature => $values) {
	$output .= "\n\t{";
	$output .= "\n\t\t\"name\":\"".$feature_structures[$feature]["Name"]."\",";
	$output .= "\n\t\t\"id\":\"".$feature_structures[$feature]["ID"]."\",";
	$output .= "\n\t\t\"type\":\"".substr($feature_structures[$feature]["ID"],0,-1)."\",";
	$output .= "\n\t\t\"author\":\"".$feature_structures[$feature]["Author"]."\",";
	$output .= "\n\t\t\"language_count\":\"".$feature_structures[$feature]["Number"]."\",";
	$output .= "\n\t\t\"area\":\"".$feature_structures[$feature]["Area"]."\",";
	$output .= "\n\t\t\"values\":{";
	foreach($values as $value => $language_ids) {
		$output .= "\n\t\t\t\"".$feature_structures[$feature]["Enum"][$value]."\": [";
		foreach($language_ids as $language_id) {
			$output .= "$language_id,";
		}
		$output = rtrim($output,",");
		$output .= "],";
	}
	$output = rtrim($output,",");
	$output .= "\n\t\t}\n\t},";
}
$output = rtrim($output,",");
$output .= "\n]";
file_put_contents("../wals_data/feature_language_json",$output);
