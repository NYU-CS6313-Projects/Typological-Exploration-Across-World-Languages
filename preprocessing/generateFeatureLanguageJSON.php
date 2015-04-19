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

$output = "\"features\":{";
foreach($feature_data as $feature => $values) {
	$output .= "\n\t".$feature_structures[$feature]["Name"]."\": {";
	foreach($values as $value => $language_ids) {
		$output .= "\n\t\t\"".$feature_structures[$feature]["Enum"][$value]."\": [";
		foreach($language_ids as $language_id) {
			$output .= "\"$language_id\",";
		}
		$output = rtrim($output,",");
		$output .= "],";
	}
	$output = rtrim($output,",");
	$output .= "\n\t},";
}
$output = rtrim($output,",");
$output .= "\n}";
file_put_contents("../wals_data/feature_language_json",$output);
